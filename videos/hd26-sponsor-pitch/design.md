# HackDiabetes — Brand & Motion Style Guide (design truth)

This is the canonical design spec for the HD26 donation video, and the reusable
baseline for any future HackDiabetes motion / social asset. Pulled from the live
site CSS (`Website/registration/index.html`) and the logo system.

## Concept angle (this video)

"Look what a weekend built." A receipts-driven, silent-safe kinetic-type reel:
concrete 2025 hackathon wins stamped off one by one, momentum since, then the ask.
The proof IS the emotional argument.

## Palette

| Role | Hex | Use |
| --- | --- | --- |
| Canvas base | `#0e1117` | everything lives on near-black |
| Canvas raise | `#161b26` | subtle vertical gradient / panels |
| Canvas raise 2 | `#1e2535` | cards, faint molecule fill |
| **Green (signal / it works)** | `#27c55e` | wins, ✓ stamps, "diabetes" in wordmark |
| Green deep | `#1ea34f` | green shadows / secondary |
| **Orange (the ask / accent)** | `#f05a3e` | CTA, donate, underline, exactly-one-accent hits |
| Orange deep | `#d44429` | orange pressed/shadow |
| Logo navy | `#16456e` | logo-only; kept OFF the video field for contrast |
| Text | `#ffffff` | statements |
| Text muted | `rgba(255,255,255,.5)` | support copy |
| Hairline | `rgba(255,255,255,.10)` | dividers, ticks |

Rule: **exactly one accent hue per beat.** Green = achieved. Orange = act.

## Type

- **Inter 900** — statement words (the brand face). Tracking `-0.03em`. Big:
  110–160px on the 1080×1920 canvas. This is the "voice."
- **JetBrains Mono 700** — the technical / receipt register: device tags,
  ✓ DONE stamps, eyebrows, beat markers, the `// 2025` labels. Tracking `+0.10em`,
  UPPERCASE. This is the "terminal / build-log" voice.
- Both are render-bundled → embed offline, deterministic, no font-fetch risk.
- Dark-bg compensation: line-height +0.05, body weight never below 700 (light-on-dark
  reads heavier but we want punch here anyway).

## Motifs (connective tissue)

- **Owl** (`assets/owl-icon.svg`) — Nightscout mascot. Opening flicker + persistent
  small top-left mark. Fill with `currentColor` (it uses `fill:currentColor`).
- **Molecule** (`assets/hackdiabetes-logo.png`) — green→navy blob mark. Final CTA lockup.
- **Wordmark** (`assets/hackdiabetes.png`) — hack(navy) diabetes(green) + orange underline.
- **Blob** (`assets/blob.svg`) — the hero organic shape; faint, low-opacity bg wash.
- Photos: `assets/IMG_9706.png` (packed ballroom) → beat 2 human anchor.
  `assets/IMG_1191.png` (CGM sensors on arm, hacking) held in reserve.

## Motion doctrine

- Percussive **kinetic-beat-slam**: one shared beat grid, distinct entrance per beat
  (scale+blur slam / side-snap / rise-rotate), ≥3 ease families. Hard cuts on the beat.
- ✓ stamps: `spring-pop-entrance`, `back.out` overshoot, green.
- Persistent chrome (owl, HD26 tag, faint blob) is always-on, not timed — brand continuity.
- Silent-safe: captions carry the whole message; music bed is additive.
- No idle wobble that doesn't perform; stillness before the CTA climax.

## Voice

Short, declarative, builder-confident. Extends the site's "Hack. Change diabetes." /
"Build what diabetes needs." Receipts, not adjectives.

## Formats

9:16 (1080×1920) is the master. 1:1 (1080×1080) and 16:9 (1920×1080) crops after sign-off.
In-feed sizing: headlines ≥90px, labels ≥24px.

## Donate CTA

On-screen: **Donate · donate.hackdiabetes.io** (branded short link). This redirects to
the Nightscout Foundation direct-donation page. Use the same link in the post caption.
