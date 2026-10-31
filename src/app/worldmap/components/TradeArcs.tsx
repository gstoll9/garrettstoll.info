'use client'
// Trade arcs: great-circle flows from the selected country to its top trade partners, split
// into raw (primary) and produced (processed) goods.
import { geoInterpolate } from 'd3';
import type { Feature, LineString, Point } from 'geojson';
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

// ── Map layer: great-circle lines, as GeoJSON for the map's arc layers ──────────────────
// Each partner gets a raw and a produced line running side by side (offset in px), width ∝
// the square root of its value; the arc-ends layer marks the partners' capitals.
export function arcFeatures(arcs: TradeArcs): { lines: Feature<LineString>[]; ends: Feature<Point>[] } {
  const o: [number, number] = [arcs.origin.lon, arcs.origin.lat];
  const max = Math.max(...arcs.partners.map(p => Math.max(p.raw, p.produced)), 1);
  const width = (v: number) => (v > 0 ? 1 + 6 * Math.sqrt(v / max) : 0);
  const lines: Feature<LineString>[] = [];
  const ends: Feature<Point>[] = [];
  for (const p of arcs.partners) {
    const q: [number, number] = [p.lon, p.lat];
    // Exports flow out of the origin, imports flow into it
    const [a, b] = arcs.flow === 'X' ? [o, q] : [q, o];
    const tip = `${arcs.origin.name} ${FLOW_VERB[arcs.flow]} ${p.name}: $${compact(p.raw + p.produced)}` +
      ` (raw $${compact(p.raw)} · produced $${compact(p.produced)})`;
    const coords = greatCircle(a, b);
    for (const [kind, value, color, offset] of [['raw', p.raw, RAW_COLOR, -2], ['produced', p.produced, PRODUCED_COLOR, 2]] as const) {
      if (value <= 0) continue;
      lines.push({
        type: 'Feature', geometry: { type: 'LineString', coordinates: coords },
        properties: { key: `${p.iso3}-${kind}`, tip, color, width: width(value), offset },
      });
    }
    ends.push({ type: 'Feature', geometry: { type: 'Point', coordinates: q }, properties: { key: p.iso3 } });
  }
  return { lines, ends };
}

// Points along the great circle from a to b, longitudes kept continuous across ±180° so the
// line doesn't jump back across the map
function greatCircle(a: [number, number], b: [number, number]): [number, number][] {
  const interp = geoInterpolate(a, b);
  const out: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const [lon, lat] = interp(i / 64);
    const prev = out[i - 1]?.[0];
    out.push([prev == null ? lon : lon + 360 * Math.round((prev - lon) / 360), lat]);
  }
  return out;
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
