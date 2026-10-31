"""Neurotransmitter receptor and transporter density of every /brain region, from PET.

Source: Hansen et al. 2022, "Mapping neurotransmitter systems to the structural and functional
organization of the human neocortex", Nature Neuroscience 25:1569, doi:10.1038/s41593-022-01186-3.
Group-averaged PET maps of 19 receptors/transporters from >1,200 healthy people, collected from the
original studies (listed in TARGETS; cite those too) and shared as MNI-space volumes at
github.com/netneurolab/hansen_receptors under CC BY-NC-SA 4.0.

Each map is sampled on the CerebrA label volume (cerebra_meshes.label_volume, MNI 2009c grid; the
PET maps are on MNI152 grids, close enough for region means). As in Hansen's make_receptor_matrix.py,
each map's region means are z-scored and maps of the same target averaged weighted by their number of
participants; the result is then rescaled so the lowest grey-matter region is 0 and the highest 1.
Units differ between tracers (binding potential, distribution volume, SUV ratio), so only this
relative ranking is comparable across receptors. Hansen's D2 map (FLB457) is a cortical tracer that
saturates in the striatum; fallypride is used instead so subcortical regions are valid.

White matter, ventricles and the optic chiasm get no values: PET binding there is mostly blur from
the grey matter around them. Both hemispheres are pooled (the maps are group averages).

Usage: python -P scripts/brain/receptors.py   (downloads ~450 MB of PET maps into scripts/.cache/hansen/)
Writes src/app/brain/data/receptors.ts.
"""

import gzip
import json
import struct
import sys
import urllib.request
from pathlib import Path

import numpy as np
from scipy.ndimage import map_coordinates

sys.path.insert(0, str(Path(__file__).resolve().parent))
import cerebra_meshes as cm  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'scripts' / '.cache' / 'hansen'
REPO = 'https://raw.githubusercontent.com/netneurolab/hansen_receptors/main/data/PET_nifti_images/'
OUT = ROOT / 'src' / 'app' / 'brain' / 'data' / 'receptors.ts'

# target id -> (label, system, [(file, participants, tracer, study)]). Studies and modelling details
# are from Hansen's Table S3 (manuscript/Table_S3.xlsx in the repo); unpublished maps name their PI.
TARGETS = {
    '5HT1a': ('5-HT1A', 'Serotonin', [('5HT1a_way_hc36_savli.nii', 35, '[11C]WAY-100635', 'Savli et al. 2012')]),
    '5HT1b': ('5-HT1B', 'Serotonin', [('5HT1b_az_hc36_beliveau.nii', 36, '[11C]AZ10419369', 'Beliveau et al. 2017'),
                                       ('5HT1b_p943_hc22_savli.nii', 23, '[11C]P943', 'Savli et al. 2012'),
                                       ('5HT1b_p943_hc65_gallezot.nii.gz', 65, '[11C]P943', 'Gallezot et al. 2010')]),
    '5HT2a': ('5-HT2A', 'Serotonin', [('5HT2a_cimbi_hc29_beliveau.nii', 29, '[11C]Cimbi-36', 'Beliveau et al. 2017')]),
    '5HT4': ('5-HT4', 'Serotonin', [('5HT4_sb20_hc59_beliveau.nii', 59, '[11C]SB207145', 'Beliveau et al. 2017')]),
    '5HT6': ('5-HT6', 'Serotonin', [('5HT6_gsk_hc30_radhakrishnan.nii.gz', 30, '[11C]GSK215083', 'Radhakrishnan et al. 2018')]),
    '5HTT': ('Serotonin transporter', 'Serotonin', [('5HTT_dasb_hc100_beliveau.nii', 100, '[11C]DASB', 'Beliveau et al. 2017')]),
    'D1': ('D1', 'Dopamine', [('D1_SCH23390_hc13_kaller.nii', 13, '[11C]SCH23390', 'Kaller et al. 2017')]),
    'D2': ('D2', 'Dopamine', [('D2_fallypride_hc49_jaworska.nii', 49, '[18F]fallypride', 'Jaworska et al. 2020')]),
    'DAT': ('Dopamine transporter', 'Dopamine', [('DAT_fpcit_hc174_dukart_spect.nii', 174, '[123I]FP-CIT (SPECT)', 'Dukart et al. 2018')]),
    'NET': ('Noradrenaline transporter', 'Noradrenaline', [('NAT_MRB_hc77_ding.nii.gz', 77, '[11C]MRB', 'Ding et al. 2010')]),
    'H3': ('H3', 'Histamine', [('H3_cban_hc8_gallezot.nii.gz', 8, '[11C]GSK189254', 'Gallezot et al. 2017')]),
    'A4B2': ('α4β2 nicotinic', 'Acetylcholine', [('A4B2_flubatine_hc30_hillmer.nii.gz', 30, '[18F]flubatine', 'Hillmer et al. 2016')]),
    'M1': ('M1 muscarinic', 'Acetylcholine', [('M1_lsn_hc24_naganawa.nii.gz', 24, '[11C]LSN3172176', 'Naganawa et al. 2020')]),
    'VAChT': ('Vesicular acetylcholine transporter', 'Acetylcholine', [
        ('VAChT_feobv_hc18_aghourian_sum.nii', 18, '[18F]FEOBV', 'Aghourian et al. 2017'),
        ('VAChT_feobv_hc5_bedard_sum.nii', 5, '[18F]FEOBV', 'Bedard et al. 2019'),
        ('VAChT_feobv_hc4_tuominen.nii', 4, '[18F]FEOBV', 'Tuominen & Guimond (unpublished)')]),
    'MOR': ('μ-opioid', 'Opioid', [('MU_carfentanil_hc204_kantonen.nii', 204, '[11C]carfentanil', 'Kantonen et al. 2020'),
                                    ('MU_carfentanil_hc39_turtonen.nii', 39, '[11C]carfentanil', 'Turtonen et al. 2021')]),
    'CB1': ('CB1 cannabinoid', 'Cannabinoid', [('CB1_omar_hc77_normandin.nii.gz', 77, '[11C]OMAR', 'Normandin et al. 2015')]),
    'GABAa': ('GABA-A', 'GABA', [('GABAa-bz_flumazenil_hc16_norgaard.nii', 16, '[11C]flumazenil', 'Nørgaard et al. 2021')]),
    'NMDA': ('NMDA', 'Glutamate', [('NMDA_ge179_hc29_galovic.nii.gz', 29, '[18F]GE-179', 'Galovic et al. 2021; McGinnity et al. 2014')]),
    'mGluR5': ('mGluR5', 'Glutamate', [('mGluR5_abp_hc22_rosaneto.nii', 22, '[11C]ABP688', 'Rosa-Neto (unpublished)'),
                                        ('mGluR5_abp_hc28_dubois.nii', 28, '[11C]ABP688', 'DuBois et al. 2016'),
                                        ('mGluR5_abp_hc73_smart.nii', 73, '[11C]ABP688', 'Smart et al. 2019')]),
}

