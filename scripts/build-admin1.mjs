// Builds per-country subregion (admin-1: states, provinces, ...) TopoJSON files for /worldmap.
//
// Source: Natural Earth 1:10m "Admin 1 – States, Provinces" (public domain)
//   https://naciscdn.org/naturalearth/10m/cultural/ne_10m_admin_1_states_provinces.zip
//
// Usage: node scripts/build-admin1.mjs <path/to/ne_10m_admin_1_states_provinces.shp>
//
// Each subregion is assigned to the world-atlas country that contains its interior point,
// so subregions always line up with the country shapes drawn on the map. Output files are
// named by countrySlug() of the world-atlas country name.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import mapshaper from 'mapshaper';
import { countrySlug, findContaining, loadCountries } from './worldmap-geo.mjs';
const OUT_DIR = path.resolve('public/worldmap/admin1');

// Natural Earth's admin-1 for these countries is a lower level (French départements,
// UK counties), so dissolve them into the actual first-level divisions.
const DISSOLVE = {
  FRA: {
    field: 'region',
    type: 'Region',
    // NE region name -> [English display name, Wikipedia title]
    names: {
      'Guyane française': ['French Guiana'],
      "Provence-Alpes-Côte-d'Azur": ["Provence-Alpes-Côte d'Azur"],
      'Occitanie': ['Occitania', 'Occitania (administrative region)'],
      'Bretagne': ['Brittany', 'Brittany (administrative region)'],
      'Normandie': ['Normandy'],
      'Corse': ['Corsica'],
    },
  },
  GBR: { field: 'geonunit', type: 'Country', names: {} },
};

const shp = process.argv[2];
if (!shp) {
  console.error('Usage: node scripts/build-admin1.mjs <ne_10m_admin_1_states_provinces.shp>');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'admin1-'));
const simplified = path.join(tmp, 'simplified.json');
const keyed = path.join(tmp, 'keyed.json');

const dissolveExpr = Object.entries(DISSOLVE)
  .map(([a3, d]) => `adm0_a3 == '${a3}' ? '${a3}:' + ${d.field} : `).join('');
await mapshaper.runCommands(
  `-i "${shp}" encoding=utf8 ` +
  `-each "grp = ${dissolveExpr}adm1_code" ` +
  `-dissolve grp copy-fields=name,name_en,type_en,wikidataid,adm0_a3 ` +
  `-simplify 8% keep-shapes ` +
  `-each "ix=this.innerX, iy=this.innerY" ` +
  `-o "${simplified}" format=geojson precision=0.0001`,
);

const countries = loadCountries();

const admin1 = JSON.parse(fs.readFileSync(simplified, 'utf8'));

// Assign by containment; tally which country each NE adm0 mostly lands in so that small
// islands whose interior point misses the coarser 50m country outline can fall back to it.
const votes = {};
for (const f of admin1.features) {
  const pt = [f.properties.ix, f.properties.iy];
  const c = findContaining(countries, pt);
  f.properties.ckey = c?.slug ?? null;
  if (c) {
    const v = (votes[f.properties.adm0_a3] ??= {});
    v[c.slug] = (v[c.slug] ?? 0) + 1;
  }
}
const majority = a3 => Object.entries(votes[a3] ?? {}).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

let fallback = 0, dropped = 0;
admin1.features = admin1.features.filter(f => {
  const p = f.properties;
  let ckey = p.ckey;
  if (!ckey) {
    ckey = majority(p.adm0_a3);
    if (!ckey) { dropped++; return false; }
    fallback++;
  }
  const d = DISSOLVE[p.adm0_a3];
  if (d) {
    const ne = p.grp.slice(p.adm0_a3.length + 1);
    const [name, wiki] = d.names[ne] ?? [ne];
    f.properties = { ckey, name, type: d.type, wikidata: null, wiki: wiki ?? name };
  } else {
    f.properties = { ckey, name: p.name_en || p.name, type: p.type_en || null, wikidata: p.wikidataid || null, wiki: null };
  }
  // Interior point (lon/lat) used to place the map label
  f.properties.label = [+p.ix.toFixed(3), +p.iy.toFixed(3)];
  return true;
});
// Stable per-country id, used to name the subregion's admin-2 file (see build-admin2.mjs)
const usedIds = new Set();
for (const f of admin1.features) {
  const base = `${f.properties.ckey}/${countrySlug(f.properties.name) || 'region'}`;
  let id = base;
  for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
  usedIds.add(id);
  f.properties.id = id.slice(f.properties.ckey.length + 1);
}

fs.writeFileSync(keyed, JSON.stringify(admin1));
console.log(`Assigned ${admin1.features.length} subregions (${fallback} via adm0 fallback, ${dropped} dropped)`);

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
await mapshaper.runCommands(
  `-i "${keyed}" name=subregions -split ckey -filter-fields id,name,type,wikidata,wiki,label ` +
  `-o "${OUT_DIR}/" format=topojson singles quantization=100000`,
);

// mapshaper names split outputs "<layer>-<value>.json"; normalise to "<value>.json"
for (const file of fs.readdirSync(OUT_DIR)) {
  const renamed = file.replace(/^subregions-/, '');
  if (renamed !== file) fs.renameSync(path.join(OUT_DIR, file), path.join(OUT_DIR, renamed));
}
fs.rmSync(tmp, { recursive: true, force: true });

const files = fs.readdirSync(OUT_DIR);
const bytes = files.reduce((s, f) => s + fs.statSync(path.join(OUT_DIR, f)).size, 0);
console.log(`Wrote ${files.length} files, ${(bytes / 1e6).toFixed(1)} MB total → ${OUT_DIR}`);
