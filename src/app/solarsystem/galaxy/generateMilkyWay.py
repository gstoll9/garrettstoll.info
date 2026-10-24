"""Build ../data/milkyWay.ts: the Milky Way model's measured spiral arms and the catalogued
objects placed inside it.

Spiral arms: the log-periodic arm fits of Reid et al. 2019 (ApJ 885, 131, "Trigonometric
Parallaxes of High-Mass Star Forming Regions: Our View of the Milky Way"), Table 2, parsed
straight from the paper's arXiv TeX source saved at ../literature/reid2019/Reid_arXiv.tex.
Each arm: ln(R / R_kink) = -(beta - beta_kink) tan(psi), with psi_< / psi_> either side of
the kink, plus the arm's Gaussian width at R_kink and the azimuth range its masers cover.

Objects: every row with a sky position and a distance from the saved Wikipedia lists under
../wikipedia/Galaxy/Lists/ (reached from "Lists of astronomical objects"):
  globular clusters, open clusters, supernova remnants (Milky Way rows), nearest known black
  holes, neutron stars, star-forming regions, Messier nebulae (planetary / diffuse / H II —
  Messier clusters and remnants come from the dedicated lists instead), nearest stars.
Each object is written as RA/Dec (deg, J2000) + distance (kpc); utils.tsx converts to the
galactocentric frame the rest of the page uses.

Run:  python -I generateMilkyWay.py
"""
import html
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LISTS = os.path.join(HERE, '..', 'wikipedia', 'Galaxy', 'Lists')
REID_TEX = os.path.join(HERE, '..', 'literature', 'reid2019', 'Reid_arXiv.tex')
OUT = os.path.join(HERE, '..', 'data', 'milkyWay.ts')
LY_PER_KPC = 3261.56

sys.stdout.reconfigure(encoding='utf-8')


# ── Reid 2019 Table 2 ───────────────────────────────────────────────────────

def tex_number(s):
    s = s.replace('\\p', '').replace('$', '').replace('~', '').strip()
    m = re.match(r'^(-?\d+(?:\.\d+)?)', s)
    return float(m.group(1)) if m else None


def parse_arms():
    tex = open(REID_TEX, encoding='utf-8', errors='replace').read()
    start = tex.index('Spiral Arm Characteristics')
    body = tex[tex.index('\\startdata', start) + len('\\startdata'):tex.index('\\enddata', start)]
    arms = []
    for line in body.strip().split('\\\\'):
        cols = [c.strip() for c in line.split('&')]
        if len(cols) < 9 or not cols[0]:
            continue
        lo, hi = [tex_number(x) for x in cols[3].split('\\rightarrow')]
        arms.append({
            'name': cols[0], 'betaMin': lo, 'betaMax': hi,
            'betaKink': tex_number(cols[4]), 'rKink': tex_number(cols[5]),
            'pitchBelow': tex_number(cols[6]), 'pitchAbove': tex_number(cols[7]),
            'width': tex_number(cols[8]),
        })
    return arms


# ── Wikipedia tables ────────────────────────────────────────────────────────

def strip(cell):
    cell = re.sub(r"data-mw='[^']*'", '', cell)
    cell = re.sub(r'data-mw="[^"]*"', '', cell)
    cell = re.sub(r'<style.*?</style>', '', cell, flags=re.S)
    cell = re.sub(r'<sup.*?</sup>', '', cell, flags=re.S)
    cell = re.sub(r'<span[^>]*display:\s*none[^>]*>.*?</span>', '', cell, flags=re.S)
    text = html.unescape(re.sub(r'<[^>]+>', ' ', cell)).replace('\xad', '')
    return re.sub(r'\s+', ' ', text).strip()


def tables(title):
    h = open(os.path.join(LISTS, title + '.html'), encoding='utf-8').read()
    h = re.sub(r"data-mw='[^']*'", '', h)
    out = []
    for tb in re.findall(r'<table[^>]*class="[^"]*wikitable[^"]*"[^>]*>(.*?)</table>', h, re.S):
        rows = []
        for r in re.findall(r'<tr[^>]*>(.*?)</tr>', tb, re.S):
            rows.append([strip(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.S)])
        out.append(rows)
    return out


def parse_ra(s):
    """'02 27 15', '04 26.9', '18h 08m 39.32s', '17 46 15.0' -> degrees"""
    nums = re.findall(r'\d+(?:\.\d+)?', s)
    if not nums:
        return None
    h = float(nums[0]) + (float(nums[1]) / 60 if len(nums) > 1 else 0) + (float(nums[2]) / 3600 if len(nums) > 2 else 0)
    return h * 15 if h < 24 else None


