'use client'
import { useEffect, useMemo, useState } from 'react';
import { CountryWiki, WikiLink, fetchCountryWiki, searchTitle, titleFromWikidata } from '../lib/wikipedia';
import type { Subregion } from './WorldMap';
import { CountryData, RegionData, loadCountryData, loadRegionData } from '../lib/db';
import {
  DemographicsTab, EconomyTab, GovernmentTab,
  RegionDemographicsTab, RegionEconomyTab, RegionGovernmentTab, regionTabs,
} from './CountryTabs';

const TABS = ['Overview', 'Government', 'Economy', 'Demographics'] as const;
export type Tab = typeof TABS[number];

// Results persist across selections for the session
const cache = new Map<string, CountryWiki>();

type Props = {
  // Wikipedia title to show. A Wikidata QID's enwiki article wins; failing that, the top
  // search result for `searchHint` (for districts with ambiguous names like "Washington").
  articleTitle: string;
  wikidata?: string | null;
  searchHint?: string;
  displayName: string;
  subtitle?: string | null;
  capital?: string;
  // Parents, outermost first, clickable to go back up
  crumbs?: { name: string; onClick: () => void }[];
  // Child regions to list (a country's subregions or a subregion's districts)
  subregions?: Subregion[];
  onSelectSubregion?: (s: Subregion) => void;
  // Attribution for the district boundaries shown
  source?: { name: string; license: string; url: string };
  // The map slug of the country being viewed (keys its database rows)
  mapSlug?: string;
  // Set when viewing a subregion or US county: its key in the regions table
  regionKey?: string;
  // Selected tab; owned by the page so it carries over when switching countries
  tab?: Tab;
  onTabChange?: (t: Tab) => void;
  // A note above the header (e.g. why the time slider changed the selection)
  notice?: string;
  // Historical countries: the dates the drawn borders are valid for
  dates?: string;
  // A note above the source line
  footnote?: string;
  onClose: () => void;
};

