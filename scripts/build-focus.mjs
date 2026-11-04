// Builds a /worldmap focus (see scripts/focuses.mjs) from Wikidata (CC0): every matching place
// with coordinates, its category, the facts the info box shows and the references Wikidata
// cites for them.
//
// Output, so the page only downloads what the map needs up front:
//   public/worldmap/focus/<id>.json      categories + one compact row per place (id, category,
//                                        name, lon, lat, has-article flag, time-filter years)
//   public/worldmap/focus/<id>/<n>.json  the info-box facts, sharded by QID (QID number mod n)
// Usage:  node scripts/build-focus.mjs <id> [<id> ...]     (ids: keys of FOCUSES)

import fs from 'node:fs';
import path from 'node:path';
import { FOCUSES } from './focuses.mjs';

const UA = 'garrettstoll.info-worldmap/0.1 (https://github.com/gstoll9/garrettstoll.info)';
const OUT_DIR = path.resolve('public/worldmap/focus');
const SHARD_SIZE = 250;

// General statements whose references are kept, and the info-box field each one backs
// (each focus's extras are cited too, under their own keys)
const CITED = { P625: 'location', P571: 'opened', P576: 'closed', P137: 'operator', P2044: 'elevation', P17: 'country' };

async function sparql(query, attempt = 0, maxAttempts = 8) {
  // Paced, to stay under the query service's per-client limits
  await new Promise(r => setTimeout(r, 400));
  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'query=' + encodeURIComponent(query),
  }).catch(err => ({ ok: false, status: 599, headers: new Headers(), text: async () => String(err) }));
  // Rate limits, timeouts and dropped connections: wait (as long as the service asks) and retry
  if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
    const wait = Number(res.headers.get('retry-after')) * 1000 || 10000 * (attempt + 1);
    await new Promise(r => setTimeout(r, wait));
    return sparql(query, attempt + 1, maxAttempts);
  }
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${(await res.text()).slice(0, 300)}
${query.slice(0, 300)}`);
  return (await res.json()).results.bindings;
}
const qid = uri => uri.split('/').pop();
const val = (b, k) => b[k]?.value ?? '';
const split = s => (s ? [...new Set(s.split('|').filter(Boolean))] : []);
const ENWIKI = '?wpa schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>.';

// ── Dates ───────────────────────────────────────────────────────────────────
// The query service gives dates in XSD 1.1 years (year 0 = 1 BCE) plus Wikidata's precision
// (6 millennium, 7 century, 8 decade, 9 year, 10 month, 11 day); the text keeps that precision
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
function parseDate(value, precision) {
  const m = /^(-?)(\d+)-(\d\d)-(\d\d)/.exec(value);
  if (!m) return null;
  const year = (m[1] ? -1 : 1) * +m[2];
  const bce = year <= 0;
  const abs = bce ? 1 - year : year;
  const era = bce ? ' BCE' : '';
  const p = +precision || 9;
  let text;
  if (p >= 11) text = `${+m[4]} ${MONTHS[+m[3] - 1]} ${abs}${era}`;
  else if (p === 10) text = `${MONTHS[+m[3] - 1]} ${abs}${era}`;
  else if (p === 9) text = `${abs}${era}`;
  else if (p === 8) text = bce ? `c. ${abs} BCE` : `${Math.floor(abs / 10) * 10}s`;
  else if (p === 7) text = `${ordinal(Math.ceil(abs / 100))} century${era}`;
  else if (p === 6) text = `${ordinal(Math.ceil(abs / 1000))} millennium${era}`;
  else text = `c. ${abs.toLocaleString('en-US')}${era || ' CE'}`;
  return { year, text };
}
// "value|precision;value|precision" -> the earliest
function earliest(list) {
  const dates = (list ? list.split(';') : []).map(s => parseDate(...s.split('|'))).filter(Boolean);
  return dates.sort((a, b) => a.year - b.year)[0];
}

async function build(id) {
  const focus = FOCUSES[id];
  if (!focus) throw new Error(`Unknown focus "${id}" (known: ${Object.keys(FOCUSES).join(', ')})`);
  const cats = focus.categories;
  const extras = focus.extras ?? [];
  console.log(`── ${id}`);

  // ── 1. Which items, and their category ────────────────────────────────────
  const walks = new Map();
  const walk = async q => {
    if (!walks.has(q)) walks.set(q, new Set((await sparql(`SELECT ?c WHERE { ?c wdt:P279* wd:${q} }`)).map(r => qid(r.c.value))));
    return walks.get(q);
  };
  const excluded = new Set();
  for (const q of focus.exclude ?? []) for (const c of await walk(q)) excluded.add(c);
  const catSets = [];
  for (const c of cats) {
    const s = new Set();
    for (const q of c.qids ?? []) for (const x of await walk(q)) if (!excluded.has(x)) s.add(x);
    catSets.push(s);
  }
  const fallback = cats.findIndex(c => !c.qids);

  // item -> its P31 types (as far as the queries saw them)
  const types = new Map();
  const note = (i, c) => {
    const set = types.get(i) ?? new Set();
    if (c) set.add(c);
    types.set(i, set);
  };
  const enwiki = focus.enwiki ? ENWIKI : '';
  if (focus.where) {
    for (const r of await sparql(`SELECT ?i ?c WHERE { ?i ${focus.where}; wdt:P625 ?co. ${enwiki} OPTIONAL { ?i wdt:P31 ?c } }`)) {
      note(qid(r.i.value), r.c && qid(r.c.value));
    }
  } else {
    // One class list at a time: a single P31/P279* walk over a big class times out
    const classes = new Set();
    for (const q of focus.roots ?? cats.flatMap(c => c.qids ?? [])) for (const x of await walk(q)) if (!excluded.has(x)) classes.add(x);
    // A chunk that keeps timing out is split in half (a lone class gets the full retries)
    const match = async chunk => {
      const values = chunk.map(c => `wd:${c}`).join(' ');
      const q = `SELECT DISTINCT ?i ?c WHERE { VALUES ?c { ${values} } ?i wdt:P31 ?c; wdt:P625 ?co. ${enwiki} }`;
      if (chunk.length === 1) return sparql(q);
      try { return await sparql(q, 0, 2); } catch {
        const h = chunk.length >> 1;
        return [...await match(chunk.slice(0, h)), ...await match(chunk.slice(h))];
      }
    };
    const list = [...classes];
    for (let i = 0; i < list.length; i += 200) {
      for (const r of await match(list.slice(i, i + 200))) note(qid(r.i.value), qid(r.c.value));
    }
  }
  const catOf = new Map();
  for (const [item, ts] of types) {
    const k = catSets.findIndex(s => [...ts].some(t => s.has(t)));
    if (k >= 0) catOf.set(item, k);
    else if (fallback >= 0) catOf.set(item, fallback);
  }

  // Parts of matched items take their parent's category (LIGO's sites, KAGRA within Kamioka);
  // sites containing matched items (Mauna Kea Observatories) are added in `siteCategory`
  if (focus.expandParts) {
    const matched = [...catOf.keys()];
    const SITE = cats.findIndex(c => c.id === focus.expandParts.siteCategory);
    const siteClasses = focus.expandParts.siteClasses.map(c => `wd:${c}`).join(' ');
    for (let i = 0; i < matched.length; i += 100) {
      const values = matched.slice(i, i + 100).map(m => `wd:${m}`).join(' ');
      // Three small queries: one UNION of them times out
      const rows = [
        ...(await sparql(`SELECT DISTINCT ?item ?from WHERE { VALUES ?from { ${values} } ?from wdt:P527 ?item. ?item wdt:P625 ?c. }`)).map(r => ({ ...r, kind: 'part' })),
        ...(await sparql(`SELECT DISTINCT ?item ?from WHERE { VALUES ?from { ${values} } ?item wdt:P361 ?from; wdt:P625 ?c. }`)).map(r => ({ ...r, kind: 'part' })),
        ...(await sparql(`SELECT DISTINCT ?item ?from WHERE { VALUES ?from { ${values} } VALUES ?t { ${siteClasses} } ?from wdt:P361 ?item. ?item wdt:P31 ?t; wdt:P625 ?c. }`)).map(r => ({ ...r, kind: 'site' })),
      ];
      for (const r of rows) {
        const item = qid(r.item.value);
        const k = r.kind === 'part' ? catOf.get(qid(r.from.value)) : SITE;
        if (!catOf.has(item) || k < catOf.get(item)) catOf.set(item, k);
      }
    }
    console.log(`${matched.length} matched, ${catOf.size - matched.length} added as parts or sites`);
  }

  // Hand-curated, cited gaps (items without coordinates on Wikidata) and dropped items
  const sup = focus.supplement ?? { coordinates: [], drop: [] };
  const catIndex = new Map(cats.map((c, i) => [c.id, i]));
  for (const s of sup.coordinates) catOf.set(s.id, catIndex.get(s.cat));
  for (const d of sup.drop) catOf.delete(d.id);
  const supplied = new Map(sup.coordinates.map(s => [s.id, s]));
  const ids = [...catOf.keys()];
  console.log(`${ids.length} items`);

  // ── 2. Facts, extras and references, in batches ───────────────────────────
  const cited = { ...CITED, ...Object.fromEntries(extras.map(e => [e.prop, e.key])) };
  const items = new Map();
  const BATCH = 120;
  for (let i = 0; i < ids.length; i += BATCH) {
    const values = ids.slice(i, i + BATCH).map(q => `wd:${q}`).join(' ');
    const facts = await sparql(`SELECT ?i (SAMPLE(?l) AS ?label) (SAMPLE(?anyL) AS ?anyLabel) (SAMPLE(?d) AS ?desc) (SAMPLE(?c) AS ?coord)
      (GROUP_CONCAT(DISTINCT ?countryL; separator="|") AS ?countries) (GROUP_CONCAT(DISTINCT ?opL; separator="|") AS ?operators)
      (GROUP_CONCAT(DISTINCT ?partL; separator="|") AS ?partOf) (SAMPLE(?placeL) AS ?place)
      (GROUP_CONCAT(DISTINCT CONCAT(STR(?inc), "|", STR(?incP)); separator=";") AS ?opened)
      (GROUP_CONCAT(DISTINCT CONCAT(STR(?end), "|", STR(?endP)); separator=";") AS ?closed)
      (SAMPLE(?elev) AS ?elevation) (SAMPLE(?web) AS ?website) (SAMPLE(?wp) AS ?wiki) (SAMPLE(?img) AS ?image)
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
      OPTIONAL { ?i p:P571/psv:P571 ?incN. ?incN wikibase:timeValue ?inc; wikibase:timePrecision ?incP }
      OPTIONAL { { ?i p:P576/psv:P576 ?endN } UNION { ?i p:P3999/psv:P3999 ?endN } ?endN wikibase:timeValue ?end; wikibase:timePrecision ?endP }
      OPTIONAL { ?i p:P2044/psn:P2044/wikibase:quantityAmount ?elev }
      OPTIONAL { ?i wdt:P856 ?web }
      OPTIONAL { ?wpa schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?wp }
      OPTIONAL { ?i wdt:P18 ?img }
    } GROUP BY ?i`);
    for (const b of facts) {
      const item = qid(b.i.value);
      // "Point(lon lat)"; coordinates on other bodies carry a globe URI prefix and are skipped.
      // Supplemented items use the supplement's cited location.
      const s = supplied.get(item);
      const m = s ? [null, s.lon, s.lat] : /^Point\(([-\d.eE]+) ([-\d.eE]+)\)$/.exec(val(b, 'coord'));
      if (!m) continue;
      const opened = earliest(val(b, 'opened'));
      const closed = earliest(val(b, 'closed'));
      items.set(item, {
        id: item, cat: cats[catOf.get(item)].id,
        name: val(b, 'label') || val(b, 'anyLabel') || item,
        desc: val(b, 'desc') || undefined,
        lon: +(+m[1]).toFixed(5), lat: +(+m[2]).toFixed(5),
        country: split(val(b, 'countries')).join(', ') || undefined,
        place: val(b, 'place') || undefined,
        operator: split(val(b, 'operators')),
        partOf: split(val(b, 'partOf')),
        opened: opened?.text, closed: closed?.text,
        elevation: b.elevation ? Math.round(+b.elevation.value) : undefined,
        website: val(b, 'website') || undefined,
        wiki: val(b, 'wiki') || s?.wiki || undefined,
        // Commons file name; the page builds a thumbnail URL from it
        image: val(b, 'image') ? decodeURIComponent(val(b, 'image').split('/').pop()) : undefined,
        extra: {},
        years: { opened: opened?.year, closed: closed?.year },
        shown: {},   // prop -> the statement a 'latest' extra shows
        refs: [],
      });
    }

    if (extras.length) {
      const rows = await sparql(`SELECT ?i ?prop ?st ?v ?vL ?t ?tv ?tp WHERE {
        VALUES ?i { ${values} }
        VALUES (?prop ?ps ?psv) { ${extras.map(e => `(p:${e.prop} ps:${e.prop} psv:${e.prop})`).join(' ')} }
        ?i ?prop ?st. ?st ?ps ?v; wikibase:rank ?rank. FILTER(?rank != wikibase:DeprecatedRank)
        OPTIONAL { ?v rdfs:label ?vL FILTER(LANG(?vL) = "en") }
        OPTIONAL { ?st pq:P585 ?t }
        OPTIONAL { ?st ?psv ?node. ?node wikibase:timeValue ?tv; wikibase:timePrecision ?tp }
      }`);
      const byKey = new Map();
      for (const b of rows) {
        const it = items.get(qid(b.i.value));
        const e = extras.find(x => x.prop === qid(b.prop.value));
        if (!it || !e) continue;
        const k = `${it.id}|${e.key}`;
        if (!byKey.has(k)) byKey.set(k, { it, e, rows: [] });
        byKey.get(k).rows.push(b);
      }
      for (const { it, e, rows: rs } of byKey.values()) {
        if (e.type === 'string') it.extra[e.key] = [...new Set(rs.map(b => val(b, 'v')))].join(', ');
        else if (e.type === 'item') it.extra[e.key] = [...new Set(rs.map(b => val(b, 'vL')).filter(Boolean))].join(', ');
        else if (e.type === 'date') {
          const d = earliest(rs.filter(b => b.tv).map(b => `${val(b, 'tv')}|${val(b, 'tp')}`).join(';'));
          if (d) { it.extra[e.key] = d.text; it.years[e.key] = d.year; }
        } else if (e.type === 'latest') {
          const best = rs.filter(b => parseDate(val(b, 't'), 9) && !isNaN(+val(b, 'v'))).sort((a, b) => val(b, 't').localeCompare(val(a, 't')))[0];
          // Only the shown statement's references are cited (not every year's)
          if (best) it.shown[e.prop] = val(best, 'st');
          if (best) it.extra[e.key] = `${Math.round(+val(best, 'v')).toLocaleString('en-US')} (${parseDate(val(best, 't'), 9).text})`;
        }
        if (!it.extra[e.key]) delete it.extra[e.key];
      }
    }

    // References on the cited statements: a URL (P854) and/or a source work (P248)
    const refRows = await sparql(`SELECT ?i ?prop ?st ?url ?statedL ?retrieved WHERE {
      VALUES ?i { ${values} }
      VALUES ?prop { ${Object.keys(cited).map(p => `p:${p}`).join(' ')} }
      ?i ?prop ?st. ?st prov:wasDerivedFrom ?ref.
      OPTIONAL { ?ref pr:P854 ?url }
      OPTIONAL { ?ref pr:P248 ?stated. ?stated rdfs:label ?statedL FILTER(LANG(?statedL) = "en") }
      OPTIONAL { ?ref pr:P813 ?retrieved }
      FILTER(BOUND(?url) || BOUND(?statedL))
    }`);
    for (const b of refRows) {
      const it = items.get(qid(b.i.value));
      if (!it) continue;
      if (it.shown[qid(b.prop.value)] && it.shown[qid(b.prop.value)] !== val(b, 'st')) continue;
      const ref = { field: cited[qid(b.prop.value)], title: val(b, 'statedL') || undefined, url: val(b, 'url') || undefined, retrieved: val(b, 'retrieved').slice(0, 10) || undefined };
      if (!it.refs.some(r => r.field === ref.field && r.title === ref.title && r.url === ref.url)) it.refs.push(ref);
    }
    process.stdout.write(`\r${Math.min(i + BATCH, ids.length)}/${ids.length}`);
  }
  console.log();

  // The supplement's citations for the locations it supplied
  for (const s of sup.coordinates) {
    const it = items.get(s.id);
    if (it) it.refs = [{ field: 'location', title: s.ref.title, url: s.ref.url }, ...it.refs.filter(r => r.field !== 'location')];
  }

  // ── 3. Write the points file and the detail shards ────────────────────────
  const list = [...items.values()].sort((a, b) => a.name.localeCompare(b.name));
  const shards = Math.max(1, Math.ceil(list.length / SHARD_SIZE));
  const yearOf = (it, key) => (key ? it.years[key] ?? null : null);
  const clean = o => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '' &&
    !(Array.isArray(v) && !v.length) && !(v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length)));
  const index = {
    generated: new Date().toISOString().slice(0, 10),
    source: { name: 'Wikidata', url: 'https://www.wikidata.org', license: 'CC0 1.0' },
    label: focus.label,
    dates: focus.dates,
    extras: extras.map(({ key, label, link }) => clean({ key, label, link })),
    shards,
    categories: cats.map(({ id: c, label, one, color }) => ({ id: c, label, one, color })),
    // [id, category index, name, lon, lat, has Wikipedia article (0/1), shown from year, until year, country]
    points: list.map(it => [it.id, catIndex.get(it.cat), it.name, it.lon, it.lat, it.wiki ? 1 : 0, yearOf(it, focus.time.from), yearOf(it, focus.time.to), it.country?.split(', ')[0] ?? null]),
  };
  const dir = path.join(OUT_DIR, id);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const buckets = Array.from({ length: shards }, () => ({}));
  for (const it of list) buckets[+it.id.slice(1) % shards][it.id] = clean({ ...it, years: undefined, shown: undefined });
  buckets.forEach((b, n) => fs.writeFileSync(path.join(dir, `${n}.json`), JSON.stringify(b)));
  const file = path.join(OUT_DIR, `${id}.json`);
  fs.writeFileSync(file, JSON.stringify(index));

  const counts = Object.fromEntries(cats.map(c => [c.id, list.filter(i => i.cat === c.id).length]));
  console.log(`${list.length} places (${list.filter(i => i.wiki).length} with Wikipedia articles, ${list.filter(i => i.refs.length).length} with cited references)`);
  console.log(`-> ${file} (${(fs.statSync(file).size / 1e6).toFixed(2)} MB) + ${shards} shards`);
  console.log(counts);
}

const ids = process.argv.slice(2);
if (!ids.length) throw new Error(`Usage: node scripts/build-focus.mjs <id> [...]  (${Object.keys(FOCUSES).join(', ')})`);
for (const id of ids) await build(id);
