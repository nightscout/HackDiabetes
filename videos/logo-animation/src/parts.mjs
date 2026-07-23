/**
 * parts.mjs — composable Nightscout brand-motion building blocks.
 *
 * Every visual element is a "Part": a self-contained bundle of (a) inner SVG
 * markup in its own viewBox and (b) scoped CSS. Parts don't know where they
 * live — `compose()` places them on a canvas and merges their CSS, so the same
 * mark / word can be reused at any size, colour, or timing, alone or together.
 *
 *   const mark = markPart({ ink: '#141414' });
 *   const nightscout = wordPart(NIGHTSCOUT, { color: '#141414', start: 2.0 });
 *   const foundation = wordPart(FOUNDATION, { color: '#2BB673', start: 2.15 });
 *   const svg = compose({ width: 1920, height: 1080, children: [
 *     { part: mark,       x, y, w, h },
 *     { part: nightscout, x, y, w, h },
 *     { part: foundation, x, y, w, h },
 *   ]});
 *
 * Parts are pure data → string; no DOM, no ffmpeg. The render pipeline
 * (render/render-anim.mjs) turns the composed SVG into video.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const loadPaths = (name) => JSON.parse(readFileSync(join(HERE, 'paths', `${name}.json`), 'utf8'));

export const MARK = loadPaths('mark');            // simple owl-pin (one even-odd shape)
export const MARK_FULL = loadPaths('mark-full');  // full PCB Foundation logo (47 nonzero paths)
export const NIGHTSCOUT = loadPaths('nightscout');
export const FOUNDATION = loadPaths('foundation');

/** Brand tokens — single source of truth for colour. */
export const BRAND = {
  ink: '#141414',      // near-black: "NIGHTSCOUT" + the PCB logo's eyes (on light bg)
  green: '#2BB673',    // the PCB Foundation logo + "FOUNDATION"
};

/** Which contours of MARK_FULL are the owl's eyes (kept black on light backgrounds). */
export const MARK_FULL_EYES = [0, 1];

/**
 * A "mark" that draws its outlines on, then fills solid. Works for both the
 * simple owl-pin (one even-odd shape) and the full PCB logo (many nonzero paths).
 *
 * Timing modes:
 *  - uniform (default): every contour draws over `drawDur`, staggered top→bottom
 *    by `stagger`; tiny bits (pupils) forced near the end. Good for the simple mark.
 *  - proportional (`proportional:true`): each contour's draw duration ∝ its length
 *    (`len / penSpeed`, clamped), so long traces draw deliberately while small pads
 *    blink in — the right feel for the detailed PCB logo.
 *
 * Fill mode follows `paths.fill`: 'separate-nonzero' keeps each path's own winding
 * (PCB logo); anything else uses one combined even-odd path (simple mark).
 *
 * @returns {{viewBox:number[], aspect:number, fillStart:number, fillEnd:number,
 *            render:(scope:string)=>{css:string, inner:string}}}
 */
