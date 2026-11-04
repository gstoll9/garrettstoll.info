'use client'
// Info box for one focus place: its facts with the references Wikidata cites for them, the
// Wikipedia summary, and links out (official site, Wikipedia, Wikidata, OpenStreetMap).
import { useEffect, useMemo, useState } from 'react';
import { WikiSummary, fetchSummary } from '../lib/wikipedia';
import { Facility, FocusCategory, FocusData, FocusPoint, FocusRef, commonsPage, commonsThumb, loadFacility } from '../lib/focus';

type Props = {
  point: FocusPoint;
  data: FocusData;
  category?: FocusCategory;
  onClose: () => void;
};

const formatDate = (iso?: string) =>
  iso && new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const formatCoord = (lat: number, lon: number) =>
  `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;

export default function FacilityPanel({ point, data, category, onClose }: Props) {
  // The facts come from the focus's detail shard; until it loads the box shows the point alone
  const [detail, setDetail] = useState<Facility | null>(null);
  const [detailError, setDetailError] = useState(false);
  useEffect(() => {
    let stale = false;
    loadFacility(data, point.id)
      .then(d => { if (stale) return; if (d) setDetail(d); else setDetailError(true); })
      .catch(() => { if (!stale) setDetailError(true); });
    return () => { stale = true; };
  }, [data, point.id]);
  const f: Facility = detail ?? { id: point.id, cat: point.cat, name: point.name, lon: point.lon, lat: point.lat };

  const [wiki, setWiki] = useState<WikiSummary | null>(null);
  const [wikiError, setWikiError] = useState(false);
  useEffect(() => {
    setWiki(null);
    setWikiError(false);
    if (!f.wiki) return;
    const ctrl = new AbortController();
    fetchSummary(f.wiki, ctrl.signal).then(setWiki).catch(() => { if (!ctrl.signal.aborted) setWikiError(true); });
    return () => ctrl.abort();
  }, [f.wiki]);

  // Number the references once; each fact lists the numbers of the references behind it
  const { refs, numbersFor } = useMemo(() => {
    const list: FocusRef[] = [];
    const byField = new Map<string, number[]>();
    for (const r of detail?.refs ?? []) {
      let n = list.findIndex(x => x.url === r.url && x.title === r.title) + 1;
      if (!n) { list.push(r); n = list.length; }
      byField.set(r.field, [...(byField.get(r.field) ?? []), n]);
    }
    return { refs: list, numbersFor: (field: string) => byField.get(field) ?? [] };
  }, [detail]);

  const facts: [string, React.ReactNode, string?][] = [
    ['Type', category?.one],
    ['Country', f.country, 'country'],
    ['Location', f.place],
    ['Coordinates', formatCoord(f.lat, f.lon), 'location'],
    ['Elevation', f.elevation != null ? `${f.elevation.toLocaleString()} m` : undefined, 'elevation'],
    ['Operator', f.operator?.join(', '), 'operator'],
    ['Part of', f.partOf?.join(', ')],
    [data.dates.opened, f.opened, 'opened'],
    [data.dates.closed, f.closed, 'closed'],
    ...data.extras.map(({ key, label, link }): [string, React.ReactNode, string] => {
      const v = f.extra?.[key];
      return [label, v && link ? <a href={link} target="_blank" rel="noreferrer">{v}</a> : v, key];
    }),
  ];

  const image = f.image ? commonsThumb(f.image, 640) : wiki?.thumbnail;
  const wikidataUrl = `https://www.wikidata.org/wiki/${f.id}`;
  const osmUrl = `https://www.openstreetmap.org/?mlat=${f.lat}&mlon=${f.lon}#map=15/${f.lat}/${f.lon}`;

  return (
    <aside className="wm-panel wm-facility">
      <button className="wm-close" onClick={onClose} aria-label="Close">×</button>
      {image && (
        <figure className="wm-facility-image">
          <img src={image} alt={f.name} loading="lazy" />
          {f.image && (
            <figcaption>
              Image: <a href={commonsPage(f.image)} target="_blank" rel="noreferrer">Wikimedia Commons</a> (see file page for licence)
            </figcaption>
          )}
        </figure>
      )}
      <div className="wm-panel-header">
        <div>
          {category && (
            <span className="wm-facility-chip" style={{ borderColor: category.color, color: category.color }}>
              <span className="wm-focus-dot" style={{ background: category.color }} /> {category.one}
            </span>
          )}
          <h2>{f.name}</h2>
          {(f.desc || wiki?.description) && <p className="wm-desc">{f.desc ?? wiki?.description}</p>}
          {f.closed && <p className="wm-desc">{data.dates.closed} {f.closed}</p>}
          {!detail && !detailError && <p className="wm-status">Loading details…</p>}
          {detailError && <p className="wm-status">Couldn’t load this place’s details.</p>}
        </div>
      </div>

      <dl className="wm-facts">
        {facts.filter(([, v]) => v).map(([label, value, field]) => (
          <div className="wm-fact" key={label}>
            <dt>{label}</dt>
            <dd>
              {value}
              {field && numbersFor(field).map(n => <sup key={n}><a href={`#wm-ref-${n}`}>[{n}]</a></sup>)}
            </dd>
          </div>
        ))}
      </dl>

      {f.wiki && (
        <section className="wm-section">
          <h3>From Wikipedia</h3>
          {wiki && <p className="wm-extract">{wiki.extract}</p>}
          {!wiki && !wikiError && <p className="wm-status">Loading Wikipedia article…</p>}
          {wikiError && <p className="wm-status">Couldn’t load the Wikipedia summary.</p>}
          <a className="wm-main-link" href={wiki?.url ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(f.wiki.replace(/ /g, '_'))}`} target="_blank" rel="noreferrer">
            Read “{f.wiki}” on Wikipedia ↗
          </a>
        </section>
      )}

      <section className="wm-section">
        <h3>Links</h3>
        <ul>
          {f.website && <li><a href={f.website} target="_blank" rel="noreferrer">Official website</a><span className="wm-link-desc">{hostOf(f.website)}</span></li>}
          <li><a href={wikidataUrl} target="_blank" rel="noreferrer">Wikidata item {f.id}</a><span className="wm-link-desc">Structured data behind this box</span></li>
          <li><a href={osmUrl} target="_blank" rel="noreferrer">OpenStreetMap</a><span className="wm-link-desc">The site on the map</span></li>
        </ul>
      </section>

      <section className="wm-section">
        <h3>References</h3>
        {refs.length > 0 ? (
          <ol className="wm-refs">
            {refs.map((r, i) => (
              <li key={i} id={`wm-ref-${i + 1}`}>
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.title ?? hostOf(r.url)}</a> : r.title}
                {r.url && r.title && <span className="wm-link-desc">{hostOf(r.url)}</span>}
                {r.retrieved && <span className="wm-link-desc">Retrieved {formatDate(r.retrieved)}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="wm-muted">Wikidata records no references for these facts.</p>
        )}
        <p className="wm-source">
          Facts: <a href={wikidataUrl} target="_blank" rel="noreferrer">Wikidata</a> (CC0), with the references cited on its statements
          {f.wiki && <> · Summary: Wikipedia (CC BY-SA 4.0)</>}
        </p>
      </section>
    </aside>
  );
}

function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
