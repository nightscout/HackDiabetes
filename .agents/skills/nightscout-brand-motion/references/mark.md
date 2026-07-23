# The mark

`markPart(opts)` animates a mark: outlines draw on, then fill solid. It handles
**two** artworks via the `paths` option:

- **`MARK`** — the simple owl-pin. `src/paths/mark.json`, viewBox `700×964`, 10
  contours forming **one even-odd shape**. Default; uniform draw timing.
- **`MARK_FULL`** — the full **PCB Foundation logo**. `src/paths/mark-full.json`,
  viewBox ≈`788×1086`, **47 nonzero paths** (circuit traces, via pads, SMD
  components), flattened from `Website/registration/images/NSF.svg` by
  `src/extract-nsf.py`. Use with `proportional:true`.

## Full PCB logo specifics

- **Proportional draw** (`proportional:true`): each contour's draw duration is
  `len / penSpeed` (clamped `minDrawDur…maxDrawDur`). The huge main outline
  (len ≈ 12 000) draws deliberately over ~`maxDrawDur`; short traces are quick;
  tiny via pads (len < ~40) blink in. Reads like a circuit etching itself.
  Contours still **start** staggered by `minY` (top→bottom).
- **Separate-nonzero fill** (`mark-full.json` has `"fill":"separate-nonzero"`):
  the fill layer is a `<g>` of the original 47 paths, each keeping its own
  `fill-rule:nonzero`. Do **not** merge them into one even-odd path — the pads'
  concentric rings and overlaps would cancel. The simple mark, by contrast, is
  one combined even-odd path.
- **Colour**: `ink` is the PCB green `#2BB673`; the two eye pupils
  (`eyeIndices: MARK_FULL_EYES` = `[0,1]`) are painted `eyeColor` — black
  `#141414` on light backgrounds, `#fff` on dark. Both the draw strokes and the
  fills honour the per-eye colour. `markPart()` paints per-path in separate mode,
  so eyes differ from the body without a second part.
- Tuning lives in `fullMark()` in `src/build.mjs`: `penSpeed` (default 900),
  `maxDrawDur` (2.1), `stagger` (0.8), `strokeWidth` (2.6).

## Simple owl-pin specifics

Artwork `src/paths/mark.json` (10 contours forming one even-odd shape).

## How the self-drawing works

Two layers, same colour, so the hand-off is invisible:

1. **Draw layer** — every contour is rendered as a *stroked* path (`fill:none`)
   with `pathLength="1"`, `stroke-dasharray:1`, and `stroke-dashoffset` animated
   `1 → 0`. That traces the outline on like a pen. Contours start staggered by
   their top edge (`minY`), so the pin draws top→bottom; tiny contours (pupils,
   `area < 7000`) are forced to the end.
2. **Fill layer** — one combined path of all contours with `fill-rule:evenodd`,
   `opacity 0 → 1` starting once the outline finishes (`drawStart + stagger +
   drawDur`). Even-odd keeps the eyes/face holes transparent.

`prefers-reduced-motion` snaps both layers to their final state.

## Options

| opt | default | meaning |
|-----|---------|---------|
| `paths` | `MARK` | artwork: `MARK` (simple) or `MARK_FULL` (PCB) |
| `ink` | `#141414` | base stroke + fill colour (PCB green for the full logo) |
| `eyeIndices` | `[]` | contour indices painted with `eyeColor` (PCB: `[0,1]`) |
| `eyeColor` | `ink` | eye colour — black on light bg, `#fff` on dark |
| `strokeWidth` | `3.4` | pen weight, in the viewBox units |
| `draw` | `true` | `false` → static filled mark |
| `stagger` | `0.6` | spread of contour start times (by `minY`) |
| `drawStart` | `0` | shift the whole draw later |
| `fillDur` | `0.55` | ink fade-in duration |
| `drawDur` | `1.0` | uniform-mode: seconds each contour draws |
| `proportional` | `false` | `true` → per-contour duration ∝ `len` |
| `penSpeed` | `850` | proportional: svg units / second |
| `minDrawDur` / `maxDrawDur` | `0.28` / `1.9` | proportional: duration clamp |
| `ease` | `cubic-bezier(.65,0,.35,1)` | draw easing |

`markPart()` returns `{ viewBox, aspect, fillStart, fillEnd, render }`.
`fillStart` = `max(start + dur)` over contours; `fillEnd = fillStart + fillDur`.
Schedule follow-on parts (words) off `fillEnd`.

## Polarity gotcha (why it's traced "inverted")

`potrace` (via `potracer`) fills the *complement* of the pixels you pass it in
SVG's y-down space. `src/extract.py` therefore traces `~mask` (the background),
which makes a **plain `fill-rule:evenodd`** render the ink correctly — no wrapper
rectangle, no stray box outline. If you ever re-trace by hand, keep that
inversion or the fill comes out as the background.
