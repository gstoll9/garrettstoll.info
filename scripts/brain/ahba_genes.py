"""Genes most enriched in each /brain region, from the Allen Human Brain Atlas.

Source: Allen Human Brain Atlas microarray data (Hawrylycz et al. 2012, "An anatomically
comprehensive atlas of the adult human brain transcriptome", Nature 489:391, doi:10.1038/nature11405):
~3,700 tissue samples from 6 donors, each assayed for ~20,000 genes and annotated with its
structure in the Allen human brain ontology. Allen Institute terms of use: free to use with
citation (brain-map.org/terms-of-use).

For each region this calls the atlas's own differential-search service (the "Differential Search"
on human.brain-map.org), all 6 donors pooled: samples in the region's structures vs samples in the
whole brain, or, for regions of the cerebral cortex (Mindboggle ids >= 1000), vs the whole cerebral
cortex -- against the brain every gyrus returns the same generic cortex genes. Only DKT regions with a matching ontology structure are listed in
REGION_STRUCTURES; the Allen ontology has no entorhinal cortex, no rostral/caudal split of the
middle frontal gyrus (both get the whole gyrus) and samples no white matter or ventricles.

Usage: python -P scripts/brain/ahba_genes.py   (~45 API calls, cached in scripts/.cache/ahba/)
Writes src/app/brain/data/genes.ts.
"""

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'scripts' / '.cache' / 'ahba'
OUT = ROOT / 'src' / 'app' / 'brain' / 'data' / 'genes.ts'
API = 'https://api.brain-map.org/api/v2/data/query.json?criteria='
DONORS = '9861,10021,12876,14380,15496,15697'  # the six microarray donors
BRAIN, CORTEX = 4005, 4008
TOP = 10       # genes listed per region
MAX_P = 1e-6   # probes less significant than this are skipped

# CerebrA region -> Allen ontology structures (ids of hemisphere-less parents, which include both
# sides, or name regexes for the striate/peristriate parts of the occipital gyri).
REGION_STRUCTURES = {
    # cerebral cortex, compared with the rest of the cortex
    'superior-frontal': [4021],
    'rostral-middle-frontal': [4028], 'caudal-middle-frontal': [4028],
    'pars-opercularis': [4041], 'pars-triangularis': [4038], 'pars-orbitalis': [4044],
    'lateral-orbitofrontal': [4059, 4053, 4056],  # lateral, anterior and posterior orbital gyri
    'medial-orbitofrontal': [4047, 4050],  # gyrus rectus, medial orbital gyrus
    'precentral': [4010], 'paracentral': [4071, 4125], 'postcentral': [4085],
    'superior-parietal': [4096], 'supramarginal': [4104], 'inferior-parietal': [4111],  # angular gyrus
    'precuneus': [4118],
    'superior-temporal': [4133], 'transverse-temporal': [4168], 'middle-temporal': [4140],
    'inferior-temporal': [4147], 'fusiform': [4156],
    'pericalcarine': [r'^(cuneus|lingual gyrus), (left|right), striate$'],  # V1 on both banks
    'cuneus': [r'^cuneus, (left|right), peristriate$'],
    'lingual': [r'^lingual gyrus, (left|right), peristriate$'],
    'lateral-occipital': [4205, 4212],  # inferior and superior occipital gyri
    'rostral-anterior-cingulate': [4062],  # subcallosal cingulate gyrus
    'caudal-anterior-cingulate': [4221],  # cingulate gyrus, frontal part
    'posterior-cingulate': [4228],  # parietal part
    'isthmus-cingulate': [4235],  # retrosplenial part
    'insula': [4268],
    'parahippocampal': [4242],
    # compared with the whole brain
    'hippocampus': [4249],
    'amygdala': [4327], 'caudate': [4278], 'putamen': [4287], 'pallidum': [4293],
    'accumbens-area': [4290], 'basal-forebrain': [4300], 'thalamus': [4392],
    'ventral-diencephalon': [4540, r'^subthalamic nucleus, (left|right)$', 9072],  # hypothalamus, STN, nigra
    'brainstem': [9001, 9131, 9512],  # midbrain, pons, medulla
    'cerebellum-gray-matter': [12930],  # cerebellar hemispheres
    'vermal-lobules-i-v': [4699],
    'vermal-lobules-vi-vii': [4705, 4706, 4707, 4708],
    'vermal-lobules-viii-x': [4709, 4710, 4711, 4712],
    'cerebellum-white-matter': [4780],  # deep cerebellar nuclei
}