def parse_dec(s):
    s = s.replace('−', '-').replace('–', '-')
    neg = s.strip().startswith('-')
    nums = re.findall(r'\d+(?:\.\d+)?', s)
    if not nums:
        return None
    d = float(nums[0]) + (float(nums[1]) / 60 if len(nums) > 1 else 0) + (float(nums[2]) / 3600 if len(nums) > 2 else 0)
    return -d if neg else d


def parse_distance(s):
    """'4,570', '27,200-27,700' (mean), '1,560 ± 10', '~3,000' -> float, or None"""
    s = s.replace(',', '').replace('−', '-').replace('–', '-').replace('~', '').replace('≈', '')
    m = re.match(r'^\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?', s)
    if not m:
        return None
    a = float(m.group(1))
    return (a + float(m.group(2))) / 2 if m.group(2) else a


def col(header, *names):
    # headers carry soft-hyphen breaks ("Dis tan ce"), so compare with spaces removed
    for i, h in enumerate(header):
        hl = h.lower().replace(' ', '')
        if any(n.replace(' ', '') in hl for n in names):
            return i
    return None


def from_table(rows, kind, name_keys, dist_keys, dist_to_kpc, ra_keys=('right ascension', 'r. a.', 'ra'), dec_keys=('declination', 'dec'),
               header_rows=1, keep=lambda cells, header: True):
    header = rows[0]
    if header_rows == 2:
        # "Epoch J2000" spans RA/Dec on a second header row
        sub = rows[1]
        i = col(header, 'epoch')
        header = header[:i] + sub + header[i + 1:] if i is not None else header
    ni, di = col(header, *name_keys), col(header, *dist_keys)
    ri, ci = col(header, *ra_keys), col(header, *dec_keys)
    out, skipped = [], 0
    for cells in rows[header_rows:]:
        if len(cells) < len(header) - 1 or ni is None:
            skipped += 1
            continue
        try:
            if not keep(cells, header):
                continue
            name, ra, dec, dist = cells[ni], parse_ra(cells[ri]), parse_dec(cells[ci]), parse_distance(cells[di])
        except (IndexError, ValueError):
            skipped += 1
            continue
        if not name or ra is None or dec is None or not dist:
            skipped += 1
            continue
        out.append({'name': re.sub(r'\s+', ' ', name).strip(' *†‡$#'), 'kind': kind,
                    'ra': round(ra, 4), 'dec': round(dec, 4), 'distanceKpc': round(dist * dist_to_kpc, 4)})
    print(f'  {kind:20s} {len(out):4d} kept, {skipped} skipped')
    return out


