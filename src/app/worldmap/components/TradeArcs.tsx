'use client'
// Trade arcs: curved flows from the selected country to its top trade partners, raised off
// the flat map so they read as 3D, split into raw (primary) and produced (processed) goods.
import { useMemo } from 'react';
import type * as d3 from 'd3';
import type { TradeFlow } from '../lib/db';
import { compact } from '../lib/format';

export type ArcPartner = { iso3: string; name: string; lon: number; lat: number; raw: number; produced: number };
export type TradeArcs = {
  flow: TradeFlow;
  year: number;
  origin: { name: string; lon: number; lat: number };
  partners: ArcPartner[];
};

// Categorical slots 2 and 1 of the chart palette (validated on the dark surface)
export const RAW_COLOR = '#d95926';
export const PRODUCED_COLOR = '#3987e5';
const FLOW_VERB: Record<TradeFlow, string> = { X: 'exports to', M: 'imports from' };
const DEFINITIONS = 'Raw: unprocessed farm, fish, forest and mineral goods (crops, live animals, logs, raw fibres, ores, ' +
  'crude oil, gas, coal). Produced: everything processed or manufactured (food products, refined fuels, metals, ' +
  'chemicals, machinery, vehicles). Goods only, no services. Source: The Growth Lab at Harvard, Atlas of Economic Complexity.';

// ── Map layer (inside the zoomed group, so arcs move with the map) ───────────
export function TradeArcLayer({ arcs, projection, onHover, onLeave }: {
  arcs: TradeArcs;
  projection: d3.GeoProjection;
  onHover: (e: React.MouseEvent, text: string) => void;
  onLeave: () => void;
}) {
  const shapes = useMemo(() => {
    const o = projection([arcs.origin.lon, arcs.origin.lat]);
    if (!o) return [];
    const max = Math.max(...arcs.partners.map(p => Math.max(p.raw, p.produced)), 1);
    const width = (v: number) => (v > 0 ? 0.8 + 7 * Math.sqrt(v / max) : 0);
    return arcs.partners.flatMap(p => {
      const q = projection([p.lon, p.lat]);
      if (!q) return [];
      // Exports flow out of the origin, imports flow into it; dashes animate start → end
      const [a, b] = arcs.flow === 'X' ? [o, q] : [q, o];
      const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
      // Lift: the control point sits above the midpoint, higher for longer routes — a
      // flat-map stand-in for an arc leaving the surface. Produced flies above raw.
      const arc = (lift: number) => {
        const h = Math.min(dist * lift, 220);
        return `M${a[0]},${a[1]} Q${(a[0] + b[0]) / 2},${(a[1] + b[1]) / 2 - h} ${b[0]},${b[1]}`;
      };
      const tip = `${arcs.origin.name} ${FLOW_VERB[arcs.flow]} ${p.name}: $${compact(p.raw + p.produced)}` +
        ` (raw $${compact(p.raw)} · produced $${compact(p.produced)})`;
      return [{
        key: p.iso3, tip, end: q,
        ground: `M${a[0]},${a[1]} L${b[0]},${b[1]}`,
        raw: { d: arc(0.32), w: width(p.raw) },
        produced: { d: arc(0.48), w: width(p.produced) },
      }];
    });
  }, [arcs, projection]);

  return (
    <g className={`wm-arcs wm-arcs-${arcs.flow}`}>
      {shapes.map(s => (
        <g key={s.key} className="wm-arc" onMouseMove={e => onHover(e, s.tip)} onMouseLeave={onLeave}
          onClick={e => e.stopPropagation()}>
          <path className="wm-arc-ground" d={s.ground} />
          {s.raw.w > 0 && <path className="wm-arc-line" d={s.raw.d} stroke={RAW_COLOR} strokeWidth={s.raw.w} />}
          {s.produced.w > 0 && <path className="wm-arc-line" d={s.produced.d} stroke={PRODUCED_COLOR} strokeWidth={s.produced.w} />}
          {/* Wide invisible copies make thin arcs easy to hover */}
          <path className="wm-arc-hit" d={s.produced.d} />
          <path className="wm-arc-hit" d={s.raw.d} />
          <circle className="wm-arc-end" cx={s.end[0]} cy={s.end[1]} r={2.2} />
        </g>
      ))}
    </g>
  );
}

// ── Control: off / exports / imports, legend, top partners ───────────────────
export function TradeArcsControl({ flow, onChange, arcs, available }: {
  flow: TradeFlow | null;
  onChange: (f: TradeFlow | null) => void;
  arcs: TradeArcs | null;
  available: boolean;   // a present-day country is selected
}) {
  const totals = arcs && arcs.partners.reduce((t, p) => ({ raw: t.raw + p.raw, produced: t.produced + p.produced }), { raw: 0, produced: 0 });
  const options: [TradeFlow | null, string][] = [[null, 'Off'], ['X', 'Exports'], ['M', 'Imports']];
  return (
    <div className="wm-arcsctl">
      <div className="wm-colorby-head"><span>Trade flows</span></div>
      {!available ? <div className="wm-colorby-note">Select a country to show its trade partners.</div> : (
        <>
          <div className="wm-seg-buttons" role="group" aria-label="Trade flows">
            {options.map(([f, label]) => (
              <button key={label} aria-pressed={flow === f} className={flow === f ? 'wm-active' : ''} onClick={() => onChange(f)}>
                {label}
              </button>
            ))}
          </div>
          {flow && !arcs && <div className="wm-colorby-note">No partner data for this country.</div>}
          {arcs && totals && (
            <div className="wm-colorby-legend">
              <ul>
                <li><span className="wm-swatch" style={{ background: RAW_COLOR }} />Raw goods · ${compact(totals.raw)}</li>
                <li><span className="wm-swatch" style={{ background: PRODUCED_COLOR }} />Produced goods · ${compact(totals.produced)}</li>
              </ul>
              <div className="wm-colorby-note">
                Top {arcs.partners.length} partners · {arcs.year} · width ∝ value{' '}
                <span className="wm-info" tabIndex={0} title={DEFINITIONS} aria-label={DEFINITIONS}>ⓘ</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
