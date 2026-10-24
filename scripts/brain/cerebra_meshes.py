"""Builds smoothed surface meshes for every CerebrA atlas label, for the /brain page.

Source: CerebrA (Manera, Dadar, Fonov & Collins 2020, Scientific Data 7:237,
doi:10.1038/s41597-020-0557-9), CC0 1.0. It is the Mindboggle-101 (Desikan-Killiany-Tourville)
labelling registered to the symmetric MNI-ICBM2009c template and manually corrected: 51 regions
per hemisphere, in separate left/right labels. https://doi.org/10.12751/g-node.be5e62

Usage: python scripts/brain/cerebra_meshes.py
Then:  node scripts/build-brain-model.mjs

Downloads the 1 mm label volume into scripts/.cache/cerebra/, then meshes every label so that
neighbours share exact boundaries (no gaps or overlaps): each label's mask is Gaussian blurred, and
label L's surface is where its blurred value equals the highest blurred value of any other label
(background included) -- a smoothed version of "which label is this point closest to". Marching
cubes at that level, Taubin smoothing, then one mesh per label is written to
scripts/.cache/cerebra/meshes/<key>.bin (uint32 vertex count, uint32 triangle count, float32 xyz
vertices in MNI mm (RAS), uint32 indices). CerebrA only labels grey matter and fluid spaces, so a
white-matter label per hemisphere is first derived: unlabelled voxels inside the cerebrum that are
brighter than cortex on the T1 template the atlas is drawn on (fluid in the fissures is darker).

Needs numpy, scipy, scikit-image and h5py (the template is MINC2, an HDF5 file).
"""

import csv
import json
import struct
import sys
import urllib.request
from pathlib import Path

import h5py
import numpy as np
from scipy import ndimage, sparse
from skimage.measure import marching_cubes

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'scripts' / '.cache' / 'cerebra'
OUT = CACHE / 'meshes'
SRC = 'https://gin.g-node.org/anamanera/CerebrA/raw/master/'
FILES = ['CerebrA.nii', 'CerebrA_LabelDetails.csv', 'LICENSE', 'mni_icbm152_t1_tal_nlin_sym_09c.mnc']

BLUR_SIGMA = 0.9  # voxels; softens the 1 mm staircase
TAUBIN_ITERS = 12

# Mindboggle ids of labels that are not part of the cerebrum's enclosed volume
NON_CEREBRAL = {16, 15, 45, 46, 630, 631, 632}  # brainstem, 4th ventricle, cerebellum, vermis


def fetch():
    CACHE.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        path = CACHE / name
        if not path.exists():
            print('downloading', name)
            urllib.request.urlretrieve(SRC + name, path)


def read_nifti(path):
    b = path.read_bytes()
    dims = struct.unpack('<8h', b[40:56])
    dtype = {2: np.uint8, 4: np.int16, 8: np.int32, 16: np.float32, 64: np.float64}[struct.unpack('<h', b[70:72])[0]]
    offset = int(struct.unpack('<f', b[108:112])[0])
    srow = np.array([struct.unpack('<4f', b[280 + 16 * i:296 + 16 * i]) for i in range(3)])
    n = dims[1] * dims[2] * dims[3]
    vol = np.frombuffer(b, dtype=dtype, count=n, offset=offset).reshape(dims[1:4], order='F')
    return np.rint(vol).astype(np.int32), srow


def read_minc2(path):
    """MINC2 volume on the same 1 mm grid as CerebrA.nii -> float array indexed [x, y, z]."""
    with h5py.File(path, 'r') as f:
        img = f['minc-2.0/image/0']
        raw = img['image'][()].astype(np.float32)  # [z, y, x]
        lo, hi = img['image-min'][()], img['image-max'][()]  # per z slice
    real = lo[:, None, None] + (hi - lo)[:, None, None] * raw / 65535
    return real.transpose(2, 1, 0)


def read_labels(path):
    """-> list of (key, side, mindboggle id, name, cerebra id)"""
    rows = list(csv.reader(path.open(encoding='utf-8-sig')))[2:]
    labels = []
    for r in rows:
        if not r or not r[0].strip():
            continue
        mb, name, rh, lh = int(r[0]), r[1].strip(), int(r[2]), int(r[3])
        slug = name.lower().replace(' ', '-')
        labels.append((f'L-{slug}', 'Left', mb, name, lh))
        labels.append((f'R-{slug}', 'Right', mb, name, rh))
    return labels


def taubin(verts, faces, iters, lam=0.5, mu=-0.53):
    n = len(verts)
    e = np.concatenate([faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [2, 0]]])
    e = np.concatenate([e, e[:, ::-1]])
    adj = sparse.coo_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n)).tocsr()
    adj.data[:] = 1
    deg = np.asarray(adj.sum(axis=1)).ravel()
    deg[deg == 0] = 1
    v = verts.astype(np.float64)
    for _ in range(iters):
        for f in (lam, mu):
            v = v + f * (adj @ v / deg[:, None] - v)
    return v


