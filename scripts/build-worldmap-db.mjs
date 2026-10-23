// Builds the /worldmap country database: CSV tables in public/worldmap/db (schema in its README.md).
//
// Sources:
//   Wikidata (CC0)        - countries, government structure, office holders, legislatures
//   Wikipedia (CC BY-SA)  - current party composition of each legislative chamber (infobox)
//   World Bank API (CC BY 4.0) - economic, demographic and governance indicator time series
//   Atlas of Economic Complexity (Growth Lab, Harvard) - each country's trade by product
//
// Usage: node scripts/build-worldmap-db.mjs [wikidata|capitals|regions|worldbank|latest|trade|partners]   (default: all)
// (the subregion steps read the admin-1/admin-2 map files, so run build-admin1/2 first)
//
// Wikidata is live data, so re-running picks up new office holders and election results.

import fs from 'node:fs';
import path from 'node:path';
import { loadCountries } from './worldmap-geo.mjs';
import { legislatureComposition } from './legislature-composition.mjs';

const DB = path.resolve('public/worldmap/db');
const UA = 'garrettstoll.info-worldmap/0.1 (https://github.com/gstoll9/garrettstoll.info)';
const only = process.argv[2];

// ── CSV helpers ──────────────────────────────────────────────────────────────
const csvCell = v => {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
function writeCsv(file, columns, rows) {
  const lines = [columns.join(','), ...rows.map(r => columns.map(c => csvCell(r[c])).join(','))];
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, lines.join('\n') + '\n');
  return rows.length;
}
function readCsv(file) {
  const [head, ...lines] = fs.readFileSync(file, 'utf8').trim().split('\n');
  const cols = head.split(',');
  // Only used on our own files, whose quoted cells never contain newlines
  return lines.map(line => {
    const cells = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { cells.push(cur); cur = ''; }
      else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  });
}

// ── Wikidata ─────────────────────────────────────────────────────────────────
async function sparql(query, attempt = 0) {
  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query }),
  });
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await new Promise(r => setTimeout(r, 5000 * (attempt + 1)));
    return sparql(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`SPARQL ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const strip = x => x.value.replace('http://www.wikidata.org/entity/', '');
  return (await res.json()).results.bindings.map(b => Object.fromEntries(Object.entries(b).map(([k, x]) => [k, strip(x)])));
}
const values = (v, qids) => `VALUES ?${v} { ${qids.map(q => `wd:${q}`).join(' ')} }`;
const LABEL = 'SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }';
const latest = r => r.time || r.start || '';

// Subregions of the map with a Wikidata item: every admin-1 subregion (QID from the map data,
// or looked up from its Wikipedia title) and every US county.
// Keys match the capitals table: admin1 -> "<country-slug>/<admin1 id>", admin2 -> QID.
async function loadRegionUnits(countries) {
  const isoBySlug = new Map(countries.filter(c => c.map_slug).map(c => [c.map_slug, c.iso3]));
  const units = []; // { level, key, qid, iso3, slug, name }
  const byTitle = [];
  const admin1Dir = path.resolve('public/worldmap/admin1');
  for (const file of fs.readdirSync(admin1Dir)) {
    const slug = file.replace(/\.json$/, '');
    const topo = JSON.parse(fs.readFileSync(path.join(admin1Dir, file), 'utf8'));
    for (const g of Object.values(topo.objects)[0].geometries) {
      const u = { level: 'admin1', key: `${slug}/${g.properties.id}`, iso3: isoBySlug.get(slug) ?? '', slug, name: g.properties.name };
      if (g.properties.wikidata) units.push({ ...u, qid: g.properties.wikidata });
      else if (g.properties.wiki) byTitle.push({ ...u, title: g.properties.wiki });
    }
  }
  // Subregions without a QID (dissolved French regions, UK countries): look it up by article
  for (let i = 0; i < byTitle.length; i += 50) {
    const chunk = byTitle.slice(i, i + 50);
    const qs = new URLSearchParams({
      action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', redirects: '1', format: 'json', formatversion: '2',
      titles: chunk.map(r => r.title).join('|'),
    });
    const data = await (await fetch(`https://en.wikipedia.org/w/api.php?${qs}`, { headers: { 'User-Agent': UA } })).json();
    const norm = new Map([...(data.query.normalized ?? []), ...(data.query.redirects ?? [])].map(n => [n.from, n.to]));
    const qidByTitle = new Map(data.query.pages.map(pg => [pg.title, pg.pageprops?.wikibase_item]));
    for (const { title, ...u } of chunk) {
      let t = title;
      while (norm.has(t)) t = norm.get(t);
      if (qidByTitle.get(t)) units.push({ ...u, qid: qidByTitle.get(t) });
    }
  }
  const usDir = path.resolve('public/worldmap/admin2/united-states-of-america');
  if (fs.existsSync(usDir)) {
    for (const file of fs.readdirSync(usDir)) {
      const topo = JSON.parse(fs.readFileSync(path.join(usDir, file), 'utf8'));
      for (const g of Object.values(topo.objects)[0].geometries) {
        if (g.properties.wikidata) {
          units.push({ level: 'admin2', key: g.properties.wikidata, qid: g.properties.wikidata, iso3: 'USA', slug: 'united-states-of-america', name: g.properties.name });
        }
      }
    }
  }
  return units;
}

