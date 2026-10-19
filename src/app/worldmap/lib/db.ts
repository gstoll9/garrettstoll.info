// Browser access to the CSV database in public/worldmap/db (schema: its README.md)
import { csvParse } from 'd3';

const BASE = '/worldmap/db';

export type CountryRow = {
  iso3: string; iso2: string; name: string; wikidata: string; map_slug: string;
  capital: string; currency: string; region: string; income_group: string;
};
export type GovernmentRow = {
  iso3: string; region_key: string; executive_body_qid: string; executive_body: string;
  judiciary_qid: string; judiciary: string; constitution_qid: string; constitution: string;
};
export type OfficeRow = {
  iso3: string; region_key: string; role: 'head_of_state' | 'head_of_government'; office_qid: string; office: string;
  holder_qid: string; holder: string; party_qid: string; party: string;
};
export type LegislatureRow = {
  legislature_qid: string; iso3: string; region_key: string; parent_qid: string; name: string; seats: string; wikipedia: string;
};
export type SeatRow = {
  legislature_qid: string; party: string; party_wikipedia: string; color: string;
  seats: number; source: string; as_of: string;
};
export type PartyRow = { party_qid: string; name: string; short_name: string; color: string; alignment: string };
export type IndicatorRow = { code: string; name: string; topic: string; unit: string; source: string };
export type Point = { year: number; value: number };

type Tables = {
  countries: CountryRow[];
  government: GovernmentRow[];
  forms: { iso3: string; form_qid: string; form: string }[];
  languages: { iso3: string; language_qid: string; language: string }[];
  offices: OfficeRow[];
  legislatures: LegislatureRow[];
  seats: SeatRow[];
  parties: PartyRow[];
  indicators: IndicatorRow[];
};

