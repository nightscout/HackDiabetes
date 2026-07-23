# Nightscout logo — self-drawing animation

A vector animation of the Nightscout "owl pin" mark: the outline **draws itself
on** like a pen, then the black **fills in solid**. Built as the end logo for
Nightscout Foundation videos, with the **NIGHTSCOUT FOUNDATION** wordmark.

The artwork was traced to clean vector paths from
`Website/registration/images/NS.png` (mark) and `NSF-Text.png` (wordmark), so
everything is resolution-independent and font-independent.

The end card uses the **full PCB Foundation logo** (`NSF.svg` — the owl-pin drawn
as a circuit board with traces, via pads and SMD components): green `#2BB673`
circuitry with **black eyes**. A simpler owl-pin mark is also available. Brand
colours: green `#2BB673` (PCB logo + "FOUNDATION"), ink `#141414` ("NIGHTSCOUT" +
the logo's eyes on light backgrounds) — single source of truth: `BRAND` in
`src/parts.mjs`. (For dark backgrounds, flip the eyes/wordmark to white via
`markPart({ eyeColor:'#fff' })`.)

```
videos/logo-animation/
├─ src/                 composable source — the parts, the build, the extractors
│  ├─ paths/*.json      vector data: mark, mark-full (PCB), nightscout, foundation
│  ├─ parts.mjs         markPart() / wordPart() / compose() building blocks
│  ├─ build.mjs         composes the parts → the .svg files below
│  ├─ extract.py        (re)trace NS.png + wordmark → paths/{mark,nightscout,foundation}.json
│  └─ extract-nsf.py    flatten NSF.svg → paths/mark-full.json (the PCB logo)
├─ NS-endcard.svg       PCB mark + two-colour wordmark, 1920×1080  ⟵ build output
├─ NSF-mark-draw.svg    full PCB mark, animated                    ⟵ build output
├─ NSF-mark.svg         full PCB mark, static                      ⟵ build output
├─ NS-logo-draw.svg     simple owl-pin mark, animated              ⟵ build output
├─ NS-logo.svg          simple owl-pin mark, static                ⟵ build output
├─ preview_*.gif        quick previews
├─ render/              the render tool (SVG animation → video)
└─ out/                 rendered video / image-sequence deliverables
```

The `.svg` files are **generated** by `node src/build.mjs` from the parts — edit
`src/`, not the SVGs. The composable design (PCB/simple mark, NIGHTSCOUT,
FOUNDATION as independent parts) and how to drive it is documented as the
`nightscout-brand-motion` skill (`.agents/skills/nightscout-brand-motion/`).

## Rendered deliverables (`out/` — not tracked in git)

Everything under `out/` is **regenerated on demand** and git-ignored — it's fully
reproducible from the tracked SVGs, so we don't bloat the repo with big binaries
or frame sequences. The tracked `preview_*.gif`s show the result; render the real
files when you need them:

```bash
cd render
node render-anim.mjs --in ../NS-endcard.svg  --out ../out/NSF-endcard --width 1920 --height 1080
node render-anim.mjs --in ../NSF-mark-draw.svg --out ../out/NSF-mark   --width 1080 --height 1080
```

Default output is **two files** per animation: `.mov` (ProRes 4444, **alpha** —
the Premiere / Final Cut / Resolve master) and `.mp4` (H.264, flattened on white —
a universal preview). Need more? add formats:

| `--formats` value | File | Alpha | Use |
|-------------------|------|:---:|-----|
| `prores` *(default)* | `.mov` ProRes 4444 | ✅ | editor master with transparency |
| `mp4` *(default)* | `.mp4` H.264 on white | ❌ | universal preview / share |
| `png` | `.frames/` PNG sequence | ✅ | lossless, import into anything |
| `apng` | `.apng` | ✅ | lossless web overlay |
| `webm` | `.webm` VP9 on white | ❌ | lightweight web |

**For transparency over footage use `prores` (or `png`/`apng`).** `mp4`/`webm`
are flattened onto `--mp4-bg` (white) by design.

## Timeline (end card, full PCB logo)

- **0 – ~2.3 s** — the circuit draws itself on: long traces draw deliberately,
  short traces quicker, tiny via pads blink in (draw duration ∝ path length).
- **~2.3 – 2.8 s** — the ink fills in solid.
- **~2.7 – 3.5 s** — NIGHTSCOUT then FOUNDATION rise and fade in, scheduled off
  the mark's `fillEnd`.
- Holds on the final frame. `prefers-reduced-motion` snaps straight to the logo.

(The simpler owl-pin mark, `NS-logo-draw.svg`, uses uniform ~1.6 s draw timing.)

## Rendering it yourself (`render/`)

`render/render-anim.mjs` turns **any** animated SVG into lossless / alpha video.
It drives your installed Chrome (via `puppeteer-core`) to seek the animation
**frame-accurately** with the Web Animations API, screenshots each frame with a
real alpha channel, then encodes with ffmpeg. No GIF, nothing lossy.

```bash
cd render
npm install                       # one-time: puppeteer-core (uses your existing Chrome)

# re-render the end card, all formats:
node render-anim.mjs --in ../NS-endcard.svg --out ../out/NSF-endcard \
  --formats prores,apng,png,mp4,webm --fps 30 --width 1920 --height 1080

# just the alpha master of the mark, 4K square:
node render-anim.mjs --in ../NS-logo-draw.svg --out ../out/NS-logo-4k \
  --formats prores,png --width 2160 --height 2160
```

It's built to be driven by a human **or an agent** — every knob is a flag (or a
`--config file.json`), and the timeline length is auto-detected from the
animation itself.