def parse_objects():
    objs = []
    LY = 1 / LY_PER_KPC

    t = tables('List_of_globular_clusters')
    objs += from_table(t[0], 'globular cluster', ('identifier',), ('distance',), LY, header_rows=2)

    t = tables('List_of_open_clusters')
    objs += from_table(t[0], 'open cluster', ('cluster identifier', 'identifier'), ('distance',), LY, ra_keys=('r. a.',), dec_keys=('dec.',), header_rows=2)

    t = tables('List_of_supernova_remnants')
    objs += from_table(t[0], 'supernova remnant', ('name',), ('distance',), LY,
                       keep=lambda c, h: 'milky' in c[col(h, 'galaxy')].lower())

    t = tables('List_of_nearest_known_black_holes')
    rows = t[0]
    header = rows[1]  # second row carries the column names (ly, kpc, Designation, …)
    objs += from_table([header] + rows[2:], 'black hole', ('designation',), ('(kpc)',), 1.0)

    t = tables('List_of_neutron_stars')
    objs += from_table(t[0], 'neutron star', ('designation',), ('distance',), 1 / 1000)

    t = tables('List_of_star-forming_regions_in_the_Local_Group')
    rows = t[0]
    header = rows[0]
    ni, ri, di, dd = col(header, 'name'), col(header, 'ra'), col(header, 'dec'), col(header, 'distance')
    n = 0
    for c in rows[1:]:
        try:
            ra, dec, dist = float(c[ri]), float(c[di]), parse_distance(c[dd])
        except (ValueError, IndexError):
            continue
        if dist:
            objs.append({'name': c[ni], 'kind': 'star-forming region', 'ra': ra, 'dec': dec, 'distanceKpc': round(dist / 1000, 4)})
            n += 1
    print(f'  {"star-forming region":20s} {n:4d} kept')

    t = tables('List_of_Messier_objects')
    rows = t[0]
    header = rows[0]
    ti, di, ri, ci, ni, cni = col(header, 'object type'), col(header, 'distance'), col(header, 'right'), col(header, 'declination'), col(header, 'messier'), col(header, 'common')
    n = 0
    for c in rows[1:]:
        if len(c) < len(header):
            continue
        typ = c[ti].lower()
        if not any(k in typ for k in ('planetary', 'diffuse', 'h ii', 'nebula')) or 'remnant' in typ or 'galax' in typ:
            continue
        dist = parse_distance(c[di])
        ra, dec = parse_ra(c[ri]), parse_dec(c[ci])
        if not dist or ra is None or dec is None:
            continue
        common = c[cni] if c[cni] not in ('—', '-', '') else ''
        kind = 'planetary nebula' if 'planetary' in typ else 'nebula'
        objs.append({'name': f'{c[ni]} {common}'.strip(), 'kind': kind, 'ra': round(ra, 4), 'dec': round(dec, 4), 'distanceKpc': round(dist * 1000 / LY_PER_KPC, 4)})
        n += 1
    print(f'  {"messier nebulae":20s} {n:4d} kept')

    # nearest stars: RA/Dec share one cell ("14 29 43.0 −62 ° 40 ′ 46 ″"); a system's first
    # row also carries the system name and constellation, its other members' rows don't
    t = tables('List_of_nearest_stars')
    rows = t[1]
    coord_re = re.compile(r'^(\d+) (\d+) ([\d.]+) ([+−-])\s*(\d+) ° (\d+) ′ ([\d.]+) ″')
    n = 0
    for c in rows[2:]:
        idx = next((i for i, x in enumerate(c) if coord_re.match(x)), None)
        if idx not in (2, 4):
            continue
        name, dist = (c[1], c[2]) if idx == 4 else (c[0], c[1])
        dist = parse_distance(dist)
        m = coord_re.match(c[idx])
        if not dist or name.startswith('Sun'):
            continue
        ra = (int(m.group(1)) + int(m.group(2)) / 60 + float(m.group(3)) / 3600) * 15
        dec = (int(m.group(5)) + int(m.group(6)) / 60 + float(m.group(7)) / 3600) * (-1 if m.group(4) in '−-' else 1)
        objs.append({'name': re.sub(r'\s*\$$', '', name), 'kind': 'nearby star', 'ra': round(ra, 4), 'dec': round(dec, 4), 'distanceKpc': round(dist / LY_PER_KPC, 6)})
        n += 1
    print(f'  {"nearby star":20s} {n:4d} kept')

    # drop exact duplicates (an object can appear in two lists)
    seen, unique = set(), []
    for o in objs:
        key = (round(o['ra'], 1), round(o['dec'], 1), o['kind'])
        if key in seen:
            continue
        seen.add(key)
        unique.append(o)
    return unique


def main():
    arms = parse_arms()
    print('arms:', ', '.join(a['name'] for a in arms))
    objs = parse_objects()
    print(f'{len(objs)} objects')
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('''// GENERATED by solarsystem/galaxy/generateMilkyWay.py — do not hand-edit; regenerate instead.
//
// milkyWayArms: Reid et al. 2019 (ApJ 885, 131) Table 2 log-periodic spiral-arm fits from
// maser parallaxes (TeX source saved in solarsystem/literature/reid2019/). beta is
// Galactocentric azimuth (deg, 0 toward the Sun, increasing in the direction of Galactic
// rotation); betaMin..betaMax is the range the arm's masers actually cover; R in kpc
// (Reid's fits assume R0 = 8.15 kpc); width = Gaussian 1-sigma at R_kink, kpc.
//
// milkyWayObjects: catalogued objects with RA/Dec (J2000, deg) and distance from the Sun,
// from the Wikipedia lists saved under solarsystem/wikipedia/Galaxy/Lists/.

export type SpiralArm = {
  name: string;
  betaMin: number;
  betaMax: number;
  betaKink: number;
  rKink: number;
  pitchBelow: number; // deg, for beta <= betaKink
  pitchAbove: number; // deg, for beta > betaKink
  width: number;
};

export type MilkyWayObjectKind = 'globular cluster' | 'open cluster' | 'supernova remnant' | 'black hole' | 'neutron star'
  | 'star-forming region' | 'planetary nebula' | 'nebula' | 'nearby star';

export type MilkyWayObject = {
  name: string;
  kind: MilkyWayObjectKind;
  ra: number;
  dec: number;
  distanceKpc: number;
};

export const milkyWayArms: SpiralArm[] = ''' + json.dumps(arms, indent=2, ensure_ascii=False) + ''';

export const milkyWayObjects: MilkyWayObject[] = [
''')
        for o in objs:
            f.write('  ' + json.dumps(o, ensure_ascii=False) + ',\n')
        f.write('];\n')
    print(f'wrote {OUT} ({os.path.getsize(OUT) // 1024} KB)')


if __name__ == '__main__':
    main()
