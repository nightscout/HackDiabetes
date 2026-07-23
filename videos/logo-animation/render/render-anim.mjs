#!/usr/bin/env node
/**
 * render-anim.mjs — render an animated SVG to lossless, alpha-capable video.
 *
 * Drives your installed Chrome (via puppeteer-core) to seek the SVG's CSS/WAAPI
 * animation frame-by-frame with the Web Animations API, screenshots each frame
 * with a real alpha channel, then encodes with ffmpeg. No GIF, nothing lossy.
 *
 * Designed to be driven by a human OR an agent: every knob is a CLI flag or a
 * JSON config, defaults are sane, and the timeline length is auto-detected from
 * the animation itself (override with --duration).
 *
 * Usage:
 *   node render-anim.mjs --in ../NS-endcard.svg --out ../out/endcard \
 *        --formats prores,webm,png,mp4 --fps 30 --width 1920 --height 1080
 *
 * Key flags:
 *   --in <file.svg>        input animated SVG (required)
 *   --out <basename>       output path basename (dir is created). default: ./out/<svgname>
 *   --formats <list>       comma list of: prores, mp4, webm, apng, png  (default: prores,mp4)
 *                          prores = alpha master (editors); mp4 = flat preview.
 *                          add apng/png for other lossless-alpha forms; webm for web.
 *   --fps <n>              frames per second (default 30)
 *   --duration <sec>       total length. default: auto-detected end + --hold
 *   --hold <sec>           extra freeze on the final frame (default 0.6)
 *   --width/--height <px>  output size. default: SVG viewBox size
 *   --ss <n>               supersample factor for anti-aliasing (default 2)
 *   --bg <css color|transparent>   canvas background (default transparent)
 *   --mp4-bg <css color>   background to flatten the alpha onto for the .mp4 (default #ffffff)
 *   --chrome <path>        Chrome/Edge executable (default: auto-detect or $CHROME)
 *   --keep-frames          keep the intermediate PNG frames folder
 *   --config <file.json>   load any of the above as JSON (CLI flags win)
 *
 * Formats & why:
 *   prores → ProRes 4444 .mov, 10-bit + ALPHA. The drop-in master for Premiere /
 *            Final Cut / DaVinci Resolve with real transparency.  [lossless-grade]
 *   png    → lossless PNG frame sequence WITH ALPHA at output resolution.
 *            Universal — import into literally anything.
 *   apng   → single animated PNG WITH ALPHA (lossless, web-friendly overlay).
 *   mp4    → H.264 .mp4 flattened onto --mp4-bg (NO alpha). Universal preview/share.
 *   webm   → VP9 .webm flattened onto --mp4-bg (NO alpha; small, for web).
 *
 * Transparency: use prores, png, or apng. (The bundled ffmpeg's libvpx cannot
 * encode alpha WebM, so webm/mp4 are opaque flattened outputs by design.)
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { dirname, basename, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- args ----------
function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t.startsWith('--')) {
      const key = t.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { a[key] = true; }
      else { a[key] = next; i++; }
    }
  }
  return a;
}
const cli = parseArgs(process.argv.slice(2));
const cfg = cli.config ? JSON.parse(readFileSync(resolve(cli.config), 'utf8')) : {};
const opt = { ...cfg, ...cli };

if (!opt.in) { console.error('ERROR: --in <file.svg> is required'); process.exit(1); }

const inPath = resolve(opt.in);
const svg = readFileSync(inPath, 'utf8');
const fps = Number(opt.fps ?? 30);
const ss = Number(opt.ss ?? 2);
const hold = Number(opt.hold ?? 0.6);
const bg = opt.bg ?? 'transparent';
const mp4Bg = opt['mp4-bg'] ?? '#ffffff';
const formats = String(opt.formats ?? 'prores,mp4').split(',').map(s => s.trim()).filter(Boolean);
const keepFrames = !!opt['keep-frames'];

// viewBox → default size
const vb = (svg.match(/viewBox\s*=\s*["']([\d.\s-]+)["']/) || [])[1];
const [, , vbW, vbH] = vb ? vb.trim().split(/\s+/).map(Number) : [0, 0, 512, 512];
const outW = Math.round(Number(opt.width ?? vbW));
const outH = Math.round(Number(opt.height ?? vbH));

const outBase = resolve(opt.out ?? join('out', basename(inPath).replace(/\.svg$/i, '')));
const outDir = dirname(outBase);
const capDir = `${outBase}.capframes`;   // raw supersampled captures (intermediate)
const pngDir = `${outBase}.frames`;       // deliverable PNG sequence at output resolution
mkdirSync(outDir, { recursive: true });
mkdirSync(capDir, { recursive: true });

// ---------- ffmpeg path ----------
function ffmpegPath() {
  if (opt.ffmpeg) return resolve(opt.ffmpeg);
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    return execFileSync(pythonExe(), ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8' }).trim();
  } catch { return 'ffmpeg'; }
}
function pythonExe() {
  for (const p of ['C:/Python314/python.exe', 'python', 'python3']) {
    try { execFileSync(p, ['--version'], { stdio: 'ignore' }); return p; } catch {}
  }
  return 'python';
}
const FFMPEG = ffmpegPath();

// ---------- chrome path ----------
function chromePath() {
  if (opt.chrome) return resolve(opt.chrome);
  if (process.env.CHROME) return process.env.CHROME;
  const candidates = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  throw new Error('Chrome/Edge not found. Pass --chrome <path> or set $CHROME.');
}

// ---------- harness ----------
const harness = `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0}
 body{background:${bg === 'transparent' ? 'transparent' : bg}}
 #stage{width:${outW}px;height:${outH}px;overflow:hidden}
 #stage>svg{width:100%;height:100%;display:block}</style>
<div id="stage">${svg}</div>`;

// ---------- render ----------
const pad = n => String(n).padStart(5, '0');

const run = async () => {
  console.log(`[render] ${basename(inPath)}  ${outW}x${outH} @${fps}fps  ss=${ss}  bg=${bg}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath(),
    headless: true,
    args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: outW, height: outH, deviceScaleFactor: ss });
    await page.setContent(harness, { waitUntil: 'load' });

    // discover timeline end (ms) across all animations
    const endMs = await page.evaluate(() => {
      const anims = document.getAnimations();
      let end = 0;
      for (const a of anims) {
        try { a.pause(); } catch {}
        const t = a.effect?.getComputedTiming?.().endTime;
        if (typeof t === 'number' && isFinite(t)) end = Math.max(end, t);
      }
      return end;
    });
    const durSec = opt.duration != null ? Number(opt.duration) : (endMs / 1000 + hold);
    const totalFrames = Math.max(1, Math.round(durSec * fps));
    console.log(`[render] animation end=${(endMs / 1000).toFixed(2)}s  ->  ${totalFrames} frames (${durSec.toFixed(2)}s)`);

    for (let i = 0; i < totalFrames; i++) {
      const tMs = Math.min((i / fps) * 1000, endMs); // clamp so the tail holds the final frame
      await page.evaluate((t) => {
        for (const a of document.getAnimations()) { try { a.pause(); a.currentTime = t; } catch {} }
      }, tMs);
      const buf = await page.screenshot({ omitBackground: bg === 'transparent', optimizeForSpeed: false });
      writeFileSync(join(capDir, `f${pad(i)}.png`), buf);
      if (i % 15 === 0 || i === totalFrames - 1) process.stdout.write(`\r[frames] ${i + 1}/${totalFrames}`);
    }
    process.stdout.write('\n');
    return { totalFrames };
  } finally {
    await browser.close();
  }
};

// ---------- encode ----------
function ff(args) {
  console.log('[ffmpeg] ' + args.join(' '));
  execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
}
const framePattern = join(capDir, 'f%05d.png');
const scaleToOut = `scale=${outW}:${outH}:flags=lanczos`;
// VP9/H.264 want even dimensions; ProRes/PNG don't care.
const scaleEven = `scale=${outW}:${outH}:flags=lanczos,format=yuv420p`;

function encode(fmt) {
  if (fmt === 'png') {                       // lossless alpha sequence at OUTPUT res
    mkdirSync(pngDir, { recursive: true });
    ff(['-framerate', String(fps), '-i', framePattern, '-vf', scaleToOut,
      join(pngDir, 'f%05d.png')]);
    console.log(`[out] PNG sequence -> ${pngDir}/`);
    return pngDir;
  }
  if (fmt === 'prores') {                     // ProRes 4444 + alpha (editor master)
    const out = `${outBase}.mov`;
    ff(['-framerate', String(fps), '-i', framePattern,
      '-vf', scaleToOut, '-c:v', 'prores_ks', '-profile:v', '4444',
      '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', '-bits_per_mb', '8000', out]);
    return out;
  }
  if (fmt === 'apng') {                        // animated PNG + alpha (lossless web)
    const out = `${outBase}.apng`;
    ff(['-framerate', String(fps), '-i', framePattern,
      '-vf', scaleToOut, '-c:v', 'apng', '-plays', '0', '-f', 'apng', out]);
    return out;
  }
  if (fmt === 'mp4') {                         // H.264 flattened on --mp4-bg (no alpha)
    const out = `${outBase}.mp4`;
    ff(['-f', 'lavfi', '-i', `color=c=${mp4Bg}:s=${outW}x${outH}:r=${fps}`,
      '-framerate', String(fps), '-i', framePattern,
      '-filter_complex', `[1:v]${scaleToOut}[fg];[0:v][fg]overlay=shortest=1,format=yuv420p`,
      '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', out]);
    return out;
  }
  if (fmt === 'webm') {                         // VP9 flattened on --mp4-bg (no alpha)
    const out = `${outBase}.webm`;
    ff(['-f', 'lavfi', '-i', `color=c=${mp4Bg}:s=${outW}x${outH}:r=${fps}`,
      '-framerate', String(fps), '-i', framePattern,
      '-filter_complex', `[1:v]${scaleToOut}[fg];[0:v][fg]overlay=shortest=1,format=yuv420p`,
      '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '24', '-row-mt', '1', out]);
    return out;
  }
  throw new Error(`unknown format: ${fmt}`);
}

// ---------- main ----------
(async () => {
  await run();
  const produced = [];
  for (const fmt of formats) produced.push([fmt, encode(fmt)]);
  if (!keepFrames) rmSync(capDir, { recursive: true, force: true });
  console.log('\n[done]');
  for (const [fmt, p] of produced) console.log(`  ${fmt.padEnd(7)} ${p}`);
})().catch(e => { console.error(e); process.exit(1); });