def get(criteria, cache_name):
    path = CACHE / cache_name
    if path.exists():
        return json.loads(path.read_text(encoding='utf-8'))['msg']
    # The differential service fails intermittently ("Informatics service request failed"), so retry.
    # (It also rejects a start_row parameter, so only the first page is requested.)
    for attempt in range(12):
        with urllib.request.urlopen(API + urllib.parse.quote(criteria, safe="[]$,:'=")) as r:
            raw = r.read()
        data = json.loads(raw)
        if data['success']:
            break
        time.sleep(1 + attempt)
    assert data['success'], data['msg']
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    return data['msg']


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ontology = get('model::Structure,rma::criteria,[graph_id$eq10],rma::options[num_rows$eqall]', 'ontology_full.json')
    def resolve(spec):
        if isinstance(spec, int):
            return [spec]
        ids = [s['id'] for s in ontology if re.search(spec, s['name'])]
        assert ids, spec
        return ids

    regions = list(REGION_STRUCTURES)
    first_subcortical = regions.index('hippocampus')
    out = {}
    for n, (region, specs) in enumerate(REGION_STRUCTURES.items()):
        ids = sorted({i for s in specs for i in resolve(s)})
        vs = CORTEX if n < first_subcortical else BRAIN
        probes = get(f"service::human_microarray_differential[donors$eq{DONORS}][structures1$eq{vs}]"
                     f"[structures2$eq{','.join(map(str, ids))}][sort_by$eq'fold-change'][sort_order$eq'down']"
                     f"[num_rows$eq100]", f'diff_{region}_vs{vs}.json')
        genes = {}
        for p in probes:
            sym = p['gene-symbol']
            # Y-chromosome genes and XIST track which donors were sampled (5 of 6 were male), not the region
            if p['chromosome'] == 'Y' or sym == 'XIST':
                continue
            if float(p['p']) > MAX_P or not p.get('entrez-id') or re.match(r'^(LOC\d|C\d+orf|A_\d|CUST_)', sym):
                continue
            fold = float(p['fold-change'])
            if sym not in genes or fold > genes[sym][2]:
                genes[sym] = [sym, p['gene-name'], round(fold, 1), p['entrez-id']]
        top = sorted(genes.values(), key=lambda g: -g[2])[:TOP]
        out[region] = {'vs': 'cortex' if vs == CORTEX else 'brain', 'genes': top}
        print(f'{region:28s}', ', '.join(f'{g[0]} {g[2]}x' for g in top))

    header = (
        '// Generated by scripts/brain/ahba_genes.py -- regenerate, don\'t hand-edit.\n'
        '// Genes most enriched in each region, from the Allen Human Brain Atlas microarray data\n'
        '// (Hawrylycz et al. 2012, Nature, doi:10.1038/nature11405; 6 donors pooled) via its\n'
        '// differential-search service. Fold change = mean expression in the region / in the comparison\n'
        '// set (`vs`: the whole cerebral cortex for cortical regions, otherwise the whole brain).\n\n'
    )
    compact = lambda v: json.dumps(v, ensure_ascii=False, separators=(',', ':'))
    body = (
        '// [gene symbol, gene name, fold change, Entrez Gene id], most enriched first\n'
        'export type EnrichedGene = [string, string, number, number];\n\n'
        'export const REGION_GENES: Record<string, { vs: \'cortex\' | \'brain\'; genes: EnrichedGene[] }> = {\n'
        + ''.join(f'  {json.dumps(k)}: {compact(v)},\n' for k, v in out.items())
        + '};\n'
    )
    OUT.write_text(header + body, encoding='utf-8')
    print('wrote', OUT.relative_to(ROOT), len(out), 'regions')


if __name__ == '__main__':
    main()
