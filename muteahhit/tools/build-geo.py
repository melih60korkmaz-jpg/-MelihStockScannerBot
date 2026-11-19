#!/usr/bin/env python3
"""
81 il + 973 ilçe sınırlarını oyun için sadeleştirip src/data/geo/ altına yazar.
Kaynak: geoBoundaries gbOpen TUR ADM1/ADM2 (CC BY 4.0, https://www.geoboundaries.org) — lisans gereği atıf README'dedir.
Kullanım: python3 tools/build-geo.py <adm1.geojson> <adm2.geojson>
Projeksiyon: eşdikdörtgen (cos 39°); koordinatlar ×10 tamsayı, SVG yolu göreli ('M x y l dx dy …z').
"""
import json, math, sys, re, unicodedata

K = 100.0           # derece başına birim (×10 depolanır)
LON0, LAT0 = 25.5, 42.3
COS = math.cos(math.radians(39.0))

def proj(lon, lat): return ((lon - LON0) * COS * K, (LAT0 - lat) * K)

def slug(s):
    s = s.replace('ı', 'i').replace('İ', 'i').replace('I', 'i')
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def dp(pts, tol):
    if len(pts) < 4: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; L = dx * dx + dy * dy; md = -1; mi = -1
        for i in range(a + 1, b):
            px, py = pts[i]
            d = math.hypot(px - ax, py - ay) if L == 0 else abs(dy * px - dx * py + bx * ay - by * ax) / math.sqrt(L)
            if d > md: md, mi = d, i
        if md > tol: keep[mi] = True; stack += [(a, mi), (mi, b)]
    return [p for p, k in zip(pts, keep) if k]

def area(r): return 0.5 * sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))
def centroid(rings):
    A = cx = cy = 0.0
    for r in rings:
        a = area(r)
        if a == 0: continue
        for i in range(len(r)):
            x0, y0 = r[i]; x1, y1 = r[(i + 1) % len(r)]; f = x0 * y1 - x1 * y0; cx += (x0 + x1) * f; cy += (y0 + y1) * f
        A += a
    return (cx / (6 * A), cy / (6 * A)) if A else (rings[0][0][0], rings[0][0][1])

def polys(g): return [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']

def simplify_geom(g, tol, min_area):
    out = []
    for poly in polys(g):
        ring = [proj(x, y) for x, y in poly[0]]
        if abs(area(ring)) < min_area: continue
        r = dp(ring[:-1] if ring[0] == ring[-1] else ring, tol)
        if len(r) >= 3: out.append(r)
    if not out:  # hepsi çok küçükse en büyüğünü tut
        best = max(polys(g), key=lambda p: abs(area([proj(x, y) for x, y in p[0]])))
        ring = [proj(x, y) for x, y in best[0]]; out = [dp(ring[:-1], tol)]
    return out

def path(rings):
    s = ''
    for r in rings:
        pts = [(round(x * 10), round(y * 10)) for x, y in r]
        s += f"M{pts[0][0]} {pts[0][1]}l" + ' '.join(f"{pts[i][0]-pts[i-1][0]} {pts[i][1]-pts[i-1][1]}" for i in range(1, len(pts))) + 'z'
    return s

def pip(pt, ring):
    x, y = pt; inside = False
    for i in range(len(ring)):
        x0, y0 = ring[i]; x1, y1 = ring[(i + 1) % len(ring)]
        if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0: inside = not inside
    return inside

adm1 = json.load(open(sys.argv[1]))['features']; adm2 = json.load(open(sys.argv[2]))['features']
provs = []
for f in adm1:
    pl = f['properties']['shapeISO'].split('-')[1]
    full = [[proj(x, y) for x, y in poly[0]] for poly in polys(f['geometry'])]
    rings = simplify_geom(f['geometry'], 0.55, 1.5)
    cx, cy = centroid(full)
    allpts = [p for r in rings for p in r]
    prov_area_km2 = sum(abs(area(r)) for r in full) * (111.0 / K) ** 2
    provs.append(dict(id=slug(f['properties']['shapeName']), plate=pl, name=f['properties']['shapeName'], path=path(rings), cx=round(cx * 10), cy=round(cy * 10),
                      bbox=[round(min(p[0] for p in allpts) * 10), round(min(p[1] for p in allpts) * 10), round(max(p[0] for p in allpts) * 10), round(max(p[1] for p in allpts) * 10)], areaKm2=round(prov_area_km2), _full=full))
dists = {p['id']: [] for p in provs}
unmatched = 0
for f in adm2:
    full = [[proj(x, y) for x, y in poly[0]] for poly in polys(f['geometry'])]
    cx, cy = centroid(full)
    owner = None
    for p in provs:  # temsilî nokta: merkez, yoksa en büyük halkanın ilk köşesi
        if any(pip((cx, cy), r) for r in p['_full']): owner = p; break
    if owner is None:
        big = max(full, key=lambda r: abs(area(r)))
        for p in provs:
            if any(pip(big[len(big) // 2], r) for r in p['_full']): owner = p; break
    if owner is None:
        owner = min(provs, key=lambda p: (p['cx'] / 10 - cx) ** 2 + (p['cy'] / 10 - cy) ** 2); unmatched += 1
    rings = simplify_geom(f['geometry'], 0.3, 0.08)
    km2 = sum(abs(area(r)) for r in full) * (111.0 / K) ** 2
    dists[owner['id']].append(dict(name=f['properties']['shapeName'], path=path(rings), cx=round(cx * 10), cy=round(cy * 10), a=round(km2)))
# ilçe kimlikleri (il içinde benzersiz slug)
for pid, ds in dists.items():
    seen = {}
    for d in sorted(ds, key=lambda d: d['name']):
        s = slug(d['name']) or 'ilce'; seen[s] = seen.get(s, 0) + 1; d['id'] = s if seen[s] == 1 else f"{s}-{seen[s]}"
    ds.sort(key=lambda d: d['name'])
for p in provs: del p['_full']
provs.sort(key=lambda p: p['plate'])
json.dump(provs, open('src/data/geo/provinces.json', 'w'), ensure_ascii=False, separators=(',', ':'))
json.dump(dists, open('src/data/geo/districts.json', 'w'), ensure_ascii=False, separators=(',', ':'))
import os
print('il', len(provs), 'ilçe', sum(len(v) for v in dists.values()), 'eşleşmeyen', unmatched, '| boyut KB', os.path.getsize('src/data/geo/provinces.json') // 1024, os.path.getsize('src/data/geo/districts.json') // 1024)
print('en çok ilçe:', sorted(((len(v), k) for k, v in dists.items()), reverse=True)[:4], '| ilçesiz:', [k for k, v in dists.items() if not v])
