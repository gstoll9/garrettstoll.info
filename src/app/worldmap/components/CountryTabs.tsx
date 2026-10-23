'use client'
// Government / Economy / Demographics tabs of the country panel, read from the CSV database
import { useEffect, useState } from 'react';
import type { CountryData, LegislatureRow, OfficeRow, Point, RegionData, SeatRow, TradeData, TradeFlow, TradeSector } from '../lib/db';
import { loadTradeData } from '../lib/db';
import { wikiLink } from '../lib/db';
import { compact, formatValue } from '../lib/format';
import { Hemicycle, LineChart, RankedBars, SERIES, ScoreBars, ShareBar, StackedShare, StatGrid } from './charts';

const latestPoint = (pts?: Point[]) => (pts?.length ? pts[pts.length - 1] : undefined);

// Stat tile for the latest value of an indicator, if the country has one
function stat(d: CountryData, code: string, label?: string) {
  const p = latestPoint(d.series.get(code));
  const ind = d.indicators.get(code);
  if (!p || !ind) return null;
  return { label: label ?? ind.name, value: formatValue(p.value, ind.unit), note: String(p.year) };
}
type Stat = { label: string; value: string; note?: string };
const stats = (...xs: (Stat | null | false | undefined | 0)[]) => xs.filter((x): x is Stat => !!x);

function seriesFor(d: CountryData, code: string, i = 0, label?: string) {
  return { key: code, label: label ?? d.indicators.get(code)?.name ?? code, color: SERIES[i], points: d.series.get(code) ?? [] };
}
const unitOf = (d: CountryData, code: string) => d.indicators.get(code)?.unit ?? '';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return <div className="wm-fact"><dt>{label}</dt><dd>{children}</dd></div>;
}
// Links a Wikidata item to its Wikipedia article; a label that is still a bare QID
// (no English label in Wikidata) is shown as a generic link instead
const Q = ({ qid, children }: { qid?: string; children: React.ReactNode }) => {
  const text = typeof children === 'string' && /^Q\d+$/.test(children) ? 'Wikidata item' : children;
  return qid ? <a href={wikiLink(qid)} target="_blank" rel="noreferrer">{text}</a> : <>{text}</>;
};

const WorldBankNote = () => (
  <p className="wm-chart-note">Data: World Bank (CC BY 4.0) · Wikidata</p>
);

// ── Government ───────────────────────────────────────────────────────────────
function OfficeFact({ label, offices }: { label: string; offices: OfficeRow[] }) {
  if (!offices.length) return null;
  return (
    <Fact label={label}>
      {offices.map(o => (
        <div key={o.holder_qid}>
          <Q qid={o.holder_qid}>{o.holder}</Q>
          {o.party && <span className="wm-muted"> · <Q qid={o.party_qid}>{o.party}</Q></span>}
          {o.office && <div className="wm-muted"><Q qid={o.office_qid}>{o.office}</Q></div>}
        </div>
      ))}
    </Fact>
  );
}

function ChamberChart({ chamber }: { chamber: LegislatureRow & { seatRows: SeatRow[] } }) {
  if (!chamber.seatRows.length) return null;
  const total = +chamber.seats || chamber.seatRows.reduce((s, r) => s + r.seats, 0);
  const src = chamber.seatRows[0];
  return (
    <Hemicycle
      title={chamber.name}
      total={total}
      groups={chamber.seatRows.map(r => ({
        party: r.party, seats: r.seats,
        color: r.party === 'Vacant' ? 'var(--wm-vacant)' : r.color || 'var(--wm-neutral)',
        link: r.party_wikipedia ? `https://en.wikipedia.org/wiki/${encodeURIComponent(r.party_wikipedia.replace(/ /g, '_'))}` : undefined,
      }))}
      source={src.source === 'wikipedia'
        ? `Composition: Wikipedia infobox, read ${src.as_of}`
        : `Composition: Wikidata${src.as_of ? `, as of ${src.as_of}` : ''}`}
    />
  );
}