async function table<T>(name: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${name}.csv`);
  if (!res.ok) throw new Error(`Failed to load ${name}.csv`);
  return csvParse(await res.text()) as unknown as T[];
}

let tablesPromise: Promise<Tables> | null = null;
export function loadTables(): Promise<Tables> {
  tablesPromise ??= Promise.all([
    table<CountryRow>('countries'), table<GovernmentRow>('government'), table<Tables['forms'][number]>('government_forms'),
    table<Tables['languages'][number]>('official_languages'), table<OfficeRow>('offices'),
    table<LegislatureRow>('legislatures'), table<SeatRow>('legislature_seats'), table<PartyRow>('parties'),
    table<IndicatorRow>('indicators'),
  ]).then(([countries, government, forms, languages, offices, legislatures, seats, parties, indicators]) => ({
    countries, government, forms, languages, offices, legislatures,
    seats: seats.map(s => ({ ...s, seats: +s.seats })),
    parties, indicators,
  }));
  tablesPromise.catch(() => { tablesPromise = null; });
  return tablesPromise;
}

const valueCache = new Map<string, Promise<Map<string, Point[]>>>();
// Yearly indicator series for one country, keyed by indicator code
export function loadIndicatorValues(iso3: string): Promise<Map<string, Point[]>> {
  if (!valueCache.has(iso3)) {
    valueCache.set(iso3, fetch(`${BASE}/indicator_values/${iso3}.csv`)
      .then(res => (res.ok ? res.text() : ''))
      .then(text => {
        const out = new Map<string, Point[]>();
        for (const r of csvParse(text)) {
          if (!out.has(r.code!)) out.set(r.code!, []);
          out.get(r.code!)!.push({ year: +r.year!, value: +r.value! });
        }
        return out;
      }));
  }
  return valueCache.get(iso3)!;
}

// Everything the country tabs need, joined for one country
export type CountryData = {
  country: CountryRow;
  government?: GovernmentRow;
  forms: string[];
  languages: string[];
  offices: OfficeRow[];
  parties: Map<string, PartyRow>;
  legislatures: (LegislatureRow & { chambers: (LegislatureRow & { seatRows: SeatRow[] })[]; seatRows: SeatRow[] })[];
  indicators: Map<string, IndicatorRow>;
  series: Map<string, Point[]>;
};

export async function loadCountryData(mapSlug: string): Promise<CountryData | null> {
  const t = await loadTables();
  const country = t.countries.find(c => c.map_slug === mapSlug);
  if (!country) return null;
  const { iso3 } = country;
  const gov = governmentFor(t, iso3, '');
  return {
    country,
    government: gov.government,
    forms: t.forms.filter(f => f.iso3 === iso3).map(f => f.form),
    languages: t.languages.filter(l => l.iso3 === iso3).map(l => l.language),
    offices: gov.offices,
    parties: new Map(t.parties.map(p => [p.party_qid, p])),
    legislatures: gov.legislatures,
    indicators: new Map(t.indicators.map(i => [i.code, i])),
    series: await loadIndicatorValues(iso3),
  };
}

// Government rows of one country (regionKey '') or subregion
function governmentFor(t: Tables, iso3: string, regionKey: string) {
  const mine = <T extends { iso3: string; region_key: string }>(r: T) => r.iso3 === iso3 && (r.region_key ?? '') === regionKey;
  const legs = t.legislatures.filter(mine);
  const seatsFor = (qid: string) => t.seats.filter(s => s.legislature_qid === qid).sort((a, b) => b.seats - a.seats);
  return {
    government: t.government.find(mine),
    offices: t.offices.filter(mine),
    legislatures: legs.filter(l => !l.parent_qid).map(l => ({
      ...l,
      seatRows: seatsFor(l.legislature_qid),
      chambers: legs.filter(c => c.parent_qid === l.legislature_qid).map(c => ({ ...c, seatRows: seatsFor(c.legislature_qid) })),
    })),
  };
}

// ── Subregions (admin-1 and US counties) ─────────────────────────────────────
export type RegionRow = { region_key: string; level: string; iso3: string; wikidata: string; name: string; area_km2: string };
export type RegionIndicatorRow = { code: string; name: string; topic: string; wikidata_property: string };
// One indicator's series in a single unit (the unit with the most data points)
export type RegionSeries = { unit: string; points: Point[] };

export type RegionData = {
  region: RegionRow;
  government?: GovernmentRow;
  offices: OfficeRow[];
  legislatures: CountryData['legislatures'];
  indicators: Map<string, RegionIndicatorRow>;
  series: Map<string, RegionSeries>;
};

type RegionValueRow = { region_key: string; code: string; year: string; value: string; unit: string };
let regionTablesPromise: Promise<{ regions: Map<string, RegionRow>; indicators: RegionIndicatorRow[] }> | null = null;
const regionValueCache = new Map<string, Promise<RegionValueRow[]>>();

export function loadRegionTables() {
  regionTablesPromise ??= Promise.all([table<RegionRow>('regions'), table<RegionIndicatorRow>('region_indicators')])
    .then(([regions, indicators]) => ({ regions: new Map(regions.map(r => [r.region_key, r])), indicators }));
  return regionTablesPromise;
}

// All subregion values of one country (its region_values partition)
export function loadRegionValueRows(countrySlug: string): Promise<RegionValueRow[]> {
  if (!regionValueCache.has(countrySlug)) {
    regionValueCache.set(countrySlug, fetch(`${BASE}/region_values/${countrySlug}.csv`)
      .then(res => (res.ok ? res.text() : ''))
      .then(text => (text ? csvParse(text) : []) as unknown as RegionValueRow[]));
  }
  return regionValueCache.get(countrySlug)!;
}

// Region data keyed as in regions.csv; countrySlug picks the region_values partition
export async function loadRegionData(regionKey: string, countrySlug: string): Promise<RegionData | null> {
  const [t, rt] = await Promise.all([loadTables(), loadRegionTables()]);
  const region = rt.regions.get(regionKey);
  if (!region) return null;

  const rows = (await loadRegionValueRows(countrySlug)).filter(r => r.region_key === regionKey);
  const byCodeUnit = new Map<string, Map<string, Point[]>>();
  for (const r of rows) {
    if (!byCodeUnit.has(r.code)) byCodeUnit.set(r.code, new Map());
    const units = byCodeUnit.get(r.code)!;
    if (!units.has(r.unit)) units.set(r.unit, []);
    units.get(r.unit)!.push({ year: +r.year, value: +r.value });
  }
  const series = new Map<string, RegionSeries>();
  for (const [code, units] of byCodeUnit) {
    const [unit, points] = [...units.entries()].sort((a, b) => b[1].length - a[1].length)[0];
    // Several statements for one year (e.g. census and estimate): keep the last listed
    const byYear = new Map(points.map(p => [p.year, p]));
    series.set(code, { unit, points: [...byYear.values()].sort((a, b) => a.year - b.year) });
  }
  return {
    region,
    ...governmentFor(t, region.iso3, regionKey),
    indicators: new Map(rt.indicators.map(i => [i.code, i])),
    series,
  };
}

// Link to the English Wikipedia article for a Wikidata item
export const wikiLink = (qid: string) => `https://en.wikipedia.org/wiki/Special:GoToLinkedPage/enwiki/${qid}`;

// ── Capitals ─────────────────────────────────────────────────────────────────
export type Capital = { name: string; qid: string; lat: number; lon: number };

let capitalsPromise: Promise<Map<string, Capital[]>> | null = null;
// Capitals keyed by region: country iso3, "<country-slug>/<admin1 id>", or a US county's QID
export function loadCapitals(): Promise<Map<string, Capital[]>> {
  capitalsPromise ??= table<{ region_key: string; capital_qid: string; capital: string; lat: string; lon: string }>('capitals')
    .then(rows => {
      const out = new Map<string, Capital[]>();
      for (const r of rows) {
        if (!out.has(r.region_key)) out.set(r.region_key, []);
        out.get(r.region_key)!.push({ name: r.capital, qid: r.capital_qid, lat: +r.lat, lon: +r.lon });
      }
      return out;
    });
  capitalsPromise.catch(() => { capitalsPromise = null; });
  return capitalsPromise;
}

// iso3 for a map country slug (the capitals and indicator tables are keyed by iso3)
export async function iso3ForSlug(mapSlug: string): Promise<string | null> {
  return (await loadTables()).countries.find(c => c.map_slug === mapSlug)?.iso3 ?? null;
}