# Reference regions (Table S3): binding is measured relative to a region assumed to have almost none
# of the target, so there it is ~0 by construction rather than measured.
CEREBELLUM = ['cerebellum-gray-matter', 'vermal-lobules-i-v', 'vermal-lobules-vi-vii', 'vermal-lobules-viii-x']
OCCIPITAL = ['lateral-occipital', 'pericalcarine', 'cuneus', 'lingual']
REFERENCE = {
    **{t: ('cerebellum', CEREBELLUM) for t in ['5HT1a', '5HT1b', '5HT2a', '5HT4', '5HT6', '5HTT', 'D1', 'D2', 'M1', 'mGluR5']},
    **{t: ('occipital cortex', OCCIPITAL) for t in ['DAT', 'NET', 'MOR']},
}

EXCLUDE = {'cerebral-white-matter', 'cerebellum-white-matter', 'optic-chiasm', 'lateral-ventricle',
           'inferior-lateral-ventricle', 'third-ventricle', 'fourth-ventricle'}


def fetch(name):
    path = CACHE / name
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        print('downloading', name)
        urllib.request.urlretrieve(REPO + name, path)
    return path


def read_pet(path):
    """Any-endian, optionally gzipped 3D NIfTI-1 -> (float array [x, y, z], 3x4 voxel->mm affine)."""
    b = path.read_bytes()
    if path.suffix == '.gz':
        b = gzip.decompress(b)
    e = '<' if struct.unpack('<i', b[:4])[0] == 348 else '>'
    dims = struct.unpack(e + '8h', b[40:56])
    dtype = np.dtype({2: 'u1', 4: 'i2', 8: 'i4', 16: 'f4', 64: 'f8'}[struct.unpack(e + 'h', b[70:72])[0]]).newbyteorder(e)
    offset = int(struct.unpack(e + 'f', b[108:112])[0])
    slope, inter = struct.unpack(e + '2f', b[112:120])
    qform, sform = struct.unpack(e + '2h', b[252:256])
    if sform > 0:
        affine = np.array([struct.unpack(e + '4f', b[280 + 16 * i:296 + 16 * i]) for i in range(3)])
    else:  # qform: quaternion rotation + pixdims + offsets
        qb, qc, qd, qx, qy, qz = struct.unpack(e + '6f', b[256:280])
        pix = struct.unpack(e + '8f', b[76:108])
        qa = np.sqrt(max(0.0, 1 - qb * qb - qc * qc - qd * qd))
        R = np.array([[qa * qa + qb * qb - qc * qc - qd * qd, 2 * (qb * qc - qa * qd), 2 * (qb * qd + qa * qc)],
                      [2 * (qb * qc + qa * qd), qa * qa + qc * qc - qb * qb - qd * qd, 2 * (qc * qd - qa * qb)],
                      [2 * (qb * qd - qa * qc), 2 * (qc * qd + qa * qb), qa * qa + qd * qd - qb * qb - qc * qc]])
        R = R * np.array([pix[1], pix[2], pix[3] * (pix[0] if pix[0] in (-1, 1) else 1)])
        affine = np.c_[R, [qx, qy, qz]]
    n = dims[1] * dims[2] * dims[3]
    vol = np.frombuffer(b, dtype=dtype, count=n, offset=offset).reshape(dims[1:4], order='F').astype(np.float32)
    vol = vol * (slope or 1) + inter
    return np.nan_to_num(vol), affine


