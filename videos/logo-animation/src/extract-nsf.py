#!/usr/bin/env python3
"""
extract-nsf.py — flatten Website/registration/images/NSF.svg (the full PCB
Foundation logo) into absolute-coordinate path data for the animation.

NSF.svg is already clean vector art (each shape is a <path>/<rect> inside a
<g transform="matrix(...)">, fill-rule:nonzero). We don't trace it — we just
bake the group transforms into the coordinates and record per-contour geometry
(minY for stagger order, length for pen-speed timing).

    python src/extract-nsf.py   ->   src/paths/mark-full.json

Output schema (consumed by src/parts.mjs):
    { viewBox:[x,y,w,h], fill:"separate-nonzero",
      contours:[ {d, minY, area, len, fillRule}, ... ] }
"""
import re, json, os, math

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..",
      "Website", "registration", "images", "NSF.svg"))
OUT = os.path.join(HERE, "paths", "mark-full.json")

svg = open(SRC, encoding="utf-8").read()

def parse_matrix(g):
    m = re.search(r"matrix\(([^)]+)\)", g)
    if not m:
        return (1, 0, 0, 1, 0, 0)
    return tuple(float(v) for v in re.split(r"[,\s]+", m.group(1).strip()))

def apply(mat, x, y):
    a, b, c, d, e, f = mat
    return (a * x + c * y + e, b * x + d * y + f)

def rect_to_pts(x, y, w, h):
    return [("M", x, y), ("L", x + w, y), ("L", x + w, y + h), ("L", x, y + h), ("Z",)]

TOK = re.compile(r"[MLCHVZmlchvz]|-?\d*\.?\d+(?:e-?\d+)?")

def path_to_pts(d):
    """Return list of drawing ops as absolute (cmd, *coords) using only M/L/C/Z."""
    t = TOK.findall(d)
    i = 0
    cur = (0.0, 0.0); start = (0.0, 0.0); ops = []
    def num():
        nonlocal i; v = float(t[i]); i += 1; return v
    while i < len(t):
        c = t[i]; i += 1
        rel = c.islower(); C = c.upper()
        if C == "M":
            x = num(); y = num()
            if rel: x += cur[0]; y += cur[1]
            cur = (x, y); start = cur; ops.append(("M", x, y))
            # subsequent implicit L
            while i < len(t) and not t[i][-1].isalpha():
                x = num(); y = num()
                if rel: x += cur[0]; y += cur[1]
                cur = (x, y); ops.append(("L", x, y))
        elif C == "L":
            while i < len(t) and not t[i][-1].isalpha():
                x = num(); y = num()
                if rel: x += cur[0]; y += cur[1]
                cur = (x, y); ops.append(("L", x, y))
        elif C == "H":
            while i < len(t) and not t[i][-1].isalpha():
                x = num(); x = x + cur[0] if rel else x
                cur = (x, cur[1]); ops.append(("L", cur[0], cur[1]))
        elif C == "V":
            while i < len(t) and not t[i][-1].isalpha():
                y = num(); y = y + cur[1] if rel else y
                cur = (cur[0], y); ops.append(("L", cur[0], cur[1]))
        elif C == "C":
            while i < len(t) and not t[i][-1].isalpha():
                x1 = num(); y1 = num(); x2 = num(); y2 = num(); x = num(); y = num()
                if rel:
                    x1 += cur[0]; y1 += cur[1]; x2 += cur[0]; y2 += cur[1]; x += cur[0]; y += cur[1]
                ops.append(("C", x1, y1, x2, y2, x, y)); cur = (x, y)
        elif C == "Z":
            ops.append(("Z",)); cur = start
    return ops

def transform_ops(ops, mat):
    out = []
    for op in ops:
        if op[0] == "Z":
            out.append(("Z",))
        elif op[0] in ("M", "L"):
            out.append((op[0], *apply(mat, op[1], op[2])))
        elif op[0] == "C":
            x1, y1 = apply(mat, op[1], op[2]); x2, y2 = apply(mat, op[3], op[4]); x, y = apply(mat, op[5], op[6])
            out.append(("C", x1, y1, x2, y2, x, y))
    return out

