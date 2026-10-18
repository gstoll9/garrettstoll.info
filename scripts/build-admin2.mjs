// Builds second-level subregion files (counties, parishes, districts, ...) for /worldmap,
// one TopoJSON file per first-level subregion. Run build-admin1.mjs first.
//
// Sources:
//   United States: Natural Earth 1:10m "Admin 2 – Counties" (public domain), which has
//     Wikidata IDs and county/parish/borough types
//     https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_2_counties.zip
//   Everywhere else: geoBoundaries gbOpen ADM2 (licenses vary by country; recorded in
//     public/worldmap/admin2/sources.json and shown on the page)
//     https://www.geoboundaries.org
//
// Usage: node scripts/build-admin2.mjs <ne_10m_admin_2_counties.shp> <download-cache-dir>
//
// Each unit is assigned to the world-atlas country, then the admin-1 subregion, containing
// its interior point, so the levels nest exactly as drawn on the map.
//
// Output: public/worldmap/admin2/<country-slug>/<admin1-id>.json, plus index.json listing
// which subregions have children.

import fs from 'node:fs';
import path from 'node:path';
import mapshaper from 'mapshaper';
import { geoBounds } from 'd3-geo';
import { feature } from 'topojson-client';
import { findContaining, loadCountries } from './worldmap-geo.mjs';

const ADMIN1_DIR = path.resolve('public/worldmap/admin1');
const OUT_DIR = path.resolve('public/worldmap/admin2');
// Simplification tolerance in meters; fine enough for county-level zoom
const SIMPLIFY = 'interval=400 keep-shapes';
// Covered by the Natural Earth US layer (which includes Puerto Rico)
const GB_SKIP = new Set(['USA', 'PRI']);

const [neShp, cacheDir] = process.argv.slice(2);
if (!neShp || !cacheDir) {
  console.error('Usage: node scripts/build-admin2.mjs <ne_10m_admin_2_counties.shp> <download-cache-dir>');
  process.exit(1);
}
fs.mkdirSync(cacheDir, { recursive: true });

// Runs mapshaper on a GeoJSON/shapefile and returns simplified features with interior points
async function prepare(files, mainFile, fields) {
  const out = await mapshaper.applyCommands(
    `-i "${mainFile}" encoding=utf8 -filter-fields ${fields} -simplify ${SIMPLIFY} ` +
    `-each "ix=this.innerX, iy=this.innerY" -o out.json format=geojson precision=0.0001`,
    files,
  );
  return JSON.parse(out['out.json']).features.filter(f => f.geometry && f.properties.ix != null);
}

// ── Load the map's countries and admin-1 subregions ─────────────────────────
const countries = loadCountries();
const admin1BySlug = new Map();
for (const file of fs.readdirSync(ADMIN1_DIR)) {
  const topo = JSON.parse(fs.readFileSync(path.join(ADMIN1_DIR, file), 'utf8'));
  const fc = feature(topo, Object.values(topo.objects)[0]);
  admin1BySlug.set(file.replace(/\.json$/, ''), fc.features.map(f => ({
    id: f.properties.id, name: f.properties.name, feature: f, bounds: geoBounds(f), label: f.properties.label,
  })));
}

// groups: "country/admin1id" -> features
const groups = new Map();
const sources = {};
function assign(units, source) {
  let dropped = 0;
  const hits = {};
  for (const f of units) {
    const pt = [f.properties.ix, f.properties.iy];
    const country = findContaining(countries, pt);
    const admin1 = country && findContaining(admin1BySlug.get(country.slug) ?? [], pt, true);
    if (!admin1) { dropped++; continue; }
    const key = `${country.slug}/${admin1.id}`;
    const { name, type, wikidata } = f.properties;
    f.properties = { name, type: type ?? null, wikidata: wikidata ?? null, label: [+pt[0].toFixed(4), +pt[1].toFixed(4)] };
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
    hits[country.slug] = (hits[country.slug] ?? 0) + 1;
  }
  // Attribute the source to the country most of its units landed in
  const main = Object.entries(hits).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (main && source) sources[main] = source;
  return dropped;
}

