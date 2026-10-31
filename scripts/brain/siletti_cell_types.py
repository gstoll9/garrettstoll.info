"""Cell-type composition of each /brain region, from the Human Brain Cell Atlas v1.0.

Source: Siletti et al. 2023, "Transcriptomic diversity of cell types across the adult human brain",
Science 382:eadd7046, doi:10.1126/science.add7046. Single-nucleus RNA-seq of ~3.4 million nuclei from
~100 dissections of 3 donors (plus a fourth donor's cortex), clustered into 31 superclusters and 461
clusters. The data are CC BY 4.0 on CELLxGENE (collection 283d65eb-dd53-496d-adb7-7570c7caa443);
this script reads the same per-cell metadata (dissection + cluster of every nucleus) from the
Allen Brain Cell Atlas's public mirror, which is one CSV instead of 138 expression files.

Usage: python scripts/brain/siletti_cell_types.py   (downloads ~830 MB into scripts/.cache/whb/)

Each Siletti dissection (a DHBA structure, e.g. "Human A44-A45" = Brodmann areas 44-45) is assigned
by hand to the CerebrA region that contains it (ROI_TO_REGION below); regions with no dissection
get no entry. Dissections were not recorded per hemisphere, so both sides share one composition.
Writes src/app/brain/data/cellTypes.ts: per region,
neuron types as shares of its neurons (also by main neurotransmitter) and other types as
shares of its non-neuronal nuclei.
"""

import json
import urllib.request
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'scripts' / '.cache' / 'whb'
OUT = ROOT / 'src' / 'app' / 'brain' / 'data' / 'cellTypes.ts'
BUCKET = 'https://allen-brain-cell-atlas.s3.us-west-2.amazonaws.com/metadata/'
FILES = {
    'cell_metadata.csv': 'WHB-10Xv3/20241115/cell_metadata.csv',
    'region_of_interest_structure_map.csv': 'WHB-10Xv3/20241115/region_of_interest_structure_map.csv',
    'cluster_annotation_term.csv': 'WHB-taxonomy/20240330/cluster_annotation_term.csv',
    'cluster_to_cluster_annotation_membership.csv': 'WHB-taxonomy/20240330/cluster_to_cluster_annotation_membership.csv',
}