def mesh_field(field, srow):
    """Surface at field == 0 (positive inside), in MNI mm."""
    inside = np.argwhere(field > 0)
    lo = np.maximum(inside.min(0) - 2, 0)
    hi = np.minimum(inside.max(0) + 3, field.shape)
    crop = field[lo[0]:hi[0], lo[1]:hi[1], lo[2]:hi[2]]
    crop = np.pad(crop, 1, constant_values=-1)  # close surfaces cut by the volume edge
    verts, faces, _, _ = marching_cubes(crop, 0.0)
    verts = taubin(verts - 1 + lo, faces, TAUBIN_ITERS)
    world = verts @ srow[:, :3].T + srow[:, 3]
    return world.astype(np.float32), faces.astype(np.uint32)


def fill_2d(mask, axis):
    out = np.zeros_like(mask)
    for i in range(mask.shape[axis]):
        sl = [slice(None)] * 3
        sl[axis] = i
        out[tuple(sl)] = ndimage.binary_fill_holes(mask[tuple(sl)])
    return out


def main():
    fetch()
    vol, srow = read_nifti(CACHE / 'CerebrA.nii')
    labels = read_labels(CACHE / 'CerebrA_LabelDetails.csv')
    OUT.mkdir(parents=True, exist_ok=True)

    # White matter: unlabelled voxels inside the closed cerebral labels (filled slice by slice in
    # two orientations, since a 3D fill leaks through the openings at the corpus callosum and
    # brainstem) that are brighter than cortex on the T1 template -- the closing also bridges deep
    # fissures, and the fluid in them is darker than grey matter. Split at the midline.
    t1 = read_minc2(CACHE / 'mni_icbm152_t1_tal_nlin_sym_09c.mnc')
    cortex_ids = [c for _, _, mb, _, c in labels if mb >= 1000]
    grey = float(np.median(t1[np.isin(vol, cortex_ids)]))
    cerebral = np.isin(vol, [c for _, _, mb, _, c in labels if mb not in NON_CEREBRAL])
    closed = ndimage.binary_closing(cerebral, ndimage.generate_binary_structure(3, 1), iterations=3)
    wm = fill_2d(closed, 2) & fill_2d(closed, 1) & (vol == 0) & (t1 > grey)
    wm = ndimage.binary_opening(wm, iterations=1)
    xs = np.arange(vol.shape[0])[:, None, None] * srow[0, 0] + srow[0, 3]

    # One integer label volume including the derived white matter; 0 stays background.
    full = vol.copy()
    jobs = [(key, side, mb, name, cid) for key, side, mb, name, cid in labels]
    for key, side, mb, name, cid, half in (('L-cerebral-white-matter', 'Left', 2, 'Cerebral White Matter', 1001, xs < 0),
                                         ('R-cerebral-white-matter', 'Right', 41, 'Cerebral White Matter', 1002, xs > 0)):
        full[wm & half] = cid
        jobs.append((key, side, mb, name, cid))

    # Pass 1: the highest and second-highest blurred indicator at every voxel, and whose it is.
    ids = [0] + [cid for *_, cid in jobs]
    top = np.full(vol.shape, -1.0, np.float32)
    second = np.full(vol.shape, -1.0, np.float32)
    owner = np.full(vol.shape, -1, np.int32)
    blur = lambda cid: ndimage.gaussian_filter((full == cid).astype(np.float32), BLUR_SIGMA)
    for cid in ids:
        b = blur(cid)
        beats_top = b > top
        second = np.where(beats_top, top, np.maximum(second, b))
        owner = np.where(beats_top, cid, owner)
        top = np.where(beats_top, b, top)

    # Pass 2: each label's field is its blurred value minus the best competing label's.
    manifest = []
    for key, side, mb, name, cid in jobs:
        if not (full == cid).any():
            print('empty label', key, file=sys.stderr)
            continue
        b = blur(cid)
        field = b - np.where(owner == cid, second, top)
        if not (field > 0).any():
            print('label vanished after smoothing', key, file=sys.stderr)
            continue
        verts, faces = mesh_field(field, srow)
        centroid = verts.mean(0)
        if (side == 'Left') != (centroid[0] < 0):
            print(f'warning: {key} centroid x={centroid[0]:.1f} is on the wrong side', file=sys.stderr)
        with (OUT / f'{key}.bin').open('wb') as f:
            f.write(struct.pack('<II', len(verts), len(faces)))
            f.write(verts.tobytes())
            f.write(faces.tobytes())
        voxels = int((full == cid).sum())
        manifest.append({'key': key, 'side': side, 'mindboggle': mb, 'name': name,
                         'voxels': voxels, 'triangles': len(faces)})
        print(f'{key:45s} {voxels:7d} vox {len(faces):7d} tris')
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=1))
    print(len(manifest), 'meshes,', sum(m['triangles'] for m in manifest), 'triangles')


if __name__ == '__main__':
    main()