export function GovernmentTab({ d }: { d: CountryData }) {
  const g = d.government;
  const hos = d.offices.filter(o => o.role === 'head_of_state');
  const hog = d.offices.filter(o => o.role === 'head_of_government');
  const sameLeader = hos.length === 1 && hog.length === 1 && hos[0].holder_qid === hog[0].holder_qid;
  const wgi = ['GOV_WGI_VA.EST', 'GOV_WGI_PV.EST', 'GOV_WGI_GE.EST', 'GOV_WGI_RQ.EST', 'GOV_WGI_RL.EST', 'GOV_WGI_CC.EST']
    .map(code => ({ code, p: latestPoint(d.series.get(code)) }))
    .filter(x => x.p);

  return (
    <>
      <dl className="wm-facts">
        <Fact label="Form of government">{d.forms.length ? d.forms.join(', ') : null}</Fact>
        {sameLeader
          ? <OfficeFact label="Head of state & government" offices={hos} />
          : <><OfficeFact label="Head of state" offices={hos} /><OfficeFact label="Head of government" offices={hog} /></>}
        <Fact label="Constitution">{g?.constitution && <Q qid={g.constitution_qid}>{g.constitution}</Q>}</Fact>
        <Fact label="Capital">{d.country.capital}</Fact>
      </dl>

      <h3 className="wm-subhead">Branches</h3>
      <dl className="wm-facts">
        <Fact label="Executive">{g?.executive_body && <Q qid={g.executive_body_qid}>{g.executive_body}</Q>}</Fact>
        <Fact label="Legislative">
          {d.legislatures.length ? d.legislatures.map(l => (
            <div key={l.legislature_qid}>
              <Q qid={l.legislature_qid}>{l.name}</Q>
              <span className="wm-muted">
                {l.chambers.length === 2 ? ' · bicameral' : l.chambers.length ? '' : ' · unicameral'}
                {!l.chambers.length && l.seats && ` · ${l.seats} seats`}
              </span>
              {l.chambers.map(c => (
                <div key={c.legislature_qid} className="wm-muted">
                  ↳ <Q qid={c.legislature_qid}>{c.name}</Q>{c.seats && ` · ${c.seats} seats`}
                </div>
              ))}
            </div>
          )) : null}
        </Fact>
        <Fact label="Judicial">{g?.judiciary && <Q qid={g.judiciary_qid}>{g.judiciary}</Q>}</Fact>
      </dl>

      {d.legislatures.some(l => l.seatRows.length || l.chambers.some(c => c.seatRows.length)) && (
        <>
          <h3 className="wm-subhead">Legislature composition</h3>
          {d.legislatures.flatMap(l => (l.chambers.length ? l.chambers : [l]))
            .map(c => <ChamberChart key={c.legislature_qid} chamber={c} />)}
        </>
      )}

      {wgi.length > 0 && (
        <>
          <h3 className="wm-subhead">Governance</h3>
          <ScoreBars
            title="Worldwide Governance Indicators"
            note={String(Math.max(...wgi.map(w => w.p!.year)))}
            rows={wgi.map(w => ({ label: d.indicators.get(w.code)!.name, value: w.p!.value }))}
          />
          <LineChart title="Government effectiveness & rule of law" unit="score, -2.5 to 2.5" zeroLine
            series={[seriesFor(d, 'GOV_WGI_GE.EST', 0), seriesFor(d, 'GOV_WGI_RL.EST', 1)]} />
        </>
      )}
      <StatGrid stats={stats(stat(d, 'GC.XPN.TOTL.GD.ZS'), stat(d, 'MS.MIL.XPND.GD.ZS'))} />
      <WorldBankNote />
    </>
  );
}

// ── Economy ──────────────────────────────────────────────────────────────────
type SectorLabel = 'Agriculture' | 'Industry' | 'Services';
const SECTOR_KEY: Record<SectorLabel, TradeSector> = { Agriculture: 'agriculture', Industry: 'industry', Services: 'services' };
const SECTOR_ADJ: Record<TradeSector, string> = { agriculture: 'agricultural', industry: 'industrial', services: 'service' };
const SECTOR_SCOPE: Record<TradeSector, string> = {
  agriculture: 'crops, livestock, fish and food (HS 01–24), plus raw fibres, hides, rubber and timber',
  industry: 'minerals, fuels, chemicals, metals, machinery, vehicles and other manufactures',
  services: 'travel, transport, ICT, financial and other business services',
};
const FLOW_NAME: Record<TradeFlow, string> = { X: 'exports', M: 'imports' };
// Same colours as the sector share bar, so a sector's goods match its segment
const SECTOR_COLOR: Record<SectorLabel, string> = { Agriculture: SERIES[0], Industry: SERIES[1], Services: SERIES[2] };
const ATLAS_NOTE = 'Source: The Growth Lab at Harvard, Atlas of Economic Complexity';

function useTrade(iso3: string) {
  const [trade, setTrade] = useState<TradeData | null | undefined>(undefined);
  useEffect(() => {
    let stale = false;
    setTrade(undefined);
    loadTradeData(iso3)
      .then(t => { if (!stale) setTrade(t); })
      .catch(() => { if (!stale) setTrade(null); });
    return () => { stale = true; };
  }, [iso3]);
  return trade;
}

