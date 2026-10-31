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
import math
import os
import re
import sys
import urllib.parse

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

class Cell(str):
    """A table cell's text, plus the article its first wiki link points to (or None)."""
    href = None


def strip(cell):
    cell = re.sub(r"data-mw='[^']*'", '', cell)
    cell = re.sub(r'data-mw="[^"]*"', '', cell)
    cell = re.sub(r'<style.*?</style>', '', cell, flags=re.S)
    cell = re.sub(r'<sup.*?</sup>', '', cell, flags=re.S)
    cell = re.sub(r'<span[^>]*display:\s*none[^>]*>.*?</span>', '', cell, flags=re.S)
    link = re.search(r'<a[^>]*rel="mw:WikiLink"[^>]*href="\./([^"#?]+)"', cell)
    text = html.unescape(re.sub(r'<[^>]+>', ' ', cell)).replace('\xad', '')
    out = Cell(re.sub(r'\s+', ' ', text).strip())
    if link and not link.group(1).startswith(('File:', 'Template:', 'Help:')):
        out.href = urllib.parse.unquote(link.group(1)).replace('_', ' ')
    return out


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
    s = s.replace(',', '').replace('−', '-').replace('–', '-').replace('~', '').replace('≈', '').replace('<', '')
    m = re.match(r'^\s*(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?', s)
    if not m:
        return None
    a = float(m.group(1))
    return (a + float(m.group(2))) / 2 if m.group(2) else a


number = parse_distance  # same leading-number rules for masses, ages, radii, …


def parse_power(s):
    """'5.50 × 10' with the exponent lost to <sup> stripping can't be recovered; plain numbers only"""
    return None if '×' in s else number(s)


def angular_size_arcmin(s):
    """"330'", '12', '8′', '420″ × 290″', '2°' -> the largest dimension in arcminutes"""
    best = None
    for value, unit in re.findall(r'(\d+(?:\.\d+)?)\s*(°|′|\'|″|")?', s.replace(',', '')):
        v = float(value) * {'°': 60, '″': 1 / 60, '"': 1 / 60}.get(unit, 1)
        best = v if best is None else max(best, v)
    return best


def physical_size_pc(arcmin, distance_kpc):
    return round(distance_kpc * 1000 * math.radians(arcmin / 60), 3) if arcmin and distance_kpc else None


def col(header, *names):
    # headers carry soft-hyphen breaks ("Dis tan ce"), so compare with spaces removed
    for i, h in enumerate(header):
        hl = h.lower().replace(' ', '')
        if any(n.replace(' ', '') in hl for n in names):
            return i
    return None


def clean_name(name):
    return re.sub(r'\s+', ' ', name).strip(' *†‡$#§&')


def compact(info):
    return {k: v for k, v in info.items() if v not in (None, '', '?', 'N/A', '—')}


def from_table(rows, kind, name_keys, dist_keys, dist_to_kpc, ra_keys=('right ascension', 'r. a.', 'ra'), dec_keys=('declination', 'dec'),
               header_rows=1, keep=lambda cells, header: True, extra=lambda cells, header, dist_kpc: {}):
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
        dist_kpc = dist * dist_to_kpc
        o = {'name': clean_name(name), 'kind': kind, 'ra': round(ra, 4), 'dec': round(dec, 4), 'distanceKpc': round(dist_kpc, 4)}
        if name.href:
            o['wiki'] = name.href
        info = compact(extra(cells, header, dist_kpc))
        if info:
            o['info'] = info
        out.append(o)
    print(f'  {kind:20s} {len(out):4d} kept, {skipped} skipped')
    return out


def cell(cells, header, *names):
    i = col(header, *names)
    return cells[i] if i is not None and i < len(cells) else ''


