// Builds the /worldmap "Astrophysics" focus: every observatory, telescope, radio array,
// gravitational-wave / neutrino / cosmic-ray detector and deep-space station on Earth that
// Wikidata (CC0) has coordinates for, with the facts the info panel shows and the references
// Wikidata cites for them.
//
// Each item gets the most specific category it belongs to (LIGO's sites are gravitational-wave
// detectors even though they're also observatories); see CATEGORIES, highest priority first.
//
// Output: public/worldmap/focus/astrophysics.json
// Usage:  node scripts/build-focus-astrophysics.mjs

import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/worldmap/focus/astrophysics.json');
const UA = 'garrettstoll.info-worldmap/0.1 (https://github.com/gstoll9/garrettstoll.info)';

// Wikidata class (matched with P31/P279*) per category, most specific first
const CATEGORIES = [
  { id: 'gw', label: 'Gravitational-wave detectors', qid: 'Q2302080', color: '#ff6b9d' },
  { id: 'neutrino', label: 'Neutrino detectors', qid: 'Q583152', color: '#b48cff' },
  { id: 'cosmicray', label: 'Cosmic-ray observatories', qid: 'Q3348407', color: '#ffd166' },
  { id: 'array', label: 'Radio arrays & interferometers', qid: 'Q349772', color: '#2dd4bf' },
  { id: 'radio', label: 'Radio telescopes', qid: 'Q184356', color: '#38bdf8' },
  { id: 'deepspace', label: 'Deep space stations', qid: 'Q106581431', color: '#fb923c' },
  { id: 'solar', label: 'Solar telescopes', qid: 'Q1238291', color: '#facc15' },
  { id: 'telescope', label: 'Optical & other telescopes', qid: 'Q4213', color: '#a3e635' },
  { id: 'observatory', label: 'Observatories', qid: 'Q1254933', color: '#cbd5e1' },
];

// Statements whose references are kept, and the info-panel field each one backs
const CITED = { P625: 'location', P571: 'opened', P576: 'closed', P137: 'operator', P2044: 'elevation', P17: 'country', P717: 'mpc' };

async function sparql(query, attempt = 0) {
  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'query=' + encodeURIComponent(query),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 5) {
    await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
    return sparql(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).results.bindings;
}
const qid = uri => uri.split('/').pop();
const val = (b, k) => b[k]?.value ?? '';
const split = s => (s ? [...new Set(s.split('|').filter(Boolean))] : []);

// ── 1. Which items, and their category ──────────────────────────────────────
const rows = await sparql(`SELECT DISTINCT ?i ?root WHERE {
  VALUES ?root { ${CATEGORIES.map(c => `wd:${c.qid}`).join(' ')} }
  ?i wdt:P31/wdt:P279* ?root; wdt:P625 ?coord.
}`);
const rank = new Map(CATEGORIES.map((c, i) => [c.qid, i]));
const catOf = new Map();
for (const r of rows) {
  const id = qid(r.i.value), k = rank.get(qid(r.root.value));
  if (!catOf.has(id) || k < catOf.get(id)) catOf.set(id, k);
}
const ids = [...catOf.keys()];
console.log(`${ids.length} items`);