// Top products of one flow within the given sectors, as shares of those sectors' total
function TopGoods({ trade, flow, sectors, title, color, limit = 10 }: {
  trade: TradeData; flow: TradeFlow; sectors: TradeSector[]; title: string; color: string; limit?: number;
}) {
  const tot = trade.totals[flow];
  const items = trade.items[flow].filter(i => sectors.includes(i.sector)).slice(0, limit);
  if (!tot || !items.length) return <p className="wm-status">No {sectors.map(s => SECTOR_ADJ[s]).join('/')} {FLOW_NAME[flow]} recorded.</p>;
  const base = sectors.reduce((s, k) => s + tot[k], 0);
  return (
    <RankedBars
      title={title}
      note={`${tot.year} · % of $${compact(base)}`}
      color={color}
      rows={items.map(i => ({ label: i.name, value: `$${compact(i.value)}`, share: (i.value / base) * 100 }))}
    />
  );
}

export function EconomyTab({ d }: { d: CountryData }) {
  const trade = useTrade(d.country.iso3);
  const [sector, setSector] = useState<SectorLabel | null>(null);
  const [flowLabel, setFlowLabel] = useState<string | null>(null);
  const flow: TradeFlow | null = flowLabel === 'Exports' ? 'X' : flowLabel === 'Imports' ? 'M' : null;
  const loadingTrade = trade === undefined ? <p className="wm-status">Loading trade data…</p> : null;
  const sectors = ['NV.AGR.TOTL.ZS', 'NV.IND.TOTL.ZS', 'NV.SRV.TOTL.ZS'];
  const sectorYear = Math.min(...sectors.map(c => latestPoint(d.series.get(c))?.year ?? 0));
  const sectorParts = sectorYear
    ? sectors.map((c, i) => ({
      label: ['Agriculture', 'Industry', 'Services'][i], color: SERIES[i],
      value: d.series.get(c)!.find(p => p.year === sectorYear)?.value ?? 0,
    }))
    : [];

  return (
    <>
      <StatGrid stats={stats(
        stat(d, 'NY.GDP.MKTP.CD'), stat(d, 'NY.GDP.PCAP.CD'), stat(d, 'NY.GDP.PCAP.PP.CD', 'GDP per capita (PPP)'),
        stat(d, 'NY.GDP.MKTP.KD.ZG'), stat(d, 'FP.CPI.TOTL.ZG', 'Inflation'), stat(d, 'SL.UEM.TOTL.ZS'),
        stat(d, 'GC.DOD.TOTL.GD.ZS', 'Gov. debt'), stat(d, 'SI.POV.GINI'),
      )} />
      <dl className="wm-facts">
        <Fact label="Currency">{d.country.currency}</Fact>
        <Fact label="Income group">{d.country.income_group}</Fact>
      </dl>
      <LineChart title="GDP" unit={unitOf(d, 'NY.GDP.MKTP.CD')} series={[seriesFor(d, 'NY.GDP.MKTP.CD')]} />
      <LineChart title="GDP per capita" unit={unitOf(d, 'NY.GDP.PCAP.CD')} series={[seriesFor(d, 'NY.GDP.PCAP.CD')]} />
      <LineChart title="Real GDP growth" unit="% annual" zeroLine series={[seriesFor(d, 'NY.GDP.MKTP.KD.ZG')]} />
      <LineChart title="Inflation" unit="% annual, consumer prices" zeroLine series={[seriesFor(d, 'FP.CPI.TOTL.ZG')]} />
      {sectorParts.length > 0 && (
        <ShareBar title="Economy by sector" note={`value added, % of GDP, ${sectorYear}`} parts={sectorParts}
          selected={sector} onSelect={l => setSector(l as SectorLabel | null)} hint="Click a sector to see its major goods." />
      )}
      {sector && (
        <div className="wm-detail">
          {loadingTrade ?? (trade ? <>
            <TopGoods trade={trade} flow="X" sectors={[SECTOR_KEY[sector]]} color={SECTOR_COLOR[sector]}
              title={`Major ${SECTOR_ADJ[SECTOR_KEY[sector]]} exports`} />
            <TopGoods trade={trade} flow="M" sectors={[SECTOR_KEY[sector]]} color={SECTOR_COLOR[sector]} limit={5}
              title={`Major ${SECTOR_ADJ[SECTOR_KEY[sector]]} imports`} />
            <p className="wm-chart-note">
              {ATLAS_NOTE}. {sector}: {SECTOR_SCOPE[SECTOR_KEY[sector]]}. Production by product isn&apos;t openly
              available for every country, so a sector&apos;s goods are shown by what it trades.
            </p>
          </> : <p className="wm-status">No product-level trade data for this country.</p>)}
        </div>
      )}
      <LineChart title="Trade" unit="% of GDP"
        series={[seriesFor(d, 'NE.EXP.GNFS.ZS', 0, 'Exports'), seriesFor(d, 'NE.IMP.GNFS.ZS', 1, 'Imports')]}
        selected={flowLabel} onSelect={setFlowLabel} hint="Click Exports or Imports to see the main goods traded." />
      {flow && (
        <div className="wm-detail">
          {loadingTrade ?? (trade ? <>
            <TopGoods trade={trade} flow={flow} sectors={['agriculture', 'industry']} color={flow === 'X' ? SERIES[0] : SERIES[1]}
              title={`Top goods ${FLOW_NAME[flow]}`} />
            <TopGoods trade={trade} flow={flow} sectors={['services']} color={SECTOR_COLOR.Services} limit={6}
              title={`Service ${FLOW_NAME[flow]}`} />
            <p className="wm-chart-note">{ATLAS_NOTE}.</p>
          </> : <p className="wm-status">No product-level trade data for this country.</p>)}
        </div>
      )}
      <LineChart title="Unemployment" unit="% of labor force" series={[seriesFor(d, 'SL.UEM.TOTL.ZS')]} />
      <WorldBankNote />
    </>
  );
}

