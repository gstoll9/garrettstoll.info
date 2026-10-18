// Shared helpers for the /worldmap data build scripts.
import { createRequire } from 'node:module';
import { geoBounds, geoContains, geoDistance } from 'd3-geo';
import { feature } from 'topojson-client';

const require = createRequire(import.meta.url);

// Must match countrySlug() in src/app/worldmap/lib/countryNames.ts
export function countrySlug(name) {
  return Array.from(name.normalize('NFD')).filter(ch => ch.charCodeAt(0) < 128).join('').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const inBounds = ([x, y], [[x0, y0], [x1, y1]]) =>
  y >= y0 && y <= y1 && (x0 <= x1 ? x >= x0 && x <= x1 : x >= x0 || x <= x1);

// World-atlas countries as drawn on the map, keyed by countrySlug
export function loadCountries() {
  const topo = require('world-atlas/countries-50m.json');
  return feature(topo, topo.objects.countries).features.map(f => ({
    slug: countrySlug(f.properties.name),
    feature: f,
    bounds: geoBounds(f),
  }));
}

// First shape containing the point, else (if `nearest`) the one whose label point is closest
export function findContaining(shapes, pt, nearest = false) {
  const hit = shapes.find(s => inBounds(pt, s.bounds) && geoContains(s.feature, pt));
  if (hit || !nearest || !shapes.length) return hit ?? null;
  return shapes.reduce((best, s) => (geoDistance(pt, s.label) < geoDistance(pt, best.label) ? s : best));
}
