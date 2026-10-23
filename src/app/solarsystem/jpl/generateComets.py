"""Build ../data/comets.ts from JPL Small-Body Database records saved under comets/.

Source: JPL SBDB API (https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=<designation>&phys-par=1&full-prec=1),
one cached JSON per comet. Each gives heliocentric ecliptic J2000 osculating elements; the
perihelion form (q, e, tp) is used because it works for every orbit type here — ellipses
(Halley), near-parabolic long-period comets (Hale-Bopp, NEOWISE) and the hyperbolic
interstellar visitors 2I/Borisov and 3I/ATLAS.

Validation: every run compares the two-body position for VALIDATE_DATES against JPL
Horizons (cached under comets/horizons/) and prints the angular error as seen from the Sun.
Two-body motion ignores planetary perturbations and outgassing, so short-period comets
drift as their element epoch ages — see the printed table.

Re-fetch one comet: delete its JSON and run with network access, or:
  curl -G https://ssd-api.jpl.nasa.gov/sbdb.api --data-urlencode "sstr=1P" --data-urlencode "phys-par=1" --data-urlencode "full-prec=1" -o comets/1P.json

Run:  python -I generateComets.py
"""
import json
import math
import os
import re
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
DIR = os.path.join(HERE, 'comets')
OUT = os.path.join(HERE, '..', 'data', 'comets.ts')

# designation -> display name
COMETS = {
    '1P': 'Halley', '2P': 'Encke', '9P': 'Tempel 1', '12P': 'Pons-Brooks',
    '19P': 'Borrelly', '21P': 'Giacobini-Zinner', '55P': 'Tempel-Tuttle',
    '67P': 'Churyumov-Gerasimenko', '81P': 'Wild 2', '103P': 'Hartley 2',
    '109P': 'Swift-Tuttle', 'C/1995 O1': 'Hale-Bopp', 'C/1996 B2': 'Hyakutake',
    'C/2020 F3': 'NEOWISE', 'C/2023 A3': 'Tsuchinshan-ATLAS', '2I': 'Borisov', '3I': 'ATLAS (3I)',
}
GAUSS_K = 0.01720209895  # rad/day, sqrt(GM_sun) in AU^1.5/day
VALIDATE_DATES = [('2020-01-01', 2458849.5), ('2026-10-23', 2461336.5), ('2030-01-01', 2462502.5)]


def fname(des):
    return des.replace('/', '_').replace(' ', '_')


def load(des):
    d = json.load(open(os.path.join(DIR, fname(des) + '.json'), encoding='utf-8'))
    el = {e['name']: e['value'] for e in d['orbit']['elements']}
    phys = {p['name']: p['value'] for p in d.get('phys_par', [])}
    return d, el, phys


def position(c, jd):
    """Heliocentric ecliptic J2000 position (AU) — mirrors cometPositionAU in utils.tsx."""
    q, e, dt = c['q'], c['e'], jd - c['tpJd']
    if e < 1:
        a = q / (1 - e)
        M = GAUSS_K * dt / a ** 1.5
        M = (M + math.pi) % (2 * math.pi) - math.pi
        E = M if e < 0.8 else math.copysign(math.pi, M) if M else 0.0
        for _ in range(100):
            E -= (E - e * math.sin(E) - M) / (1 - e * math.cos(E))
        xo, yo = a * (math.cos(E) - e), a * math.sqrt(1 - e * e) * math.sin(E)
    else:
        a = q / (e - 1)
        M = GAUSS_K * dt / a ** 1.5
        H = math.asinh(M / e)
        for _ in range(100):
            H -= (e * math.sinh(H) - H - M) / (e * math.cosh(H) - 1)
        xo, yo = a * (e - math.cosh(H)), a * math.sqrt(e * e - 1) * math.sinh(H)
    O, i, w = (math.radians(c[k]) for k in ('nodeDeg', 'inclinationDeg', 'argPerihelionDeg'))
    cO, sO, ci, si, cw, sw = math.cos(O), math.sin(O), math.cos(i), math.sin(i), math.cos(w), math.sin(w)
    return [
        (cO * cw - sO * sw * ci) * xo + (-cO * sw - sO * cw * ci) * yo,
        (sO * cw + cO * sw * ci) * xo + (-sO * sw + cO * cw * ci) * yo,
        (sw * si) * xo + (cw * si) * yo,
    ]