export default function CountryPanel({
  articleTitle, wikidata, searchHint, displayName, subtitle, crumbs, subregions, onSelectSubregion, source, mapSlug, regionKey, capital, tab: tabProp, onTabChange, notice, dates, footnote, onClose,
}: Props) {
  // Country or subregion statistics; undefined while loading, null if there are none
  const [stats, setStats] = useState<
    { kind: 'country'; d: CountryData } | { kind: 'region'; d: RegionData } | null | undefined
  >(undefined);

  useEffect(() => {
    if (!mapSlug) { setStats(null); return; }
    let stale = false;
    const load = regionKey
      ? loadRegionData(regionKey, mapSlug).then(d => d && { kind: 'region' as const, d })
      : loadCountryData(mapSlug).then(d => d && { kind: 'country' as const, d });
    load
      .then(s => { if (!stale) setStats(s); })
      .catch(err => { console.error('Failed to load data', err); if (!stale) setStats(null); });
    return () => { stale = true; };
  }, [mapSlug, regionKey]);

  // Tabs with something to show; Overview always
  const available: Tab[] = !stats ? ['Overview']
    : stats.kind === 'country' ? [...TABS]
    : TABS.filter(t => t === 'Overview' || regionTabs(stats.d)[t]);
  const tab = tabProp && available.includes(tabProp) ? tabProp : 'Overview';

  const cacheKey = wikidata ?? (searchHint ? `${displayName}|${searchHint}` : articleTitle);
  const [data, setData] = useState<CountryWiki | null>(cache.get(cacheKey) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [showSubs, setShowSubs] = useState(true);

  useEffect(() => {
    if (cache.has(cacheKey)) return;
    const ctrl = new AbortController();
    (async () => {
      const title =
        (wikidata && await titleFromWikidata(wikidata, ctrl.signal)) ||
        (searchHint && await searchTitle(displayName, searchHint, ctrl.signal)) ||
        articleTitle;
      return fetchCountryWiki(title, ctrl.signal);
    })()
      .then(d => { cache.set(cacheKey, d); setData(d); })
      .catch(e => { if (!ctrl.signal.aborted) setError(String(e.message ?? e)); });
    return () => ctrl.abort();
  }, [cacheKey, articleTitle, wikidata, searchHint, displayName]);

  const sortedSubs = useMemo(
    () => [...(subregions ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    [subregions],
  );

  return (
    <aside className="wm-panel">
      <button className="wm-close" onClick={onClose} aria-label="Close">×</button>

      {crumbs && crumbs.length > 0 && (
        <div className="wm-crumbs">
          {crumbs.map((c, i) => (
            <span key={c.name}>
              {i > 0 && ' › '}
              <button className="wm-breadcrumb" onClick={c.onClick}>{i === 0 ? '← ' : ''}{c.name}</button>
            </span>
          ))}
        </div>
      )}

      {notice && <p className="wm-notice">{notice}</p>}

      <div className="wm-panel-header">
        {data?.summary.thumbnail && <img src={data.summary.thumbnail} alt="" className="wm-thumb" />}
        <div>
          <h2>{data?.summary.title ?? displayName}</h2>
          {(data?.summary.description || subtitle) && (
            <p className="wm-desc">{data?.summary.description ?? subtitle}</p>
          )}
          {dates && <p className="wm-desc">{dates}</p>}
          {capital && <p className="wm-capital"><span aria-hidden>★</span> Capital: {capital}</p>}
        </div>
      </div>

      {available.length > 1 && (
        <div className="wm-tabs" role="tablist">
          {available.map(t => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'wm-tab-active' : ''} onClick={() => onTabChange?.(t)}>
              {t}
            </button>
          ))}
        </div>
      )}

      {tab !== 'Overview' && stats?.kind === 'country' && (
        <div className="wm-tabpanel">
          {tab === 'Government' && <GovernmentTab d={stats.d} />}
          {tab === 'Economy' && <EconomyTab d={stats.d} />}
          {tab === 'Demographics' && <DemographicsTab d={stats.d} />}
        </div>
      )}
      {tab !== 'Overview' && stats?.kind === 'region' && (
        <div className="wm-tabpanel">
          {tab === 'Government' && <RegionGovernmentTab d={stats.d} />}
          {tab === 'Economy' && <RegionEconomyTab d={stats.d} />}
          {tab === 'Demographics' && <RegionDemographicsTab d={stats.d} />}
        </div>
      )}

      {tab === 'Overview' && <>
      {error && <p className="wm-error">{error}</p>}
      {!data && !error && <p className="wm-status">Loading Wikipedia articles…</p>}

      {data && (
        <>
          <p className="wm-extract">{data.summary.extract}</p>
          <a className="wm-main-link" href={data.summary.url} target="_blank" rel="noreferrer">
            Read “{data.summary.title}” on Wikipedia ↗
          </a>
        </>
      )}

      {sortedSubs.length > 0 && onSelectSubregion && (
        <section className="wm-section">
          <button className="wm-more-toggle" onClick={() => setShowSubs(s => !s)}>
            {showSubs ? '▾' : '▸'} {subdivisionLabel(sortedSubs)} ({sortedSubs.length})
          </button>
          {showSubs && (
            <ul className="wm-subs">
              {sortedSubs.map(s => (
                <li key={s.key}><button onClick={() => onSelectSubregion(s)}>{s.name}</button></li>
              ))}
            </ul>
          )}
        </section>
      )}

      {data && (
        <>
          {data.categories.map(cat => (
            <section key={cat.name} className="wm-section">
              <h3>{cat.name}</h3>
              <ul>{cat.links.map(l => <LinkItem key={l.url} link={l} />)}</ul>
            </section>
          ))}

          {data.more.length > 0 && (
            <section className="wm-section">
              <button className="wm-more-toggle" onClick={() => setShowMore(s => !s)}>
                {showMore ? '▾' : '▸'} More related articles ({data.more.length})
              </button>
              {showMore && <ul className="wm-more">{data.more.map(l => <LinkItem key={l.url} link={l} />)}</ul>}
            </section>
          )}
        </>
      )}

      </>}

      {footnote && <p className="wm-footnote">{footnote}</p>}

      {source && (
        <p className="wm-source">
          Boundaries: <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a> · {source.license}
        </p>
      )}
    </aside>
  );
}

// "States", "Provinces", ... when one type dominates, else "Subdivisions"
function subdivisionLabel(subs: Subregion[]): string {
  const counts = new Map<string, number>();
  for (const s of subs) if (s.type) counts.set(s.type, (counts.get(s.type) ?? 0) + 1);
  const [type, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!type || n! < subs.length * 0.75) return 'Subdivisions';
  if (/[^aeiou]y$/i.test(type)) return `${type.slice(0, -1)}ies`;
  return /(s|sh|ch|x)$/i.test(type) ? `${type}es` : `${type}s`;
}

function LinkItem({ link }: { link: WikiLink }) {
  return (
    <li>
      <a href={link.url} target="_blank" rel="noreferrer">{link.title}</a>
      {link.section && <span className="wm-link-desc">→ section of {link.section}</span>}
      {link.description && <span className="wm-link-desc">{link.description}</span>}
    </li>
  );
}