// Current values of a property for many items: statements without an end date, and only the
// preferred ones when any are preferred (Wikidata's "truthy" rule). Returns qid -> rows.
async function currentValues(qids, p) {
  const out = new Map();
  for (let i = 0; i < qids.length; i += 400) {
    const rows = await sparql(`SELECT ?c ?v ?vLabel ?rank ?start WHERE { ${values('c', qids.slice(i, i + 400))}
      ?c p:${p} ?st . ?st ps:${p} ?v ; wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
      FILTER NOT EXISTS { ?st pq:P582 [] } OPTIONAL { ?st pq:P580 ?start } ${LABEL} }`);
    for (const r of rows) {
      if (!out.has(r.c)) out.set(r.c, []);
      if (!out.get(r.c).some(x => x.v === r.v)) out.get(r.c).push(r);
    }
  }
  for (const [qid, rows] of out) {
    const preferred = rows.filter(r => r.rank.endsWith('PreferredRank'));
    out.set(qid, preferred.length ? preferred : rows);
  }
  return out;
}

async function buildWikidata() {
  // One item per ISO 3166-1 alpha-3 code; where several items share a code, the most linked wins
  const raw = await sparql(`
    SELECT ?c ?cLabel ?iso3 ?iso2 ?num ?links WHERE {
      ?c wdt:P298 ?iso3 ; wikibase:sitelinks ?links .
      FILTER NOT EXISTS { ?c wdt:P576 [] }
      OPTIONAL { ?c wdt:P297 ?iso2 } OPTIONAL { ?c wdt:P299 ?num }
      ${LABEL}
    }`);
  const byIso = new Map();
  for (const r of raw) {
    const cur = byIso.get(r.iso3);
    if (!cur || +r.links > +cur.links) byIso.set(r.iso3, r);
  }
  // Map the world-atlas shapes (ISO numeric ids) to their file slugs
  const slugByNum = new Map(loadCountries().filter(c => c.feature.id != null).map(c => [String(c.feature.id), c.slug]));
  const countryQids = [...byIso.values()].map(r => r.c);
  const [capital, currency, forms, languages] = await Promise.all(['P36', 'P38', 'P122', 'P37'].map(p => currentValues(countryQids, p)));

  const countries = [...byIso.values()].map(r => ({
    iso3: r.iso3, iso2: r.iso2, iso_numeric: r.num, name: r.cLabel, wikidata: r.c,
    map_slug: slugByNum.get(r.num) ?? '',
    capital: capital.get(r.c)?.[0]?.vLabel, currency: currency.get(r.c)?.[0]?.vLabel,
  })).sort((a, b) => a.iso3.localeCompare(b.iso3));
  const multi = (m, cols) => countries.flatMap(c => (m.get(c.wikidata) ?? []).map(r => ({ iso3: c.iso3, [cols[0]]: r.v, [cols[1]]: r.vLabel })));
  const governmentForms = multi(forms, ['form_qid', 'form']);
  const officialLanguages = multi(languages, ['language_qid', 'language']);

  // Government of every country and subregion ("unit"); region_key is empty for countries
  const regionUnits = await loadRegionUnits(countries);
  const units = [
    ...countries.map(c => ({ iso3: c.iso3, region_key: '', qid: c.wikidata })),
    ...regionUnits.map(u => ({ iso3: u.iso3, region_key: u.key, qid: u.qid })),
  ];
  const qids = [...new Set(units.map(u => u.qid))];
  const [legislature, hos, hosOffice, hog, hogOffice, executive, judiciary, constitution] =
    await Promise.all(['P194', 'P35', 'P1906', 'P6', 'P1313', 'P208', 'P209', 'P92'].map(p => currentValues(qids, p)));
  const first = (m, u) => m.get(u.qid)?.[0];

  const government = units.map(u => ({
    iso3: u.iso3, region_key: u.region_key,
    executive_body_qid: first(executive, u)?.v, executive_body: first(executive, u)?.vLabel,
    judiciary_qid: first(judiciary, u)?.v, judiciary: first(judiciary, u)?.vLabel,
    constitution_qid: first(constitution, u)?.v, constitution: first(constitution, u)?.vLabel,
  })).filter(g => !g.region_key || g.executive_body || g.judiciary || g.constitution);

  // Offices and their current holders, with the holder's current party
  const holders = [...new Set([...hos.values(), ...hog.values()].flat().map(r => r.v))];
  const holderParty = new Map();
  for (let i = 0; i < holders.length; i += 400) {
    const memberships = await sparql(`SELECT ?h ?p ?pLabel ?start WHERE { ${values('h', holders.slice(i, i + 400))}
      ?h p:P102 ?st . ?st ps:P102 ?p ; wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
      FILTER NOT EXISTS { ?st pq:P582 [] } OPTIONAL { ?st pq:P580 ?start } ${LABEL} }`);
    for (const r of memberships) {
      const cur = holderParty.get(r.h);
      if (!cur || (r.start ?? '') > (cur.start ?? '')) holderParty.set(r.h, r);
    }
  }
  const offices = units.flatMap(u => [
    ['head_of_state', hos, hosOffice], ['head_of_government', hog, hogOffice],
  ].flatMap(([role, people, office]) => (people.get(u.qid) ?? []).map(p => ({
    iso3: u.iso3, region_key: u.region_key, role,
    office_qid: first(office, u)?.v, office: first(office, u)?.vLabel,
    holder_qid: p.v, holder: p.vLabel,
    party_qid: holderParty.get(p.v)?.p, party: holderParty.get(p.v)?.pLabel,
  }))));

  // Legislatures, their chambers (has part ⊂ legislative chamber), seat totals and Wikipedia titles
  const topLegs = units.flatMap(u => (legislature.get(u.qid) ?? []).map(r => ({ qid: r.v, iso3: u.iso3, region_key: u.region_key, name: r.vLabel })));
  const topQids = [...new Set(topLegs.map(l => l.qid))];
  const chambers = [];
  for (let i = 0; i < topQids.length; i += 400) {
    chambers.push(...await sparql(`SELECT ?l ?h ?hLabel WHERE { ${values('l', topQids.slice(i, i + 400))}
      ?l wdt:P527 ?h . ?h wdt:P31/wdt:P279* wd:Q10553309 .
      FILTER NOT EXISTS { ?h wdt:P576 [] } ${LABEL} }`));
  }
  const legRows = [];
  const seenLeg = new Set();
  for (const r of [
    ...topLegs.map(l => ({ legislature_qid: l.qid, iso3: l.iso3, region_key: l.region_key, parent_qid: '', name: l.name })),
    ...chambers.flatMap(ch => topLegs.filter(l => l.qid === ch.l)
      .map(l => ({ legislature_qid: ch.h, iso3: l.iso3, region_key: l.region_key, parent_qid: l.qid, name: ch.hLabel }))),
  ]) {
    const key = `${r.iso3}|${r.region_key}|${r.legislature_qid}`;
    if (!seenLeg.has(key)) { seenLeg.add(key); legRows.push(r); }
  }
  const legQids = [...new Set(legRows.map(l => l.legislature_qid))];
  const legInfo = new Map();
  for (let i = 0; i < legQids.length; i += 400) {
    for (const r of await sparql(`SELECT ?l ?seats ?article WHERE { ${values('l', legQids.slice(i, i + 400))}
        OPTIONAL { ?l wdt:P1342 ?seats }
        OPTIONAL { ?article schema:about ?l ; schema:isPartOf <https://en.wikipedia.org/> } }`)) {
      if (!legInfo.has(r.l)) legInfo.set(r.l, r);
    }
  }
  const legislatures = legRows.map(l => ({
    ...l,
    seats: legInfo.get(l.legislature_qid)?.seats,
    wikipedia: legInfo.get(l.legislature_qid)?.article && decodeURIComponent(legInfo.get(l.legislature_qid).article.split('/wiki/')[1]).replace(/_/g, ' '),
  }));

  // Party composition of each chamber (a legislature with chambers has none of its own).
  // Primary source: the Wikipedia infobox; fallback: Wikidata's "number of seats in
  // legislature" on party items, which is often stale, so it must pass the same sum check.
  const best = new Map();
  for (let i = 0; i < legQids.length; i += 400) {
    const seatRows = await sparql(`SELECT ?party ?l ?seats ?time ?start ?end WHERE {
      ${values('l', legQids.slice(i, i + 400))}
      ?party p:P1410 ?st . ?st ps:P1410 ?seats ; pq:P194 ?l .
      ?party wdt:P31/wdt:P279* ?kind . VALUES ?kind { wd:Q7278 wd:Q848197 }
      OPTIONAL { ?st pq:P585 ?time } OPTIONAL { ?st pq:P580 ?start } OPTIONAL { ?st pq:P582 ?end } }`);
    for (const r of seatRows) {
      if (r.end || !(+r.seats > 0)) continue;
      const key = `${r.l}|${r.party}`;
      const cur = best.get(key);
      if (!cur || latest(r) > latest(cur)) best.set(key, r);
    }
  }
  const wikidataSeats = new Map();
  for (const r of best.values()) {
    if (!wikidataSeats.has(r.l)) wikidataSeats.set(r.l, []);
    wikidataSeats.get(r.l).push(r);
  }

  const partyQids = [...new Set([...[...best.values()].map(r => r.party), ...offices.map(o => o.party_qid).filter(Boolean)])];
  const parties = [];
  for (let i = 0; i < partyQids.length; i += 400) {
    const rows = await sparql(`SELECT ?p ?pLabel ?short ?color ?alignLabel WHERE { ${values('p', partyQids.slice(i, i + 400))}
      OPTIONAL { ?p wdt:P1813 ?short . FILTER(LANG(?short) = "en") }
      OPTIONAL { ?p wdt:P465 ?color } OPTIONAL { ?p wdt:P1387 ?align } ${LABEL} }`);
    const seen = new Set();
    for (const r of rows) {
      if (seen.has(r.p)) continue;
      seen.add(r.p);
      parties.push({ party_qid: r.p, name: r.pLabel, short_name: r.short, color: r.color && `#${r.color}`, alignment: r.alignLabel });
    }
  }
  parties.sort((a, b) => a.party_qid.localeCompare(b.party_qid));
  const partyById = new Map(parties.map(p => [p.party_qid, p]));

  const today = new Date().toISOString().slice(0, 10);
  const parents = new Set(legislatures.map(l => l.parent_qid).filter(Boolean));
  const chambersToRead = [...new Map(legislatures
    .filter(l => !parents.has(l.legislature_qid))
    .map(l => [l.legislature_qid, l])).values()];
  const legislatureSeats = [];
  let fromWikipedia = 0, fromWikidata = 0;
  const queue = [...chambersToRead];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let l = queue.shift(); l; l = queue.shift()) {
      const expected = +l.seats || null;
      const comp = l.wikipedia && await legislatureComposition(l.wikipedia, expected).catch(() => null);
      if (comp) {
        fromWikipedia++;
        for (const g of comp.groups) {
          legislatureSeats.push({ legislature_qid: l.legislature_qid, ...g, source: 'wikipedia', as_of: today });
        }
        continue;
      }
      const wd = wikidataSeats.get(l.legislature_qid) ?? [];
      const sum = wd.reduce((a, r) => a + +r.seats, 0);
      if (expected && wd.length && sum <= expected * 1.02 && sum >= expected * 0.85) {
        fromWikidata++;
        for (const r of wd) {
          const party = partyById.get(r.party);
          legislatureSeats.push({
            legislature_qid: l.legislature_qid, party: party?.short_name || party?.name || r.party, party_wikipedia: '',
            color: party?.color ?? '', seats: +r.seats, source: 'wikidata', as_of: latest(r).slice(0, 10),
          });
        }
      }
    }
  }));
  legislatureSeats.sort((a, b) => a.legislature_qid.localeCompare(b.legislature_qid) || b.seats - a.seats);

  // Keep the World Bank columns from a previous run (the worldbank step fills them in)
  const prev = fs.existsSync(`${DB}/countries.csv`) ? new Map(readCsv(`${DB}/countries.csv`).map(c => [c.iso3, c])) : new Map();
  for (const c of countries) Object.assign(c, { region: prev.get(c.iso3)?.region, income_group: prev.get(c.iso3)?.income_group });

  console.log('Wikidata:',
    writeCsv(`${DB}/countries.csv`, ['iso3', 'iso2', 'iso_numeric', 'name', 'wikidata', 'map_slug', 'capital', 'currency', 'region', 'income_group'], countries), 'countries,',
    writeCsv(`${DB}/government.csv`, ['iso3', 'region_key', 'executive_body_qid', 'executive_body', 'judiciary_qid', 'judiciary', 'constitution_qid', 'constitution'], government), 'governments,',
    writeCsv(`${DB}/government_forms.csv`, ['iso3', 'form_qid', 'form'], governmentForms), 'forms,',
    writeCsv(`${DB}/official_languages.csv`, ['iso3', 'language_qid', 'language'], officialLanguages), 'languages,',
    writeCsv(`${DB}/offices.csv`, ['iso3', 'region_key', 'role', 'office_qid', 'office', 'holder_qid', 'holder', 'party_qid', 'party'], offices), 'office holders,',
    writeCsv(`${DB}/legislatures.csv`, ['legislature_qid', 'iso3', 'region_key', 'parent_qid', 'name', 'seats', 'wikipedia'], legislatures), 'legislatures,',
    writeCsv(`${DB}/parties.csv`, ['party_qid', 'name', 'short_name', 'color', 'alignment'],
      parties.filter(p => offices.some(o => o.party_qid === p.party_qid))), 'parties,',
    writeCsv(`${DB}/legislature_seats.csv`, ['legislature_qid', 'party', 'party_wikipedia', 'color', 'seats', 'source', 'as_of'], legislatureSeats), 'seat rows');
  console.log(`  party composition for ${fromWikipedia + fromWikidata} of ${chambersToRead.length} chambers (${fromWikipedia} Wikipedia, ${fromWikidata} Wikidata)`);
}

