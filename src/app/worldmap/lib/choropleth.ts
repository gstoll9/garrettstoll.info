// Map colouring ("choropleth"): which datapoints can colour the current view, their values
// for every shape in it, and the colour scales.
import { quantile } from 'd3';
import { loadRegionValueRows, loadRegionTables, loadTables } from './db';
import { formatValue } from './format';

export type Category = 'Government' | 'Economy' | 'Demographics';
// 0: world (countries), 1: a country's subregions, 2: a subregion's districts
export type Level = 0 | 1 | 2;
type Kind = 'sequential' | 'diverging' | 'categorical';

type Source =
  | { code: string }                 // national indicator_latest / region_values code
  | { derived: 'form' | 'legislature' | 'income' | 'party' | 'density' | 'area' };

export type Metric = {
  id: string;
  label: string;
  category: Category;
  kind: Kind;
  unit: string;
  // Fixed symmetric domain for diverging scores
  domain?: number;
  country?: Source;
  region?: Source;   // admin-1 and US counties
};

const wgi = (code: string, label: string): Metric => ({
  id: code, label, category: 'Government', kind: 'diverging', unit: 'score, -2.5 to 2.5', domain: 2.5, country: { code },
});

export const METRICS: Metric[] = [
  // Government
  { id: 'form', label: 'Form of government', category: 'Government', kind: 'categorical', unit: '', country: { derived: 'form' } },
  { id: 'party', label: "Head of government's party", category: 'Government', kind: 'categorical', unit: '', region: { derived: 'party' } },
  { id: 'legislature', label: 'Legislature structure', category: 'Government', kind: 'categorical', unit: '', country: { derived: 'legislature' }, region: { derived: 'legislature' } },
  wgi('GOV_WGI_VA.EST', 'Voice and accountability'),
  wgi('GOV_WGI_PV.EST', 'Political stability'),
  wgi('GOV_WGI_GE.EST', 'Government effectiveness'),
  wgi('GOV_WGI_RQ.EST', 'Regulatory quality'),
  wgi('GOV_WGI_RL.EST', 'Rule of law'),
  wgi('GOV_WGI_CC.EST', 'Control of corruption'),
  { id: 'gov_expense', label: 'Government expense (% GDP)', category: 'Government', kind: 'sequential', unit: '% of GDP', country: { code: 'GC.XPN.TOTL.GD.ZS' } },
  { id: 'military', label: 'Military expenditure (% GDP)', category: 'Government', kind: 'sequential', unit: '% of GDP', country: { code: 'MS.MIL.XPND.GD.ZS' } },
  // Economy
  { id: 'gdp', label: 'GDP', category: 'Economy', kind: 'sequential', unit: 'current US$', country: { code: 'NY.GDP.MKTP.CD' }, region: { code: 'gdp' } },
  { id: 'gdp_pc', label: 'GDP per capita', category: 'Economy', kind: 'sequential', unit: 'current US$', country: { code: 'NY.GDP.PCAP.CD' }, region: { code: 'gdp_per_capita' } },
  { id: 'gdp_pc_ppp', label: 'GDP per capita (PPP)', category: 'Economy', kind: 'sequential', unit: 'current international $', country: { code: 'NY.GDP.PCAP.PP.CD' } },
  { id: 'income', label: 'Income group', category: 'Economy', kind: 'categorical', unit: '', country: { derived: 'income' } },
  { id: 'growth', label: 'GDP growth', category: 'Economy', kind: 'diverging', unit: '% annual', country: { code: 'NY.GDP.MKTP.KD.ZG' } },
  { id: 'inflation', label: 'Inflation', category: 'Economy', kind: 'sequential', unit: '% annual', country: { code: 'FP.CPI.TOTL.ZG' } },
  { id: 'unemployment', label: 'Unemployment', category: 'Economy', kind: 'sequential', unit: '% of labor force', country: { code: 'SL.UEM.TOTL.ZS' }, region: { code: 'unemployment' } },
  { id: 'debt', label: 'Government debt (% GDP)', category: 'Economy', kind: 'sequential', unit: '% of GDP', country: { code: 'GC.DOD.TOTL.GD.ZS' } },
  { id: 'gini', label: 'Income inequality (Gini)', category: 'Economy', kind: 'sequential', unit: '0-100', country: { code: 'SI.POV.GINI' } },
  { id: 'exports', label: 'Exports (% GDP)', category: 'Economy', kind: 'sequential', unit: '% of GDP', country: { code: 'NE.EXP.GNFS.ZS' } },
  // Demographics
  { id: 'population', label: 'Population', category: 'Demographics', kind: 'sequential', unit: 'people', country: { code: 'SP.POP.TOTL' }, region: { code: 'population' } },
  { id: 'density', label: 'Population density', category: 'Demographics', kind: 'sequential', unit: 'people per km²', country: { code: 'EN.POP.DNST' }, region: { derived: 'density' } },
  { id: 'area', label: 'Area', category: 'Demographics', kind: 'sequential', unit: 'km²', region: { derived: 'area' } },
  { id: 'pop_growth', label: 'Population growth', category: 'Demographics', kind: 'diverging', unit: '% annual', country: { code: 'SP.POP.GROW' } },
  { id: 'urban', label: 'Urban population', category: 'Demographics', kind: 'sequential', unit: '% of total', country: { code: 'SP.URB.TOTL.IN.ZS' } },
  { id: 'life', label: 'Life expectancy', category: 'Demographics', kind: 'sequential', unit: 'years', country: { code: 'SP.DYN.LE00.IN' }, region: { code: 'life_expectancy' } },
  { id: 'fertility', label: 'Fertility rate', category: 'Demographics', kind: 'sequential', unit: 'births per woman', country: { code: 'SP.DYN.TFRT.IN' } },
  { id: 'aged', label: 'Ages 65+', category: 'Demographics', kind: 'sequential', unit: '% of total', country: { code: 'SP.POP.65UP.TO.ZS' } },
  { id: 'migration', label: 'Net migration', category: 'Demographics', kind: 'diverging', unit: 'people', country: { code: 'SM.POP.NETM' } },
  { id: 'literacy', label: 'Adult literacy', category: 'Demographics', kind: 'sequential', unit: '% of ages 15+', country: { code: 'SE.ADT.LITR.ZS' } },
  { id: 'hdi', label: 'Human Development Index', category: 'Demographics', kind: 'sequential', unit: 'index, 0 to 1', region: { code: 'hdi' } },
];

