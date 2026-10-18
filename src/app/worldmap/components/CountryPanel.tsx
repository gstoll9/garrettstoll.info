'use client'
import { useEffect, useMemo, useState } from 'react';
import { CountryWiki, WikiLink, fetchCountryWiki, searchTitle, titleFromWikidata } from '../lib/wikipedia';
import type { Subregion } from './WorldMap';

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
  // Parents, outermost first, clickable to go back up
  crumbs?: { name: string; onClick: () => void }[];
  // Child regions to list (a country's subregions or a subregion's districts)
  subregions?: Subregion[];
  onSelectSubregion?: (s: Subregion) => void;
  // Attribution for the district boundaries shown
  source?: { name: string; license: string; url: string };
  onClose: () => void;
};

export default function CountryPanel({
  articleTitle, wikidata, searchHint, displayName, subtitle, crumbs, subregions, onSelectSubregion, source, onClose,
}: Props) {
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

      <div className="wm-panel-header">
        {data?.summary.thumbnail && <img src={data.summary.thumbnail} alt="" className="wm-thumb" />}
        <div>
          <h2>{data?.summary.title ?? displayName}</h2>
          {(data?.summary.description || subtitle) && (
            <p className="wm-desc">{data?.summary.description ?? subtitle}</p>
          )}
        </div>
      </div>

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
