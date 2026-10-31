import { useEffect, useState } from 'react'
import { milkyWaySystems } from '../data/milkyWay'
import { spectralTemperature, starRadiusSun, type MilkyWayMarker } from '../utils'
import type { ModelPlan } from './ObjectModel'

// Details for the object selected in the Milky Way view: its Wikipedia summary and lead image
// (fetched live from the REST API, like the world map's panels), the catalogue data the model
// was built from, and what in the model is real vs. estimated vs. illustrative.
//
// Images: only files hosted on Wikimedia Commons (freely licensed) are shown, with a link to
// the file's Commons page for its author and license. A lead image stored on English
// Wikipedia itself is non-free (fair use) and is skipped.

type Summary = {
  title: string
  extract: string
  url: string
  image: { src: string; full: string; filePage: string } | null
}

const cache = new Map<string, Summary | null>()

// Catalogue names ("Sagittarius dSph", "FSR 584") often aren't article titles; when the list
// gave no link or the title 404s, take the top Wikipedia search hit for the name plus its kind
async function searchTitle(query: string): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=5&srsearch=${encodeURIComponent(query)}`
  const j = await fetch(url).then((r) => r.json())
  const hit = (j.query?.search ?? []).find((h: { title: string }) => !/^(List of|Lists of|Satellite galaxies of)/.test(h.title))
  return hit?.title ?? null
}

async function fetchPage(title: string) {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}?redirect=true`)
  if (!res.ok) return null
  const j = await res.json()
  return j.type === 'disambiguation' ? null : j
}

async function fetchSummary(title: string, searchQuery: string): Promise<Summary | null> {
  if (cache.has(title)) return cache.get(title)!
  try {
    let j = await fetchPage(title)
    if (!j) {
      const found = await searchTitle(searchQuery)
      j = found ? await fetchPage(found) : null
    }
    if (!j) throw new Error('not found')
    const original: string | undefined = j.originalimage?.source
    const thumb: string | undefined = j.thumbnail?.source
    let image: Summary['image'] = null
    if (original && thumb && original.includes('/wikipedia/commons/')) {
      const file = decodeURIComponent(original.split('/').pop() ?? '')
      image = { src: thumb, full: original, filePage: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file)}` }
    }
    const summary: Summary = { title: j.title, extract: j.extract ?? '', url: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`, image }
    cache.set(title, summary)
    return summary
  } catch {
    cache.set(title, null)
    return null
  }
}

const formatLy = (kpc: number) => {
  const ly = kpc * 3261.56
  return ly >= 10000 ? `${Math.round(ly / 1000).toLocaleString()} thousand ly` : ly >= 100 ? `${Math.round(ly).toLocaleString()} ly` : `${ly.toFixed(1)} ly`
}
const sig = (n: number, digits = 3) => (Math.abs(n) >= 1e5 ? n.toExponential(2) : Number(n.toPrecision(digits)).toLocaleString())