# Siletti dissection (region_of_interest_label minus "Human ") -> CerebrA region id. Cortical
# dissections are Brodmann/DHBA areas placed in the DKT gyrus that holds them.
ROI_TO_REGION = {
    'A46': 'rostral-middle-frontal',
    'A44-A45': ['pars-opercularis', 'pars-triangularis'],  # one dissection spanning both
    'A13': 'lateral-orbitofrontal',
    'A14': 'medial-orbitofrontal', 'A25': 'medial-orbitofrontal',  # gyrus rectus, subgenual area
    'M1C': 'precentral',
    'S1C': 'postcentral',
    'A5-A7': 'superior-parietal',
    'A40': 'supramarginal',
    'STG': 'superior-temporal',
    'A1C': 'transverse-temporal',  # Heschl's gyrus
    'MTG': 'middle-temporal',
    'ITG': 'inferior-temporal',
    'A38': 'superior-temporal',  # temporal pole, which DKT folds into the superior temporal gyrus
    'V1C': 'pericalcarine',
    'V2': ['cuneus', 'lingual'],  # V2 borders V1 above and below the calcarine sulcus
    'A19': 'lateral-occipital',
    'ACC': 'rostral-anterior-cingulate', 'A32': 'rostral-anterior-cingulate',
    'A23': 'posterior-cingulate',
    'A29-A30': 'isthmus-cingulate',  # retrosplenial cortex
    'Ig': 'insula', 'Idg': 'insula', 'FI': 'insula',
    'LEC': 'entorhinal', 'MEC': 'entorhinal',
    'TF': 'parahippocampal', 'TH-TL': 'parahippocampal', 'A35-A36': 'parahippocampal', 'A35r': 'parahippocampal',
    **{r: 'hippocampus' for r in ['CA1', 'CA1-2R', 'CA1C-CA3C', 'CA1R-CA2R-CA3R', 'CA1U-CA2U-CA3U', 'CA2-3',
                                   'CA3R', 'CA4C-DGC', 'DG-CA4', 'DGR-CA4', 'DGR-CA4Rpy', 'DGU-CA4Upy',
                                   'Rostral CA1-CA3', 'Rostral DG-CA4', 'Sub']},
    **{r: 'amygdala' for r in ['BL', 'BM', 'CEN', 'CMN', 'CoA', 'La']},
    'CaB': 'caudate',
    'Pu': 'putamen',
    'GPe': 'pallidum', 'GPi': 'pallidum',
    'NAC': 'accumbens-area',
    'SI': 'basal-forebrain', 'SEP': 'basal-forebrain', 'BNST': 'basal-forebrain',
    **{r: 'thalamus' for r in ['ANC', 'CM', 'CM-Pf', 'LG', 'LP', 'LP-VPL', 'MD', 'MD-Re', 'MG', 'Pul', 'VA',
                                'VLN', 'VPL', 'ETH']},
    # FreeSurfer's ventral diencephalon (which CerebrA follows) holds the hypothalamus, mammillary
    # bodies, subthalamic nucleus, substantia nigra and red nucleus.
    **{r: 'ventral-diencephalon' for r in ['HTHma', 'HTHma-HTHtub', 'HTHpo', 'HTHpo-HTHso', 'HTHso',
                                            'HTHso-HTHtub', 'HTHtub', 'MN', 'STH', 'SN', 'SN-RN', 'RN']},
    **{r: 'brainstem' for r in ['PAG', 'PAG-DR', 'SC', 'IC', 'PTR', 'DTg', 'PB', 'PN', 'PnAN', 'PnEN', 'PnRF',
                                 'MoAN', 'MoRF-MoEN', 'MoSR', 'IO']},
    'CBL': 'cerebellum-gray-matter',
    'CBV': ['vermal-lobules-i-v', 'vermal-lobules-vi-vii', 'vermal-lobules-viii-x'],
    'CbDN': 'cerebellum-white-matter',  # deep nuclei sit inside the cerebellar white matter
    # Not placed: AON, Pir, Cla, Pro (no matching CerebrA label), SpC (spinal cord).
}

# A neuron cluster's main transmitter, from its neurotransmitter annotation (marker genes): the
# neuromodulators first, then fast inhibitory, then glutamate.
TRANSMITTERS = [('DA', 'Dopamine'), ('SER', 'Serotonin'), ('HDC', 'Histamine'), ('CHOL', 'Acetylcholine'),
                ('GLY', 'Glycine'), ('GABA', 'GABA'), ('VGLUT', 'Glutamate')]


def fetch():
    CACHE.mkdir(parents=True, exist_ok=True)
    for name, key in FILES.items():
        path = CACHE / name
        if not path.exists():
            print('downloading', name)
            urllib.request.urlretrieve(BUCKET + key, path)


