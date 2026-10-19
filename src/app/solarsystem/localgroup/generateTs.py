"""Convert McConnachie's "Nearby Galaxies" catalog (saved FITS file next to this script)
into ../data/localGroup.ts.

Source: McConnachie (2012), AJ 144, 4, "The observed properties of dwarf galaxies in and
around the Local Group" — the public, continuously-updated version (Jan 2021) hosted by
CADC: https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/community/nearby/
(file: NearbyGalaxies_Jan2021_PUBLIC.fits).

Only the columns the visualization needs are kept, converted to physical units:
  distance (kpc)       <- distance modulus:  d = 10 ** (dmod / 5 + 1) pc
  M_V                  <- Vmag - dmod - 3.1 * E(B-V)   (standard R_V = 3.1 extinction)
  half-light rad (kpc) <- rh (arcmin) * distance
  ellipticity, PA      <- as given
  RA/Dec (deg)         <- sexagesimal as given (galactic conversion happens in utils.tsx)

Run:  python -I generateTs.py
"""
import json
import re
import math
import os
import struct

HERE = os.path.dirname(os.path.abspath(__file__))
FITS = os.path.join(HERE, 'NearbyGalaxies_Jan2021_PUBLIC.fits')
OUT = os.path.join(HERE, '..', 'data', 'localGroup.ts')

# Catalog uses 99.99 / 999.9-style sentinels for missing values.
def present(v):
    return v is not None and not math.isnan(v) and abs(v) < 90


