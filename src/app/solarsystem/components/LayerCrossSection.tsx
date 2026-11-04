import { useState } from 'react';
import '../styles/orbitControls.css';
import { PlanetStructure, getLayerSegments } from '../data/planetStructure';
import { HoveredLayer, Row, formatKm, getTooltipContent } from './Planet';
import LayerSources from './LayerSources';

type LayerCrossSectionProps = {
  planet: string; // for the layer's citations (data/layerCitations.ts)
  structure?: PlanetStructure;
  hoveredLayer: HoveredLayer;
  setHoveredLayer: (layer: HoveredLayer) => void;
  selectedLayer: HoveredLayer; // clicked/pinned layer, shown whenever nothing is hovered
  setSelectedLayer: (layer: HoveredLayer) => void;
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

// Where a layer sits, derived from its boundaries' radius fractions (planetStructure.ts):
// depth below the surface, thickness, and share of the planet's volume
function layerGeometry(structure: PlanetStructure, key: string) {
  const segments = getLayerSegments(structure).filter((s) => s.kind !== 'atmosphere');
  const i = segments.findIndex((s) => s.key === key);
  if (i < 0) return null;
  const R = structure.facts.meanRadiusKm;
  const outer = segments[i].radiusFraction;
  const inner = i === 0 ? 0 : segments[i - 1].radiusFraction;
  return {
    depth: [(1 - outer) * R, (1 - inner) * R] as const,
    thickness: (outer - inner) * R,
    volumePct: (outer ** 3 - inner ** 3) * 100,
  };
}

const pct = (v: number) => (v >= 10 ? `${v.toFixed(0)}%` : v >= 1 ? `${v.toFixed(1)}%` : `${v.toFixed(2)}%`);

export default function LayerCrossSection({ planet, structure, hoveredLayer, setHoveredLayer, selectedLayer, setSelectedLayer }: LayerCrossSectionProps) {
  // collapsed to its header on a phone, where the right-hand panels form a bottom sheet
  const [isExpanded, setIsExpanded] = useState(() => typeof window === 'undefined' || !window.matchMedia('(max-width: 768px)').matches);

  if (!structure) return null;

  const segments = getLayerSegments(structure);
  const widths = computeSegmentWidths(segments.map((s) => s.radiusFraction));
  const shownLayer = hoveredLayer && hoveredLayer !== 'total_crust' ? hoveredLayer : selectedLayer;
  const activeContent = shownLayer && shownLayer !== 'total_crust' ? getTooltipContent(structure, shownLayer) : null;
  const geometry = shownLayer && shownLayer !== 'total_crust' ? layerGeometry(structure, shownLayer) : null;
  const toggleSelected = (key: HoveredLayer) => setSelectedLayer(selectedLayer === key ? null : key);
  const stateClass = (key: HoveredLayer) =>
    `${hoveredLayer === key ? 'active' : ''} ${selectedLayer === key ? 'selected' : ''}`;

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
                className={`layer-bar-segment ${stateClass(seg.key)}`}
                style={{ width: `${widths[i] * 100}%`, background: seg.facts.color || '#888' }}
                onMouseEnter={() => setHoveredLayer(seg.key)}
                onClick={() => toggleSelected(seg.key)}
              />
            ))}
          </div>

          <div className="layer-legend">
            {segments.map((seg) => (
              <button
                key={seg.key}
                type="button"
                className={`layer-legend-item ${stateClass(seg.key)}${seg.label.length > 16 ? ' wide' : ''}`}
                aria-pressed={selectedLayer === seg.key}
                onMouseEnter={() => setHoveredLayer(seg.key)}
                onClick={() => toggleSelected(seg.key)}
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
                <div className="layer-detail-grid">
                  {geometry && (
                    <>
                      <Row label="Depth" value={`${formatKm(geometry.depth[0])} – ${formatKm(geometry.depth[1])}`} />
                      <Row label="Thickness" value={formatKm(geometry.thickness)} />
                      <Row label="Volume" value={`${pct(geometry.volumePct)} of the planet`} />
                    </>
                  )}
                  {activeContent.body}
                </div>
                {shownLayer && <LayerSources planet={planet} layerKey={shownLayer === 'outerCore' && !structure.core.innerCore ? 'core' : shownLayer} />}
              </>
            ) : (
              <div className="layer-detail-placeholder">
                Hover or click a layer above (or hover one in the 3D view) to see its data.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
