#!/usr/bin/env python3
"""
extract.py — trace the Nightscout source PNGs into vector path JSON.

Run once (or when the source art changes) to (re)generate:
    src/paths/mark.json         the owl-pin mark
    src/paths/nightscout.json   the "NIGHTSCOUT" word
    src/paths/foundation.json   the "FOUNDATION" word

The JS build (src/build.mjs) reads only these JSONs, so Python/potrace are NOT
needed to compose or render — only to re-trace.

    pip install pillow numpy potracer
    python src/extract.py

Polarity note: potracer fills the *complement* of the True pixels in SVG's y-down
space, so we trace ~mask (the background). A plain fill-rule:evenodd then renders
the ink correctly, with no wrapper rectangle. See references/mark.md.
"""
from PIL import Image
import numpy as np
import potrace, json, os

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.normpath(os.path.join(HERE, "..", "..", "..",
      "Website", "registration", "images"))
OUT = os.path.join(HERE, "paths")
os.makedirs(OUT, exist_ok=True)

# Source images and the x-column where the wordmark text starts (past the owl).
NS_PNG = os.path.join(IMG, "NS.png")
NSF_TEXT_PNG = os.path.join(IMG, "NSF-Text.png")
WORDMARK_TEXT_X = 1300


def trace_contours(mask, turd=4, opt=0.35):
    """Trace the INVERTED mask; return [{d, minY, area}] (SVG path data)."""
    bmp = potrace.Bitmap(~mask)
    path = bmp.trace(turdsize=turd, opttolerance=opt, alphamax=1.0)
    out = []
    for curve in path:
        sp = curve.start_point
        d = [f"M{sp.x:.2f},{sp.y:.2f}"]
        ys = [sp.y]
        pts = [(sp.x, sp.y)]
        for seg in curve:
            if seg.is_corner:
                d.append(f"L{seg.c.x:.2f},{seg.c.y:.2f}L{seg.end_point.x:.2f},{seg.end_point.y:.2f}")
                ys += [seg.c.y, seg.end_point.y]
                pts += [(seg.c.x, seg.c.y), (seg.end_point.x, seg.end_point.y)]
            else:
                d.append(f"C{seg.c1.x:.2f},{seg.c1.y:.2f} {seg.c2.x:.2f},{seg.c2.y:.2f} {seg.end_point.x:.2f},{seg.end_point.y:.2f}")
                ys.append(seg.end_point.y)
                pts.append((seg.end_point.x, seg.end_point.y))
        d.append("Z")
        a = np.array(pts)
        area = 0.5 * abs(np.dot(a[:, 0], np.roll(a[:, 1], -1)) - np.dot(a[:, 1], np.roll(a[:, 0], -1)))
        out.append({"d": "".join(d), "minY": round(float(min(ys)), 1), "area": round(float(area), 1)})
    return out


def ink_mask(path, crop_x=None):
    im = Image.open(path).convert("RGBA")
    m = np.array(im)[..., 3] > 128
    return m[:, crop_x:] if crop_x is not None else m


def crop_to_ink(mask):
    ys, xs = np.where(mask)
    return mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def resize_mask(mask, target_w):
    h, w = mask.shape
    im = Image.fromarray((mask * 255).astype("uint8")).resize((target_w, round(h * target_w / w)), Image.LANCZOS)
    return np.array(im) > 128, im.size


def dump(name, viewBox, contours, extra=None):
    obj = {"viewBox": list(viewBox), "contours": contours}
    if extra:
        obj.update(extra)
    json.dump(obj, open(os.path.join(OUT, f"{name}.json"), "w"))
    print(f"  {name}: {len(contours)} contours  viewBox={viewBox[2:]}")


def main():
    # ---- mark ----
    m = crop_to_ink(ink_mask(NS_PNG))
    m, (W, H) = resize_mask(m, 700)
    dump("mark", [0, 0, W, H], trace_contours(m, turd=8, opt=0.4))

    # ---- wordmark: split into the two text lines on the blank row between them ----
    text = crop_to_ink(ink_mask(NSF_TEXT_PNG, crop_x=WORDMARK_TEXT_X))
    rows = text.sum(1)
    H0 = text.shape[0]
    runs, s = [], None
    for i in range(H0):
        if rows[i] == 0:
            s = i if s is None else s
        elif s is not None:
            runs.append((s, i, i - s)); s = None
    gaps = [r for r in runs if r[2] > 8 and 0.2 * H0 < r[0] < 0.8 * H0]
    split = (gaps[0][0] + gaps[0][1]) // 2 if gaps else H0 // 2

    for name, sub in [("nightscout", text[:split, :]), ("foundation", text[split:, :])]:
        mm, (W, H) = resize_mask(crop_to_ink(sub), 1400)
        dump(name, [0, 0, W, H], trace_contours(mm, turd=4, opt=0.3))


if __name__ == "__main__":
    print(f"[extract] source: {IMG}")
    main()
    print("[extract] done ->", OUT)
