// Historical country borders for the time slider: CShapes 2.0 country-periods, built by
// scripts/build-history.mjs into /worldmap/history/countries.json.
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';

// First and last years CShapes covers; later years show the present-day map
export const HISTORY_START = 1886;
export const HISTORY_END = 2019;

// One span in which a territory's borders, capital and state were unchanged
export type Period = {
  g: number;       // Gleditsch–Ward code: the territory, stable across periods
  s: number;       // start date, YYYYMMDD
  e: number;       // end date, YYYYMMDD, inclusive
  n: string;       // display name of the state, e.g. "Russian Empire"
  w: string;       // its English Wikipedia article
  q: string;       // its Wikidata QID
  c: string;       // capital
  x: number;       // capital longitude
  y: number;       // capital latitude
  a: number;       // area, km²
};

export type PeriodFeature = Feature<Geometry, Period>;

// The map for a year shows borders as of 1 July: CShapes dates many changes of uncertain
// date to 1 January, so mid-year avoids landing on those placeholder boundaries.
export const dateOfYear = (year: number) => year * 10000 + 701;

export const formatDate = (d: number) => {
  const y = Math.floor(d / 10000);
  const date = new Date(Date.UTC(y, Math.floor(d / 100) % 100 - 1, d % 100));
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

let historyPromise: Promise<PeriodFeature[]> | null = null;
export function loadHistory(): Promise<PeriodFeature[]> {
  historyPromise ??= fetch('/worldmap/history/countries.json')
    .then(r => r.json())
    .then(json => {
      const topo = json as Topology<{ countries: GeometryCollection<Period> }>;
      return feature(topo, topo.objects.countries).features as PeriodFeature[];
    });
  return historyPromise;
}

export const periodsAt = (all: PeriodFeature[], year: number) => {
  const d = dateOfYear(year);
  return all.filter(f => f.properties.s <= d && d <= f.properties.e);
};

// Number of territories whose borders, status or name changed in each year, for the
// slider's tick marks; a territory's first appearance in 1886 isn't a change
export function changesPerYear(all: PeriodFeature[]): Map<number, number> {
  const seen = new Set<string>();
  for (const f of all) {
    const { g, s } = f.properties;
    if (s > HISTORY_START * 10000 + 101) seen.add(`${g}-${Math.floor(s / 10000)}`);
  }
  const counts = new Map<number, number>();
  for (const k of seen) {
    const y = +k.split('-')[1];
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  return counts;
}
