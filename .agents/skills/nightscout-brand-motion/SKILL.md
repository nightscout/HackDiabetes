---
name: nightscout-brand-motion
description: Build and render the Nightscout Foundation animated logo — the self-drawing "mark" (simple owl-pin OR the full PCB logo with circuit traces/pads) plus the two-colour NIGHTSCOUT (ink) / FOUNDATION (green #2BB673) wordmark — as composable SVG parts, then export lossless alpha video (ProRes 4444, PNG sequence, APNG) for video end cards. Use when asked to create, animate, recolour, restyle, re-time, re-lay-out, or re-render the Nightscout / Nightscout Foundation logo, PCB logo, wordmark, or end card, or to turn any animated SVG into alpha/lossless video. Lives in videos/logo-animation/.
---

# Nightscout brand motion

Composable animated Nightscout logo. Visual **parts** — a self-drawing **mark**,
the **NIGHTSCOUT** word (ink), the **FOUNDATION** word (green) — are emitted by
`src/parts.mjs`, composed by `src/build.mjs` into shipped SVGs, and turned into
video by `render/render-anim.mjs`. Everything lives in `videos/logo-animation/`.

There are **two marks**: `MARK` (the simple owl-pin, one even-odd shape) and
`MARK_FULL` (the full **PCB Foundation logo** — 47 nonzero paths of circuit
traces, via pads and SMD components, from `Website/registration/images/NSF.svg`).
The end card uses the **full PCB logo**. The same `markPart()` animates both.

## Brand tokens (single source of truth: `BRAND` in `src/parts.mjs`)

- **green** `#2BB673` — the PCB logo's circuitry **and** "FOUNDATION"
- **ink** `#141414` — "NIGHTSCOUT" and the PCB logo's **eyes** (on light backgrounds)

The full PCB logo is green with **black eyes** (contours `MARK_FULL_EYES = [0,1]`,
the two pupils). For a dark background, flip the eyes to white via
`markPart({ …, eyeColor: '#fff' })` (and use white for "NIGHTSCOUT" too).

## Quick start

```bash
cd videos/logo-animation
node src/build.mjs                       # regenerate NS-logo-draw.svg, NS-endcard.svg, NS-logo.svg
cd render && npm install                 # one-time (puppeteer-core, uses your Chrome)
node render-anim.mjs --in ../NS-endcard.svg --out ../out/NSF-endcard --width 1920 --height 1080
```

`out/` is git-ignored — rendered files are regenerated on demand, never tracked.
Default output is `.mov` (ProRes 4444, alpha) + `.mp4` (flat preview); add
`--formats prores,mp4,png,apng,webm` for more.

The artwork is **traced vector data** in `src/paths/*.json` (mark, nightscout,
foundation), extracted once from the source PNGs. You almost never re-trace;
you compose and re-render.

## The parts (compose freely)

```js
import { markPart, wordPart, compose, BRAND, MARK, MARK_FULL, NIGHTSCOUT, FOUNDATION } from './src/parts.mjs';

// full PCB logo: proportional draw (long traces draw slowly, tiny pads blink in)
const mark  = markPart({ paths: MARK_FULL, proportional: true, strokeWidth: 2.6 });
// or the simple owl-pin: markPart({ paths: MARK })  ← uniform draw, one even-odd fill
const line1 = wordPart(NIGHTSCOUT, { color: BRAND.ink,   start: mark.fillEnd - 0.1 });
const line2 = wordPart(FOUNDATION, { color: BRAND.green, start: mark.fillEnd + 0.06 });

const svg = compose({ width: 1920, height: 1080, children: [
  { part: mark,  x, y, w, h },
  { part: line1, x, y, w, h },
  { part: line2, x, y, w, h },
]});
```

`markPart()` returns `fillEnd` so words (or anything else) can be scheduled right
after the mark resolves — no hand-synced magic numbers.

Each part is `{ viewBox, aspect, render(scope) }` and carries its own scoped CSS,
so parts never collide and can be reused alone, restyled, or re-timed. See:

- **[references/mark.md](references/mark.md)** — the self-drawing mark: how the
  draw-then-fill works, `markPart()` options, re-tracing.
- **[references/wordmark.md](references/wordmark.md)** — the two words as
  separate parts, why they're traced separately, recolouring, adding lines.
- **[references/rendering.md](references/rendering.md)** — `render-anim.mjs`
  flags, the output formats, and which ones carry alpha.

## Common edits

| Goal | Do this |
|------|---------|
| Change a colour | edit `BRAND` in `src/parts.mjs` (or pass `color`/`ink` per part), `node src/build.mjs` |
| Change timing/speed | `markPart()` `drawDur`/`stagger`, `wordPart()` `start`/`dur`, then rebuild |
| Change end-card layout | the layout block in `src/build.mjs` (`markH`, `wordW`, gaps), rebuild |
| New size / fps / format | pass `--width/--height/--fps/--formats` to `render-anim.mjs` (no rebuild) |
| Tune the PCB draw feel | `fullMark()` opts in `src/build.mjs`: `penSpeed`, `maxDrawDur`, `stagger`, `strokeWidth` |
| Re-extract the simple mark / words | `python src/extract.py` → `paths/{mark,nightscout,foundation}.json` |
| Re-extract the full PCB logo | `python src/extract-nsf.py` → `paths/mark-full.json` (flattens NSF.svg transforms) |

## Rules

- **Transparency ships via ProRes 4444 (`.mov`), the PNG sequence, or APNG.** The
  bundled ffmpeg's libvpx can't encode alpha WebM, so `mp4`/`webm` are flattened
  onto `--mp4-bg` by design — don't promise alpha from them.
- Keep the two words as **separate parts** — merging them breaks per-word colour
  and each word's even-odd fill (see references/wordmark.md).
- After any artwork/colour/layout change, **`node src/build.mjs` then re-render**;
  the `.svg` files are build outputs, not hand-edited.
