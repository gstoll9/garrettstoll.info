// Registry of every external data source the site uses and the jobs that refresh them.
// Single source of truth for:
//   - scripts/update-data.mjs (status / run / graph / check), the update process
//   - public/knowledgegraph/datasources.fol, the /knowledgegraph "data sources" graph
//     (generated from SOURCES; don't hand-edit it)
//
// Adding a source: add it to SOURCES (license + the pages that use it), then either add a
// job that refreshes it or list it in an existing job's `sources`. Run
// `npm run data:graph` to regenerate the knowledge graph.

// ── Sources ──────────────────────────────────────────────────────────────────
// `license` is a short token (no spaces) shown as the link label in the knowledge graph;
// `usedBy` lists site routes or other source ids (for derived datasets like world-atlas).
// `licenses` replaces `license` where a source's license differs per item (geoBoundaries).
export const SOURCES = [
  { id: 'wikipedia', name: 'Wikipedia', url: 'https://en.wikipedia.org', license: 'CC_BY-SA_4.0',
    usedBy: ['/worldmap', '/solarsystem', '/hydrogen', '/hubbardmodel', '/numericalmethods'] },
  { id: 'wikidata', name: 'Wikidata', url: 'https://www.wikidata.org', license: 'CC0_1.0', usedBy: ['/worldmap'] },
  { id: 'worldbank', name: 'World Bank Open Data', url: 'https://data.worldbank.org', license: 'CC_BY_4.0', usedBy: ['/worldmap'] },
  // License not confirmed: check the Growth Lab's Dataverse dataset pages / Atlas terms of use
  { id: 'atlas', name: 'Atlas of Economic Complexity · Harvard Growth Lab', url: 'https://atlas.hks.harvard.edu',
    license: 'Unverified', usedBy: ['/worldmap'] },
  { id: 'cshapes', name: 'CShapes 2.0 · ETH Zürich', url: 'https://icr.ethz.ch/data/cshapes/', license: 'CC_BY-NC-SA_4.0',
    usedBy: ['/worldmap'] },
  { id: 'naturalearth', name: 'Natural Earth', url: 'https://www.naturalearthdata.com', license: 'Public_Domain',
    usedBy: ['/worldmap', 'worldatlas'] },
  { id: 'worldatlas', name: 'world-atlas', url: 'https://github.com/topojson/world-atlas', license: 'ISC', usedBy: ['/worldmap'] },
  // Per-country licenses, grouped by family (see public/worldmap/admin2/sources.json)
  { id: 'geoboundaries', name: 'geoBoundaries gbOpen', url: 'https://www.geoboundaries.org', usedBy: ['/worldmap'],
    licenses: ['CC_BY_3.0_IGO', 'CC_BY_4.0', 'ODbL_1.0', 'Public_Domain', 'CC_BY-SA_2.0/3.0', 'CC_BY_3.0', 'CC0_1.0',
      'National_open_licenses'] },
  { id: 'nist', name: 'NIST Atomic Spectroscopic Data Handbook', url: 'https://physics.nist.gov/PhysRefData/Handbook/',
    license: 'NIST_SRD_Terms', usedBy: ['/hydrogen'] },
  { id: 'horizons', name: 'JPL Horizons', url: 'https://ssd.jpl.nasa.gov/horizons/', license: 'JPL_Free_Use_With_Credit',
    usedBy: ['/solarsystem'] },
  { id: 'astronomyengine', name: 'astronomy-engine', url: 'https://github.com/cosinekitty/astronomy', license: 'MIT',
    usedBy: ['/solarsystem'] },
  { id: 'mcconnachie', name: 'McConnachie Nearby Galaxies Catalog',
    url: 'https://www.cadc-ccda.hia-iha.nrc-cnrc.gc.ca/en/community/nearby/', license: 'Cite_McConnachie_2012',
    usedBy: ['/solarsystem'] },
  // Spiral-arm fits (Table 2), parsed from the arXiv TeX source saved in src/app/solarsystem/literature/reid2019/
  { id: 'reid2019', name: 'Reid et al. 2019 · Milky Way spiral arms from BeSSeL maser parallaxes', url: 'https://arxiv.org/abs/1910.03357',
    license: 'Cite_Reid_2019', usedBy: ['/solarsystem'] },
  // IBEX interstellar-wind direction the heliosphere's nose points into
  { id: 'swaczyna2023', name: 'Swaczyna et al. 2023 · IBEX interstellar neutral helium', url: 'https://arxiv.org/abs/2307.06694',
    license: 'Cite_Swaczyna_2023', usedBy: ['/solarsystem'] },
  // Inferred from the 8k equirectangular star map + constellation overlays; not recorded in the repo
  { id: 'svsstarmaps', name: 'NASA SVS Deep Star Maps', url: 'https://svs.gsfc.nasa.gov/4851', license: 'NASA_Media_Guidelines',
    usedBy: ['/solarsystem'] },
  { id: 'gaia', name: 'ESA Gaia DR2', url: 'https://www.cosmos.esa.int/web/gaia/dr2', license: 'CC_BY-SA_3.0_IGO',
    usedBy: ['svsstarmaps'] },
  { id: 'planettextures', name: 'Planet textures', url: null, license: 'Unverified', usedBy: ['/solarsystem'] },
  { id: 'bodyparts3d', name: 'BodyParts3D', url: 'https://lifesciencedb.jp/bp3d/', license: 'CC_BY-SA_2.1_JP', usedBy: ['/brain'] },
  // Lead images in the Milky Way object panel, fetched live via Wikipedia's REST summaries;
  // only Commons-hosted (freely licensed) files are shown, each linked to its file page
  { id: 'commons', name: 'Wikimedia Commons', url: 'https://commons.wikimedia.org', license: 'Per-file_free_licenses',
    usedBy: ['/solarsystem'] },
  { id: 'uniprot', name: 'UniProt', url: 'https://www.uniprot.org', license: 'CC_BY_4.0', usedBy: ['/methanogens'] },
  { id: 'pdb', name: 'RCSB PDB', url: 'https://www.rcsb.org', license: 'CC0_1.0', usedBy: ['/methanogens'] },
];

