import { useState } from 'react'
import { moonElements } from '../data/moonElements'
import { moonAppearance } from '../data/moonAppearance'
import { orbitalPosition, simulationState } from '../utils'
import { formatDayLength, formatMassKg, formatTempK, type PlanetProps } from './Planet'
import { MOON_SYSTEM } from './CameraController'
import { useWikiSummary } from './wikiSummary'

// The planet view's info card: the focused planet's (or moon's) Wikipedia summary and
// Commons lead image (wikiSummary.ts), its key numbers, and its moons — click one to fly the
// camera to it, or "All moons" to frame the whole system.
//
// Planet numbers come from data/planetStructure.ts `facts` (sourced from each planet's saved
// Wikipedia page); year length and current distance from the orbit data; moon numbers from
// data/moonElements.ts (JPL) and data/moonAppearance.ts.

const ORBITAL_PERIOD_FACTOR = 5 // data/planets.tsx stores orbitalPeriod as years × 5

const wikiTitle = (name: string, kind: 'planet' | 'moon') =>
  kind === 'planet' ? (name === 'Mercury' ? 'Mercury (planet)' : name) : name === 'Moon' ? 'Moon' : `${name} (moon)`

const formatYears = (years: number) => (years < 1 ? `${Math.round(years * 365.25)} days` : `${years.toFixed(years < 10 ? 2 : 1)} years`)
const formatKmBig = (km: number) => (km >= 1e6 ? `${(km / 1e6).toFixed(2)} million km` : `${Math.round(km).toLocaleString()} km`)

function planetFacts(planet: PlanetProps): [string, React.ReactNode][] {
  const f = planet.structure?.facts
  const out: [string, React.ReactNode][] = []
  if (f) {
    const { mantissa, exp } = formatMassKg(f.massKg)
    out.push(['Radius', `${Math.round(f.meanRadiusKm).toLocaleString()} km`])
    out.push(['Mass', <>{mantissa} × 10<sup>{exp}</sup> kg</>])
    out.push(['Density', `${f.densityGCm3} g/cm³`])
    out.push(['Surface gravity', `${f.gravityMs2} m/s²`])
    out.push(['Day (sidereal)', formatDayLength(f.dayLengthHours)])
  }
  out.push(['Year', formatYears(planet.orbitData.orbitalPeriod / ORBITAL_PERIOD_FACTOR)])
  const [x, y, z] = orbitalPosition('RealLive', 0, planet.orbitData, false, planet.name, simulationState.dateMs)
  out.push(['Distance from Sun', `${(Math.hypot(x, y, z) / 12).toFixed(2)} AU (now)`])
  if (f) {
    out.push(['Axial tilt', `${f.axialTiltDeg}°`])
    const temp = formatTempK(planet.structure?.crust.tempK)
    if (temp) out.push(['Surface temperature', temp])
    out.push(['Known moons', String(f.moonCount)])
  }
  return out
}

function moonFacts(name: string, planet: string): [string, React.ReactNode][] {
  const el = moonElements[name]
  const look = moonAppearance[name]
  const out: [string, React.ReactNode][] = []
  if (el) {
    out.push(['Radius', `${Math.round(el.meanRadiusKm).toLocaleString()} km`])
    out.push([`Distance from ${planet}`, formatKmBig(el.semimajorAxisKm)])
    out.push(['Orbit', el.periodDays < 2 ? `${(el.periodDays * 24).toFixed(1)} hours` : `${el.periodDays.toFixed(2)} days`])
    out.push(['Eccentricity', el.eccentricity.toFixed(3)])
  }
  if (look) {
    out.push(['Geometric albedo', String(look.geometricAlbedo)])
    out.push(['Rotation', look.tidallyLocked ? 'Tidally locked' : look.rotationPeriodHours ? formatDayLength(look.rotationPeriodHours) : 'Not locked'])
  }
  return out
}

export default function PlanetInfoCard({ planet, focusedMoon, setFocusedMoon }: {
  planet: PlanetProps
  focusedMoon: string | null
  setFocusedMoon: (moon: string | null) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const [moreText, setMoreText] = useState(false)
  const moon = focusedMoon && focusedMoon !== MOON_SYSTEM ? focusedMoon : null
  const subject = moon ?? planet.name
  const summary = useWikiSummary(wikiTitle(subject, moon ? 'moon' : 'planet'), moon ? `${moon} moon of ${planet.name}` : `${planet.name} planet`)
  const facts = moon ? moonFacts(moon, planet.name) : planetFacts(planet)
  const moons = planet.moons ?? []

  return (
    <div className={`orbit-controls-menu planet-info ${expanded ? 'expanded' : 'collapsed'}`}>
      <button type="button" className="menu-toggle-button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
        <span className="menu-toggle-label">
          {subject}
          <span className="planet-info-kind">{moon ? `moon of ${planet.name}` : 'planet'}</span>
        </span>
        <span className="menu-toggle-arrow">▾</span>
      </button>
      {expanded && (
        <div className="planet-info-body">
          {summary?.image && (
            <figure className="planet-info-figure">
              <a href={summary.image.full} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={summary.image.src} alt={summary.title} loading="lazy" />
              </a>
              <figcaption><a href={summary.image.filePage} target="_blank" rel="noreferrer">Image: Wikimedia Commons</a></figcaption>
            </figure>
          )}
          {summary === undefined && <p className="planet-info-muted">Loading from Wikipedia…</p>}
          {summary && (
            <>
              <p className={`planet-info-extract${moreText ? ' open' : ''}`}>{summary.extract}</p>
              <div className="planet-info-links">
                <button type="button" className="planet-info-more" onClick={() => setMoreText(!moreText)}>{moreText ? 'Less' : 'More'}</button>
                <a href={summary.url} target="_blank" rel="noreferrer">Wikipedia ↗</a>
              </div>
            </>
          )}

          <dl className="planet-info-facts">
            {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
          {!moon && planet.structure?.facts.funFact && <p className="planet-info-fun">{planet.structure.facts.funFact}</p>}

          {moons.length > 0 && (
            <div className="planet-info-moons">
              <div className="planet-info-moons-title">Moons shown</div>
              <div className="planet-info-chips">
                <button type="button" className={`planet-chip${!focusedMoon ? ' active' : ''}`} onClick={() => setFocusedMoon(null)}>{planet.name}</button>
                <button type="button" className={`planet-chip${focusedMoon === MOON_SYSTEM ? ' active' : ''}`} onClick={() => setFocusedMoon(MOON_SYSTEM)}>
                  {moons.length > 1 ? 'All moons' : 'With moon'}
                </button>
                {moons.map((m) => (
                  <button key={m} type="button" className={`planet-chip${focusedMoon === m ? ' active' : ''}`} onClick={() => setFocusedMoon(m)}>{m}</button>
                ))}
              </div>
            </div>
          )}
          <p className="planet-info-muted planet-info-credit">Text: Wikipedia (CC BY-SA 4.0)</p>
        </div>
      )}
    </div>
  )
}
