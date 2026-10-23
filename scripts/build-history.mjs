// Builds the /worldmap time slider's historical country borders, 1886–2019, from CShapes 2.0
// (ETH Zürich, CC BY-NC-SA 4.0 — https://icr.ethz.ch/data/cshapes/).
//
// CShapes has one row per country-period: a span in which a territory's borders and capital
// were unchanged, keyed by Gleditsch–Ward code. Each row is further split where the state
// it belongs to changed name or regime (scripts/worldmap-history-names.mjs), so every period
// links to the Wikipedia article about the state as it was then. Every title is checked
// against Wikipedia and resolved to its Wikidata QID; the build fails on an unknown title.
//
// Outputs:
//   public/worldmap/history/countries.json  TopoJSON, one feature per period (see below)
//   public/worldmap/db/entities.csv         one row per territory (gwcode)
//   public/worldmap/db/entity_periods.csv   one row per period, same rows as the TopoJSON
//
// Usage: node scripts/build-history.mjs <download-cache-dir>
// (the raw CShapes GeoJSON is downloaded into the cache dir on first run)

import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import { NAME_PERIODS } from './worldmap-history-names.mjs';
import { countrySlug } from './worldmap-geo.mjs';

const SOURCE_URL = 'https://icr.ethz.ch/data/cshapes/CShapes-2.0.geojson';
const OUT = path.resolve('public/worldmap/history/countries.json');
const DB = path.resolve('public/worldmap/db');
const UA = 'garrettstoll.info-worldmap/0.1 (https://github.com/gstoll9/garrettstoll.info)';

const [cacheDir] = process.argv.slice(2);
if (!cacheDir) {
  console.error('Usage: node scripts/build-history.mjs <download-cache-dir>');
  process.exit(1);
}
fs.mkdirSync(cacheDir, { recursive: true });
const rawFile = path.join(cacheDir, 'CShapes-2.0.geojson');
if (!fs.existsSync(rawFile)) {
  console.log(`Downloading ${SOURCE_URL}`);
  const res = await fetch(SOURCE_URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`CShapes download failed: ${res.status}`);
  fs.writeFileSync(rawFile, Buffer.from(await res.arrayBuffer()));
}
const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8'));

// Dates as YYYYMMDD integers; CShapes end dates are inclusive
const ymd = (y, m, d) => y * 10000 + m * 100 + d;
const fromIso = s => +s.replaceAll('-', '');
const toIso = n => `${String(Math.floor(n / 10000)).padStart(4, '0')}-${String(Math.floor(n / 100) % 100).padStart(2, '0')}-${String(n % 100).padStart(2, '0')}`;
const dayBefore = n => {
  const d = new Date(Date.UTC(Math.floor(n / 10000), Math.floor(n / 100) % 100 - 1, n % 100 - 1));
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
};

// "Belarus (Byelorussia)" -> "Belarus"
const defaultTitle = name => name.replace(/\s*\(.*$/, '').trim();

// Name periods for one gwcode as [{ start, candidates }], start ascending
function namePeriods(gwcode, cshapesName) {
  const list = NAME_PERIODS[gwcode] ?? [[defaultTitle(cshapesName)]];
  return list.map((entry, i) => {
    const [start, titles] = entry.length === 1 ? [null, entry[0]] : entry;
    if (i > 0 && !start) throw new Error(`gwcode ${gwcode}: only the first name period may omit its date`);
    return { start: start ? fromIso(start) : 0, candidates: Array.isArray(titles) ? titles : [titles] };
  });
}

// ── Split CShapes rows at name changes ──────────────────────────────────────
const periods = [];
for (const f of raw.features) {
  const p = f.properties;
  const s = ymd(p.gwsyear, p.gwsmonth, p.gwsday);
  const e = ymd(p.gweyear, p.gwemonth, p.gweday);
  const names = namePeriods(p.gwcode, p.cntry_name);
  names.forEach((np, i) => {
    const npEnd = i + 1 < names.length ? dayBefore(names[i + 1].start) : 99991231;
    const ps = Math.max(s, np.start);
    const pe = Math.min(e, npEnd);
    if (ps > pe) return;
    periods.push({
      gwcode: p.gwcode, cshapesName: p.cntry_name, start: ps, end: pe, candidates: np.candidates,
      capital: p.capname, capLat: p.caplat, capLon: p.caplong, area: Math.round(p.area), geometry: f.geometry,
    });
  });
}

// ── Resolve titles on Wikipedia ─────────────────────────────────────────────
// Every candidate title -> { title (canonical), qid }, or null if there's no such article
async function resolveTitles(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 50) {
    const batch = titles.slice(i, i + 50);
    const url = 'https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1'
      + '&prop=pageprops&ppprop=wikibase_item&titles=' + encodeURIComponent(batch.join('|'));
    const json = await (await fetch(url, { headers: { 'User-Agent': UA } })).json();
    const q = json.query;
    // Follow normalisation ("foo" -> "Foo") then redirects
    const step = (list, t) => list?.find(x => x.from === t)?.to ?? t;
    const pages = new Map(q.pages.map(pg => [pg.title, pg]));
    for (const t of batch) {
      const canonical = step(q.redirects, step(q.normalized, t));
      const page = pages.get(canonical);
      out.set(t, page && !page.missing && !page.invalid
        ? { title: page.title, qid: page.pageprops?.wikibase_item ?? '' }
        : null);
    }
  }
  return out;
}

