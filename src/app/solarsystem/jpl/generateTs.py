"""Build ../data/moonElements.ts: an orbit model for each moon, anchored to JPL Horizons.

Why not just JPL's published mean elements? They were checked against Horizons and don't
hold up: Saturn's and Uranus's rows don't reproduce Horizons even at their own J2000 epoch,
and propagating any of them by their precession rates drifts tens of degrees by the 2020s
for resonant moons (Europa, Phobos, Amalthea). So instead:

  1. Fetch each moon's planet-centred state vector (ICRF) from the Horizons API at a fit
     epoch (2026-01-01) and at +1 d, +10 d, +100 d, +1 yr and +10 yr. Raw responses are cached
     under horizons/ (re-runs are offline; delete a file to refetch).
  2. Convert the fit-epoch vector to osculating elements in the moon's reference plane
     (pole from JPL's mean-elements table: Laplace plane, ecliptic, or — for Uranus — the
     planet's equator, using the *rotational* pole RA 77.311°, Dec +15.175°, since the IAU
     "north" pole of Uranus is the retrograde one).
  3. Measure the mean-longitude rate across the later epochs (unwrapping whole orbits step by
     step, so fast moons like Phobos don't alias), and node / periapsis rates over 10 years
     (falling back to JPL's tabulated precession periods where the angle is ill-defined).

Validation against Horizons (printed on every run): ≲3° along the orbit for 2020-2040 for
every moon except Mimas (≲15°, its 70-yr libration with Tethys) and Hyperion (≲25°, chaotic
4:3 resonance with Titan). Earth's Moon and the Galilean four are rendered from
astronomy-engine instead; they're fitted here only for their orbit-line periods.

Sources (saved for provenance):
  sat_elem.html      https://ssd.jpl.nasa.gov/sats/elem/      reference planes, periods
  sat_phys_par.html  https://ssd.jpl.nasa.gov/sats/phys_par/  mean radii
  horizons/*.txt     https://ssd.jpl.nasa.gov/api/horizons.api state vectors

Run:  python -I generateTs.py
"""
import html
import json
import math
import os
import re
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'data', 'moonElements.ts')
CACHE = os.path.join(HERE, 'horizons')

# name -> (Horizons ID, planet-centre ID)
MOONS = {
    'Moon': ('301', '399'),
    'Phobos': ('401', '499'), 'Deimos': ('402', '499'),
    'Amalthea': ('505', '599'), 'Io': ('501', '599'), 'Europa': ('502', '599'),
    'Ganymede': ('503', '599'), 'Callisto': ('504', '599'),
    'Mimas': ('601', '699'), 'Enceladus': ('602', '699'), 'Tethys': ('603', '699'),
    'Dione': ('604', '699'), 'Rhea': ('605', '699'), 'Titan': ('606', '699'),
    'Hyperion': ('607', '699'), 'Iapetus': ('608', '699'),
    'Miranda': ('705', '799'), 'Ariel': ('701', '799'), 'Umbriel': ('702', '799'),
    'Titania': ('703', '799'), 'Oberon': ('704', '799'),
    'Proteus': ('808', '899'), 'Triton': ('801', '899'), 'Nereid': ('802', '899'),
}

# label -> (Horizons TDB time, JD)
FIT = ('2026-01-01 00:00', 2461041.5)
UNWRAP_STEPS = [('2026-01-02 00:00', 2461042.5), ('2026-01-11 00:00', 2461051.5),
                ('2026-04-11 00:00', 2461141.5), ('2027-01-01 00:00', 2461406.5),
                ('2036-01-01 00:00', 2464693.5)]
VALIDATE = [('2020-01-01 00:00', 2458849.5), ('2026-10-18 00:00', 2461331.5),
            ('2030-06-01 00:00', 2462653.5), ('2040-01-01 00:00', 2466154.5)]

ECLIPTIC_POLE = (270.0, 66.560708)
URANUS_ROTATIONAL_POLE = (77.311, 15.175)
D2R = math.pi / 180


# ── Source tables ───────────────────────────────────────────────────────────

def table_rows(path, table_start):
    s = open(os.path.join(HERE, path), encoding='utf-8').read()
    i = s.index(table_start)
    t = s[i:s.index('</table>', i)]
    for r in re.findall(r'<tr>(.*?)</tr>', t, re.S):
        cells = [re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', '', c))).strip()
                 for c in re.findall(r'<td[^>]*>(.*?)</td>', r, re.S)]
        if cells:
            yield cells