// ── United States: Natural Earth ─────────────────────────────────────────────
{
  const base = neShp.replace(/\.shp$/, '');
  const files = { 'in.shp': fs.readFileSync(base + '.shp'), 'in.dbf': fs.readFileSync(base + '.dbf'), 'in.cpg': 'UTF-8' };
  const units = (await prepare(files, 'in.shp', 'NAME,NAME_EN,TYPE_EN,WIKIDATAID')).map(f => {
    const p = f.properties;
    f.properties = { name: p.NAME_EN || p.NAME, type: p.TYPE_EN, wikidata: p.WIKIDATAID || null, ix: p.ix, iy: p.iy };
    return f;
  });
  const dropped = assign(units, { name: 'Natural Earth', license: 'Public Domain', url: 'https://www.naturalearthdata.com' });
  // Puerto Rico's municipios come from the same layer
  sources['puerto-rico'] = sources['united-states-of-america'];
  console.log(`Natural Earth US: ${units.length} units (${dropped} dropped)`);
}

// ── Everywhere else: geoBoundaries ──────────────────────────────────────────
const indexFile = path.join(cacheDir, 'index.json');
if (!fs.existsSync(indexFile)) {
  const res = await fetch('https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM2/');
  fs.writeFileSync(indexFile, await res.text());
}
const gbIndex = JSON.parse(fs.readFileSync(indexFile, 'utf8')).filter(m => !GB_SKIP.has(m.boundaryISO));

async function download(meta) {
  const file = path.join(cacheDir, `${meta.boundaryISO}.geojson`);
  if (!fs.existsSync(file)) {
    const res = await fetch(meta.simplifiedGeometryGeoJSON);
    if (!res.ok) throw new Error(`${meta.boundaryISO}: HTTP ${res.status}`);
    fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

// Download with limited concurrency, then process in order
const queue = [...gbIndex];
const downloaded = new Map();
await Promise.all(Array.from({ length: 6 }, async () => {
  for (let m = queue.shift(); m; m = queue.shift()) {
    try { downloaded.set(m.boundaryISO, await download(m)); }
    catch (e) { console.warn(`  skip ${m.boundaryISO}: ${e.message}`); }
  }
}));

for (const meta of gbIndex) {
  const file = downloaded.get(meta.boundaryISO);
  if (!file) continue;
  const units = (await prepare({ 'in.json': fs.readFileSync(file, 'utf8') }, 'in.json', 'shapeName')).map(f => {
    f.properties = { name: f.properties.shapeName, ix: f.properties.ix, iy: f.properties.iy };
    return f;
  });
  const dropped = assign(units, {
    name: `geoBoundaries (${meta.boundarySource || meta.boundaryISO})`,
    license: meta.boundaryLicense,
    url: 'https://www.geoboundaries.org',
  });
  console.log(`geoBoundaries ${meta.boundaryISO}: ${units.length} units${dropped ? ` (${dropped} dropped)` : ''}`);
}

// ── Write one file per admin-1 subregion ────────────────────────────────────
fs.rmSync(OUT_DIR, { recursive: true, force: true });
const index = {};
let written = 0;
for (const [key, feats] of groups) {
  // A single child means this dataset's level 2 is the same as our level 1; nothing to show
  if (feats.length < 2) continue;
  const [slug, id] = key.split('/');
  const out = await mapshaper.applyCommands(
    '-i in.json name=districts -o out.json format=topojson quantization=20000',
    { 'in.json': JSON.stringify({ type: 'FeatureCollection', features: feats }) },
  );
  fs.mkdirSync(path.join(OUT_DIR, slug), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, slug, `${id}.json`), out['out.json']);
  (index[slug] ??= {})[id] = feats.length;
  written++;
}
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index));
fs.writeFileSync(path.join(OUT_DIR, 'sources.json'), JSON.stringify(
  Object.fromEntries(Object.entries(sources).filter(([slug]) => index[slug])), null, 1,
));

let bytes = 0;
for (const dir of fs.readdirSync(OUT_DIR, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  for (const f of fs.readdirSync(path.join(OUT_DIR, dir.name))) bytes += fs.statSync(path.join(OUT_DIR, dir.name, f)).size;
}
console.log(`Wrote ${written} files for ${Object.keys(index).length} countries, ${(bytes / 1e6).toFixed(1)} MB total → ${OUT_DIR}`);
