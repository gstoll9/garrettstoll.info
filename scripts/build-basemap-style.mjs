// Builds the /worldmap basemap style (MapLibre GL) from OpenFreeMap's "dark" style:
// OpenStreetMap vector tiles (OpenMapTiles schema) plus an EOX Sentinel-2 cloudless
// satellite layer, saved locally so the page doesn't depend on a remote style file.
//
// Changes from the upstream style:
//   - colours tinted from neutral grey to the page's navy palette
//   - country/state boundaries and labels dropped (the map draws its own)
//   - every symbol layer moved to the end; the page inserts its own fills/lines before
//     `metadata["wm:labels-start"]` and its own labels after everything
//   - layers tagged `metadata["wm:mode"]`: "streets" layers hide in satellite mode,
//     "satellite" layers show only in it
//   - globe projection with an atmosphere that fades out as you zoom in
//
// Also copies MapLibre's CSP worker into public/: Next's bundler breaks the worker that
// MapLibre's default build inlines as a blob, so the page uses the CSP build and points it at
// this file (named by version; maplibre-gl is pinned to an exact version in package.json).
//
// Usage: node scripts/build-basemap-style.mjs <download-cache-dir>

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { color, hsl } from 'd3-color';

const UPSTREAM = 'https://tiles.openfreemap.org/styles/dark';
const SATELLITE_YEAR = 2024;
const OUT = path.resolve('public/worldmap/basemap/style.json');

const [cacheDir] = process.argv.slice(2);
if (!cacheDir) {
  console.error('Usage: node scripts/build-basemap-style.mjs <download-cache-dir>');
  process.exit(1);
}
fs.mkdirSync(cacheDir, { recursive: true });
const rawFile = path.join(cacheDir, 'openfreemap-dark.json');
if (!fs.existsSync(rawFile)) {
  const res = await fetch(UPSTREAM);
  if (!res.ok) throw new Error(`Style download failed: ${res.status}`);
  fs.writeFileSync(rawFile, await res.text());
}
const style = JSON.parse(fs.readFileSync(rawFile, 'utf8'));

// Grey -> navy, keeping lightness and alpha; text a little brighter to stay readable
function tint(value, lift = 0) {
  const c = color(value);
  if (!c) return value;
  const h = hsl(c);
  const out = hsl(222, Math.max(h.s || 0, 0.28), Math.min(1, h.l * 1.25 + 0.03 + lift), c.opacity);
  return out.formatRgb();
}
const tintDeep = (v, lift) =>
  typeof v === 'string' ? tint(v, lift) : Array.isArray(v) ? v.map(x => tintDeep(x, lift)) : v;

const DROP = /^(boundary_|place_country_|place_state)/;
const base = [];
const labels = [];
for (const layer of style.layers) {
  if (DROP.test(layer.id)) continue;
  // The upstream sprite has no "circle-11" (city dots); drop the reference rather than warn
  if (JSON.stringify(layer.layout?.['icon-image'] ?? '').includes('circle-11')) delete layer.layout['icon-image'];
  for (const [k, v] of Object.entries(layer.paint ?? {})) {
    if (k.endsWith('-color')) layer.paint[k] = tintDeep(v, k === 'text-color' ? 0.35 : 0);
  }
  // Fills of the drawn map hide under imagery; roads, rails and labels stay on top of it
  const kind = layer.type === 'symbol' ? 'labels'
    : layer.type === 'background' || layer.source !== 'openmaptiles' || layer['source-layer'] !== 'transportation' ? 'streets'
    : 'both';
  layer.metadata = { ...layer.metadata, 'wm:mode': kind === 'labels' ? 'both' : kind };
  (layer.type === 'symbol' ? labels : base).push(layer);
}
// Deeper ocean than the tint gives, so countries stand out on the globe
const water = base.find(l => l.id === 'water');
if (water) water.paint['fill-color'] = '#0b1730';
// Background stays in both modes (it's what shows outside imagery coverage)
base[0].metadata['wm:mode'] = 'both';
base.splice(1, 0, {
  id: 'satellite', type: 'raster', source: 'satellite',
  layout: { visibility: 'none' }, paint: { 'raster-opacity': 0.95 },
  metadata: { 'wm:mode': 'satellite' },
});

const out = {
  version: 8,
  name: 'garrettstoll.info world map',
  metadata: { 'wm:labels-start': labels[0].id },
  projection: { type: 'globe' },
  sky: {
    'sky-color': '#0b1220', 'horizon-color': '#1d3157', 'fog-color': '#0b1220',
    'sky-horizon-blend': 0.6, 'horizon-fog-blend': 0.5, 'fog-ground-blend': 0.6,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 5, 1, 7, 0],
  },
  glyphs: style.glyphs,
  sprite: style.sprite,
  sources: {
    openmaptiles: style.sources.openmaptiles,
    satellite: {
      type: 'raster', tileSize: 256, maxzoom: 17,
      tiles: [`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${SATELLITE_YEAR}_3857/default/g/{z}/{y}/{x}.jpg`],
      attribution: `<a href="https://s2maps.eu" target="_blank">Sentinel-2 cloudless ${SATELLITE_YEAR}</a> by EOX IT Services GmbH ` +
        `(contains modified Copernicus Sentinel data ${SATELLITE_YEAR})`,
    },
  },
  layers: [...base, ...labels],
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`${out.layers.length} layers -> ${OUT}`);

const require = createRequire(import.meta.url);
const { version } = require('maplibre-gl/package.json');
const worker = path.resolve(`public/worldmap/vendor/maplibre-gl-csp-worker-${version}.js`);
fs.mkdirSync(path.dirname(worker), { recursive: true });
for (const f of fs.readdirSync(path.dirname(worker))) {
  if (f.startsWith('maplibre-gl-csp-worker-')) fs.rmSync(path.join(path.dirname(worker), f));
}
fs.copyFileSync(require.resolve('maplibre-gl/dist/maplibre-gl-csp-worker.js'), worker);
console.log(`MapLibre worker -> ${worker}`);