def main():
    fetch()
    terms = pd.read_csv(CACHE / 'cluster_annotation_term.csv')
    sups = terms[terms.cluster_annotation_term_set_name == 'supercluster'].sort_values('term_order')
    sup_names = sups.name.tolist()
    member = pd.read_csv(CACHE / 'cluster_to_cluster_annotation_membership.csv')
    per_cluster = member.pivot_table(index='cluster_alias', columns='cluster_annotation_term_set_name',
                                     values='cluster_annotation_term_name', aggfunc='first')

    def transmitter(nt):
        if not isinstance(nt, str):
            return None
        return next((name for tag, name in TRANSMITTERS if tag in nt), None)

    per_cluster['nt'] = per_cluster.neurotransmitter.map(transmitter)

    cells = pd.read_csv(CACHE / 'cell_metadata.csv',
                        usecols=['cluster_alias', 'region_of_interest_label', 'feature_matrix_label'])
    cells['roi'] = cells.region_of_interest_label.str.removeprefix('Human ')
    cells['sup'] = cells.cluster_alias.map(per_cluster.supercluster)
    cells['nt'] = cells.cluster_alias.map(per_cluster.nt)
    cells['neuron'] = cells.feature_matrix_label.str.endswith('-Neurons')
    unmapped = sorted(set(cells.roi) - set(ROI_TO_REGION))
    print('dissections not placed:', unmapped)

    rows = []
    for roi, regions in ROI_TO_REGION.items():
        for region in [regions] if isinstance(regions, str) else regions:
            rows.append((roi, region))
    roi_region = pd.DataFrame(rows, columns=['roi', 'region'])
    missing = set(roi_region.roi) - set(cells.roi)
    assert not missing, f'dissections not in the data: {missing}'
    joined = cells[['roi', 'sup', 'nt', 'neuron']].merge(roi_region, on='roi')

    # Many samples were sorted to enrich neurons, so neuron/glia ratios say nothing about the tissue:
    # neuron types are shares of the neurons, other types shares of the non-neuronal nuclei.
    out = {}
    for region, g in joined.groupby('region'):
        neurons, others = g[g.neuron], g[~g.neuron]

        def shares(sub):
            v = (sub.sup.value_counts() / max(len(sub), 1)).sort_values(ascending=False)
            # [supercluster index, share], largest first, dropping shares under 0.5%
            return [[sup_names.index(k), round(float(x), 3)] for k, x in v.items() if x >= 0.005]

        nt = neurons.nt.value_counts() / max(len(neurons), 1)
        out[region] = {
            'neurons': len(neurons),
            'others': len(others),
            'dissections': sorted(g.roi.unique()),
            'neuronTypes': shares(neurons),
            'otherTypes': shares(others),
            'transmitters': {k: round(float(v), 3) for k, v in nt.items() if v >= 0.005},
        }
        print(f'{region:28s} {len(neurons):7d} neurons {len(others):7d} other')

    roi_names = pd.read_csv(CACHE / 'region_of_interest_structure_map.csv')
    roi_names['roi'] = roi_names.region_of_interest_label.str.removeprefix('Human ')
    names = roi_names.groupby('roi').structure_name.apply(lambda s: ' + '.join(dict.fromkeys(s)))
    dissections = {r: names[r] for r in sorted(set(roi_region.roi))}
    colors = dict(zip(sups.name, sups.color_hex_triplet))

    header = (
        '// Generated by scripts/brain/siletti_cell_types.py -- regenerate, don\'t hand-edit.\n'
        '// Cell-type composition per region from the Human Brain Cell Atlas v1.0 (Siletti et al. 2023,\n'
        '// Science, doi:10.1126/science.add7046; CC BY 4.0 via CELLxGENE). Shares are of the nuclei\n'
        '// sequenced from the dissections listed for each region, pooled over donors and hemispheres:\n'
        '// neuron types as shares of the neurons, other types as shares of the non-neuronal nuclei\n'
        '// (many samples were enriched for neurons, so the neuron/glia ratio is not the tissue\'s).\n\n'
    )
    compact = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    lines = lambda d: '{\n' + ''.join(f'  {json.dumps(k)}: {compact(v)},\n' for k, v in d.items()) + '}'
    sup_list = '[\n' + ''.join(f'  {compact({"name": s, "color": colors[s]})},\n' for s in sup_names) + ']'
    body = (
        f'export const SUPERCLUSTERS: {{ name: string; color: string }}[] = {sup_list};\n\n'
        '// Siletti dissection code -> DHBA structure name.\n'
        f'export const DISSECTIONS: Record<string, string> = {lines(dissections)};\n\n'
        'export interface RegionCells {\n'
        '  neurons: number;\n'
        '  others: number;\n'
        '  dissections: string[];\n'
        '  // [index into SUPERCLUSTERS, share], largest first\n'
        '  neuronTypes: [number, number][];\n'
        '  otherTypes: [number, number][];\n'
        '  // main neurotransmitter -> share of neurons\n'
        '  transmitters: Record<string, number>;\n'
        '}\n\n'
        f'export const REGION_CELLS: Record<string, RegionCells> = {lines(out)};\n'
    )
    OUT.write_text(header + body, encoding='utf-8')
    print('wrote', OUT.relative_to(ROOT), len(out), 'regions')


if __name__ == '__main__':
    main()