def ops_to_d(ops):
    s = []
    for op in ops:
        if op[0] == "Z": s.append("Z")
        elif op[0] == "M": s.append(f"M{op[1]:.2f},{op[2]:.2f}")
        elif op[0] == "L": s.append(f"L{op[1]:.2f},{op[2]:.2f}")
        elif op[0] == "C": s.append(f"C{op[1]:.2f},{op[2]:.2f} {op[3]:.2f},{op[4]:.2f} {op[5]:.2f},{op[6]:.2f}")
    return "".join(s)

def flatten(ops, n=16):
    """Polyline points for length/minY/area."""
    pts = []; cur = (0, 0); start = (0, 0)
    for op in ops:
        if op[0] == "M": cur = (op[1], op[2]); start = cur; pts.append(cur)
        elif op[0] == "L": cur = (op[1], op[2]); pts.append(cur)
        elif op[0] == "C":
            p0 = cur
            for k in range(1, n + 1):
                tt = k / n; u = 1 - tt
                x = u*u*u*p0[0] + 3*u*u*tt*op[1] + 3*u*tt*tt*op[3] + tt*tt*tt*op[5]
                y = u*u*u*p0[1] + 3*u*u*tt*op[2] + 3*u*tt*tt*op[4] + tt*tt*tt*op[6]
                pts.append((x, y))
            cur = (op[5], op[6])
        elif op[0] == "Z": pts.append(start); cur = start
    return pts

# ---- walk the <g> blocks ----
contours = []
allpts = []
for gm in re.finditer(r"<g\b[^>]*transform=\"([^\"]*)\"[^>]*>(.*?)</g>", svg, re.S):
    mat = parse_matrix(gm.group(1)); inner = gm.group(2)
    pm = re.search(r"<path\b[^>]*\bd=\"([^\"]+)\"", inner)
    rm = re.search(r"<rect\b[^>]*/?>", inner)
    if pm:
        ops = path_to_pts(pm.group(1))
    elif rm:
        gv = lambda a: float(re.search(a + r'="([-\d.]+)"', rm.group(0)).group(1))
        ops = [(o[0], *o[1:]) for o in
               [("M", *([gv("x"), gv("y")][:2]))]]  # placeholder, rebuilt below
        x, y, w, h = gv("x"), gv("y"), gv("width"), gv("height")
        ops = []
        pts = rect_to_pts(x, y, w, h)
        cur = None
        for p in pts:
            if p[0] == "M": ops.append(("M", p[1], p[2]))
            elif p[0] == "L": ops.append(("L", p[1], p[2]))
            elif p[0] == "Z": ops.append(("Z",))
    else:
        continue
    tops = transform_ops(ops, mat)
    pts = flatten(tops)
    if len(pts) < 2:
        continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    length = sum(math.hypot(pts[i+1][0]-pts[i][0], pts[i+1][1]-pts[i][1]) for i in range(len(pts)-1))
    a = 0.0
    for i in range(len(pts)):
        x1, y1 = pts[i]; x2, y2 = pts[(i+1) % len(pts)]
        a += x1*y2 - x2*y1
    contours.append({"d": ops_to_d(tops), "minY": round(min(ys), 1),
                     "area": round(abs(a)/2, 1), "len": round(length, 1), "fillRule": "nonzero"})
    allpts += pts

xs = [p[0] for p in allpts]; ys = [p[1] for p in allpts]
pad = 4
vb = [round(min(xs)-pad, 1), round(min(ys)-pad, 1),
      round(max(xs)-min(xs)+2*pad, 1), round(max(ys)-min(ys)+2*pad, 1)]
json.dump({"viewBox": vb, "fill": "separate-nonzero", "contours": contours},
          open(OUT, "w"))
print(f"[extract-nsf] {len(contours)} contours  viewBox={vb}")
print(f"  length range: {min(c['len'] for c in contours):.0f} .. {max(c['len'] for c in contours):.0f}")
