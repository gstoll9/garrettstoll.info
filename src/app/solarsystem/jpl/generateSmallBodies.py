"""Build ../data/smallBodies.ts: the named small bodies from Wikipedia's "List of Solar System
objects" (saved at ../wikipedia/Lists/List_of_Solar_System_objects.html) that the scene
didn't already have.

Per body:
  * Wikipedia article (linked from the list; saved under ../wikipedia/SmallBodies/) ->
    mean diameter and geometric albedo from its infobox.
  * JPL SBDB record (https://ssd-api.jpl.nasa.gov/sbdb.api, full precision; saved under
    smallbodies/) -> osculating heliocentric ecliptic J2000 elements and epoch. Orbits come
    from JPL rather than the infobox because they're precise and machine-readable; the
    infobox values are cross-checked (semimajor axis) and any disagreement is printed.
  * If the infobox has no usable diameter, SBDB's physical-parameter diameter is used.

Run:  python -I generateSmallBodies.py   (fetches anything not cached yet)
"""
import html
import json
import os
import re
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
WIKI_DIR = os.path.join(HERE, '..', 'wikipedia', 'SmallBodies')
SBDB_DIR = os.path.join(HERE, 'smallbodies')
OUT = os.path.join(HERE, '..', 'data', 'smallBodies.ts')
UA = {'User-Agent': 'garrettstoll.info solar-system data build (garrettstoll@gmail.com)'}

# (display name, SBDB designation, Wikipedia title, category) in the list page's order
BODIES = [
    ('Zoozve', '524522', '524522_Zoozve', 'near-earth'),
    ('2021 PH27', '2021 PH27', '2021_PH27', 'near-earth'),
    ('Apophis', '99942', '99942_Apophis', 'near-earth'),
    ('Eros', '433', '433_Eros', 'near-earth'),
    ('2010 TK7', '2010 TK7', '2010_TK7', 'trojan'),
    ('Eureka', '5261', '5261_Eureka', 'trojan'),
    ('2019 UO14', '2019 UO14', '2019_UO14', 'trojan'),
    ('2011 QF99', '2011 QF99', '2011_QF99', 'trojan'),
    ('Chiron', '2060', '2060_Chiron', 'centaur'),
    ('Chariklo', '10199', '10199_Chariklo', 'centaur'),
    ('Pholus', '5145', '5145_Pholus', 'centaur'),
    ('Orcus', '90482', 'Orcus_(dwarf_planet)', 'dwarf'),
    ('Quaoar', '50000', 'Quaoar', 'dwarf'),
    ('Gonggong', '225088', 'Gonggong_(dwarf_planet)', 'dwarf'),
    ('Sedna', '90377', 'Sedna_(dwarf_planet)', 'dwarf'),
    ('Ixion', '28978', '28978_Ixion', 'kuiper'),
    ('Achlys', '208996', '208996_Achlys', 'kuiper'),
    ('Lempo', '47171', '47171_Lempo', 'kuiper'),
    ('Huya', '38628', '38628_Huya', 'kuiper'),
    ('Xewioso', '78799', '78799_Xewioso', 'kuiper'),
    ('Máni', '307261', '307261_Máni', 'kuiper'),
    ('Salacia', '120347', '120347_Salacia', 'kuiper'),
    ('Aya', '55565', '55565_Aya', 'kuiper'),
    ('Varda', '174567', '174567_Varda', 'kuiper'),
    ('Varuna', '20000', '20000_Varuna', 'kuiper'),
    ('Goibniu', '90568', '90568_Goibniu', 'kuiper'),
    ('Ritona', '145452', '145452_Ritona', 'kuiper'),
    ('Chaos', '19521', '19521_Chaos', 'kuiper'),
    ('Logos', '58534', '58534_Logos', 'kuiper'),
    ('Deucalion', '53311', '53311_Deucalion', 'kuiper'),
    ('Teharonhiawako', '88611', '88611_Teharonhiawako', 'kuiper'),
    ('Borasisi', '66652', '66652_Borasisi', 'kuiper'),
    ('Uni', '55637', '55637_Uni', 'kuiper'),
    ('Arrokoth', '486958', '486958_Arrokoth', 'kuiper'),
    ('Chiminigagua', '532037', '532037_Chiminigagua', 'scattered'),
    ('Gǃkúnǁʼhòmdímà', '229762', '229762_Gǃkúnǁʼhòmdímà', 'scattered'),
    ('2010 JO179', '574372', '(574372)_2010_JO179', 'scattered'),
    ('2002 TC302', '84522', '(84522)_2002_TC302', 'scattered'),
    ('2003 QX113', '612584', '(612584)_2003_QX113', 'scattered'),
    ('2000 OO67', '87269', '(87269)_2000_OO67', 'scattered'),
    ('2015 TH367', '2015 TH367', '2015_TH367', 'scattered'),
    ('Rumina', '145451', '145451_Rumina', 'scattered'),
    ('2014 UZ224', '2014 UZ224', '2014_UZ224', 'scattered'),
    ('2004 XR190', '612911', '(612911)_2004_XR190', 'detached'),
    ('2017 OF201', '2017 OF201', '2017_OF201', 'detached'),
    ('2012 VP113', '2012 VP113', '2012_VP113', 'detached'),
]


def safe(name):
    return re.sub(r'[^\w.()-]+', '_', name)


def cached_get(url, path):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        open(path, 'wb').write(data)
    return open(path, encoding='utf-8').read()