def parse_objects():
    objs, systems = [], []
    LY = 1 / LY_PER_KPC

    t = tables('List_of_globular_clusters')
    objs += from_table(t[0], 'globular cluster', ('identifier',), ('distance',), LY, header_rows=2,
                       extra=lambda c, h, d: {'diameterPc': physical_size_pc(angular_size_arcmin(cell(c, h, 'diameter')), d),
                                              'apparentMagnitude': number(cell(c, h, 'magnitude')),
                                              'constellation': cell(c, h, 'constellation')})

    t = tables('List_of_open_clusters')
    objs += from_table(t[0], 'open cluster', ('cluster identifier', 'identifier'), ('distance',), LY, ra_keys=('r. a.',), dec_keys=('dec.',), header_rows=2,
                       extra=lambda c, h, d: {'diameterPc': physical_size_pc(angular_size_arcmin(cell(c, h, 'diameter')), d),
                                              'ageMyr': number(cell(c, h, 'age')),
                                              'apparentMagnitude': number(cell(c, h, 'magnitude')),
                                              'constellation': cell(c, h, 'constellation')})

    t = tables('List_of_supernova_remnants')
    objs += from_table(t[0], 'supernova remnant', ('name',), ('distance',), LY,
                       keep=lambda c, h: 'milky' in c[col(h, 'galaxy')].lower(),
                       extra=lambda c, h, d: {'supernovaType': cell(c, h, 'type'), 'remnant': cell(c, h, 'remnant'),
                                              'firstSeen': cell(c, h, 'first visible')})

    # black holes: a system's first row names it and gives one component; the components
    # after it get short rows of their own ([designation, class, mass]). Which ones have an
    # accretion disk: the X-ray binaries (named for their X-ray source — A0620-00, GRS, XTE,
    # GRO, GS, Swift, 4U, Cygnus X-1/X-3, V404 Cygni), which accrete from their companion,
    # and Sagittarius A*'s faint hot flow; not the dormant Gaia BH binaries (wide orbits, no
    # mass transfer) or the isolated microlensing detections.
    t = tables('List_of_nearest_known_black_holes')
    rows = t[0]
    header = rows[1]
    di, ni, de, ri, ci = col(header, '(kpc)'), col(header, 'designation'), col(header, 'description'), col(header, 'right'), col(header, 'declination')
    ki, cl, ma = 7, 8, 9  # component designation / stellar class / mass ("Desig nation" repeats the header word)
    xray = re.compile(r'^(A0620|GRS|XTE|GRO|GS |Swift|4U|Cygnus X|V404|MAXI|H1705|GX )')
    period_units = {'h': 1 / 24, 'd': 1, 'yr': 365.25}
    n = 0
    current = None
    for c in rows[2:]:
        if len(c) >= 10:
            ra, dec, dist = parse_ra(c[ri]), parse_dec(c[ci]), parse_distance(c[di])
            current = None
            if ra is None or dec is None or not dist:
                continue
            desc = c[de]
            name = clean_name(re.sub(r' \(.*\)$', '', c[ni]))
            name = 'Sagittarius A*' if name == 'Sagittarius A' else name
            period = re.search(r't\s*=\s*([\d.]+)\s*(h|d|yr)', desc)
            current = {'name': name, 'kind': 'black hole', 'ra': round(ra, 4), 'dec': round(dec, 4), 'distanceKpc': round(dist, 4),
                       'info': compact({'description': desc, 'components': [],
                                        'accreting': bool(xray.match(name)) or 'supermassive' in desc.lower(),
                                        'orbitalPeriodDays': round(float(period.group(1)) * period_units[period.group(2)], 5) if period else None})}
            if c[ni].href:
                current['wiki'] = c[ni].href
            current['info']['components'].append(compact({'name': c[ki], 'spectralClass': c[cl], 'massSun': number(c[ma])}))
            objs.append(current)
            n += 1
        elif current and 2 <= len(c) <= 4:
            current['info']['components'].append(compact({'name': c[0], 'spectralClass': c[1], 'massSun': number(c[2]) if len(c) > 2 else None}))
    print(f'  {"black hole":20s} {n:4d} kept, {sum(1 for o in objs if o["kind"] == "black hole" and o["info"]["accreting"])} accreting')

    t = tables('List_of_neutron_stars')
    objs += from_table(t[0], 'neutron star', ('designation',), ('distance',), 1 / 1000,
                       extra=lambda c, h, d: {'type': cell(c, h, 'type'), 'massSun': number(cell(c, h, 'mass')),
                                              'radiusKm': number(cell(c, h, 'radius')), 'spinPeriodS': number(cell(c, h, 'spin')),
                                              'temperatureK': parse_power(cell(c, h, 'temperature'))})

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
            o = {'name': clean_name(c[ni]), 'kind': 'star-forming region', 'ra': ra, 'dec': dec, 'distanceKpc': round(dist / 1000, 4)}
            if c[ni].href:
                o['wiki'] = c[ni].href
            info = compact({'ageMyr': number(cell(c, header, 'age')), 'earliestSpectralType': cell(c, header, 'earliest'),
                            'stars': number(cell(c, header, 'number')), 'cloudMassSun': parse_power(cell(c, header, 'cloud mass'))})
            if info:
                o['info'] = info
            objs.append(o)
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
        dist_kpc = dist * 1000 / LY_PER_KPC
        o = {'name': f'{c[ni]} {common}'.strip(), 'kind': kind, 'ra': round(ra, 4), 'dec': round(dec, 4), 'distanceKpc': round(dist_kpc, 4)}
        href = c[cni].href or c[ni].href
        if href:
            o['wiki'] = href
        o['info'] = compact({'nebulaType': c[ti], 'diameterPc': physical_size_pc(angular_size_arcmin(cell(c, header, 'dimensions')), dist_kpc),
                             'apparentMagnitude': number(cell(c, header, 'magnitude')), 'constellation': cell(c, header, 'constellation')})
        objs.append(o)
        n += 1
    print(f'  {"messier nebulae":20s} {n:4d} kept')

    # nearest stars: RA/Dec share one cell ("14 29 43.0 −62 ° 40 ′ 46 ″"). Row layouts, by
    # where that cell sits:
    #   [system, distance, constellation, coords, class, mass, …]          a single star
    #   [system, member, distance, constellation, coords, class, mass, …]  first member of a multiple system
    #   [member, distance, coords, class, mass, …]                         another member with its own distance
    #   [member, coords, class, mass, …]                                   another member at the system's distance
    #   [member, class, mass, …]  (no coords)                              a companion too close to separate
    # Members are often just a component letter ("A", "Ba"), so they're named with their system.
    # Every member (with or without its own position) is also listed under its system in
    # milkyWaySystems, which the 3D model draws.
    t = tables('List_of_nearest_stars')
    rows = t[1]
    coord_re = re.compile(r'^(\d+) (\d+) ([\d.]+) ([+−-])\s*(\d+) ° (\d+) ′ ([\d.]+) ″')
    marks = re.compile(r'[\s$&‡§#*]+$')
    component = re.compile(r'^[A-Z][a-z]?(?:\s|$|\()')
    system, system_dist, n = None, None, 0

    def star_name(member):
        member = marks.sub('', member)
        if system is None:
            return member
        if component.match(member):
            return f"{re.sub(r' [(].*', '', system['name'])} {member}"  # "Sirius A", "Gliese 65 A (BL Ceti)"
        return re.sub(r' [(].*', '', member)  # a member with its own name: "Proxima Centauri"

    def new_system(cell_):
        s = {'name': marks.sub('', cell_), 'members': []}
        if cell_.href:
            s['wiki'] = cell_.href
        systems.append(s)
        return s

    for c in rows[2:]:
        idx = next((i for i, x in enumerate(c) if coord_re.match(x)), None)
        if idx == 3 and c[0].startswith('Solar'):
            system = None
            continue
        if idx == 3:
            system, system_dist = new_system(c[0]), parse_distance(c[1])
            name, dist, href = system['name'], system_dist, c[0].href
        elif idx == 4:
            system, system_dist = new_system(c[0]), parse_distance(c[2])
            name, dist, href = star_name(c[1]), system_dist, c[1].href or c[0].href
        elif idx == 2:
            name, dist, href = star_name(c[0]), parse_distance(c[1]), c[0].href
        elif idx == 1:
            name, dist, href = star_name(c[0]), system_dist, c[0].href
        elif idx is None and system is not None and 3 <= len(c) <= 6:
            # a companion with no position of its own: part of the model, not a marker
            system['members'].append(compact({'name': star_name(c[0]), 'spectralClass': marks.sub('', c[1]), 'massSun': number(c[2])}))
            continue
        else:
            continue
        if system is None:
            continue
        member = compact({'name': name, 'spectralClass': marks.sub('', c[idx + 1]) if idx + 1 < len(c) else '',
                          'massSun': number(c[idx + 2]) if idx + 2 < len(c) else None})
        system['members'].append(member)
        if not dist:
            continue
        m = coord_re.match(c[idx])
        ra = (int(m.group(1)) + int(m.group(2)) / 60 + float(m.group(3)) / 3600) * 15
        dec = (int(m.group(5)) + int(m.group(6)) / 60 + float(m.group(7)) / 3600) * (-1 if m.group(4) in '−-' else 1)
        o = {'name': name, 'kind': 'nearby star', 'ra': round(ra, 4), 'dec': round(dec, 4), 'distanceKpc': round(dist / LY_PER_KPC, 6),
             'wiki': href or system.get('wiki'), 'info': compact({**{k: v for k, v in member.items() if k != 'name'}, 'system': len(systems) - 1})}
        if not o['wiki']:
            del o['wiki']
        objs.append(o)
        n += 1
    print(f'  {"nearby star":20s} {n:4d} kept in {len(systems)} systems')

    # drop exact duplicates (an object can appear in two lists); nearby stars only merge when
    # they share a position to the arcsecond, so close pairs like Alpha Cen A/B both stay
    seen, unique = set(), []
    for o in objs:
        p = 4 if o['kind'] == 'nearby star' else 1
        key = (round(o['ra'], p), round(o['dec'], p), o['kind'])
        if key in seen:
            continue
        seen.add(key)
        unique.append(o)
    return unique, systems


