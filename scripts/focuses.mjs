// The /worldmap "focuses": themed sets of places drawn over the map, each built from Wikidata
// (CC0) by scripts/build-focus.mjs into public/worldmap/focus/<id>.json (+ <id>/ detail shards).
//
// Which items a focus holds:
//   roots    Wikidata classes whose instances (P31, any subclass via P279*) with coordinates
//            are included; defaults to the categories' classes
//   exclude  classes (and their subclasses) never counted as matches, e.g. marinas under "port"
//   where    instead of roots: a triple pattern on ?i, e.g. airports with an IATA code
//   enwiki   only items with an English Wikipedia article (archaeology: 325k sites otherwise)
// Each item gets the first category whose classes (with subclasses) include one of its P31
// types; a category without `qids` takes everything left over.
//
// `extras` are the focus's own facts, shown in the info box (with Wikidata's references):
//   string: the value(s); item: the linked items' English labels; date: a formatted date;
//   latest: the quantity with the latest "point in time" (P585) qualifier
// `dates` names the general inception/end dates (P571, P576) for this kind of place; `time`
// says which dates the time slider filters on (an extra date key, or 'opened'/'closed').

import { SUPPLEMENT } from './focus-astrophysics-supplement.mjs';

export const FOCUSES = {
  astrophysics: {
    label: 'Astrophysics',
    categories: [
      { id: 'gw', label: 'Gravitational-wave detectors', one: 'Gravitational-wave detector', qids: ['Q2302080'], color: '#ff6b9d' },
      { id: 'neutrino', label: 'Neutrino detectors', one: 'Neutrino detector', qids: ['Q583152'], color: '#b48cff' },
      { id: 'cosmicray', label: 'Cosmic-ray observatories', one: 'Cosmic-ray observatory', qids: ['Q3348407'], color: '#ffd166' },
      { id: 'array', label: 'Radio arrays & interferometers', one: 'Radio array / interferometer', qids: ['Q349772'], color: '#2dd4bf' },
      { id: 'radio', label: 'Radio telescopes', one: 'Radio telescope', qids: ['Q184356'], color: '#38bdf8' },
      { id: 'deepspace', label: 'Deep space stations', one: 'Deep space station', qids: ['Q106581431'], color: '#fb923c' },
      { id: 'solar', label: 'Solar telescopes', one: 'Solar telescope', qids: ['Q1238291'], color: '#facc15' },
      { id: 'telescope', label: 'Optical & other telescopes', one: 'Telescope', qids: ['Q4213'], color: '#a3e635' },
      { id: 'observatory', label: 'Observatories', one: 'Observatory', qids: ['Q1254933'], color: '#cbd5e1' },
    ],
    // Facilities recorded as parts of matched items take their parent's category, and
    // observatory sites containing matched items are added as observatories
    expandParts: { siteClasses: ['Q62832', 'Q1254933'], siteCategory: 'observatory' },
    supplement: SUPPLEMENT,
    extras: [
      { key: 'mpc', label: 'MPC code', prop: 'P717', type: 'string', link: 'https://minorplanetcenter.net/iau/lists/ObsCodesF.html' },
    ],
    dates: { opened: 'Opened', closed: 'Closed' },
    time: { from: 'opened', to: 'closed' },
  },

  archaeology: {
    label: 'Archaeology',
    roots: ['Q839954'],
    exclude: ['Q852190'], // shipwrecks (30k, mostly offshore wreck records)
    enwiki: true,
    categories: [
      { id: 'cities', label: 'Ancient cities & settlements', one: 'Ancient city / settlement', qids: ['Q15661340', 'Q148837', 'Q755017', 'Q1708422', 'Q106491339'], color: '#f59e0b' },
      { id: 'roman', label: 'Roman sites', one: 'Roman site', qids: ['Q88205', 'Q918230', 'Q14752696'], color: '#ef4444' },
      { id: 'megaliths', label: 'Megaliths & stone circles', one: 'Megalithic monument', qids: ['Q164240', 'Q1935728', 'Q101659', 'Q193475'], color: '#a78bfa' },
      { id: 'burials', label: 'Tombs & burial sites', one: 'Tomb / burial site', qids: ['Q34023', 'Q200141', 'Q1141225', 'Q5737', 'Q381885'], color: '#94a3b8' },
      { id: 'rockart', label: 'Caves & rock art', one: 'Cave / rock art site', qids: ['Q11269813', 'Q1211146'], color: '#f472b6' },
      { id: 'forts', label: 'Hillforts & earthworks', one: 'Hillfort / earthwork', qids: ['Q744099', 'Q325017'], color: '#84cc16' },
      { id: 'other', label: 'Other archaeological sites', one: 'Archaeological site', color: '#fde68a' },
    ],
    extras: [
      { key: 'period', label: 'Period', prop: 'P2348', type: 'item' },
      { key: 'culture', label: 'Culture', prop: 'P2596', type: 'item' },
      { key: 'discovered', label: 'Discovered', prop: 'P575', type: 'date' },
      { key: 'heritage', label: 'Heritage status', prop: 'P1435', type: 'item' },
    ],
    dates: { opened: 'Built', closed: 'Abandoned' },
    // Ruins outlast their abandonment, so the time slider only hides sites not yet discovered
    time: { from: 'discovered', to: null },
  },

  airports: {
    label: 'Airports',
    where: 'wdt:P238 ?iata', // airports with an IATA code: the ones in the airline system
    categories: [
      { id: 'military', label: 'Military air bases', one: 'Military air base', qids: ['Q695850'], color: '#f87171' },
      { id: 'international', label: 'International airports', one: 'International airport', qids: ['Q644371'], color: '#38bdf8' },
      { id: 'airport', label: 'Other airports', one: 'Airport', color: '#cbd5e1' },
    ],
    extras: [
      { key: 'iata', label: 'IATA code', prop: 'P238', type: 'string' },
      { key: 'icao', label: 'ICAO code', prop: 'P239', type: 'string' },
      { key: 'passengers', label: 'Passengers', prop: 'P3872', type: 'latest' },
    ],
    dates: { opened: 'Opened', closed: 'Closed' },
    time: { from: 'opened', to: 'closed' },
  },

  ports: {
    label: 'Ports',
    roots: ['Q44782'],
    // Leisure and passenger landings, not shipping ports
    exclude: ['Q721207', 'Q16938673', 'Q133867301', 'Q3543043', 'Q10512405', 'Q1602776', 'Q25516778', 'Q106835724', 'Q10651051', 'Q3497366', 'Q136432636'],
    categories: [
      { id: 'energy', label: 'Oil & LNG terminals', one: 'Oil / LNG terminal', qids: ['Q3398676', 'Q111522266', 'Q15709854', 'Q10609171'], color: '#fb923c' },
      { id: 'naval', label: 'Naval bases', one: 'Naval base', qids: ['Q1324633', 'Q331367', 'Q1745026', 'Q7374547', 'Q55624858', 'Q11637431'], color: '#f87171' },
      { id: 'fishing', label: 'Fishing ports', one: 'Fishing port', qids: ['Q1420027'], color: '#a3e635' },
      { id: 'inland', label: 'Inland & river ports', one: 'Inland port', qids: ['Q863915', 'Q1879141', 'Q122973226'], color: '#2dd4bf' },
      { id: 'seaport', label: 'Seaports & other ports', one: 'Port', color: '#38bdf8' },
    ],
    extras: [
      { key: 'locode', label: 'UN/LOCODE', prop: 'P1937', type: 'string', link: 'https://unece.org/trade/cefact/unlocode-code-list-country-and-territory' },
    ],
    dates: { opened: 'Opened', closed: 'Closed' },
    time: { from: 'opened', to: 'closed' },
  },

  universities: {
    label: 'Universities',
    roots: ['Q3918'],
    categories: [
      { id: 'research', label: 'Research universities', one: 'Research university', qids: ['Q15936437', 'Q62078547', 'Q4315006'], color: '#facc15' },
      { id: 'military', label: 'Military academies', one: 'Military academy', qids: ['Q917182', 'Q1898357'], color: '#f87171' },
      { id: 'religious', label: 'Religious universities & seminaries', one: 'Religious university / seminary', qids: ['Q1743327', 'Q14911880', 'Q576603', 'Q557206', 'Q2120466', 'Q6082807'], color: '#c084fc' },
      { id: 'technical', label: 'Technical universities & polytechnics', one: 'Technical university / polytechnic', qids: ['Q845392', 'Q1371037', 'Q1365560', 'Q121735451'], color: '#2dd4bf' },
      { id: 'public', label: 'Public universities', one: 'Public university', qids: ['Q875538', 'Q265662', 'Q3351682'], color: '#38bdf8' },
      { id: 'private', label: 'Private universities', one: 'Private university', qids: ['Q902104'], color: '#fb923c' },
      { id: 'other', label: 'Other universities', one: 'University', color: '#cbd5e1' },
    ],
    extras: [
      { key: 'students', label: 'Students', prop: 'P2196', type: 'latest' },
      { key: 'staff', label: 'Academic staff', prop: 'P1128', type: 'latest' },
    ],
    dates: { opened: 'Founded', closed: 'Closed' },
    time: { from: 'opened', to: 'closed' },
  },
};
