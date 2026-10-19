'use client'
import { useEffect, useMemo, useState } from 'react';
import { feature } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import StandardLayout from '@/layouts/standardLayout';
import WorldMap, { Country, Insets, Subregion, SubregionProps } from './components/WorldMap';
import CountryPanel, { Tab } from './components/CountryPanel';
import { countrySlug, wikiTitleFor } from './lib/countryNames';
import { Capital, iso3ForSlug, loadCapitals } from './lib/db';
import { Level, METRICS, NO_DATA, ViewData, buildScale, loadViewData } from './lib/choropleth';
import ColorByControl from './components/ColorByControl';
import './styles/worldmap.css';

const PANEL_WIDTH = 420;
// Matches the bottom-sheet breakpoint in worldmap.css
const MOBILE_QUERY = '(max-width: 640px)';

type DataSource = { name: string; license: string; url: string };
// Which subregions have district (admin-2) files, and where each country's came from
type Admin2Meta = { index: Record<string, Record<string, number>>; sources: Record<string, DataSource> };

const regionCache = new Map<string, Subregion[]>();

async function loadRegions(url: string, keyPrefix: string): Promise<Subregion[]> {
  const cached = regionCache.get(url);
  if (cached) return cached;
  const res = await fetch(url);
  const list: Subregion[] = [];
  if (res.ok) {
    const topo = await res.json() as Topology<Record<string, GeometryCollection<SubregionProps>>>;
    const fc = feature(topo, Object.values(topo.objects)[0]);
    fc.features.forEach((f, i) => list.push({ ...f.properties, key: `${keyPrefix}-${i}`, feature: f }));
  }
  regionCache.set(url, list);
  return list;
}

// Loads child regions for `parent` whenever it changes; empty while loading or if none
function useChildRegions(parent: object | null, url: string | null, keyPrefix: string) {
  const [list, setList] = useState<Subregion[]>([]);
  useEffect(() => {
    setList([]);
    if (!parent || !url) return;
    let stale = false;
    loadRegions(url, keyPrefix)
      .then(l => { if (!stale) setList(l); })
      .catch(err => console.error('Failed to load regions', err));
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent, url]);
  return list;
}