def main():
    arms = parse_arms()
    print('arms:', ', '.join(a['name'] for a in arms))
    objs, systems = parse_objects()
    print(f'{len(objs)} objects, {sum(1 for o in objs if o.get("wiki"))} with a Wikipedia article')
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
// from the Wikipedia lists saved under solarsystem/wikipedia/Galaxy/Lists/. `wiki` is the
// article the list links the object to; `info` holds whatever physical data that list gives
// (sizes in pc are the listed angular size times the distance).
//
// milkyWaySystems: the nearest-star systems, every member listed (including close companions
// with no position of their own); a nearby star's info.system indexes into it.

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

export type StarComponent = { name?: string; spectralClass?: string; massSun?: number };

export type MilkyWayObjectInfo = {
  diameterPc?: number;
  ageMyr?: number;
  apparentMagnitude?: number;
  constellation?: string;
  supernovaType?: string;
  remnant?: string;
  firstSeen?: string;
  description?: string;
  components?: StarComponent[];
  accreting?: boolean;
  orbitalPeriodDays?: number;
  type?: string;
  massSun?: number;
  radiusKm?: number;
  spinPeriodS?: number;
  temperatureK?: number;
  earliestSpectralType?: string;
  stars?: number;
  cloudMassSun?: number;
  nebulaType?: string;
  spectralClass?: string;
  system?: number;
};

export type MilkyWayObject = {
  name: string;
  kind: MilkyWayObjectKind;
  ra: number;
  dec: number;
  distanceKpc: number;
  wiki?: string;
  info?: MilkyWayObjectInfo;
};

export type StarSystem = { name: string; wiki?: string; members: StarComponent[] };

export const milkyWayArms: SpiralArm[] = ''' + json.dumps(arms, indent=2, ensure_ascii=False) + ''';

export const milkyWaySystems: StarSystem[] = [
''')
        for s in systems:
            f.write('  ' + json.dumps(s, ensure_ascii=False) + ',\n')
        f.write('''];

export const milkyWayObjects: MilkyWayObject[] = [
''')
        for o in objs:
            f.write('  ' + json.dumps(o, ensure_ascii=False) + ',\n')
        f.write('];\n')
    print(f'wrote {OUT} ({os.path.getsize(OUT) // 1024} KB)')


if __name__ == '__main__':
    main()