def wiki_html(title):
    url = 'https://en.wikipedia.org/api/rest_v1/page/html/' + urllib.parse.quote(title, safe='')
    return cached_get(url, os.path.join(WIKI_DIR, safe(title) + '.html'))


def sbdb(des):
    q = urllib.parse.urlencode({'sstr': des, 'phys-par': 1, 'full-prec': 1})
    return json.loads(cached_get('https://ssd-api.jpl.nasa.gov/sbdb.api?' + q, os.path.join(SBDB_DIR, safe(des) + '.json')))


def infobox_rows(page):
    m = re.search(r'<table[^>]*class="[^"]*infobox[^"]*"[^>]*>(.*?)</table>', page, re.S)
    if not m:
        return {}
    rows = {}
    for tr in re.findall(r'<tr[^>]*>(.*?)</tr>', m.group(1), re.S):
        th = re.search(r'<th[^>]*>(.*?)</th>', tr, re.S)
        td = re.search(r'<td[^>]*>(.*?)</td>', tr, re.S)
        if th and td:
            clean = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<style.*?</style>|<sup.*?</sup>|<[^>]+>', ' ', s, flags=re.S))).strip()
            rows.setdefault(clean(th.group(1)).lower(), clean(td.group(1)))
    return rows


def first_number(s):
    s = s.replace('\u2009', '').replace('\xa0', ' ')
    # Wikipedia digit grouping often renders as "1 115 .7" (spans split by spaces)
    s = re.sub(r'(?<=\d) (?=\d{3}\b)', '', s)
    s = re.sub(r'(?<=\d) \.(?=\d)', '.', s)
    m = re.search(r'(\d[\d,]*\.?\d*|\.\d+)', s)
    return float(m.group(1).replace(',', '')) if m else None


def diameter_km(rows):
    for key in ('mean diameter', 'diameter', 'dimensions', 'mean radius'):
        for k, v in rows.items():
            if k.startswith(key) and re.search(r'\b(km|m)\b', v):
                n = first_number(v)
                if n:
                    if not re.search(r'\bkm\b', v):
                        n /= 1000  # metres
                    return n * 2 if 'radius' in key else n
    return None


def albedo(rows):
    for k, v in rows.items():
        if 'albedo' in k:
            n = first_number(v)
            if n is not None and n <= 2:
                return n
    return None


def semimajor_au(rows):
    for k, v in rows.items():
        if k.startswith('semi-major axis') and 'au' in v.lower():
            return first_number(v)
    return None


def main():
    import sys
    sys.stdout.reconfigure(encoding='utf-8')
    out = []
    for name, des, title, category in BODIES:
        page = wiki_html(title)
        rows = infobox_rows(page)
        rec = sbdb(des)
        el = {e['name']: e['value'] for e in rec['orbit']['elements']}
        phys = {p['name']: p['value'] for p in rec.get('phys_par', [])}
        d_wiki = diameter_km(rows)
        d = d_wiki or (float(phys['diameter']) if phys.get('diameter') else None)
        p_wiki = albedo(rows)
        p = p_wiki if p_wiki is not None else (float(phys['albedo']) if phys.get('albedo') else None)
        a = float(el['a'])
        a_wiki = semimajor_au(rows)
        flag = '' if a_wiki is None or abs(a_wiki - a) / a < 0.02 else f'  !! infobox a={a_wiki} vs SBDB {a:.3f}'
        print(f'{name:16s} D={d} km ({"wiki" if d_wiki else "sbdb" if d else "none"})  p={p}  a={a:.2f} AU{flag}')
        out.append({
            'name': name,
            'designation': rec['object']['fullname'],
            'category': category,
            'wikipedia': title,
            'diameterKm': d,
            'albedo': p,
            'a': a,
            'e': float(el['e']),
            'i': float(el['i']),
            'node': float(el['om']),
            'peri': float(el['w']),
            'meanAnomaly': float(el['ma']),
            'epochJd': float(rec['orbit']['epoch']),
        })

    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('''// GENERATED by solarsystem/jpl/generateSmallBodies.py — do not hand-edit; regenerate instead.
//
// Named small bodies from Wikipedia's "List of Solar System objects" that the scene didn't
// already have. Diameter / albedo from each body's Wikipedia infobox (saved under
// solarsystem/wikipedia/SmallBodies/; SBDB fallback where the infobox has none); orbital
// elements (heliocentric ecliptic J2000, AU / deg) from the JPL Small-Body Database (saved
// under solarsystem/jpl/smallbodies/). Positioned from `epochJd` by data/smallBodies.ts's
// consumers via the epoch-anchored Kepler branch of orbitalPosition().

export type SmallBodyCategory = 'near-earth' | 'trojan' | 'centaur' | 'dwarf' | 'kuiper' | 'scattered' | 'detached';

export type SmallBodyRecord = {
  name: string;
  designation: string;
  category: SmallBodyCategory;
  wikipedia: string;
  diameterKm: number | null;
  albedo: number | null;
  a: number; e: number; i: number; node: number; peri: number; meanAnomaly: number;
  epochJd: number;
};

export const smallBodyRecords: SmallBodyRecord[] = [
''')
        for b in out:
            f.write('  ' + json.dumps(b, ensure_ascii=False) + ',\n')
        f.write('];\n')
    print(f'wrote {len(out)} bodies -> {OUT}')


if __name__ == '__main__':
    main()