def region_means(path, full, srow, regions):
    """Mean PET value inside each region (both hemispheres), sampled at the label grid's voxels."""
    vol, affine = read_pet(path)
    inv = np.linalg.inv(np.vstack([affine, [0, 0, 0, 1]]))
    out = {}
    for name, ids in regions.items():
        vox = np.argwhere(np.isin(full, ids))
        world = vox @ srow[:, :3].T + srow[:, 3]
        pet = world @ inv[:3, :3].T + inv[:3, 3]
        out[name] = float(map_coordinates(vol, pet.T, order=1, mode='constant', cval=0).mean())
    return out


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    full, srow, jobs = cm.label_volume()
    regions = {}
    for key, side, mb, name, cid in jobs:
        if key[2:] not in EXCLUDE:
            regions.setdefault(key[2:], []).append(cid)
    names = sorted(regions)

    data, meta = {}, {}
    for tid, (label, system, maps) in TARGETS.items():
        zs, weights = [], []
        for file, n, tracer, study in maps:
            means = region_means(fetch(file), full, srow, regions)
            v = np.array([means[r] for r in names])
            print(f'{file:38s} min {v.min():8.3f} ({names[v.argmin()]})  max {v.max():8.3f} ({names[v.argmax()]})'
                  f'  cerebellum {means["cerebellum-gray-matter"]:.3f}')
            zs.append((v - v.mean()) / v.std())
            weights.append(n)
        z = np.average(zs, axis=0, weights=weights)
        rel = (z - z.min()) / (z.max() - z.min())
        for r, x in zip(names, rel):
            data.setdefault(r, {})[tid] = round(float(x), 3)
        meta[tid] = {'label': label, 'system': system,
                     'maps': [{'tracer': t, 'n': n, 'study': st} for _, n, t, st in maps]}
        if tid in REFERENCE:
            meta[tid]['reference'] = REFERENCE[tid][0]
            meta[tid]['refRegions'] = REFERENCE[tid][1]
        top = [names[i] for i in np.argsort(-rel)[:4]]
        print(f'  {label}: highest {top}')

    header = (
        '// Generated by scripts/brain/receptors.py -- regenerate, don\'t hand-edit.\n'
        '// Receptor/transporter density per region from group-averaged PET (Hansen et al. 2022, Nat Neurosci,\n'
        '// doi:10.1038/s41593-022-01186-3; maps CC BY-NC-SA 4.0), sampled on the CerebrA labels. Values are\n'
        '// relative: 0 = lowest grey-matter region, 1 = highest, per receptor. Both hemispheres pooled.\n\n'
    )
    compact = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    body = (
        'export interface ReceptorTarget {\n'
        '  label: string;\n'
        '  system: string;\n'
        '  // PET maps averaged into this target (participant-weighted)\n'
        '  maps: { tracer: string; n: number; study: string }[];\n'
        '  // reference region the tracer is measured against, and the regions it covers\n'
        '  reference?: string;\n'
        '  refRegions?: string[];\n'
        '}\n\n'
        'export const RECEPTOR_TARGETS: Record<string, ReceptorTarget> = {\n'
        + ''.join(f'  {json.dumps(k)}: {compact(v)},\n' for k, v in meta.items())
        + '};\n\n'
        '// region -> target id -> relative density (0-1)\n'
        'export const RECEPTORS: Record<string, Record<string, number>> = {\n'
        + ''.join(f'  {json.dumps(r)}: {compact(data[r])},\n' for r in names)
        + '};\n'
    )
    OUT.write_text(header + body, encoding='utf-8')
    print('wrote', OUT.relative_to(ROOT), len(names), 'regions')


if __name__ == '__main__':
    main()