// ── Demographics ─────────────────────────────────────────────────────────────
export function DemographicsTab({ d }: { d: CountryData }) {
  return (
    <>
      <StatGrid stats={stats(
        stat(d, 'SP.POP.TOTL'), stat(d, 'SP.POP.GROW'), stat(d, 'EN.POP.DNST', 'Density (per km²)'),
        stat(d, 'SP.URB.TOTL.IN.ZS', 'Urban'), stat(d, 'SP.DYN.LE00.IN', 'Life expectancy'),
        stat(d, 'SP.DYN.TFRT.IN', 'Fertility (births/woman)'), stat(d, 'SM.POP.NETM'), stat(d, 'SE.ADT.LITR.ZS', 'Literacy'),
      )} />
      <dl className="wm-facts">
        <Fact label="Official languages">{d.languages.length ? d.languages.join(', ') : null}</Fact>
        <Fact label="Region">{d.country.region}</Fact>
      </dl>
      <LineChart title="Population" unit="people" series={[seriesFor(d, 'SP.POP.TOTL')]} />
      <StackedShare title="Age structure" series={[
        seriesFor(d, 'SP.POP.0014.TO.ZS', 0, '0–14'), seriesFor(d, 'SP.POP.1564.TO.ZS', 1, '15–64'), seriesFor(d, 'SP.POP.65UP.TO.ZS', 2, '65+'),
      ]} />
      <LineChart title="Life expectancy at birth" unit="years" series={[seriesFor(d, 'SP.DYN.LE00.IN')]} />
      <LineChart title="Fertility rate" unit="births per woman" series={[seriesFor(d, 'SP.DYN.TFRT.IN')]} />
      <LineChart title="Urban population" unit="% of total" series={[seriesFor(d, 'SP.URB.TOTL.IN.ZS')]} />
      <WorldBankNote />
    </>
  );
}

// ── Subregions (Wikidata) ────────────────────────────────────────────────────
// Region values carry Wikidata units ("United States dollar", "percent", ...); map them to
// the indicator-style unit strings the formatters and charts understand
function regionUnit(code: string, unit: string): string {
  if (code === 'population') return 'people';
  if (code === 'life_expectancy') return 'years';
  if (code === 'hdi') return 'index, 0 to 1';
  if (unit === 'percent') return '% of labor force';
  if (unit === 'United States dollar') return 'current US$';
  return unit;
}
function regionStat(d: RegionData, code: string, label?: string) {
  const s = d.series.get(code);
  const p = latestPoint(s?.points);
  if (!s || !p) return null;
  const unit = regionUnit(code, s.unit);
  const known = unit.includes('$') || unit.startsWith('%') || unit === 'people' || unit === 'years' || unit.startsWith('index');
  return {
    label: label ?? d.indicators.get(code)?.name ?? code,
    value: known ? formatValue(p.value, unit) : `${formatValue(p.value, unit)} ${unit}`,
    note: String(p.year),
  };
}
function regionChart(d: RegionData, code: string, title: string, opts: { zeroLine?: boolean } = {}) {
  const s = d.series.get(code);
  if (!s || s.points.length < 2) return null;
  return <LineChart title={title} unit={regionUnit(code, s.unit)} zeroLine={opts.zeroLine}
    series={[{ key: code, label: title, color: SERIES[0], points: s.points }]} />;
}
const WikidataNote = () => <p className="wm-chart-note">Data: Wikidata (CC0) · Wikipedia (CC BY-SA)</p>;

