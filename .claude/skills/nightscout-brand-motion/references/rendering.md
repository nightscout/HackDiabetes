# Rendering (SVG animation → video)

`render/render-anim.mjs` drives your installed Chrome (`puppeteer-core`) to seek
the SVG's animation **frame-accurately** with the Web Animations API, screenshots
each frame with a real alpha channel (2× supersampled), then encodes with ffmpeg.
Frame-exact and deterministic — no screen-recording, nothing lossy.

```bash
cd videos/logo-animation/render
npm install    # one-time
node render-anim.mjs --in ../NS-endcard.svg --out ../out/NSF-endcard \
  --formats prores,apng,png,mp4,webm --fps 30 --width 1920 --height 1080
```

## Formats

| format | file | alpha | use |
|--------|------|:---:|-----|
| `prores` | `.mov` ProRes 4444 | ✅ | Premiere / FCP / Resolve master |
| `png` | `.frames/` sequence (output res) | ✅ | import anywhere, lossless |
| `apng` | `.apng` | ✅ | lossless web overlay |
| `mp4` | `.mp4` H.264 on `--mp4-bg` | ❌ | universal preview |
| `webm` | `.webm` VP9 on `--mp4-bg` | ❌ | lightweight web |

**Transparency → `prores`, `png`, or `apng`.** The bundled ffmpeg's libvpx
silently strips alpha from VP8/VP9, so alpha WebM is not available; `mp4`/`webm`
are flattened onto `--mp4-bg` (default white) on purpose. For a real alpha WebM
you'd need a full ffmpeg build with working libvpx alpha.

## Flags

| flag | default | notes |
|------|---------|-------|
| `--in` | — | input animated SVG (required) |
| `--out` | `out/<name>` | output basename |
| `--formats` | `prores,apng,png,mp4` | comma list |
| `--fps` | `30` | frame rate |
| `--duration` | auto | total s; auto = animation end + `--hold` |
| `--hold` | `0.6` | freeze on the final frame |
| `--width` / `--height` | SVG viewBox | output size |
| `--ss` | `2` | supersample factor (AA) |
| `--bg` | `transparent` | canvas background |
| `--mp4-bg` | `#ffffff` | flatten colour for mp4/webm |
| `--chrome` | auto / `$CHROME` | Chrome or Edge path |
| `--ffmpeg` | auto | ffmpeg path (`$FFMPEG`, else the `imageio-ffmpeg` binary) |
| `--keep-frames` | off | keep raw supersampled captures |
| `--config` | — | JSON file of any of the above (CLI flags win) |

## How length is decided

The tool reads every animation on the page and takes the max end time
(`effect.getComputedTiming().endTime`), then adds `--hold`. So if you re-time a
part in `parts.mjs`, the render length follows automatically — no flag to update.

## Requirements

Node ≥ 18, Chrome or Edge, and an ffmpeg binary. With none on PATH it falls back
to the `imageio-ffmpeg` bundled binary (`pip install imageio-ffmpeg`). It's fully
non-interactive, so an agent can call it directly.