function facts(marker: MilkyWayMarker): [string, string][] {
  const out: [string, string][] = [['Type', marker.kind], ['Distance', formatLy(marker.distanceKpc)]]
  const i = marker.info ?? {}
  if (marker.kind === 'nearby star') {
    if (i.spectralClass) out.push(['Spectral class', i.spectralClass])
    if (i.massSun) out.push(['Mass', `${i.massSun} M☉`])
    const t = spectralTemperature(i.spectralClass)
    if (t) out.push(['Temperature (est.)', `~${sig(t, 2)} K`])
    out.push(['Radius (est.)', `~${sig(starRadiusSun(i.spectralClass, i.massSun), 2)} R☉`])
    const system = i.system !== undefined ? milkyWaySystems[i.system] : undefined
    if (system && system.members.length > 1) out.push(['System', `${system.name} — ${system.members.length} stars`])
  }
  if (marker.kind === 'black hole') {
    for (const c of i.components ?? []) out.push([c.spectralClass?.startsWith('BH') ? 'Black hole' : `Companion${c.name ? ` (${c.name})` : ''}`,
      [c.spectralClass?.startsWith('BH') ? null : c.spectralClass, c.massSun ? `${sig(c.massSun)} M☉` : null].filter(Boolean).join(', ')])
    if (i.orbitalPeriodDays) out.push(['Orbital period', i.orbitalPeriodDays < 1 ? `${sig(i.orbitalPeriodDays * 24)} h` : `${sig(i.orbitalPeriodDays)} d`])
    out.push(['Accretion disk', i.accreting ? 'yes' : 'no'])
  }
  if (i.type) out.push(['Class', i.type])
  if (i.radiusKm) out.push(['Radius', `${i.radiusKm} km`])
  if (marker.kind === 'neutron star' && i.massSun) out.push(['Mass', `${i.massSun} M☉`])
  if (i.spinPeriodS) out.push(['Spin period', `${i.spinPeriodS} s`])
  if (i.temperatureK) out.push(['Temperature', `${sig(i.temperatureK)} K`])
  if (i.diameterPc) out.push(['Diameter', `${sig(i.diameterPc)} pc (${sig(i.diameterPc * 3.26156)} ly)`])
  if (i.ageMyr) out.push(['Age', `${i.ageMyr} million years`])
  if (i.nebulaType) out.push(['Messier type', i.nebulaType])
  if (i.supernovaType) out.push(['Supernova type', i.supernovaType])
  if (i.remnant) out.push(['Remnant', i.remnant])
  if (i.firstSeen) out.push(['First seen', i.firstSeen])
  if (i.earliestSpectralType) out.push(['Earliest spectral type', i.earliestSpectralType])
  if (i.stars) out.push(['Stars', sig(i.stars)])
  if (i.apparentMagnitude !== undefined) out.push(['Apparent magnitude', String(i.apparentMagnitude)])
  if (i.constellation) out.push(['Constellation', i.constellation])
  if (marker.galaxy) {
    if (marker.galaxy.absMagV !== null) out.push(['Absolute magnitude', String(marker.galaxy.absMagV)])
    if (marker.galaxy.halfLightKpc !== null) out.push(['Half-light radius', `${sig(marker.galaxy.halfLightKpc * 1000)} pc`])
  }
  return out
}

export default function MilkyWayObjectPanel({ marker, plan, onClose }: { marker: MilkyWayMarker; plan: ModelPlan | null; onClose: () => void }) {
  const title = marker.wiki ?? marker.name
  const searchQuery = `${marker.name.replace(/ \(.*\)$/, '')} ${marker.kind === 'nearby star' ? 'star' : marker.kind}`
  const [summary, setSummary] = useState<Summary | null | undefined>(cache.get(title))
  useEffect(() => {
    let live = true
    setSummary(cache.get(title))
    if (!cache.has(title)) fetchSummary(title, searchQuery).then((s) => { if (live) setSummary(s) })
    return () => { live = false }
  }, [title, searchQuery])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <aside className="mw-object-panel" aria-label={marker.name}>
      <header className="mw-object-header">
        <div>
          <div className="mw-object-kind">{marker.kind}</div>
          <h2 className="mw-object-title">{marker.name}</h2>
        </div>
        <button type="button" className="mw-object-close" onClick={onClose} aria-label="Close">×</button>
      </header>

      {summary?.image && (
        <figure className="mw-object-figure">
          <a href={summary.image.full} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={summary.image.src} alt={summary.title} loading="lazy" />
          </a>
          <figcaption>
            <a href={summary.image.filePage} target="_blank" rel="noreferrer">Image: Wikimedia Commons</a> (see file page for author and license)
          </figcaption>
        </figure>
      )}

      <div className="mw-object-body">
        {summary === undefined && <p className="mw-object-muted">Loading from Wikipedia…</p>}
        {summary === null && <p className="mw-object-muted">No Wikipedia summary found for “{title}”.</p>}
        {summary && <p className="mw-object-extract">{summary.extract}</p>}
        {summary && (
          <a className="mw-object-link" href={summary.url} target="_blank" rel="noreferrer">Read more on Wikipedia ↗</a>
        )}

        <dl className="mw-object-facts">
          {facts(marker).map(([k, v]) => (
            <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>

        {plan && (
          <div className="mw-object-model">
            <div className="mw-object-model-title">
              About the 3D model{plan.enlarged ? ` · enlarged ~${sig(plan.enlarged, 2)}×` : ' · true size'}
            </div>
            <ul>{plan.notes.map((n) => <li key={n}>{n}</li>)}</ul>
          </div>
        )}
        <p className="mw-object-muted mw-object-credit">Text: Wikipedia (CC BY-SA 4.0). Catalogue data: Wikipedia&apos;s lists of astronomical objects.</p>
      </div>
    </aside>
  )
}
