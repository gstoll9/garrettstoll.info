import { useState } from 'react';
import '../styles/orbitControls.css';
import { PlanetStructure, getLayerSegments } from '../data/planetStructure';
import { HoveredLayer, getTooltipContent } from './Planet';

type LayerCrossSectionProps = {
  structure?: PlanetStructure;
  hoveredLayer: HoveredLayer;
  setHoveredLayer: (layer: HoveredLayer) => void;
};

// Every segment gets at least this fraction of the bar's width so thin real layers (a
// planet's crust, a 613 km Mars inner core) stay visible and independently hoverable —
// deliberately *not* to true scale, unlike the 3D cutaway. The remaining width is
// distributed proportionally to each layer's true relative thickness, so the big
// picture (e.g. the mantle dominating the core) still comes through.
const MIN_SEGMENT_FRACTION = 0.08;

function computeSegmentWidths(radiusFractions: number[]): number[] {
  const thicknesses = radiusFractions.map((b, i) => b - (i === 0 ? 0 : radiusFractions[i - 1]));
  const total = thicknesses.reduce((sum, t) => sum + t, 0);
  const n = radiusFractions.length;
  const reserved = MIN_SEGMENT_FRACTION * n;
  const remaining = Math.max(0, 1 - reserved);
  return thicknesses.map((t) => MIN_SEGMENT_FRACTION + (total > 0 ? (t / total) * remaining : remaining / n));
}

export default function LayerCrossSection({ structure, hoveredLayer, setHoveredLayer }: LayerCrossSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!structure) return null;

  const segments = getLayerSegments(structure);
  const widths = computeSegmentWidths(segments.map((s) => s.radiusFraction));
  const activeContent = hoveredLayer && hoveredLayer !== 'total_crust' ? getTooltipContent(structure, hoveredLayer) : null;

  return (
    <div className={`orbit-controls-menu ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        type="button"
        className="menu-toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="menu-toggle-label">Layer Cross-Section</span>
        <span className="menu-toggle-arrow">▾</span>
      </button>

      {isExpanded && (
        <div className="controls-content">
          <div className="layer-bar" onMouseLeave={() => setHoveredLayer(null)}>
            {segments.map((seg, i) => (
              <div
                key={seg.key}
                className={`layer-bar-segment ${hoveredLayer === seg.key ? 'active' : ''}`}
                style={{ width: `${widths[i] * 100}%`, background: seg.facts.color || '#888' }}
                onMouseEnter={() => setHoveredLayer(seg.key)}
              />
            ))}
          </div>

          <div className="layer-legend">
            {segments.map((seg) => (
              <button
                key={seg.key}
                type="button"
                className={`layer-legend-item ${hoveredLayer === seg.key ? 'active' : ''}`}
                onMouseEnter={() => setHoveredLayer(seg.key)}
                onMouseLeave={() => setHoveredLayer(null)}
                onFocus={() => setHoveredLayer(seg.key)}
                onBlur={() => setHoveredLayer(null)}
              >
                <span className="layer-legend-swatch" style={{ background: seg.facts.color || '#888' }} />
                <span>{seg.label}</span>
              </button>
            ))}
          </div>

          <div className="layer-detail">
            {activeContent ? (
              <>
                <div className="layer-detail-title" style={{ color: activeContent.color }}>
                  {activeContent.title}
                </div>
                <div className="layer-detail-grid">{activeContent.body}</div>
              </>
            ) : (
              <div className="layer-detail-placeholder">
                Hover a layer above (or in the 3D view) to see its data.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