def jpl_tables():
    radii = {c[1]: float(c[4].split()[0])
             for c in table_rows('sat_phys_par.html', '<table') if len(c) >= 5 and c[1] in MOONS}
    rows = {}
    for c in table_rows('sat_elem.html', '<table id="sat_elem"'):
        if len(c) < 19 or c[2] not in MOONS:
            continue
        (_, planet, name, _, _, frame, _, a, _, _, _, i, _, P, Pw, Pnode, ra, dec, *_r) = c
        if frame == 'Laplace':
            pole = (float(ra), float(dec))
        elif frame == 'ecliptic':
            pole = ECLIPTIC_POLE
        elif frame == 'equatorial' and planet == 'Uranus':
            pole = URANUS_ROTATIONAL_POLE
        else:
            raise ValueError(f'unhandled frame {frame} for {name}')
        rows[name] = {
            'planet': planet, 'a': float(a), 'i': float(i), 'P': float(P),
            'Pw': float(Pw) if Pw not in ('', 'n/a') and float(Pw) else None,
            'Pnode': float(Pnode) if Pnode not in ('', 'n/a') and float(Pnode) else None,
            'pole': pole, 'radius': radii[name],
        }
    missing = [m for m in MOONS if m not in rows]
    if missing:
        raise ValueError(f'missing from JPL tables: {missing}')
    return rows


def horizons_state(name, when):
    tid, centre = MOONS[name]
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f"{name}_{when[:10]}.txt")
    if not os.path.exists(path):
        q = {
            'format': 'text', 'COMMAND': f"'{tid}'", 'CENTER': f"'500@{centre}'",
            'EPHEM_TYPE': "'VECTORS'", 'REF_PLANE': "'FRAME'", 'REF_SYSTEM': "'ICRF'",
            'START_TIME': f"'{when}'", 'STOP_TIME': f"'{when[:-2]}01'", 'STEP_SIZE': "'1'",
            'TIME_TYPE': "'TDB'", 'VEC_TABLE': "'2'", 'OUT_UNITS': "'KM-D'",
        }
        url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(q)
        text = urllib.request.urlopen(url, timeout=60).read().decode('utf-8')
        open(path, 'w', encoding='utf-8', newline='\n').write(text)
    text = open(path, encoding='utf-8').read()
    block = text[text.index('$$SOE'):text.index('$$EOE')]
    nums = re.findall(r'(?:X|Y|Z|VX|VY|VZ)\s*=\s*([-\dE.+]+)', block)
    return [float(x) for x in nums[:6]]


# ── Orbit math (mirrors moonPositionKm in utils.tsx) ────────────────────────

def dot(a, b): return sum(x * y for x, y in zip(a, b))
def cross(a, b): return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
def norm(a): return math.sqrt(dot(a, a))


def plane_basis(pole):
    A, D = pole[0] * D2R, pole[1] * D2R
    zp = [math.cos(D) * math.cos(A), math.cos(D) * math.sin(A), math.sin(D)]
    xp = [-math.sin(A), math.cos(A), 0.0]  # plane's ascending node on the ICRF equator
    return xp, cross(zp, xp), zp


def osculating(sv, pole, gm):
    basis = plane_basis(pole)
    r = [dot(sv[:3], b) for b in basis]
    v = [dot(sv[3:], b) for b in basis]
    h = cross(r, v)
    inc = math.acos(h[2] / norm(h))
    node = math.atan2(h[0], -h[1])
    ev = [c / gm - x / norm(r) for c, x in zip(cross(v, h), r)]
    e = norm(ev)
    nvec = [math.cos(node), math.sin(node), 0.0]

    def in_plane_angle(vec):
        c = dot(nvec, vec) / norm(vec)
        s = dot(cross(nvec, vec), h) / norm(h) / norm(vec)
        return math.atan2(s, c)

    u = in_plane_angle(r)
    w = in_plane_angle(ev) if e > 1e-7 else 0.0
    nu = u - w
    E = 2 * math.atan2(math.sqrt(1 - e) * math.sin(nu / 2), math.sqrt(1 + e) * math.cos(nu / 2))
    M = E - e * math.sin(E)
    return {'i': inc, 'node': node, 'e': e, 'varpi': node + w, 'lam': node + w + M}


def unwrap_rate(a0, a1, guess_rate, dt):
    d = math.degrees(a1 - a0)
    d += 360 * round((guess_rate * dt - d) / 360)
    return d / dt