def read_header(data, off):
    cards = {}
    order = []
    while True:
        card = data[off:off + 80].decode('ascii')
        off += 80
        if card.startswith('END'):
            break
        if '=' in card[:10]:
            key = card[:8].strip()
            rest = card[10:].strip()
            # Quoted strings can contain '/' (e.g. 'e=1-b/a'), so only split comments off
            # unquoted values.
            val = rest[1:].split("'")[0].strip() if rest.startswith("'") else rest.split('/')[0].strip()
            cards[key] = val
            order.append(key)
    return cards, ((off + 2879) // 2880) * 2880


def read_table():
    data = open(FITS, 'rb').read()
    primary, off = read_header(data, 0)
    off += ((int(primary['NAXIS1']) + 2879) // 2880) * 2880
    hdr, off = read_header(data, off)
    nfields, width, nrows = int(hdr['TFIELDS']), int(hdr['NAXIS1']), int(hdr['NAXIS2'])
    cols = []
    for i in range(1, nfields + 1):
        form = hdr[f'TFORM{i}']
        code = form[-1]
        count = int(form[:-1] or 1)
        size = {'A': 1, 'E': 4, 'I': 2, 'D': 8, 'J': 4}[code] * count
        cols.append((hdr[f'TTYPE{i}'], code, size))
    rows = []
    for r in range(nrows):
        row, p = {}, off + r * width
        for name, code, size in cols:
            raw = data[p:p + size]
            p += size
            if code == 'A':
                row[name] = raw.decode('ascii').strip()
            elif code == 'E':
                row[name] = struct.unpack('>f', raw)[0]
            elif code == 'D':
                row[name] = struct.unpack('>d', raw)[0]
            elif code == 'I':
                row[name] = struct.unpack('>h', raw)[0]
            elif code == 'J':
                row[name] = struct.unpack('>i', raw)[0]
        rows.append(row)
    return rows


def sexagesimal(s, hours):
    parts = [float(x) for x in s.replace(':', ' ').split()]
    sign = -1 if s.strip().startswith('-') else 1
    deg = abs(parts[0]) + (parts[1] if len(parts) > 1 else 0) / 60 + (parts[2] if len(parts) > 2 else 0) / 3600
    return sign * deg * (15 if hours else 1)


# The catalog's own names are space-less ("AndromedaXIX", "Leo1", "Bootes(1)"); a leading
# '*' marks objects the catalog flags as candidates/uncertain. Display names only.
SPECIAL_NAMES = {
    'SagittariusdSph': 'Sagittarius dSph',
    'SagittariusdIrr': 'Sagittarius dIrr',
    'PegasusdIrr': 'Pegasus dIrr',
    'CanisMajor': 'Canis Major',
    'ComaBerenices': 'Coma Berenices',
    'Triangulum': 'Triangulum (M33)',
    'LMC': 'Large Magellanic Cloud',
    'SMC': 'Small Magellanic Cloud',
    'HIZSS3(A)': 'HIZSS 3A',
    'HIZSS3B': 'HIZSS 3B',
}
ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']


def display_name(raw):
    name = raw.lstrip('*')
    if name in SPECIAL_NAMES:
        return SPECIAL_NAMES[name]
    name = re.sub(r'\((\d)\)$', r'\1', name)  # "Bootes(1)" -> "Bootes1"
    m = re.match(r'^([A-Z][a-z]+(?:[A-Z][a-z]+)*?)(\d)$', name)
    if m:
        name = f'{m.group(1)} {ROMAN[int(m.group(2))]}'  # "Leo1" -> "Leo I"
    name = re.sub(r'([a-z])([A-Z])', r'\1 \2', name)  # "AndromedaXIX" -> "Andromeda XIX"
    name = re.sub(r'^(NGC|IC|DDO|UGCA|UGC|KKH|KKR|KKs|KK|ESO|GR)(?=\d)', r'\1 ', name)
    return name.replace('Bootes', 'Boötes')


# Local Group membership is conventionally taken as within ~1.5 Mpc; the catalog also
# includes a handful of more distant "nearby" galaxies (Sculptor-group NGC 55/300, etc.).
MAX_DISTANCE_KPC = 1500


def main():
    rows = read_table()
    out = []
    for r in rows:
        if not present(r['dmod']):
            continue
        dist_kpc = 10 ** (r['dmod'] / 5 + 1) / 1000
        if dist_kpc > MAX_DISTANCE_KPC:
            continue
        ra = sexagesimal(r['RA'], True)
        dec = sexagesimal(r['Dec'], False)
        ebv = r['EB-V'] if present(r['EB-V']) else 0.0
        abs_v = r['Vmag'] - r['dmod'] - 3.1 * ebv if present(r['Vmag']) else None
        rh_kpc = math.radians(r['rh'] / 60) * dist_kpc if r['rh'] and 0 < r['rh'] < 900 else None
        ell = r['e=1-b/a'] if present(r['e=1-b/a']) and 0 <= r['e=1-b/a'] < 1 else None
        pa = r['PA'] if not math.isnan(r['PA']) and abs(r['PA']) < 400 else None
        hi = r['MHI'] if not math.isnan(r['MHI']) and 0 <= r['MHI'] < 999 else None
        out.append({
            'name': display_name(r['GalaxyName']),
            'catalogName': r['GalaxyName'],
            'raDeg': round(ra, 5),
            'decDeg': round(dec, 5),
            'distanceKpc': round(dist_kpc, 2),
            'absMagV': None if abs_v is None else round(abs_v, 2),
            'halfLightKpc': None if rh_kpc is None else round(rh_kpc, 4),
            'ellipticity': None if ell is None else round(ell, 3),
            'positionAngle': None if pa is None else round(pa, 1),
            'hiMass': None if hi is None else round(hi, 3),
        })
    out.sort(key=lambda g: g['distanceKpc'])

    header = '''// GENERATED by solarsystem/localgroup/generateTs.py — do not hand-edit; regenerate instead.
//
// Source: McConnachie (2012), AJ 144, 4, "The observed properties of dwarf galaxies in and
// around the Local Group", public Jan 2021 update hosted by CADC
// (https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/community/nearby/), saved as
// localgroup/NearbyGalaxies_Jan2021_PUBLIC.fits.
//
// Every entry is the catalog's own measurement converted to physical units (see the script's
// docstring): heliocentric distance from the distance modulus, extinction-corrected absolute
// V magnitude, half-light radius in kpc, projected ellipticity and position angle, and
// J2000 RA/Dec and HI gas mass. null = not measured in the catalog. Limited to
// heliocentric distance <= 1.5 Mpc (conventional Local Group extent).
// The Milky Way and Andromeda aren't catalog rows (it catalogs their satellites) — see
// data/localGroupHosts.ts.

export type LocalGroupGalaxy = {
  name: string; // display name
  catalogName: string; // name as written in the catalog ('*' = flagged candidate)
  raDeg: number; // J2000
  decDeg: number; // J2000
  distanceKpc: number; // heliocentric
  absMagV: number | null; // extinction-corrected absolute V magnitude
  halfLightKpc: number | null; // major-axis half-light radius
  ellipticity: number | null; // 1 - b/a, projected on the sky
  positionAngle: number | null; // major axis, deg east of north
  hiMass: number | null; // neutral hydrogen mass, 10^6 solar masses (0 = gas-free)
};

export const localGroupGalaxies: LocalGroupGalaxy[] = '''
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        f.write(header)
        f.write('[\n')
        for g in out:
            f.write('  ' + json.dumps(g, ensure_ascii=False).replace('NaN', 'null') + ',\n')
        f.write('];\n')
    print(f'wrote {len(out)} galaxies -> {OUT}')


if __name__ == '__main__':
    main()
