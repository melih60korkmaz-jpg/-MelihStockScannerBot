"""İlçe sınırlarını oyunun il haritasıyla aynı koordinat sisteminde üretir.
Girdi: github.com/Pinlyx/turkiye-il-ilce data/{iller,ilceler}.geojson (ODbL; © OpenStreetMap contributors, Overture Maps Foundation)
Çıktı: src/data/districts.json  (il komşulukları + ilçe yolları + ilçe komşulukları)
Kullanım: python3 scripts/build-districts.py <veri-klasörü>"""
import json, re, sys
from shapely.geometry import shape, MultiPolygon, Polygon
from shapely import coverage_simplify
from shapely.affinity import affine_transform
from shapely.ops import unary_union
D = sys.argv[1]
prov = json.load(open('src/data/provinces.json'))['iller']
il = {f['properties']['plaka']: shape(f['geometry']) for f in json.load(open(f'{D}/iller.geojson'))['features']}
feats = json.load(open(f'{D}/ilceler.geojson'))['features']
def pbox(path):
    n = [float(v) for v in re.findall(r'-?\d+\.?\d*', path)]; xs, ys = n[0::2], n[1::2]; return min(xs), max(xs), min(ys), max(ys)
# il bazında: lon/lat kutusu -> oyun haritasındaki il kutusu (ayrı x/y ölçek)
tf = {}
for p in prov:
    g = il[p['id']]; x0, y0, x1, y1 = g.bounds; a, b, c, d = pbox(p['path'])
    sx, sy = (b - a) / (x1 - x0), (c - d) / (y1 - y0)       # y ters
    tf[p['id']] = [sx, 0, 0, sy, a - sx * x0, d - sy * y0]
# il komşulukları
ids = sorted(il); kom = {i: [] for i in ids}
for i in ids:
    for j in ids:
        if i < j and il[i].buffer(0.01).intersects(il[j]): kom[i].append(j); kom[j].append(i)
groups = {}
for f in feats: groups.setdefault(f['properties']['plaka'], []).append(f)
out, allg = [], []
for pid in ids:
    fs = groups[pid]; geoms = [shape(f['geometry']).buffer(0) for f in fs]
    try: simp = list(coverage_simplify(geoms, 0.0035 * max(il[pid].bounds[2] - il[pid].bounds[0], il[pid].bounds[3] - il[pid].bounds[1])))
    except Exception: simp = geoms
    for f, g0, g in zip(fs, geoms, simp):
        gt = affine_transform(g, tf[pid]); polys = list(gt.geoms) if isinstance(gt, MultiPolygon) else [gt]
        polys = [q for q in polys if q.area > 0.02]
        if not polys: polys = [max(list(gt.geoms) if isinstance(gt, MultiPolygon) else [gt], key=lambda q: q.area)]
        d = ''
        for q in polys:
            c = list(q.exterior.coords)
            d += 'M' + 'L'.join(f'{x:.2f} {y:.2f}' for x, y in c[:-1]) + 'Z'
        cen = affine_transform(g0, tf[pid]).representative_point()
        out.append({'p': pid, 'a': f['properties']['ilce'], 'd': d, 'c': [round(cen.x, 2), round(cen.y, 2)], 'm2': round(g0.area * 111 * 85, 1)})
        allg.append(g0)
# ilçe komşulukları (ilçe dizini)
from shapely.strtree import STRtree
tree = STRtree(allg); nb = []
for i, g in enumerate(allg):
    hits = [int(j) for j in tree.query(g.buffer(0.004)) if j != i and allg[int(j)].intersects(g.buffer(0.004))]; nb.append(sorted(hits))
# deniz/boğaz ayırdığı ilçeleri (Boğaz, adalar) il içinde bağla: kopuk bileşenleri en yakın çiftle birleştir
byp = {}
for i, o in enumerate(out): byp.setdefault(o['p'], []).append(i)
for pid, idx in byp.items():
    while True:
        seen, comps = set(), []
        for s0 in idx:
            if s0 in seen: continue
            comp, st = set(), [s0]
            while st:
                x = st.pop()
                if x in comp: continue
                comp.add(x); st += [y for y in nb[x] if y in byp[pid] and y not in comp]
            seen |= comp; comps.append(comp)
        if len(comps) <= 1: break
        best = None
        for ci in range(1, len(comps)):
            for a_ in comps[0]:
                for b_ in comps[ci]:
                    d_ = allg[a_].distance(allg[b_])
                    if best is None or d_ < best[0]: best = (d_, a_, b_)
        _, a_, b_ = best; nb[a_] = sorted(set(nb[a_]) | {b_}); nb[b_] = sorted(set(nb[b_]) | {a_})
for i, o in enumerate(out): o['n'] = nb[i]
keys = [f"{o['p']}:{o['a']}" for o in out]; assert len(set(keys)) == len(keys), 'tekrar eden ilçe adı'
json.dump({'komsu': {str(k): v for k, v in kom.items()}, 'ilce': out}, open('src/data/districts.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'ilçe', sum(len(o['d']) for o in out) // 1024, 'KB yol')
