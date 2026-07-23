# The wordmark (two words, two colours)

The lockup wordmark is **two independent parts**, not one:

- `NIGHTSCOUT` → `src/paths/nightscout.json` (ink `#141414`)
- `FOUNDATION` → `src/paths/foundation.json` (green `#2BB673`)

Each is drawn with `wordPart(paths, opts)` in `src/parts.mjs`.

## Why separate

1. **Per-word colour.** FOUNDATION is green, NIGHTSCOUT is ink. One combined path
   can't hold two fills.
2. **Even-odd integrity.** `wordPart` fills each word with `fill-rule:evenodd`
   (so letter counters — the holes in O, A, D, U — stay open). Splitting a single
   combined trace by y-position would put the outer boundary contour in one group
   and break the parity. Tracing the two lines from separate crops (see
   `src/extract.py`, which finds the blank row between the lines) keeps each
   word's contours self-consistent.

Both words are equal width and left-aligned in the source art, so in a layout
give them the **same `w`** and the same centred `x`; stack with a small line gap.

## Options

| opt | default | meaning |
|-----|---------|---------|
| `color` | `#141414` | fill colour |
| `start` | `0` | reveal start (s) |
| `dur` | `0.7` | reveal duration (s) |
| `rise` | `26` | px it rises while fading in (word's own viewBox space) |
| `ease` | `cubic-bezier(.22,1,.36,1)` | reveal easing |
| `animate` | `true` | `false` → static word |

The reveal is a fade + upward slide (`transform-box:fill-box` so the rise is
relative to the word, independent of where it's placed).

## Recipes

- **Recolour FOUNDATION:** change `BRAND.green` in `parts.mjs`, or pass
  `wordPart(FOUNDATION, { color: '#xxxxxx' })`, then `node src/build.mjs`.
- **Both words one colour / all ink:** pass the same `color` to both.
- **Add a tagline line:** trace it into a new `paths/*.json` and add another
  `wordPart` child in `src/build.mjs` with its own `start`.
- **Beside the mark instead of below:** in `src/build.mjs` place the words to the
  right of the mark and left-align them (`wordX = markX + markW + gap`).