def fit(name, jpl):
    n_mean = 2 * math.pi / jpl['P']
    gm = n_mean ** 2 * jpl['a'] ** 3  # consistent with JPL's mean a and P
    o0 = osculating(horizons_state(name, FIT[0]), jpl['pole'], gm)

    rate = 360 / jpl['P']
    for when, jd in UNWRAP_STEPS:
        o = osculating(horizons_state(name, when), jpl['pole'], gm)
        rate = unwrap_rate(o0['lam'], o['lam'], rate, jd - FIT[1])

    prograde = 1 if jpl['i'] <= 90 else -1
    node_rate = -prograde * 360 / (jpl['Pnode'] * 365.25) if jpl['Pnode'] else 0.0
    peri_rate = node_rate + (360 / (jpl['Pw'] * 365.25) if jpl['Pw'] else 0.0)
    far_when, far_jd = UNWRAP_STEPS[-1]
    o10 = osculating(horizons_state(name, far_when), jpl['pole'], gm)
    span = far_jd - FIT[1]
    if 0.05 * D2R < o0['i'] < 179.95 * D2R:  # node undefined for (near-)equatorial orbits
        node_rate = unwrap_rate(o0['node'], o10['node'], node_rate, span)
    if o0['e'] > 0.005:  # periapsis too noisy to fit on near-circular orbits
        peri_rate = unwrap_rate(o0['varpi'], o10['varpi'], peri_rate, span)

    return {
        'epochJd': FIT[1],
        'semimajorAxisKm': jpl['a'],
        'eccentricity': round(o0['e'], 6),
        'inclinationDeg': round(math.degrees(o0['i']), 5),
        'nodeDeg': round(math.degrees(o0['node']) % 360, 5),
        'longPeriapsisDeg': round(math.degrees(o0['varpi']) % 360, 5),
        'meanLongitudeDeg': round(math.degrees(o0['lam']) % 360, 5),
        'meanLongitudeRate': rate,
        'nodeRate': node_rate,
        'periapsisRate': peri_rate,
        'poleRaDeg': jpl['pole'][0],
        'poleDecDeg': jpl['pole'][1],
        'periodDays': jpl['P'],
    }


def position(f, jd):
    dt = jd - f['epochJd']
    lam = (f['meanLongitudeDeg'] + f['meanLongitudeRate'] * dt) * D2R
    node = (f['nodeDeg'] + f['nodeRate'] * dt) * D2R
    varpi = (f['longPeriapsisDeg'] + f['periapsisRate'] * dt) * D2R
    w, M, inc, e, a = varpi - node, lam - varpi, f['inclinationDeg'] * D2R, f['eccentricity'], f['semimajorAxisKm']
    M %= 2 * math.pi
    E = M if e < 0.8 else math.pi
    for _ in range(50):
        E -= (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
    xo, yo = a * (math.cos(E) - e), a * math.sqrt(1 - e * e) * math.sin(E)
    cw, sw, cO, sO, ci, si = math.cos(w), math.sin(w), math.cos(node), math.sin(node), math.cos(inc), math.sin(inc)
    xr = (cO * cw - sO * sw * ci) * xo + (-cO * sw - sO * cw * ci) * yo
    yr = (sO * cw + cO * sw * ci) * xo + (-sO * sw + cO * cw * ci) * yo
    zr = sw * si * xo + cw * si * yo
    xp, yp, zp = plane_basis((f['poleRaDeg'], f['poleDecDeg']))
    return [xp[j] * xr + yp[j] * yr + zp[j] * zr for j in range(3)]


def angle_deg(a, b):
    return math.degrees(math.acos(max(-1.0, min(1.0, dot(a, b) / norm(a) / norm(b)))))


def main():
    jpl = jpl_tables()
    out = {}
    print('Angle from Horizons (deg): ' + ', '.join(w[:10] for w, _ in VALIDATE))
    for name in MOONS:
        f = fit(name, jpl[name])
        f = {'name': name, 'planet': jpl[name]['planet'], **f, 'meanRadiusKm': jpl[name]['radius']}
        out[name] = f
        errs = [angle_deg(position(f, jd), horizons_state(name, when)[:3]) for when, jd in VALIDATE]
        print(f'  {name:10s} ' + '  '.join(f'{x:6.2f}' for x in errs))

    with open(OUT, 'w', encoding='utf-8', newline='\n') as fh:
        fh.write('''// GENERATED by solarsystem/jpl/generateTs.py — do not hand-edit; regenerate instead.
//
// Per-moon orbit model anchored to JPL Horizons state vectors (cached under solarsystem/jpl/
// horizons/): osculating elements at epochJd in the plane whose pole is (poleRaDeg,
// poleDecDeg) (ICRF; node measured from that plane's ascending node on the ICRF equator),
// plus mean-longitude / node / periapsis rates measured from Horizons over 1 day to 10 years.
// Propagated linearly by moonPositionKm in utils.tsx. Checked against Horizons for 2020-2040:
// within ~3° along the orbit except Mimas (~15°) and Hyperion (~25°) — see the generator's
// docstring. Mean radii and periods from JPL SSD's satellite tables.

export type MoonElements = {
  name: string;
  planet: string;
  epochJd: number; // TDB
  semimajorAxisKm: number;
  eccentricity: number;
  inclinationDeg: number;
  nodeDeg: number;
  longPeriapsisDeg: number;
  meanLongitudeDeg: number;
  meanLongitudeRate: number; // deg/day
  nodeRate: number; // deg/day
  periapsisRate: number; // deg/day
  poleRaDeg: number;
  poleDecDeg: number;
  periodDays: number; // sidereal
  meanRadiusKm: number;
};

export const moonElements: Record<string, MoonElements> = {
''')
        for name in MOONS:
            fh.write(f'  {json.dumps(name)}: {json.dumps(out[name])},\n')
        fh.write('};\n')
    print(f'wrote {len(out)} moons -> {OUT}')


if __name__ == '__main__':
    main()