export default function WorldMapPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selected, setSelected] = useState<Country | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subregion | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<Subregion | null>(null);
  const [admin2, setAdmin2] = useState<Admin2Meta | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('Overview');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    Promise.all(['index', 'sources'].map(f => fetch(`/worldmap/admin2/${f}.json`).then(r => r.json())))
      .then(([index, sources]) => setAdmin2({ index, sources }))
      .catch(err => console.error('Failed to load district index', err));
  }, []);

  const slug = selected ? countrySlug(selected.name) : null;
  const subregions = useChildRegions(selected, slug && `/worldmap/admin1/${slug}.json`, slug ?? '');
  const hasDistricts = !!(slug && selectedSub?.id && admin2?.index[slug]?.[selectedSub.id]);
  const districts = useChildRegions(
    selectedSub,
    hasDistricts ? `/worldmap/admin2/${slug}/${selectedSub!.id}.json` : null,
    `${slug}/${selectedSub?.id}`,
  );

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    // Prefix matches first, then shorter names, so "united states" finds the US before its territories
    const rank = (title: string) => (title.toLowerCase().startsWith(q) ? 0 : 1);
    return countries
      .map(c => ({ c, title: wikiTitleFor(c.name) }))
      .filter(({ c, title }) => c.name.toLowerCase().includes(q) || title.toLowerCase().includes(q))
      .sort((a, b) => rank(a.title) - rank(b.title) || a.title.length - b.title.length || a.title.localeCompare(b.title))
      .slice(0, 8)
      .map(({ c }) => c);
  }, [query, countries]);

  const select = (c: Country | null) => {
    if (c?.key !== selected?.key) setSelected(c);
    setSelectedSub(null);
    setSelectedDistrict(null);
    setQuery('');
  };
  const selectSub = (s: Subregion | null) => {
    if (s?.key !== selectedSub?.key) setSelectedSub(s);
    setSelectedDistrict(null);
  };

  // Escape steps back out: district -> subregion -> country -> world
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (selectedDistrict) setSelectedDistrict(null);
      else if (selectedSub) setSelectedSub(null);
      else setSelected(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedSub, selectedDistrict]);

  const panelOpen = !!selected;
  const insets: Insets = useMemo(() => ({
    right: panelOpen && !isMobile ? PANEL_WIDTH : 0,
    bottom: panelOpen && isMobile ? window.innerHeight * 0.6 : 0,
  }), [panelOpen, isMobile]);

  const countryTitle = selected ? wikiTitleFor(selected.name) : '';

  // ── Map colouring: the deepest level currently drawn is "the view" ──────────
  const [metricId, setMetricId] = useState<string | null>(null);
  const level: Level = districts.length ? 2 : subregions.length ? 1 : 0;
  const [viewData, setViewData] = useState<ViewData | null>(null);
  useEffect(() => {
    setViewData(null);
    let stale = false;
    loadViewData(level, slug ?? undefined)
      .then(d => { if (!stale) setViewData(d); })
      .catch(err => console.error('Failed to load map colouring data', err));
    return () => { stale = true; };
  }, [level, slug]);
  const metric = METRICS.find(m => m.id === metricId) ?? null;
  const scale = useMemo(
    () => (metric && viewData ? buildScale(metric, viewData.get(metric.id)!) : null),
    [metric, viewData],
  );
  // Fill colour and tooltip text per shape of the current view
  const choropleth = useMemo(() => {
    if (!metric || !scale || !viewData) return null;
    const data = viewData.get(metric.id)!;
    const shapes: [string, string | null | undefined][] = level === 0
      ? countries.map(c => [c.key, countrySlug(c.name)])
      : (level === 1 ? subregions : districts).map(s => [s.key, level === 1 ? s.id : s.wikidata]);
    const fills = new Map<string, string>();
    const labels = new Map<string, string>();
    for (const [key, dataKey] of shapes) {
      const d = dataKey ? data.get(dataKey) : undefined;
      fills.set(key, d ? scale.color(d) : NO_DATA);
      labels.set(key, d ? scale.describe(d) : 'No data');
    }
    return { level, fills, labels };
  }, [metric, scale, viewData, level, countries, subregions, districts]);

  // Capital(s) of the most specific selection: district (US counties), subregion or country
  const [capitals, setCapitals] = useState<Capital[]>([]);
  useEffect(() => {
    setCapitals([]);
    if (!slug) return;
    let stale = false;
    (async () => {
      const key = selectedDistrict ? selectedDistrict.wikidata
        : selectedSub ? `${slug}/${selectedSub.id}`
        : await iso3ForSlug(slug);
      const list = key ? (await loadCapitals()).get(key) ?? [] : [];
      if (!stale) setCapitals(list);
    })().catch(err => console.error('Failed to load capitals', err));
    return () => { stale = true; };
  }, [slug, selectedSub, selectedDistrict]);
  const capitalNames = capitals.length ? capitals.map(c => c.name).join(', ') : undefined;
  const districtSource = slug && districts.length ? admin2?.sources[slug] : undefined;

  let panel = null;
  if (selected && selectedSub && selectedDistrict) {
    panel = (
      <CountryPanel
        key={selectedDistrict.key}
        articleTitle={selectedDistrict.name}
        wikidata={selectedDistrict.wikidata}
        searchHint={`${selectedSub.name} ${countryTitle}`}
        capital={capitalNames}
        // Only US counties have region data; other districts show just the overview
        mapSlug={selectedDistrict.wikidata ? slug! : undefined}
        regionKey={selectedDistrict.wikidata ?? undefined}
        tab={tab}
        onTabChange={setTab}
        displayName={selectedDistrict.name}
        subtitle={selectedDistrict.type}
        crumbs={[
          { name: countryTitle, onClick: () => selectSub(null) },
          { name: selectedSub.name, onClick: () => setSelectedDistrict(null) },
        ]}
        source={districtSource}
        onClose={() => select(null)}
      />
    );
  } else if (selected && selectedSub) {
    panel = (
      <CountryPanel
        key={selectedSub.key}
        articleTitle={selectedSub.wiki ?? selectedSub.name}
        wikidata={selectedSub.wikidata}
        displayName={selectedSub.name}
        subtitle={selectedSub.type}
        crumbs={[{ name: countryTitle, onClick: () => selectSub(null) }]}
        capital={capitalNames}
        mapSlug={slug!}
        regionKey={`${slug}/${selectedSub.id}`}
        tab={tab}
        onTabChange={setTab}
        subregions={districts}
        onSelectSubregion={setSelectedDistrict}
        source={districtSource}
        onClose={() => select(null)}
      />
    );
  } else if (selected) {
    panel = (
      <CountryPanel
        key={selected.key}
        articleTitle={countryTitle}
        displayName={selected.name}
        mapSlug={slug!}
        capital={capitalNames}
        tab={tab}
        onTabChange={setTab}
        subregions={subregions}
        onSelectSubregion={selectSub}
        onClose={() => select(null)}
      />
    );
  }

  const main = (
    <div className="wm-page">
      <WorldMap
        selectedKey={selected?.key ?? null}
        onSelect={select}
        subregions={subregions}
        selectedSubKey={selectedSub?.key ?? null}
        onSelectSubregion={selectSub}
        districts={districts}
        selectedDistrictKey={selectedDistrict?.key ?? null}
        onSelectDistrict={setSelectedDistrict}
        capitals={capitals}
        choropleth={choropleth}
        onLoad={setCountries}
        insets={insets}
      />

      <div className="wm-search">
        <input
          placeholder="Search for a country…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && matches[0]) select(matches[0]);
            if (e.key === 'Escape') setQuery('');
          }}
        />
        {matches.length > 0 && (
          <ul>
            {matches.map(c => (
              <li key={c.key}><button onClick={() => select(c)}>{wikiTitleFor(c.name)}</button></li>
            ))}
          </ul>
        )}
      </div>

      {panel}

      <ColorByControl
        level={level}
        data={viewData}
        metricId={metricId}
        onChange={setMetricId}
        scale={scale}
        style={isMobile ? undefined : { right: insets.right + 12 }}
      />

      <div className="wm-credits" style={{ right: insets.right + 8, bottom: insets.bottom + 6 }}>
        Map data: <a href="https://www.naturalearthdata.com" target="_blank" rel="noreferrer">Natural Earth</a>,{' '}
        <a href="https://www.geoboundaries.org" target="_blank" rel="noreferrer">geoBoundaries</a> ·
        Text: <a href="https://en.wikipedia.org" target="_blank" rel="noreferrer">Wikipedia</a> (CC BY-SA)
      </div>
    </div>
  );

  return StandardLayout({ title: 'World Map', main, headerMode: 'tyro-only', variant: 'plain' });
}