export function markPart(opts = {}) {
  const {
    paths = MARK,
    ink = BRAND.ink,        // base fill/stroke colour (the PCB green for the full logo)
    eyeIndices = [],        // contour indices painted with eyeColour instead of ink
    eyeColor = ink,         // colour for the eyes (black on light bg, white on dark)
    strokeWidth = 3.4,
    draw = true,
    drawDur = 1.0,
    stagger = 0.6,
    drawStart = 0,          // shift the whole draw later (e.g. on an end card)
    fillDur = 0.55,
    proportional = false,
    penSpeed = 850,         // svg units / second (proportional mode)
    minDrawDur = 0.28,
    maxDrawDur = 1.9,
    ease = 'cubic-bezier(.65,0,.35,1)',
  } = opts;

  const [, , w, h] = paths.viewBox;
  const cs = paths.contours;
  const separate = paths.fill === 'separate-nonzero';
  const eyes = new Set(eyeIndices);
  const colorOf = (i) => (eyes.has(i) ? eyeColor : ink);
  const tops = cs.map(c => c.minY);
  const tmin = Math.min(...tops), tmax = Math.max(...tops);

  const timing = cs.map(c => {
    let start = drawStart + ((c.minY - tmin) / (tmax - tmin || 1)) * stagger;
    if (!proportional && c.area < 7000) start = Math.max(start, drawStart + stagger * 0.83);
    const dur = proportional
      ? Math.min(maxDrawDur, Math.max(minDrawDur, (c.len ?? 200) / penSpeed))
      : drawDur;
    return { start: +start.toFixed(3), dur: +dur.toFixed(3) };
  });
  const fillStart = +Math.max(...timing.map(t => t.start + t.dur)).toFixed(3);
  const fillEnd = +(fillStart + fillDur).toFixed(3);
  const combined = cs.map(c => c.d).join(' ');

  const eyeStyle = (i) => (eyes.has(i) ? `;stroke:${eyeColor}` : '');
  const render = (scope) => {
    if (!draw) {
      const inner = separate
        ? `<g>${cs.map((c, i) => `<path fill="${colorOf(i)}" fill-rule="${c.fillRule || 'nonzero'}" d="${c.d}"/>`).join('')}</g>`
        : `<path fill="${ink}" fill-rule="evenodd" d="${combined}"/>`;
      return { css: '', inner };
    }
    // combined mode paints via the class; separate mode paints per path (eyes differ).
    const fillDecl = separate ? '' : `fill:${ink};fill-rule:evenodd;`;
    const css = `
    .${scope}-s{fill:none;stroke:${ink};stroke-width:${strokeWidth};stroke-linecap:round;stroke-linejoin:round;
      stroke-dasharray:1;stroke-dashoffset:1;animation:${scope}Draw var(--dur,${drawDur}s) ${ease} var(--d) forwards}
    .${scope}-fill{${fillDecl}opacity:0;animation:${scope}Fill ${fillDur}s ease-out ${fillStart}s forwards}
    @keyframes ${scope}Draw{to{stroke-dashoffset:0}}
    @keyframes ${scope}Fill{to{opacity:1}}
    @media (prefers-reduced-motion:reduce){.${scope}-s{animation:none;stroke-dashoffset:0}.${scope}-fill{animation:none;opacity:1}}`;
    const strokes = cs.map((c, i) =>
      `<path class="${scope}-s" pathLength="1" style="--d:${timing[i].start}s;--dur:${timing[i].dur}s${eyeStyle(i)}" d="${c.d}"/>`
    ).join('\n      ');
    const fill = separate
      ? `<g class="${scope}-fill">${cs.map((c, i) => `<path fill="${colorOf(i)}" fill-rule="${c.fillRule || 'nonzero'}" d="${c.d}"/>`).join('')}</g>`
      : `<path class="${scope}-fill" d="${combined}"/>`;
    const inner = `<g>\n      ${strokes}\n    </g>\n    ${fill}`;
    return { css, inner };
  };
  return { viewBox: paths.viewBox, aspect: w / h, fillStart, fillEnd, render };
}

/**
 * A single wordmark line (e.g. "NIGHTSCOUT" or "FOUNDATION"), one flat colour,
 * revealed with a fade + rise. Colour, timing and rise distance are all params.
 */
export function wordPart(paths, opts = {}) {
  const {
    color = BRAND.ink,
    start = 0,
    dur = 0.7,
    rise = 26,               // px in the word's own viewBox space
    ease = 'cubic-bezier(.22,1,.36,1)',
    animate = true,
  } = opts;
  const [, , w, h] = paths.viewBox;
  const d = paths.contours.map(c => c.d).join(' ');

  const render = (scope) => {
    if (!animate) {
      return { css: '', inner: `<path fill="${color}" fill-rule="evenodd" d="${d}"/>` };
    }
    const css = `
    .${scope}{opacity:0;transform:translateY(${rise}px);transform-box:fill-box;
      animation:${scope}In ${dur}s ${ease} ${start}s forwards}
    @keyframes ${scope}In{to{opacity:1;transform:translateY(0)}}
    @media (prefers-reduced-motion:reduce){.${scope}{animation:none;opacity:1;transform:none}}`;
    const inner = `<path class="${scope}" fill="${color}" fill-rule="evenodd" d="${d}"/>`;
    return { css, inner };
  };
  return { viewBox: paths.viewBox, aspect: w / h, render };
}

/**
 * Place parts on a canvas → one self-contained SVG string.
 * @param {{width:number,height:number,bg?:string,label?:string,
 *          children:{part:object,x:number,y:number,w:number,h:number}[]}} cfg
 */
export function compose(cfg) {
  const { width, height, bg = 'transparent', label = 'Nightscout', children } = cfg;
  const cssParts = [];
  const bodyParts = [];
  children.forEach((c, i) => {
    const scope = `p${i}`;
    const { css, inner } = c.part.render(scope);
    if (css) cssParts.push(css);
    const [vx, vy, vw, vh] = c.part.viewBox;
    bodyParts.push(
      `  <svg x="${round(c.x)}" y="${round(c.y)}" width="${round(c.w)}" height="${round(c.h)}" viewBox="${vx} ${vy} ${vw} ${vh}">
    ${inner}
  </svg>`);
  });
  const bgRect = bg === 'transparent' ? '' : `\n  <rect width="100%" height="100%" fill="${bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}">
  <style>${cssParts.join('\n')}
  </style>${bgRect}
${bodyParts.join('\n')}
</svg>
`;
}

const round = (n) => Math.round(n * 10) / 10;
