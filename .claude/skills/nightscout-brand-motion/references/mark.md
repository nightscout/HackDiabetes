# The mark (owl-pin)

`markPart(opts)` in `src/parts.mjs`. Artwork: `src/paths/mark.json`
(`{viewBox:[0,0,700,964], contours:[{d, minY, area}, …]}`, 10 contours).

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
| `ink` | `#141414` | stroke + fill colour |
| `strokeWidth` | `3.4` | pen weight, in the 700-wide viewBox |
| `draw` | `true` | `false` → static filled mark (used for `NS-logo.svg`) |
| `drawDur` | `1.0` | seconds each contour takes to draw |
| `stagger` | `0.6` | spread of contour start times |
| `drawStart` | `0` | shift the whole draw later |
| `fillDur` | `0.55` | ink fade-in duration |
| `ease` | `cubic-bezier(.65,0,.35,1)` | draw easing |

Fill start is derived: `drawStart + stagger + drawDur` (≈1.6s at defaults).

## Polarity gotcha (why it's traced "inverted")

`potrace` (via `potracer`) fills the *complement* of the pixels you pass it in
SVG's y-down space. `src/extract.py` therefore traces `~mask` (the background),
which makes a **plain `fill-rule:evenodd`** render the ink correctly — no wrapper
rectangle, no stray box outline. If you ever re-trace by hand, keep that
inversion or the fill comes out as the background.
