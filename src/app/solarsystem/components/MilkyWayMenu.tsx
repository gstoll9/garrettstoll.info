import { useState } from 'react'
import { MARKERS, MARKER_STYLES, type MarkerKind } from './MilkyWayField'

// Show/hide each category of catalogued object in the Milky Way view
const COUNTS = MARKERS.reduce((acc, m) => acc.set(m.kind, (acc.get(m.kind) ?? 0) + 1), new Map<MarkerKind, number>())

export default function MilkyWayMenu({ hiddenKinds, toggleKind }: { hiddenKinds: Set<MarkerKind>; toggleKind: (kind: MarkerKind) => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  return (
    <div className={`orbit-controls-menu ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button type="button" className="menu-toggle-button" onClick={() => setIsExpanded(!isExpanded)} aria-expanded={isExpanded}>
        <span className="menu-toggle-label">Galactic Objects</span>
        <span className="menu-toggle-arrow">▾</span>
      </button>
      {isExpanded && (
        <div className="controls-content">
          {(Object.keys(MARKER_STYLES) as MarkerKind[]).filter((k) => COUNTS.get(k)).map((kind) => (
            <div className="control-group mw-kind-row" key={kind}>
              <label className="toggle-label">
                <input type="checkbox" checked={!hiddenKinds.has(kind)} onChange={() => toggleKind(kind)} />
                <span className="mw-swatch" style={{ background: MARKER_STYLES[kind].color }} />
                <span>{MARKER_STYLES[kind].label}</span>
                <span className="mw-kind-count">{COUNTS.get(kind)}</span>
              </label>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