// ── Subregion statistics ─────────────────────────────────────────────────────
// Wikidata quantity properties with dated statements -> region_values/<country-slug>.csv
const REGION_STATS = [
  ['P1082', 'population', 'Population', 'demographics'],
  ['P2250', 'life_expectancy', 'Life expectancy', 'demographics'],
  ['P1081', 'hdi', 'Human Development Index', 'demographics'],
  ['P2131', 'gdp', 'GDP (nominal)', 'economy'],
  ['P2132', 'gdp_per_capita', 'GDP per capita (nominal)', 'economy'],
  ['P1198', 'unemployment', 'Unemployment rate', 'economy'],
  ['P3529', 'median_income', 'Median household income', 'economy'],
];
// Area units -> km²
const AREA_UNITS = { Q712226: 1, Q232291: 2.589988, Q35852: 0.01, Q25343: 1e-6, Q81292: 0.00404686 };

async function buildRegionStats() {
  const countries = readCsv(`${DB}/countries.csv`);
  const units = await loadRegionUnits(countries);
  const byQid = new Map();
  for (const u of units) {
    if (!byQid.has(u.qid)) byQid.set(u.qid, []);
    byQid.get(u.qid).push(u);
  }
  const qids = [...byQid.keys()];

  // Area (one current value)
  const area = new Map();
  for (let i = 0; i < qids.length; i += 400) {
    const rows = await sparql(`SELECT ?r ?amount ?unit WHERE { ${values('r', qids.slice(i, i + 400))}
      ?r p:P2046 ?st . ?st psv:P2046 [ wikibase:quantityAmount ?amount ; wikibase:quantityUnit ?unit ] ;
         wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank) }`);
    for (const r of rows) {
      const f = AREA_UNITS[r.unit];
      if (f && !area.has(r.r)) area.set(r.r, +(+r.amount * f).toPrecision(6));
    }
  }

  // Dated quantity statements; values without a date are kept only when nothing dated exists
  const values_ = []; // { qid, code, year, value, unit }
  const unitQids = new Set();
  for (const [prop, code] of REGION_STATS) {
    for (let i = 0; i < qids.length; i += 300) {
      const rows = await sparql(`SELECT ?r ?amount ?unit ?time WHERE { ${values('r', qids.slice(i, i + 300))}
        ?r p:${prop} ?st . ?st psv:${prop} [ wikibase:quantityAmount ?amount ; wikibase:quantityUnit ?unit ] ;
           wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
        OPTIONAL { ?st pq:P585 ?time } }`);
      const seen = new Set();
      for (const r of rows) {
        const year = r.time ? +r.time.slice(0, 4) : null;
        if (!year) continue;
        const key = `${r.r}|${code}|${year}|${r.unit}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (r.unit !== 'http://wikiba.se/ontology#one' && r.unit !== 'Q199') unitQids.add(r.unit);
        values_.push({ qid: r.r, code, year, value: +(+r.amount).toPrecision(6), unit: r.unit });
      }
    }
    console.log(`  ${code}: ${values_.filter(v => v.code === code).length} values`);
  }
  // Unit labels (currencies, percent, years)
  const unitLabel = new Map();
  const uq = [...unitQids].filter(u => /^Q\d+$/.test(u));
  for (let i = 0; i < uq.length; i += 400) {
    for (const r of await sparql(`SELECT ?u ?uLabel WHERE { ${values('u', uq.slice(i, i + 400))} ${LABEL} }`)) unitLabel.set(r.u, r.uLabel);
  }
  const unitName = u => (u === 'Q199' || u.startsWith('http') ? '' : unitLabel.get(u) ?? u);

  // regions table (dimension) and per-country value partitions
  const regionRows = units.map(u => ({
    region_key: u.key, level: u.level, iso3: u.iso3, wikidata: u.qid, name: u.name, area_km2: area.get(u.qid) ?? '',
  }));
  const bySlug = new Map();
  for (const v of values_) {
    for (const u of byQid.get(v.qid)) {
      if (!bySlug.has(u.slug)) bySlug.set(u.slug, []);
      bySlug.get(u.slug).push({ region_key: u.key, code: v.code, year: v.year, value: v.value, unit: unitName(v.unit) });
    }
  }
  const dir = `${DB}/region_values`;
  fs.rmSync(dir, { recursive: true, force: true });
  let total = 0;
  for (const [slug, rows] of bySlug) {
    rows.sort((a, b) => a.region_key.localeCompare(b.region_key) || a.code.localeCompare(b.code) || a.year - b.year);
    total += writeCsv(`${dir}/${slug}.csv`, ['region_key', 'code', 'year', 'value', 'unit'], rows);
  }
  writeCsv(`${DB}/region_indicators.csv`, ['code', 'name', 'topic', 'wikidata_property'],
    REGION_STATS.map(([prop, code, name, topic]) => ({ code, name, topic, wikidata_property: prop })));
  console.log('Regions:', writeCsv(`${DB}/regions.csv`, ['region_key', 'level', 'iso3', 'wikidata', 'name', 'area_km2'], regionRows),
    `regions, ${total} values in ${bySlug.size} country files`);
}

// ── Capitals ─────────────────────────────────────────────────────────────────
// Capital (with coordinates) of every country, admin-1 subregion and US county.
// Keys: country -> iso3; admin1 -> "<country-slug>/<admin1 id>"; admin2 -> its Wikidata QID.
async function buildCapitals() {
  const countries = readCsv(`${DB}/countries.csv`);
  const regions = [
    ...countries.map(c => ({ level: 'country', key: c.iso3, qid: c.wikidata })),
    ...await loadRegionUnits(countries),
  ];

  // Current capitals only (no end date), with the capital's coordinates
  const qids = [...new Set(regions.map(r => r.qid))];
  const capitalsByQid = new Map();
  for (let i = 0; i < qids.length; i += 300) {
    const rows = await sparql(`SELECT ?r ?cap ?capLabel ?coord WHERE { ${values('r', qids.slice(i, i + 300))}
      ?r p:P36 ?st . ?st ps:P36 ?cap ; wikibase:rank ?rank . FILTER(?rank != wikibase:DeprecatedRank)
      FILTER NOT EXISTS { ?st pq:P582 [] }
      ?cap wdt:P625 ?coord . ${LABEL} }`);
    for (const r of rows) {
      const m = /Point\(([-\d.eE]+) ([-\d.eE]+)\)/.exec(r.coord);
      if (!m) continue;
      if (!capitalsByQid.has(r.r)) capitalsByQid.set(r.r, new Map());
      // One coordinate per capital
      capitalsByQid.get(r.r).set(r.cap, { capital_qid: r.cap, capital: r.capLabel, lon: +(+m[1]).toFixed(4), lat: +(+m[2]).toFixed(4) });
    }
  }
  const capitals = regions.flatMap(r => [...(capitalsByQid.get(r.qid)?.values() ?? [])]
    .map(c => ({ region_level: r.level, region_key: r.key, ...c })));
  console.log('Capitals:', writeCsv(`${DB}/capitals.csv`, ['region_level', 'region_key', 'capital_qid', 'capital', 'lat', 'lon'], capitals),
    `rows for ${new Set(capitals.map(c => c.region_key)).size} of ${regions.length} regions`);
}

// ── Latest national values ───────────────────────────────────────────────────
// Each country's most recent value per indicator, in one file, for colouring the world map
function buildLatest() {
  const dir = `${DB}/indicator_values`;
  const rows = [];
  for (const file of fs.readdirSync(dir)) {
    const latestByCode = new Map();
    for (const r of readCsv(`${dir}/${file}`)) {
      const cur = latestByCode.get(r.code);
      if (!cur || +r.year > +cur.year) latestByCode.set(r.code, r);
    }
    for (const r of latestByCode.values()) rows.push({ iso3: file.replace(/\.csv$/, ''), code: r.code, year: r.year, value: r.value });
  }
  rows.sort((a, b) => a.code.localeCompare(b.code) || a.iso3.localeCompare(b.iso3));
  console.log('Latest values:', writeCsv(`${DB}/indicator_latest.csv`, ['iso3', 'code', 'year', 'value'], rows), 'rows');
}

// ── Trade by product (Atlas of Economic Complexity) ──────────────────────────
// Each country's exports and imports by product from the Growth Lab at Harvard's Atlas of
// Economic Complexity GraphQL API (HS 1992, 4-digit, plus services). The Atlas reconciles
// what countries report with their partners' mirror data, so it covers countries that
// report poorly to UN Comtrade. One request per country; responses are cached so a re-run
// only fetches what's missing. Sectors follow the World Bank's split (agriculture = crops,
// livestock, forestry, fishing): HS chapters 01–24 plus raw farm and forest commodities
// (AGRI_RAW) are agriculture, services are services, all other goods are industry. The
// Atlas's own sections differ (it files raw cotton under textiles and luggage under
// agriculture), so they're kept only as `section`.
// Writes trade_products.csv, trade_totals.csv and trade_values/<iso3>.csv (the top
// TRADE_TOP products per country, flow and sector).
const ATLAS = 'https://atlas.hks.harvard.edu/api/graphql';
const TRADE_TOP = 20;
const TRADE_CACHE = path.resolve('node_modules/.cache/worldmap-atlas');

async function atlas(query, cacheKey) {
  const file = cacheKey && path.join(TRADE_CACHE, `${cacheKey}.json`);
  if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(ATLAS, {
        method: 'POST',
        headers: { 'User-Agent': UA, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const json = await res.json();
      if (res.ok && json.data && !json.errors) {
        if (file) {
          fs.mkdirSync(TRADE_CACHE, { recursive: true });
          fs.writeFileSync(file, JSON.stringify(json.data));
        }
        return json.data;
      }
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error(`Atlas query failed: ${query.slice(0, 100)}`);
}

// Raw (primary) goods: unprocessed farm, fish, forest and mineral products. HS chapters
// 01–14 (animals, meat, fish, dairy, plants, cereals, oilseeds) except processed dairy and
// milling products; cocoa beans, raw tobacco; stone, salt and other minerals except cement;
// ores; coal, crude oil, natural gas; raw rubber, hides, logs, fibres; rough diamonds.
// Everything else is produced (processed or manufactured).
const PRIMARY_EXTRA = /^(1801|2401|25(?!23)\d\d|26\d\d|2701|2702|2709|2711|4001|410[1-3]|440[1-3]|500[1-3]|510[1-3]|520[1-3]|530[1-5]|7102)$/;
function stageOf(code) {
  if (!/^\d{4}$/.test(code)) return 'produced';
  if (+code.slice(0, 2) <= 14) return /^(040[2-6]|110[1-9])$/.test(code) ? 'produced' : 'raw';
  return PRIMARY_EXTRA.test(code) ? 'raw' : 'produced';
}

async function buildTrade() {
  const countries = readCsv(`${DB}/countries.csv`).filter(c => c.iso_numeric);
  const { productHs92 } = await atlas('{ productHs92(productLevel: 4) { productId code nameShortEn productType topParent { nameShortEn } } }');
  // Raw natural rubber, raw hides, logs/fuelwood, raw silk, wool, cotton and other plant fibres
  const AGRI_RAW = /^(4001|410[1-3]|440[1-3]|500[1-3]|510[1-3]|520[1-3]|530[1-5])$/;
  const sectorOf = p => (p.productType === 'service' ? 'services'
    : +p.code.slice(0, 2) <= 24 || AGRI_RAW.test(p.code) ? 'agriculture' : 'industry');
  // Catch-all codes ("commodities not specified", "unspecified" services) count toward
  // totals but aren't listed as products
  const unlisted = p => /not specified|unspecified/i.test(p.nameShortEn);
  const products = new Map(productHs92.map(p => [p.productId, {
    code: p.code, name: p.nameShortEn, section: p.topParent?.nameShortEn ?? '', sector: sectorOf(p), listed: !unlisted(p),
    stage: p.productType === 'service' ? '' : stageOf(p.code),
  }]));
  writeCsv(`${DB}/trade_products.csv`, ['code', 'name', 'section', 'sector', 'stage'],
    [...products.values()].sort((a, b) => a.code.localeCompare(b.code)));

  const { dataAvailability } = await atlas('{ dataAvailability { productClassification yearMax } }');
  const latestYear = dataAvailability.find(d => d.productClassification === 'HS92').yearMax;

  const dir = `${DB}/trade_values`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const totals = [];
  const queue = [...countries];
  let done = 0;
  await Promise.all(Array.from({ length: 2 }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      const id = +c.iso_numeric;
      let rows = [];
      let year = latestYear;
      for (; year >= latestYear - 2 && !rows.length; year--) {
        const data = await atlas(`{ countryProductYear(countryId: ${id}, productLevel: 4, yearMin: ${year}, yearMax: ${year}) { productId exportValue importValue } }`,
          `cpy-${id}-${year}`).catch(() => ({ countryProductYear: [] }));
        rows = data.countryProductYear ?? [];
      }
      year++;
      if (!rows.length) continue;
      const out = [];
      for (const [flow, field] of [['X', 'exportValue'], ['M', 'importValue']]) {
        const bySector = { agriculture: [], industry: [], services: [] };
        for (const r of rows) {
          const p = products.get(r.productId);
          if (p && r[field] > 0) bySector[p.sector].push({ code: p.code, value: r[field], listed: p.listed });
        }
        for (const [sector, list] of Object.entries(bySector)) {
          list.sort((a, b) => b.value - a.value);
          totals.push({ iso3: c.iso3, flow, year, sector, value: Math.round(list.reduce((s, x) => s + x.value, 0)) });
          for (const it of list.filter(x => x.listed).slice(0, TRADE_TOP)) out.push({ flow, code: it.code, year, value: Math.round(it.value) });
        }
      }
      writeCsv(`${dir}/${c.iso3}.csv`, ['flow', 'code', 'year', 'value'], out);
      if (++done % 25 === 0) console.log(`  trade: ${done} countries`);
    }
  }));
  totals.sort((a, b) => a.iso3.localeCompare(b.iso3) || a.flow.localeCompare(b.flow) || a.sector.localeCompare(b.sector));
  console.log('Trade:', writeCsv(`${DB}/trade_totals.csv`, ['iso3', 'flow', 'year', 'sector', 'value'], totals), 'total rows,',
    fs.readdirSync(dir).length, 'countries with product data');
}

// ── Trade partners (Atlas bilateral data) ────────────────────────────────────
// Each country's top PARTNERS_TOP partners per flow, with goods split into raw and produced
// (stageOf). Partner totals come from one request per country; the raw/produced split needs
// one request per country pair, so it's fetched only for those top partners. Only the
// per-pair sums are cached (the full product lists are large).
const PARTNERS_TOP = 15;

async function buildPartners() {
  const countries = readCsv(`${DB}/countries.csv`).filter(c => c.iso_numeric);
  const isoByNum = new Map(countries.map(c => [+c.iso_numeric, c.iso3]));
  const { productHs92 } = await atlas('{ productHs92(productLevel: 4) { productId code productType } }');
  const stageById = new Map(productHs92.filter(p => p.productType !== 'service').map(p => [+p.productId.split('-').pop(), stageOf(p.code)]));
  const { dataAvailability } = await atlas('{ dataAvailability { productClassification yearMax } }');
  const year = dataAvailability.find(d => d.productClassification === 'HS92').yearMax;

  const dir = `${DB}/trade_partners`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const queue = [...countries];
  let done = 0, pairs = 0;
  await Promise.all(Array.from({ length: 3 }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      const id = +c.iso_numeric;
      const { countryCountryYear: partners = [] } = await atlas(
        `{ countryCountryYear(countryId: ${id}, yearMin: ${year}, yearMax: ${year}) { partnerCountryId exportValue importValue } }`,
        `ccy-${id}-${year}`).catch(() => ({}));
      const withIso = partners
        .map(p => ({ ...p, iso3: isoByNum.get(+p.partnerCountryId.split('-').pop()) }))
        .filter(p => p.iso3 && p.iso3 !== c.iso3);
      const top = flow => [...withIso].sort((a, b) => b[flow] - a[flow]).filter(p => p[flow] > 0).slice(0, PARTNERS_TOP);
      const topX = top('exportValue'), topM = top('importValue');
      const rows = [];
      const split = new Map();
      for (const p of new Set([...topX, ...topM])) {
        const pid = +p.partnerCountryId.split('-').pop();
        const key = `ccpy-split-${id}-${pid}-${year}`;
        const file = path.join(TRADE_CACHE, `${key}.json`);
        let sums;
        if (fs.existsSync(file)) sums = JSON.parse(fs.readFileSync(file, 'utf8'));
        else {
          const data = await atlas(`{ countryCountryProductYear(countryId: ${id}, partnerCountryId: ${pid}, yearMin: ${year}, yearMax: ${year}, productLevel: 4) { productId exportValue importValue } }`)
            .catch(() => null);
          if (!data) continue;
          sums = { X: { raw: 0, produced: 0 }, M: { raw: 0, produced: 0 } };
          for (const r of data.countryCountryProductYear ?? []) {
            const stage = stageById.get(+String(r.productId).split('-').pop());
            if (!stage) continue;
            sums.X[stage] += r.exportValue || 0;
            sums.M[stage] += r.importValue || 0;
          }
          fs.mkdirSync(TRADE_CACHE, { recursive: true });
          fs.writeFileSync(file, JSON.stringify(sums));
          pairs++;
        }
        split.set(p.iso3, sums);
      }
      for (const [flow, list] of [['X', topX], ['M', topM]]) {
        for (const p of list) {
          const s = split.get(p.iso3)?.[flow];
          if (!s || s.raw + s.produced <= 0) continue;
          rows.push({ flow, partner: p.iso3, year, raw: Math.round(s.raw), produced: Math.round(s.produced) });
        }
      }
      if (rows.length) writeCsv(`${dir}/${c.iso3}.csv`, ['flow', 'partner', 'year', 'raw', 'produced'], rows);
      if (++done % 25 === 0) console.log(`  partners: ${done}/${countries.length} countries (${pairs} pairs fetched)`);
    }
  }));
  console.log('Partners:', fs.readdirSync(dir).length, 'countries with partner data');
}

// ── World Bank ───────────────────────────────────────────────────────────────
// [code, name, topic, unit, source id]  (source 2 = WDI, 3 = Worldwide Governance Indicators)
const INDICATORS = [
  ['NY.GDP.MKTP.CD', 'GDP', 'economy', 'current US$', 2],
  ['NY.GDP.PCAP.CD', 'GDP per capita', 'economy', 'current US$', 2],
  ['NY.GDP.PCAP.PP.CD', 'GDP per capita, PPP', 'economy', 'current international $', 2],
  ['NY.GDP.MKTP.KD.ZG', 'GDP growth', 'economy', '% annual', 2],
  ['FP.CPI.TOTL.ZG', 'Inflation (consumer prices)', 'economy', '% annual', 2],
  ['SL.UEM.TOTL.ZS', 'Unemployment', 'economy', '% of labor force', 2],
  ['NV.AGR.TOTL.ZS', 'Agriculture, forestry & fishing', 'economy', '% of GDP', 2],
  ['NV.IND.TOTL.ZS', 'Industry', 'economy', '% of GDP', 2],
  ['NV.SRV.TOTL.ZS', 'Services', 'economy', '% of GDP', 2],
  ['NE.EXP.GNFS.ZS', 'Exports', 'economy', '% of GDP', 2],
  ['NE.IMP.GNFS.ZS', 'Imports', 'economy', '% of GDP', 2],
  ['GC.DOD.TOTL.GD.ZS', 'Central government debt', 'economy', '% of GDP', 2],
  ['SI.POV.GINI', 'Gini index', 'economy', '0-100', 2],
  ['SP.POP.TOTL', 'Population', 'demographics', 'people', 2],
  ['SP.POP.GROW', 'Population growth', 'demographics', '% annual', 2],
  ['EN.POP.DNST', 'Population density', 'demographics', 'people per km²', 2],
  ['SP.URB.TOTL.IN.ZS', 'Urban population', 'demographics', '% of total', 2],
  ['SP.DYN.LE00.IN', 'Life expectancy at birth', 'demographics', 'years', 2],
  ['SP.DYN.TFRT.IN', 'Fertility rate', 'demographics', 'births per woman', 2],
  ['SP.POP.0014.TO.ZS', 'Ages 0-14', 'demographics', '% of total', 2],
  ['SP.POP.1564.TO.ZS', 'Ages 15-64', 'demographics', '% of total', 2],
  ['SP.POP.65UP.TO.ZS', 'Ages 65+', 'demographics', '% of total', 2],
  ['SM.POP.NETM', 'Net migration', 'demographics', 'people', 2],
  ['SE.ADT.LITR.ZS', 'Adult literacy rate', 'demographics', '% of ages 15+', 2],
  ['GC.XPN.TOTL.GD.ZS', 'Government expense', 'government', '% of GDP', 2],
  ['MS.MIL.XPND.GD.ZS', 'Military expenditure', 'government', '% of GDP', 2],
  ['GOV_WGI_VA.EST', 'Voice and accountability', 'government', 'score, -2.5 to 2.5', 3],
  ['GOV_WGI_PV.EST', 'Political stability', 'government', 'score, -2.5 to 2.5', 3],
  ['GOV_WGI_GE.EST', 'Government effectiveness', 'government', 'score, -2.5 to 2.5', 3],
  ['GOV_WGI_RQ.EST', 'Regulatory quality', 'government', 'score, -2.5 to 2.5', 3],
  ['GOV_WGI_RL.EST', 'Rule of law', 'government', 'score, -2.5 to 2.5', 3],
  ['GOV_WGI_CC.EST', 'Control of corruption', 'government', 'score, -2.5 to 2.5', 3],
];

async function wb(pathAndQuery) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://api.worldbank.org/v2/${pathAndQuery}`, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (attempt >= 3) throw new Error(`World Bank ${res.status} for ${pathAndQuery}`);
    await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
  }
}

async function buildWorldBank() {
  const countriesFile = `${DB}/countries.csv`;
  if (!fs.existsSync(countriesFile)) throw new Error('Run the wikidata step first (countries.csv is missing)');
  const countries = readCsv(countriesFile);
  const known = new Set(countries.map(c => c.iso3));

  // Region / income group (adds two columns to countries.csv)
  const [, meta] = await wb('country?format=json&per_page=400');
  const wbMeta = new Map(meta.map(m => [m.id, m]));
  for (const c of countries) {
    c.region = wbMeta.get(c.iso3)?.region?.value?.trim() || '';
    c.income_group = wbMeta.get(c.iso3)?.incomeLevel?.value?.trim() || '';
  }
  writeCsv(countriesFile, [...Object.keys(countries[0]).filter(k => !['region', 'income_group'].includes(k)), 'region', 'income_group'], countries);

  writeCsv(`${DB}/indicators.csv`, ['code', 'name', 'topic', 'unit', 'source'],
    INDICATORS.map(([code, name, topic, unit, src]) => ({
      code, name, topic, unit, source: src === 3 ? 'World Bank, Worldwide Governance Indicators' : 'World Bank, World Development Indicators',
    })));

  const byCountry = new Map();
  for (const [code, , , , src] of INDICATORS) {
    let page = 1, pages = 1, n = 0;
    do {
      const [info, rows] = await wb(`country/all/indicator/${code}?format=json&per_page=20000&date=1960:2030&source=${src}&page=${page}`);
      pages = info.pages;
      for (const r of rows ?? []) {
        if (r.value == null || !known.has(r.countryiso3code)) continue;
        if (!byCountry.has(r.countryiso3code)) byCountry.set(r.countryiso3code, []);
        // Trim float noise: keep 6 significant digits
        byCountry.get(r.countryiso3code).push({ year: +r.date, code, value: +(+r.value).toPrecision(6) });
        n++;
      }
    } while (++page <= pages);
    console.log(`  ${code}: ${n} values`);
  }

  const dir = `${DB}/indicator_values`;
  fs.rmSync(dir, { recursive: true, force: true });
  let total = 0;
  for (const [iso3, rows] of byCountry) {
    rows.sort((a, b) => a.code.localeCompare(b.code) || a.year - b.year);
    total += writeCsv(`${dir}/${iso3}.csv`, ['code', 'year', 'value'], rows);
  }
  console.log(`World Bank: ${total} values for ${byCountry.size} countries`);
}

if (!only || only === 'wikidata') await buildWikidata();
if (!only || only === 'wikidata' || only === 'capitals') await buildCapitals();
if (!only || only === 'wikidata' || only === 'regions') await buildRegionStats();
if (!only || only === 'worldbank') await buildWorldBank();
if (!only || only === 'worldbank' || only === 'latest') buildLatest();
if (!only || only === 'trade') await buildTrade();
if (!only || only === 'trade' || only === 'partners') await buildPartners();