| Flag | Default | Notes |
|------|---------|-------|
| `--in` | — | input animated SVG (required) |
| `--out` | `out/<name>` | output basename |
| `--formats` | `prores,apng,png,mp4` | any of `prores,apng,png,mp4,webm` |
| `--fps` | `30` | frame rate |
| `--duration` | auto | total seconds; auto = animation end + `--hold` |
| `--hold` | `0.6` | extra freeze on the final frame |
| `--width` / `--height` | SVG viewBox | output size |
| `--ss` | `2` | supersample factor (anti-aliasing) |
| `--bg` | `transparent` | canvas background |
| `--mp4-bg` | `#ffffff` | flatten colour for `mp4`/`webm` |
| `--chrome` | auto / `$CHROME` | Chrome or Edge executable |
| `--ffmpeg` | auto | ffmpeg path (`$FFMPEG` or the `imageio-ffmpeg` binary) |
| `--keep-frames` | off | keep the raw supersampled captures |

**Requirements:** Node ≥ 18, Chrome or Edge, and an ffmpeg binary. If ffmpeg
isn't on PATH the tool falls back to the one bundled by `imageio-ffmpeg`
(`pip install imageio-ffmpeg`). Note: that bundled build cannot encode alpha
WebM (a libvpx limitation) — that's why transparency ships via ProRes / PNG /
APNG, and `webm`/`mp4` are opaque.

## Customising the look

Edit `src/`, then `node src/build.mjs`, then re-render:

- **Colour** — `BRAND` in `src/parts.mjs`, or pass `color`/`ink` per part in
  `src/build.mjs`.
- **Pen weight** — `strokeWidth` on `markPart()` (default `3.4`, in the 700-wide
  viewBox).
- **Speed / timing** — `markPart()` `drawDur`/`stagger`, `wordPart()`
  `start`/`dur` in `src/build.mjs`. The render length auto-follows.
- **End-card layout** — the layout block in `src/build.mjs` (`markH`, `wordW`,
  gaps, positions).
- **Solid background** — canvases are transparent; pass `--bg <color>` when
  rendering, or add a bg to `compose()`.

See the `nightscout-brand-motion` skill and its `references/` for the full part
APIs and the tracing/polarity details.