const ECONOMY_CODES = ['gdp', 'gdp_per_capita', 'unemployment', 'median_income'];
const DEMOGRAPHIC_CODES = ['population', 'life_expectancy', 'hdi'];

// Which tabs have something to show for this region
export function regionTabs(d: RegionData) {
  return {
    Government: !!(d.offices.length || d.legislatures.length || d.government),
    Economy: ECONOMY_CODES.some(c => d.series.has(c)),
    Demographics: DEMOGRAPHIC_CODES.some(c => d.series.has(c)) || !!d.region.area_km2,
  };
}

export function RegionGovernmentTab({ d }: { d: RegionData }) {
  const g = d.government;
  const hos = d.offices.filter(o => o.role === 'head_of_state');
  const hog = d.offices.filter(o => o.role === 'head_of_government');
  const chambers = d.legislatures.flatMap(l => (l.chambers.length ? l.chambers : [l]));
  return (
    <>
      <dl className="wm-facts">
        <OfficeFact label="Head of government" offices={hog} />
        <OfficeFact label="Head of state" offices={hos} />
        <Fact label="Executive">{g?.executive_body && <Q qid={g.executive_body_qid}>{g.executive_body}</Q>}</Fact>
        <Fact label="Legislative">
          {d.legislatures.length ? d.legislatures.map(l => (
            <div key={l.legislature_qid}>
              <Q qid={l.legislature_qid}>{l.name}</Q>
              <span className="wm-muted">
                {l.chambers.length === 2 ? ' · bicameral' : l.chambers.length ? '' : ' · unicameral'}
                {!l.chambers.length && l.seats && ` · ${l.seats} seats`}
              </span>
              {l.chambers.map(c => (
                <div key={c.legislature_qid} className="wm-muted">
                  ↳ <Q qid={c.legislature_qid}>{c.name}</Q>{c.seats && ` · ${c.seats} seats`}
                </div>
              ))}
            </div>
          )) : null}
        </Fact>
        <Fact label="Judicial">{g?.judiciary && <Q qid={g.judiciary_qid}>{g.judiciary}</Q>}</Fact>
        <Fact label="Constitution">{g?.constitution && <Q qid={g.constitution_qid}>{g.constitution}</Q>}</Fact>
      </dl>
      {chambers.some(c => c.seatRows.length) && (
        <>
          <h3 className="wm-subhead">Legislature composition</h3>
          {chambers.map(c => <ChamberChart key={c.legislature_qid} chamber={c} />)}
        </>
      )}
      <WikidataNote />
    </>
  );
}

export function RegionEconomyTab({ d }: { d: RegionData }) {
  return (
    <>
      <StatGrid stats={stats(
        regionStat(d, 'gdp', 'GDP'), regionStat(d, 'gdp_per_capita', 'GDP per capita'),
        regionStat(d, 'unemployment', 'Unemployment'), regionStat(d, 'median_income', 'Median household income'),
      )} />
      {regionChart(d, 'gdp', 'GDP')}
      {regionChart(d, 'gdp_per_capita', 'GDP per capita')}
      {regionChart(d, 'unemployment', 'Unemployment rate')}
      {regionChart(d, 'median_income', 'Median household income')}
      <WikidataNote />
    </>
  );
}

export function RegionDemographicsTab({ d }: { d: RegionData }) {
  const area = +d.region.area_km2 || 0;
  const pop = latestPoint(d.series.get('population')?.points);
  return (
    <>
      <StatGrid stats={stats(
        regionStat(d, 'population'),
        area ? { label: 'Area', value: `${compact(area)} km²` } : null,
        area && pop ? { label: 'Density (per km²)', value: compact(pop.value / area), note: String(pop.year) } : null,
        regionStat(d, 'life_expectancy'),
        regionStat(d, 'hdi', 'Human Development Index'),
      )} />
      {regionChart(d, 'population', 'Population')}
      {regionChart(d, 'life_expectancy', 'Life expectancy')}
      {regionChart(d, 'hdi', 'Human Development Index')}
      <WikidataNote />
    </>
  );
}
