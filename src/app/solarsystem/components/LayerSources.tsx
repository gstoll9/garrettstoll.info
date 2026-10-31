import { layerCitations } from '../data/layerCitations'

// The "Sources" block under a cross-section layer's data: the sentence its numbers come
// from (data/layerCitations.ts, generated from the saved Wikipedia pages), linked to that
// article section, and the references Wikipedia gives for it.

export function hasSources(planet: string, key: string) {
  return !!layerCitations[planet]?.[key]?.length
}

export default function LayerSources({ planet, layerKey }: { planet: string; layerKey: string }) {
  const cites = layerCitations[planet]?.[layerKey]
  if (!cites?.length) return null
  return (
    <div className="layer-sources">
      <div className="layer-sources-title">Sources</div>
      {cites.map((c) => (
        <div key={c.url + c.quote} className="layer-source">
          <a href={c.url} target="_blank" rel="noreferrer" className="layer-source-where">
            Wikipedia · {c.article} § {c.section} ↗
          </a>
          <q className="layer-source-quote">{c.quote}</q>
          {c.references.length > 0 && (
            <ol className="layer-source-refs">
              {c.references.map((r) => (
                <li key={r.text}>
                  {r.url ? <a href={r.url} target="_blank" rel="noreferrer">{r.text}</a> : r.text}
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  )
}