// ── Jobs ─────────────────────────────────────────────────────────────────────
// A job refreshes one set of generated files. `everyDays` is how often it should be re-run
// (null = only when the upstream source publishes a new release). Kinds:
//   auto   - `steps` run unattended; `downloads` (URL, or { url, file } for a zip) are fetched into scripts/.cache/ first and
//            `{download:<name>}` / `{cache}` in args are replaced with their local paths
//   manual - can't be run unattended (pinned release, hand-curated extraction); `checklist`
//            is printed instead, and `update-data.mjs done <job>` records it as done
// `after` names jobs that must have run first (their outputs are this job's inputs).
const CACHE = '{cache}';
export const JOBS = [
  {
    id: 'worldmap-admin1', kind: 'auto', everyDays: 365, sources: ['naturalearth', 'worldatlas'],
    downloads: { ne_admin1: { url: 'https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip',
      file: 'ne_10m_admin_1_states_provinces.shp' } },
    steps: [['node', 'scripts/build-admin1.mjs', '{download:ne_admin1}']],
    outputs: ['public/worldmap/admin1', 'public/worldmap/countries-50m.json'],
  },
  {
    id: 'worldmap-admin2', kind: 'auto', everyDays: 365, after: ['worldmap-admin1'], sources: ['naturalearth', 'geoboundaries'],
    downloads: { ne_admin2: { url: 'https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_2_counties.zip',
      file: 'ne_10m_admin_2_counties.shp' } },
    steps: [['node', 'scripts/build-admin2.mjs', '{download:ne_admin2}', `${CACHE}/geoboundaries`]],
    outputs: ['public/worldmap/admin2'],
  },
  {
    id: 'worldmap-history', kind: 'auto', everyDays: 365, sources: ['cshapes', 'wikipedia', 'wikidata'],
    steps: [['node', 'scripts/build-history.mjs', `${CACHE}/cshapes`]],
    outputs: ['public/worldmap/history', 'public/worldmap/db/entities.csv', 'public/worldmap/db/entity_periods.csv'],
  },
  {
    // Office holders, legislatures and capitals change with elections; the subregion steps
    // read the admin-1/admin-2 map files
    id: 'worldmap-government', kind: 'auto', everyDays: 30, after: ['worldmap-admin2'], sources: ['wikidata', 'wikipedia'],
    steps: [['node', 'scripts/build-worldmap-db.mjs', 'wikidata']],
    outputs: ['public/worldmap/db'],
  },
  {
    id: 'worldmap-indicators', kind: 'auto', everyDays: 90, sources: ['worldbank'],
    steps: [['node', 'scripts/build-worldmap-db.mjs', 'worldbank']],
    outputs: ['public/worldmap/db'],
  },
  {
    // Slow (rate-limited API); the Atlas publishes a new data year roughly annually
    id: 'worldmap-trade', kind: 'auto', everyDays: 180, sources: ['atlas'],
    steps: [['node', 'scripts/build-worldmap-db.mjs', 'trade']],
    outputs: ['public/worldmap/db'],
  },
  {
    id: 'hydrogen-nist', kind: 'auto', everyDays: 730, sources: ['nist'],
    steps: [['python', 'src/app/hydrogen/nist/nistScraper.py'], ['python', 'src/app/hydrogen/nist/generateTs.py']],
    outputs: ['src/app/hydrogen/nist', 'src/app/hydrogen/data/nistSpectralLines.ts'],
  },
  {
    id: 'solarsystem-moons', kind: 'manual', everyDays: 365, sources: ['horizons'],
    outputs: ['src/app/solarsystem/data/moonElements.ts'],
    checklist: [
      'Horizons responses are cached under src/app/solarsystem/jpl/horizons/; to refit, move the fit epoch in jpl/generateTs.py forward and delete the cached .txt files',
      'python -I src/app/solarsystem/jpl/generateTs.py',
      'Check the printed error vs Horizons for 2020-2040 is still ≲3° (Mimas ~15°, Hyperion ~25°)',
    ],
  },
  {
    id: 'solarsystem-localgroup', kind: 'manual', everyDays: null, sources: ['mcconnachie'],
    outputs: ['src/app/solarsystem/data/localGroup.ts'],
    checklist: [
      'Check the CADC page for a catalog newer than NearbyGalaxies_Jan2021_PUBLIC.fits',
      'Save it under src/app/solarsystem/localgroup/ and update FITS in localgroup/generateTs.py',
      'python -I src/app/solarsystem/localgroup/generateTs.py',
    ],
  },
  {
    id: 'solarsystem-wikipedia', kind: 'manual', everyDays: 365, sources: ['wikipedia'],
    outputs: ['src/app/solarsystem/wikipedia', 'src/app/solarsystem/data/planetStructure.ts', 'src/app/solarsystem/data/asteroids.ts'],
    checklist: [
      'Re-save the planet/asteroid pages under src/app/solarsystem/wikipedia/ (wikiScraper.py)',
      'Diff the infobox/layer values against data/planetStructure.ts, asteroids.ts, dwarfPlanets.ts, rings.ts and moonAppearance.ts; these are hand-extracted, so update by hand',
    ],
  },
  {
    id: 'solarsystem-milkyway', kind: 'manual', everyDays: 365, sources: ['reid2019', 'wikipedia'],
    outputs: ['src/app/solarsystem/data/milkyWay.ts'],
    checklist: [
      'Re-save the object lists named in src/app/solarsystem/galaxy/generateMilkyWay.py (reached from Wikipedia "Lists of astronomical objects") under src/app/solarsystem/wikipedia/Galaxy/Lists/',
      'python -I src/app/solarsystem/galaxy/generateMilkyWay.py',
      'Check the printed kept/skipped counts per list; a big drop means a table layout changed',
    ],
  },
  {
    id: 'solarsystem-galactic-motion', kind: 'manual', everyDays: null, sources: ['wikipedia', 'swaczyna2023'],
    outputs: ['src/app/solarsystem/data/galacticMotion.ts', 'src/app/solarsystem/components/Heliosphere.tsx'],
    checklist: [
      'Re-save the pages under src/app/solarsystem/wikipedia/Galaxy/ (Oort constants, Solar apex, Sun, Galactic year, Milky Way, Local standard of rest)',
      'Hand-curated: update the constants in data/galacticMotion.ts and re-check the consistency figures in its header',
      'Heliosphere nose: INFLOW_LON/INFLOW_LAT in components/Heliosphere.tsx come from Swaczyna et al. 2023 (abstract in src/app/solarsystem/literature/); update if IBEX/IMAP publish a newer inflow vector',
    ],
  },
  {
    id: 'brain-model', kind: 'manual', everyDays: null, sources: ['bodyparts3d'],
    outputs: ['public/brainImages/brain.glb'],
    checklist: [
      'BodyParts3D is a finished release, pinned to a mirror commit (COMMIT in scripts/build-brain-model.mjs); only rerun after changing PARTS or the commit',
      'node scripts/build-brain-model.mjs',
    ],
  },
];
