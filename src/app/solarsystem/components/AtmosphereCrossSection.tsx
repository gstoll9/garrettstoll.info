import { useState } from 'react';
import '../styles/orbitControls.css';
import { PlanetStructure, AtmosphereLayer } from '../data/planetStructure';
import { Row, formatTempK } from './Planet';

type AtmosphereCrossSectionProps = {
  atmosphere?: PlanetStructure['atmosphere'];
};

// Same idea as LayerCrossSection's MIN_SEGMENT_FRACTION: every layer gets at least this
// much of the bar so thin real layers stay visible and hoverable — not to true scale.
const MIN_SEGMENT_FRACTION = 0.1;

function layerThicknesses(layers: AtmosphereLayer[]): number[] {
  const known = layers.map((l) => (l.altitudeKm.max !== undefined ? l.altitudeKm.max - l.altitudeKm.min : null));
  const knownVals = known.filter((v): v is number => v !== null);
  const totalKnown = knownVals.reduce((sum, v) => sum + v, 0);
  // The open-ended top layer (exosphere, or a combined thermosphere/exosphere) has no
  // cited upper bound — give it a modest bar-visualization stand-in (capped relative to
  // the known layers' total) rather than letting it dominate the bar or using an
  // arbitrary constant.
  const fallback = knownVals.length > 0 ? Math.min(knownVals[knownVals.length - 1], totalKnown * 0.25) : 100;
  return known.map((v) => v ?? fallback);
}

function computeHeights(thicknesses: number[]): number[] {
  const total = thicknesses.reduce((sum, t) => sum + t, 0);
  const n = thicknesses.length;
  const reserved = MIN_SEGMENT_FRACTION * n;
  const remaining = Math.max(0, 1 - reserved);
  return thicknesses.map((t) => MIN_SEGMENT_FRACTION + (total > 0 ? (t / total) * remaining : remaining / n));
}

function formatAltitude({ min, max }: { min: number; max?: number }): string {
  const fmt = (km: number) => `${km.toLocaleString()} km`;
  return max === undefined ? `${fmt(min)} and up` : `${fmt(min)} to ${fmt(max)}`;
}

export default function AtmosphereCrossSection({ atmosphere }: AtmosphereCrossSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!atmosphere?.layers?.length) return null;

  const layers = atmosphere.layers;
  const heights = computeHeights(layerThicknesses(layers));
  const active = hoveredIndex !== null ? layers[hoveredIndex] : null;

  return (
    <div className={`orbit-controls-menu ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        type="button"
        className="menu-toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="menu-toggle-label">Atmosphere Cross-Section</span>
        <span className="menu-toggle-arrow">▾</span>
      </button>

      {isExpanded && (
        <div className="controls-content">
          {/* Rendered ground-to-space bottom-to-top: the array is already ordered
              troposphere-first, and column-reverse flips that to read bottom-up. */}
          <div className="atmo-bar" onMouseLeave={() => setHoveredIndex(null)}>
            {layers.map((layer, i) => (
              <div
                key={layer.name}
                className={`atmo-bar-segment ${hoveredIndex === i ? 'active' : ''}`}
                style={{ height: `${heights[i] * 100}%`, background: layer.color || '#888' }}
                onMouseEnter={() => setHoveredIndex(i)}
              >
                {heights[i] > 0.16 && <span className="atmo-bar-label">{layer.name}</span>}
              </div>
            ))}
          </div>

          <div className="layer-legend">
            {layers.map((layer, i) => (
              <button
                key={layer.name}
                type="button"
                className={`layer-legend-item ${hoveredIndex === i ? 'active' : ''}`}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(i)}
                onBlur={() => setHoveredIndex(null)}
              >
                <span className="layer-legend-swatch" style={{ background: layer.color || '#888' }} />
                <span>{layer.name}</span>
              </button>
            ))}
          </div>

          <div className="layer-detail">
            {active ? (
              <>
                <div className="layer-detail-title" style={{ color: active.color || '#fff' }}>
                  {active.name}
                </div>
                <div className="layer-detail-grid">
                  <Row label="Altitude" value={formatAltitude(active.altitudeKm)} />
                  {formatTempK(active.tempK) && <Row label="Temp" value={formatTempK(active.tempK)} />}
                  {active.note && <Row label="" value={active.note} />}
                </div>
              </>
            ) : (
              <div className="layer-detail-placeholder">Hover a layer above to see its data.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