def horizons(des, date):
    os.makedirs(os.path.join(DIR, 'horizons'), exist_ok=True)
    path = os.path.join(DIR, 'horizons', f'{fname(des)}_{date}.txt')
    if not os.path.exists(path):
        # DES=...;CAP; = the current small-body solution (a bare SPK-ID can resolve to a
        # spacecraft-encounter trajectory that only spans the mission window)
        command = f"DES={des};CAP;"
        q = {'format': 'text', 'COMMAND': f"'{command}'", 'CENTER': "'500@10'", 'EPHEM_TYPE': "'VECTORS'",
             'REF_PLANE': "'ECLIPTIC'", 'REF_SYSTEM': "'ICRF'", 'START_TIME': f"'{date} 00:00'",
             'STOP_TIME': f"'{date} 00:01'", 'STEP_SIZE': "'1'", 'VEC_TABLE': "'1'", 'OUT_UNITS': "'AU-D'"}
        url = 'https://ssd.jpl.nasa.gov/api/horizons.api?' + urllib.parse.urlencode(q)
        open(path, 'w', encoding='utf-8', newline='\n').write(urllib.request.urlopen(url, timeout=60).read().decode('utf-8'))
    text = open(path, encoding='utf-8').read()
    if '$$SOE' not in text:
        return None
    block = text[text.index('$$SOE'):text.index('$$EOE')]
    return [float(x) for x in re.findall(r'[XYZ]\s*=\s*([-\dE.+]+)', block)[:3]]


def angle(a, b):
    d = sum(x * y for x, y in zip(a, b)) / math.sqrt(sum(x * x for x in a) * sum(y * y for y in b))
    return math.degrees(math.acos(max(-1.0, min(1.0, d))))


def main():
    out = []
    print('Angle from Horizons as seen from the Sun (deg): ' + ', '.join(d for d, _ in VALIDATE_DATES))
    for des, name in COMETS.items():
        d, el, phys = load(des)
        e = float(el['e'])
        kind = 'interstellar' if des.endswith('I') else ('periodic' if des.endswith('P') else 'long-period')
        diameter = phys.get('diameter') or (2 * float(phys['radius']) if phys.get('radius') else None)
        c = {
            'name': name,
            'designation': d['object']['fullname'],
            'kind': kind,
            'q': float(el['q']),
            'e': e,
            'inclinationDeg': float(el['i']),
            'nodeDeg': float(el['om']),
            'argPerihelionDeg': float(el['w']),
            'tpJd': float(el['tp']),
            'elementEpochJd': float(d['orbit']['epoch']),
            'diameterKm': float(diameter) if diameter else None,
        }
        out.append(c)
        errs = []
        for date, jd in VALIDATE_DATES:
            h = horizons(d['object']['des'], date)
            errs.append(f'{angle(position(c, jd), h):7.2f}' if h else '    n/a')
        print(f'  {name:24s}' + '  '.join(errs))

    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write('''// GENERATED by solarsystem/jpl/generateComets.py — do not hand-edit; regenerate instead.
//
// Notable comets from the JPL Small-Body Database (raw records cached under
// solarsystem/jpl/comets/): heliocentric ecliptic J2000 osculating elements in perihelion
// form (q, e, tp), which covers ellipses, near-parabolic and hyperbolic (interstellar) orbits.
// Positioned by two-body motion (cometPositionAU in utils.tsx); the generator prints its error
// against JPL Horizons. diameterKm is SBDB's nucleus diameter where measured.

export type Comet = {
  name: string;
  designation: string;
  kind: 'periodic' | 'long-period' | 'interstellar';
  q: number; // perihelion distance, AU
  e: number;
  inclinationDeg: number;
  nodeDeg: number;
  argPerihelionDeg: number;
  tpJd: number; // time of perihelion, JD TDB
  elementEpochJd: number;
  diameterKm: number | null;
};

export const comets: Comet[] = [
''')
        for c in out:
            f.write('  ' + json.dumps(c) + ',\n')
        f.write('];\n')
    print(f'wrote {len(out)} comets -> {OUT}')


if __name__ == '__main__':
    main()