const allCandidates = [...new Set(periods.flatMap(p => p.candidates))];
const resolved = await resolveTitles(allCandidates);
const missing = new Set();
for (const p of periods) {
  const hit = p.candidates.map(c => resolved.get(c)).find(Boolean);
  if (!hit) { missing.add(`${p.gwcode} ${p.cshapesName}: ${p.candidates.join(' | ')}`); continue; }
  p.title = hit.title;
  p.qid = hit.qid;
  // "Republic of China (1912–1949)" -> "Republic of China"
  p.name = hit.title.replace(/\s*\([^)]*\)$/, '');
}
const unusedFallbacks = allCandidates.filter(c => !resolved.get(c));
if (unusedFallbacks.length) console.log(`Titles not on Wikipedia (a later candidate was used where given):\n  ${unusedFallbacks.join('\n  ')}`);
if (missing.size) {
  console.error(`No Wikipedia article for:\n  ${[...missing].join('\n  ')}`);
  process.exit(1);
}

// ── Entities, and their modern counterparts in countries.csv ────────────────
// Splits one line of our own CSV output (quoted cells never contain newlines)
const csvRow = line => [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)]
  .slice(0, -1).map(m => m[1].startsWith('"') ? m[1].slice(1, -1).replace(/""/g, '"') : m[1]);
const countriesCsv = fs.readFileSync(path.join(DB, 'countries.csv'), 'utf8').trim().split('\n').slice(1).map(csvRow);
const iso3ByQid = new Map(countriesCsv.map(([iso3, , , , qid]) => [qid, iso3]));
const iso3ByName = new Map(countriesCsv.flatMap(([iso3, , , name, , slug]) => [[name, iso3], [slug, iso3]]));
const entities = new Map();
for (const p of [...periods].sort((a, b) => a.start - b.start)) {
  const ent = entities.get(p.gwcode) ?? { gwcode: p.gwcode, name: p.cshapesName, start: p.start, end: p.end, iso3: '' };
  ent.start = Math.min(ent.start, p.start);
  ent.end = Math.max(ent.end, p.end);
  // The latest period that is a present-day country links the territory to today's data
  if (iso3ByQid.has(p.qid)) ent.iso3 = iso3ByQid.get(p.qid);
  entities.set(p.gwcode, ent);
}
// Where a territory's last article isn't the country's own item (e.g. the Netherlands' QID
// in countries.csv is the Kingdom of the Netherlands), fall back to matching name or map slug
for (const ent of entities.values()) {
  const name = defaultTitle(ent.name);
  if (!ent.iso3 && ent.end >= 20191231) ent.iso3 = iso3ByName.get(name) ?? iso3ByName.get(countrySlug(name)) ?? '';
}

// ── Write ───────────────────────────────────────────────────────────────────
periods.sort((a, b) => a.gwcode - b.gwcode || a.start - b.start);
const fc = {
  type: 'FeatureCollection',
  features: periods.map(p => ({
    type: 'Feature',
    geometry: p.geometry,
    // Short keys: this file is downloaded by the browser
    properties: {
      g: p.gwcode, s: p.start, e: p.end, n: p.name, w: p.title, q: p.qid,
      c: p.capital, x: p.capLon, y: p.capLat, a: p.area,
    },
  })),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
// Shared borders become shared arcs, so the many repeats of an unchanged border cost
// little; simplified to roughly the detail of the present-day countries-50m map.
const result = await mapshaper.applyCommands(
  '-i in.json -simplify 30% weighted keep-shapes -o out.json format=topojson quantization=100000',
  { 'in.json': JSON.stringify(fc) },
);
// mapshaper names the object after the input file; the client expects "countries"
const topo = JSON.parse(result['out.json']);
topo.objects = { countries: Object.values(topo.objects)[0] };
fs.writeFileSync(OUT, JSON.stringify(topo));

const csvCell = v => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const writeCsv = (file, columns, rows) =>
  fs.writeFileSync(path.join(DB, file), [columns.join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n') + '\n');

writeCsv('entities.csv', ['gwcode', 'name', 'valid_from', 'valid_to', 'iso3'],
  [...entities.values()].sort((a, b) => a.gwcode - b.gwcode)
    .map(e => [e.gwcode, e.name, toIso(e.start), toIso(e.end), e.iso3]));
writeCsv('entity_periods.csv',
  ['gwcode', 'valid_from', 'valid_to', 'name', 'wikipedia', 'wikidata', 'capital', 'capital_lat', 'capital_lon', 'area_km2'],
  periods.map(p => [p.gwcode, toIso(p.start), toIso(p.end), p.name, p.title, p.qid, p.capital, p.capLat, p.capLon, p.area]));

console.log(`${entities.size} territories, ${periods.length} periods -> ${OUT} (${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB)`);