export type Datum = { value?: number; category?: string; color?: string; year?: number };
// metric id -> shape key -> datum. Shape keys: country map slug (level 0), admin-1 id
// (level 1) or US county QID (level 2)
export type ViewData = Map<string, Map<string, Datum>>;

// Form-of-government groups, in legend order
const FORM_CLASSES = [
  'Absolute monarchy', 'Constitutional monarchy', 'Presidential republic', 'Semi-presidential republic',
  'Parliamentary republic', 'One-party state', 'Military or provisional', 'Other',
];
const MONARCH = /monarch|king|queen|emperor|emir|sultan|prince|grand duke|sovereign|crown/i;

// Wikidata's "basic form of government" labels are often vague ("constitutional republic"),
// so explicit labels are combined with the structure of the executive: a monarch as head of
// state means a monarchy; one person as head of state and of government means a presidential
// republic (or absolute monarchy); separate holders mean a parliamentary system.
function classifyForm(forms: string, hosOffice: string, sameHolder: boolean, hasHog: boolean): string {
  if (/one-party|single-party|communist|people's republic|socialist state/.test(forms)) return 'One-party state';
  if (/military|junta|provisional|transitional/.test(forms)) return 'Military or provisional';
  if (/absolute monarchy/.test(forms)) return 'Absolute monarchy';
  if (/theocracy/.test(forms)) return 'Other';
  const monarchy = MONARCH.test(hosOffice) || /monarchy|commonwealth realm|emirate|kingdom/.test(forms);
  if (monarchy) return sameHolder ? 'Absolute monarchy' : 'Constitutional monarchy';
  if (/semi-presidential/.test(forms)) return 'Semi-presidential republic';
  if (/parliamentary/.test(forms)) return 'Parliamentary republic';
  if (/presidential|directorial/.test(forms) || sameHolder) return 'Presidential republic';
  if (hasHog) return 'Parliamentary republic';
  return 'Other';
}
export const INCOME_ORDER = ['Low income', 'Lower middle income', 'Upper middle income', 'High income'];

const latestBy = <T extends { year: string }>(rows: T[], key: (r: T) => string) => {
  const out = new Map<string, T>();
  for (const r of rows) {
    const k = key(r);
    if (!out.has(k) || +r.year > +out.get(k)!.year) out.set(k, r);
  }
  return out;
};

// Every metric's values for the shapes of one view
export async function loadViewData(level: Level, countrySlug?: string): Promise<ViewData> {
  const t = await loadTables();
  const out: ViewData = new Map(METRICS.map(m => [m.id, new Map()]));
  const set = (id: string, key: string, d: Datum) => out.get(id)!.set(key, d);

  if (level === 0) {
    const slugByIso = new Map(t.countries.filter(c => c.map_slug).map(c => [c.iso3, c.map_slug]));
    const latest = await loadLatest();
    for (const m of METRICS) {
      if (m.country && 'code' in m.country) {
        for (const r of latest.get(m.country.code) ?? []) {
          const slug = slugByIso.get(r.iso3);
          if (slug) set(m.id, slug, { value: r.value, year: r.year });
        }
      }
    }
    for (const c of t.countries) {
      if (!c.map_slug) continue;
      const forms = t.forms.filter(f => f.iso3 === c.iso3).map(f => f.form.toLowerCase()).join(' | ');
      const offices = t.offices.filter(o => o.iso3 === c.iso3 && !o.region_key);
      const hos = offices.filter(o => o.role === 'head_of_state');
      const hog = offices.filter(o => o.role === 'head_of_government');
      if (forms || hos.length) {
        const same = hos.length > 0 && hog.length > 0 && hog.every(g => hos.some(h => h.holder_qid === g.holder_qid));
        set('form', c.map_slug, { category: classifyForm(forms, hos.map(h => h.office).join(' '), same, hog.length > 0) });
      }
      if (c.income_group && INCOME_ORDER.includes(c.income_group)) set('income', c.map_slug, { category: c.income_group });
    }
    legislatureStructure(t.legislatures.filter(l => !l.region_key), l => slugByIso.get(l.iso3), (k, d) => set('legislature', k, d));
    return out;
  }

  if (!countrySlug) return out;
  // Subregion shapes are keyed by admin-1 id (level 1) or county QID (level 2)
  const shapeKey = (regionKey: string) => (level === 1
    ? regionKey.startsWith(`${countrySlug}/`) ? regionKey.slice(countrySlug.length + 1) : null
    : /^Q\d+$/.test(regionKey) ? regionKey : null);

  const [rows, rt] = await Promise.all([loadRegionValueRows(countrySlug), loadRegionTables()]);
  for (const m of METRICS) {
    if (!m.region || !('code' in m.region)) continue;
    const code = m.region.code;
    // Use only the most common unit, so values are comparable (e.g. one currency)
    const mine = rows.filter(r => r.code === code && shapeKey(r.region_key));
    const unitCounts = new Map<string, number>();
    for (const r of mine) unitCounts.set(r.unit, (unitCounts.get(r.unit) ?? 0) + 1);
    const unit = [...unitCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    for (const [rk, r] of latestBy(mine.filter(r => r.unit === unit), r => r.region_key)) {
      set(m.id, shapeKey(rk)!, { value: +r.value, year: +r.year });
    }
  }
  for (const r of rt.regions.values()) {
    const k = shapeKey(r.region_key);
    if (!k || !+r.area_km2) continue;
    set('area', k, { value: +r.area_km2 });
    const pop = out.get('population')!.get(k);
    if (pop?.value) set('density', k, { value: pop.value / +r.area_km2, year: pop.year });
  }
  const parties = new Map(t.parties.map(p => [p.party_qid, p]));
  for (const o of t.offices) {
    const k = o.region_key && o.role === 'head_of_government' ? shapeKey(o.region_key) : null;
    if (!k || !o.party) continue;
    set('party', k, { category: o.party, color: parties.get(o.party_qid)?.color || undefined });
  }
  legislatureStructure(t.legislatures.filter(l => l.region_key), l => shapeKey(l.region_key) ?? undefined, (k, d) => set('legislature', k, d));
  return out;
}

function legislatureStructure<L extends { legislature_qid: string; parent_qid: string }>(
  legs: L[], keyOf: (l: L) => string | undefined, set: (k: string, d: Datum) => void,
) {
  const chambers = new Map<string, number>();
  for (const l of legs) {
    const k = keyOf(l);
    if (!k) continue;
    if (!chambers.has(k)) chambers.set(k, 0);
    if (l.parent_qid) chambers.set(k, chambers.get(k)! + 1);
  }
  for (const [k, n] of chambers) set(k, { category: n >= 2 ? 'Bicameral' : 'Unicameral' });
}

let latestPromise: Promise<Map<string, { iso3: string; year: number; value: number }[]>> | null = null;
function loadLatest() {
  latestPromise ??= fetch('/worldmap/db/indicator_latest.csv').then(r => r.text()).then(text => {
    const out = new Map<string, { iso3: string; year: number; value: number }[]>();
    for (const line of text.trim().split('\n').slice(1)) {
      const [iso3, code, year, value] = line.split(',');
      if (!out.has(code)) out.set(code, []);
      out.get(code)!.push({ iso3, year: +year, value: +value });
    }
    return out;
  });
  return latestPromise;
}

// ── Colour scales ────────────────────────────────────────────────────────────
// Sequential: one blue ramp, dark (low, recedes into the dark map) to light (high)
const SEQ = ['#163f7a', '#1c5cab', '#2a78d6', '#3987e5', '#6da7ec', '#9ec5f4', '#cde2fb'];
// Diverging: red (negative) - neutral grey - blue (positive)
const DIV = ['#b33c3c', '#e66767', '#eea3a3', '#5c5c58', '#86b6ef', '#3987e5', '#1c5cab'];
// Categorical: fixed slot order (dark-mode steps of the validated palette); never cycled
const CAT = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
export const NO_DATA = '#2b3446';
const OTHER = '#6b7280';

export type LegendItem = { color: string; label: string };
export type Scale = { color: (d: Datum | undefined) => string; legend: LegendItem[]; describe: (d: Datum) => string };

export function buildScale(metric: Metric, data: Map<string, Datum>): Scale | null {
  const items = [...data.values()];
  if (!items.length) return null;
  const fmt = (v: number) => formatValue(v, metric.unit);
  const describe = (d: Datum) =>
    d.category ?? (d.value != null ? `${fmt(d.value)}${d.year ? ` (${d.year})` : ''}` : 'No data');

  if (metric.kind === 'categorical') {
    // Fixed order where one exists (form classes, income groups); otherwise by frequency
    const counts = new Map<string, number>();
    for (const d of items) counts.set(d.category!, (counts.get(d.category!) ?? 0) + 1);
    const order = metric.id === 'form' ? FORM_CLASSES
      : metric.id === 'income' ? INCOME_ORDER
      : metric.id === 'legislature' ? ['Unicameral', 'Bicameral']
      : [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)!);
    const shown = order.filter(c => counts.has(c));
    // "Other" is never given a hue of its own; it always folds into the grey bucket
    const top = shown.filter(c => c !== 'Other').slice(0, CAT.length);
    const colorOf = new Map<string, string>();
    top.forEach((c, i) => {
      // Parties keep their own colours; income groups read as an ordered ramp
      const own = items.find(d => d.category === c)?.color;
      colorOf.set(c, metric.id === 'party' && own ? own
        : metric.id === 'income' ? SEQ[[1, 3, 5, 6][INCOME_ORDER.indexOf(c)]]
        : CAT[i]);
    });
    const hasOther = shown.length > top.length;
    const otherCount = shown.filter(c => !top.includes(c)).reduce((n, c) => n + counts.get(c)!, 0);
    return {
      color: d => (d?.category ? colorOf.get(d.category) ?? OTHER : NO_DATA),
      legend: [...top.map(c => ({ color: colorOf.get(c)!, label: `${c} (${counts.get(c)})` })), ...(hasOther ? [{ color: OTHER, label: `Other (${otherCount})` }] : [])],
      describe,
    };
  }

  const values = items.map(d => d.value!).filter(v => Number.isFinite(v)).sort((a, b) => a - b);
  if (!values.length) return null;
  let thresholds: number[];
  let colors: string[];
  if (metric.kind === 'diverging') {
    const m = metric.domain ?? (Math.max(Math.abs(quantile(values, 0.05)!), Math.abs(quantile(values, 0.95)!)) || 1);
    // Seven bins symmetric around 0; the middle bin is "about zero"
    thresholds = [-0.6, -0.3, -0.08, 0.08, 0.3, 0.6].map(f => f * m);
    colors = DIV;
  } else {
    // Quantile bins: equal numbers of shapes per colour, robust to skew (GDP, population)
    const n = Math.min(SEQ.length, new Set(values).size);
    thresholds = [...new Set(Array.from({ length: n - 1 }, (_, i) => quantile(values, (i + 1) / n)!))];
    colors = n === SEQ.length ? SEQ : SEQ.filter((_, i) => i % Math.ceil(SEQ.length / n) === 0).slice(0, thresholds.length + 1);
  }
  const bin = (v: number) => thresholds.findIndex(t => v < t) === -1 ? thresholds.length : thresholds.findIndex(t => v < t);
  const legend = colors.slice(0, thresholds.length + 1).map((color, i) => ({
    color,
    label: i === 0 ? `< ${fmt(thresholds[0])}` : i === thresholds.length ? `≥ ${fmt(thresholds[i - 1])}` : `${fmt(thresholds[i - 1])} – ${fmt(thresholds[i])}`,
  }));
  return {
    color: d => (d?.value != null && Number.isFinite(d.value) ? colors[bin(d.value)] : NO_DATA),
    legend: thresholds.length ? legend : [{ color: colors[0], label: fmt(values[0]) }],
    describe,
  };
}