// ── 2. Facts and references, in batches ─────────────────────────────────────
const items = new Map();
const refs = new Map();
const BATCH = 120;
for (let i = 0; i < ids.length; i += BATCH) {
  const values = ids.slice(i, i + BATCH).map(id => `wd:${id}`).join(' ');
  const facts = await sparql(`SELECT ?i (SAMPLE(?l) AS ?label) (SAMPLE(?anyL) AS ?anyLabel) (SAMPLE(?d) AS ?desc) (SAMPLE(?c) AS ?coord)
    (GROUP_CONCAT(DISTINCT ?countryL; separator="|") AS ?countries) (GROUP_CONCAT(DISTINCT ?opL; separator="|") AS ?operators)
    (GROUP_CONCAT(DISTINCT ?partL; separator="|") AS ?partOf) (SAMPLE(?placeL) AS ?place)
    (MIN(?inc) AS ?opened) (MIN(?end) AS ?closed) (SAMPLE(?elev) AS ?elevation) (SAMPLE(?web) AS ?website)
    (SAMPLE(?wp) AS ?wiki) (SAMPLE(?img) AS ?image) (SAMPLE(?mpc) AS ?mpcCode)
  WHERE {
    VALUES ?i { ${values} }
    OPTIONAL { ?i rdfs:label ?l FILTER(LANG(?l) = "en") }
    OPTIONAL { ?i rdfs:label ?anyL }
    OPTIONAL { ?i schema:description ?d FILTER(LANG(?d) = "en") }
    OPTIONAL { ?i wdt:P625 ?c }
    OPTIONAL { ?i wdt:P17 ?co. ?co rdfs:label ?countryL FILTER(LANG(?countryL) = "en") }
    OPTIONAL { ?i wdt:P137 ?op. ?op rdfs:label ?opL FILTER(LANG(?opL) = "en") }
    OPTIONAL { ?i wdt:P361 ?part. ?part rdfs:label ?partL FILTER(LANG(?partL) = "en") }
    OPTIONAL { ?i wdt:P131 ?pl. ?pl rdfs:label ?placeL FILTER(LANG(?placeL) = "en") }
    OPTIONAL { ?i wdt:P571 ?inc }
    OPTIONAL { { ?i wdt:P576 ?end } UNION { ?i wdt:P3999 ?end } }
    OPTIONAL { ?i p:P2044/psn:P2044/wikibase:quantityAmount ?elev }
    OPTIONAL { ?i wdt:P856 ?web }
    OPTIONAL { ?wpa schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?wp }
    OPTIONAL { ?i wdt:P18 ?img }
    OPTIONAL { ?i wdt:P717 ?mpc }
  } GROUP BY ?i`);
  for (const b of facts) {
    const id = qid(b.i.value);
    // "Point(lon lat)"; coordinates on other bodies carry a globe URI prefix and are skipped
    const m = /^Point\(([-\d.eE]+) ([-\d.eE]+)\)$/.exec(val(b, 'coord'));
    if (!m) continue;
    const cat = CATEGORIES[catOf.get(id)];
    items.set(id, {
      id, cat: cat.id,
      name: val(b, 'label') || val(b, 'anyLabel') || id,
      desc: val(b, 'desc') || undefined,
      lon: +(+m[1]).toFixed(5), lat: +(+m[2]).toFixed(5),
      country: split(val(b, 'countries')).join(', ') || undefined,
      place: val(b, 'place') || undefined,
      operator: split(val(b, 'operators')),
      partOf: split(val(b, 'partOf')),
      opened: val(b, 'opened').slice(0, 10) || undefined,
      closed: val(b, 'closed').slice(0, 10) || undefined,
      elevation: b.elevation ? Math.round(+b.elevation.value) : undefined,
      website: val(b, 'website') || undefined,
      wiki: val(b, 'wiki') || undefined,
      // Commons file name; the page builds a thumbnail URL from it
      image: val(b, 'image') ? decodeURIComponent(val(b, 'image').split('/').pop()) : undefined,
      mpc: val(b, 'mpcCode') || undefined,
    });
  }

  // References on the cited statements: a URL (P854) and/or a source work (P248)
  const refRows = await sparql(`SELECT ?i ?prop ?url ?statedL ?retrieved WHERE {
    VALUES ?i { ${values} }
    VALUES ?prop { ${Object.keys(CITED).map(p => `p:${p}`).join(' ')} }
    ?i ?prop ?st. ?st prov:wasDerivedFrom ?ref.
    OPTIONAL { ?ref pr:P854 ?url }
    OPTIONAL { ?ref pr:P248 ?stated. ?stated rdfs:label ?statedL FILTER(LANG(?statedL) = "en") }
    OPTIONAL { ?ref pr:P813 ?retrieved }
    FILTER(BOUND(?url) || BOUND(?statedL))
  }`);
  for (const b of refRows) {
    const id = qid(b.i.value);
    const field = CITED[qid(b.prop.value)];
    const ref = { field, title: val(b, 'statedL') || undefined, url: val(b, 'url') || undefined, retrieved: val(b, 'retrieved').slice(0, 10) || undefined };
    const list = refs.get(id) ?? [];
    if (!list.some(r => r.field === ref.field && r.title === ref.title && r.url === ref.url)) list.push(ref);
    refs.set(id, list);
  }
  process.stdout.write(`\r${Math.min(i + BATCH, ids.length)}/${ids.length}`);
}
console.log();

// Drop empty fields so the file stays small
const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length)));
const out = {
  generated: new Date().toISOString().slice(0, 10),
  source: { name: 'Wikidata', url: 'https://www.wikidata.org', license: 'CC0 1.0' },
  categories: CATEGORIES.map(({ id, label, qid: q, color }) => ({ id, label, qid: q, color })),
  items: [...items.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(it => clean({ ...it, refs: refs.get(it.id) })),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const counts = Object.fromEntries(CATEGORIES.map(c => [c.id, out.items.filter(i => i.cat === c.id).length]));
console.log(`${out.items.length} facilities (${out.items.filter(i => i.wiki).length} with Wikipedia articles, ` +
  `${out.items.filter(i => i.refs).length} with cited references) -> ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB)`);
console.log(counts);
