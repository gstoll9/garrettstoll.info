// Map "focuses": themed sets of places drawn over the map (astrophysics facilities, airports…),
// built from Wikidata by scripts/build-focus.mjs (configs in scripts/focuses.mjs). Each is a
// compact points file, public/worldmap/focus/<id>.json, plus info-box facts sharded under
// public/worldmap/focus/<id>/, fetched when a place is opened.

// `label` is plural (legend), `one` singular (info box)
export type FocusCategory = { id: string; label: string; one: string; color: string };

// A reference Wikidata cites for one of a place's facts
export type FocusRef = { field: string; title?: string; url?: string; retrieved?: string };

// One dot: what the map, search and time filter need
export type FocusPoint = {
  id: string;            // Wikidata QID
  cat: string;           // FocusCategory id
  name: string;
  lon: number;
  lat: number;
  notable: boolean;      // has an English Wikipedia article
  from?: number;         // shown from this year (the focus decides which date: opened, discovered…)
  to?: number;           // until this year (closed)
  country?: string;      // (the first, if several) for telling search results apart
};

// The info box's facts (dates are display text, at Wikidata's precision)
export type Facility = {
  id: string;
  cat: string;
  name: string;
  desc?: string;
  lon: number;
  lat: number;
  country?: string;
  place?: string;
  operator?: string[];
  partOf?: string[];
  opened?: string;
  closed?: string;
  elevation?: number;    // metres
  website?: string;
  wiki?: string;         // English Wikipedia title
  image?: string;        // Wikimedia Commons file name
  extra?: Record<string, string>;  // the focus's own facts, by FocusExtra key
  refs?: FocusRef[];
};

export type FocusExtra = { key: string; label: string; link?: string };

export type FocusData = {
  id: FocusId;
  generated: string;
  source: { name: string; url: string; license: string };
  dates: { opened: string; closed: string };   // labels for the general dates
  extras: FocusExtra[];
  shards: number;
  categories: FocusCategory[];
  points: FocusPoint[];
};

export const FOCUSES = [
  {
    id: 'astrophysics',
    label: 'Astrophysics',
    blurb: 'Observatories, telescopes, radio arrays, deep-space stations and gravitational-wave, neutrino and cosmic-ray detectors.',
  },
  {
    id: 'archaeology',
    label: 'Archaeology',
    blurb: 'Archaeological sites with an English Wikipedia article (Wikidata lists 325,000 sites; most are unstudied cairns and barrows). On the time slider, sites appear once discovered.',
  },
  {
    id: 'airports',
    label: 'Airports',
    blurb: 'Airports with an IATA code — the ones in the airline system — plus military air bases that have one.',
  },
  {
    id: 'ports',
    label: 'Ports',
    blurb: 'Seaports, inland ports, oil and LNG terminals, fishing ports and naval bases (marinas and ferry landings left out).',
  },
  {
    id: 'universities',
    label: 'Universities',
    blurb: 'Universities and university-level institutions.',
  },
] as const;
export type FocusId = typeof FOCUSES[number]['id'];

type Row = [string, number, string, number, number, 0 | 1, number | null, number | null, string | null];
const cache = new Map<string, Promise<FocusData>>();
export function loadFocus(id: FocusId): Promise<FocusData> {
  if (!cache.has(id)) {
    cache.set(id, fetch(`/worldmap/focus/${id}.json`).then(r => r.json()).then(d => ({
      ...d,
      id,
      points: (d.points as Row[]).map(([pid, cat, name, lon, lat, notable, from, to, country]) => ({
        id: pid, cat: d.categories[cat].id, name, lon, lat, notable: !!notable,
        from: from ?? undefined, to: to ?? undefined, country: country ?? undefined,
      })),
    })));
  }
  return cache.get(id)!;
}

const shardCache = new Map<string, Promise<Record<string, Facility>>>();
export function loadFacility(data: FocusData, id: string): Promise<Facility | undefined> {
  const file = `/worldmap/focus/${data.id}/${+id.slice(1) % data.shards}.json`;
  if (!shardCache.has(file)) shardCache.set(file, fetch(file).then(r => r.json()));
  return shardCache.get(file)!.then(s => s[id]);
}

// Shown in the given year (null: today, when closed places are still shown, faded).
// Places with no recorded date are always shown.
export function activeIn(f: FocusPoint, year: number | null): boolean {
  if (year == null) return true;
  return (f.from == null || f.from <= year) && (f.to == null || f.to >= year);
}

export const commonsThumb = (file: string, width: number) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
export const commonsPage = (file: string) =>
  `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;
