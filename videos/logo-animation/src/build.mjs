/**
 * build.mjs — compose the shipped SVGs from the parts.
 *
 * Emits (into the package root):
 *   NS-logo-draw.svg   the mark alone, self-drawing (transparent)
 *   NS-endcard.svg     mark + NIGHTSCOUT (ink) + FOUNDATION (green), 1920×1080
 *   NS-logo.svg        static mark (no animation)
 *
 * Re-run after editing parts.mjs, the colours, or the layout below:
 *   node src/build.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { markPart, wordPart, compose, BRAND, MARK, MARK_FULL, MARK_FULL_EYES, NIGHTSCOUT, FOUNDATION } from './parts.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const write = (name, svg) => { writeFileSync(join(ROOT, name), svg); console.log(`  ${name}  (${svg.length} bytes)`); };

// The full PCB Foundation logo: green (#2BB673) circuitry with black eyes, drawn
// with proportional pen speed (long traces draw deliberately, tiny via pads blink
// in) and a per-path nonzero fill. eyeColor flips to white for a dark-bg build.
const fullMark = (extra = {}) => markPart({
  paths: MARK_FULL, ink: BRAND.green, eyeIndices: MARK_FULL_EYES, eyeColor: BRAND.ink,
  proportional: true, strokeWidth: 2.6, stagger: 0.8, penSpeed: 900, maxDrawDur: 2.1, ...extra,
});

// ---- 1) simple owl-pin mark, alone --------------------------------------
const [, , MW, MH] = MARK.viewBox;
write('NS-logo-draw.svg', compose({
  width: MW, height: MH, label: 'Nightscout logo',
  children: [{ part: markPart(), x: 0, y: 0, w: MW, h: MH }],
}));
write('NS-logo.svg', compose({                       // static
  width: MW, height: MH, label: 'Nightscout logo',
  children: [{ part: markPart({ draw: false }), x: 0, y: 0, w: MW, h: MH }],
}));

// ---- 2) full PCB Foundation mark, alone ---------------------------------
const [, , FW, FH] = MARK_FULL.viewBox;
write('NSF-mark-draw.svg', compose({
  width: FW, height: FH, label: 'Nightscout Foundation logo',
  children: [{ part: fullMark(), x: 0, y: 0, w: FW, h: FH }],
}));
write('NSF-mark.svg', compose({                      // static
  width: FW, height: FH, label: 'Nightscout Foundation logo',
  children: [{ part: fullMark({ draw: false }), x: 0, y: 0, w: FW, h: FH }],
}));

// ---- 3) end card: full PCB mark + two-colour wordmark -------------------
const CW = 1920, CH = 1080;
const markH = 560;
const markW = markH * (FW / FH);
const wordW = 720;                                   // both words share one width (equal in the source)
const nH = wordW / (NIGHTSCOUT.viewBox[2] / NIGHTSCOUT.viewBox[3]);
const fH = wordW / (FOUNDATION.viewBox[2] / FOUNDATION.viewBox[3]);
const lineGap = nH * 0.16;
const markGap = 54;
const blockH = markH + markGap + nH + lineGap + fH;
const top = (CH - blockH) / 2;

const markX = (CW - markW) / 2, markY = top;
const wordX = (CW - wordW) / 2;
const nY = markY + markH + markGap;
const fY = nY + nH + lineGap;

// timing: mark draws & fills, then the two words rise in just after, staggered
const mark = fullMark();
const nightscout = wordPart(NIGHTSCOUT, { color: BRAND.ink,   start: +(mark.fillEnd - 0.1).toFixed(2), dur: 0.7 });
const foundation = wordPart(FOUNDATION, { color: BRAND.green, start: +(mark.fillEnd + 0.06).toFixed(2), dur: 0.7 });

write('NS-endcard.svg', compose({
  width: CW, height: CH, label: 'Nightscout Foundation',
  children: [
    { part: mark,       x: markX, y: markY, w: markW, h: markH },
    { part: nightscout, x: wordX, y: nY,    w: wordW, h: nH },
    { part: foundation, x: wordX, y: fY,    w: wordW, h: fH },
  ],
}));

console.log('[build] done');
