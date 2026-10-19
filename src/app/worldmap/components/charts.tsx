'use client'
// Small SVG charts for the country panel. Colours come from CSS tokens in worldmap.css
// (validated against the panel surface); party colours come from the data.
import { useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { Point } from '../lib/db';
import { formatTick, formatValue } from '../lib/format';

const W = 376;
const M = { top: 10, right: 12, bottom: 22, left: 46 };

export const SERIES = ['var(--wm-series-1)', 'var(--wm-series-2)', 'var(--wm-series-3)'];

type Series = { key: string; label: string; color: string; points: Point[] };

function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="wm-legend">
      {items.map(i => (
        <li key={i.label}>
          <span className="wm-swatch" style={{ background: i.color }} />
          {i.label}{i.value && <span className="wm-legend-value"> {i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

// ── Line chart (1–3 series, one unit) with crosshair tooltip ─────────────────
export function LineChart({ title, unit, series, height = 140, zeroLine = false }: {
  title: string; unit: string; series: Series[]; height?: number; zeroLine?: boolean;
}) {
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const live = series.filter(s => s.points.length > 1);

  const { x, y, years } = useMemo(() => {
    const all = live.flatMap(s => s.points);
    const x = d3.scaleLinear().domain(d3.extent(all, p => p.year) as [number, number]).range([M.left, W - M.right]);
    let [lo, hi] = d3.extent(all, p => p.value) as [number, number];
    if (zeroLine || lo > 0 && lo < (hi - lo)) lo = Math.min(lo, 0);
    if (zeroLine) hi = Math.max(hi, 0);
    const y = d3.scaleLinear().domain([lo, hi]).nice(4).range([height - M.bottom, M.top]);
    const years = [...new Set(all.map(p => p.year))].sort((a, b) => a - b);
    return { x, y, years };
  }, [live, height, zeroLine]);

  if (!live.length) return null;
  const line = d3.line<Point>().x(p => x(p.year)).y(p => y(p.value)).curve(d3.curveMonotoneX);
  const area = d3.area<Point>().x(p => x(p.year)).y0(y(Math.max(y.domain()[0], 0))).y1(p => y(p.value)).curve(d3.curveMonotoneX);

  const onMove = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const yr = x.invert(((e.clientX - r.left) / r.width) * W);
    setHoverYear(years.reduce((best, v) => (Math.abs(v - yr) < Math.abs(best - yr) ? v : best), years[0]));
  };
  const hx = hoverYear != null ? x(hoverYear) : 0;
  const last = live.map(s => s.points[s.points.length - 1]);

  return (
    <figure className="wm-chart">
      <figcaption>{title}<span className="wm-unit"> · {unit}</span></figcaption>
      <div className="wm-chart-body">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} onPointerMove={onMove} onPointerLeave={() => setHoverYear(null)}>
          {y.ticks(4).map(t => (
            <g key={t}>
              <line className={t === 0 ? 'wm-axis-zero' : 'wm-grid'} x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
              <text className="wm-tick" x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="central">{formatTick(t, unit)}</text>
            </g>
          ))}
          {x.ticks(5).map(t => (
            <text key={t} className="wm-tick" x={x(t)} y={height - 6} textAnchor="middle">{t}</text>
          ))}
          {live.length === 1 && <path d={area(live[0].points) ?? ''} fill={live[0].color} opacity={0.1} />}
          {live.map(s => (
            <path key={s.key} d={line(s.points) ?? ''} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {hoverYear == null && live.map((s, i) => (
            <circle key={s.key} className="wm-dot" cx={x(last[i].year)} cy={y(last[i].value)} r={4} fill={s.color} />
          ))}
          {hoverYear != null && (
            <g>
              <line className="wm-crosshair" x1={hx} x2={hx} y1={M.top} y2={height - M.bottom} />
              {live.map(s => {
                const p = s.points.find(p => p.year === hoverYear);
                return p && <circle key={s.key} className="wm-dot" cx={hx} cy={y(p.value)} r={4} fill={s.color} />;
              })}
            </g>
          )}
        </svg>
        {hoverYear != null && (
          <div className="wm-tip" style={{ left: `${(hx / W) * 100}%` }}>
            <strong>{hoverYear}</strong>
            {live.map(s => {
              const p = s.points.find(p => p.year === hoverYear);
              return (
                <div key={s.key}>
                  {live.length > 1 && <span className="wm-swatch" style={{ background: s.color }} />}
                  {live.length > 1 && `${s.label} `}{p ? formatValue(p.value, unit) : '—'}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {live.length > 1 && <Legend items={live.map((s, i) => ({ label: s.label, color: s.color, value: formatValue(last[i].value, unit) }))} />}
    </figure>
  );
}

// ── 100% stacked area over time (part-to-whole, e.g. age groups) ────────────
export function StackedShare({ title, series, height = 130 }: { title: string; series: Series[]; height?: number }) {
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const rows = useMemo(() => {
    const years = d3.intersection(...series.map(s => s.points.map(p => p.year))) as Set<number>;
    return [...years].sort((a, b) => a - b).map(year => {
      const row: Record<string, number> = { year };
      for (const s of series) row[s.key] = s.points.find(p => p.year === year)!.value;
      return row;
    });
  }, [series]);
  if (rows.length < 2) return null;

  const x = d3.scaleLinear().domain(d3.extent(rows, r => r.year) as [number, number]).range([M.left, W - M.right]);
  const y = d3.scaleLinear().domain([0, 100]).range([height - M.bottom, M.top]);
  const stack = d3.stack<Record<string, number>>().keys(series.map(s => s.key))(rows);
  const area = d3.area<d3.SeriesPoint<Record<string, number>>>().x(d => x(d.data.year)).y0(d => y(d[0])).y1(d => y(d[1]));
  const lastRow = rows[rows.length - 1];
  const onMove = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const yr = Math.round(x.invert(((e.clientX - r.left) / r.width) * W));
    setHoverYear(rows.reduce((b, row) => (Math.abs(row.year - yr) < Math.abs(b - yr) ? row.year : b), rows[0].year));
  };
  const hoverRow = rows.find(r => r.year === hoverYear);

  return (
    <figure className="wm-chart">
      <figcaption>{title}<span className="wm-unit"> · % of population</span></figcaption>
      <div className="wm-chart-body">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${height}`} onPointerMove={onMove} onPointerLeave={() => setHoverYear(null)}>
          {stack.map((layer, i) => (
            <path key={layer.key} d={area(layer) ?? ''} fill={series[i].color} stroke="var(--wm-surface)" strokeWidth={2} />
          ))}
          {[0, 50, 100].map(t => (
            <text key={t} className="wm-tick" x={M.left - 6} y={y(t)} textAnchor="end" dominantBaseline="central">{t}%</text>
          ))}
          {x.ticks(5).map(t => <text key={t} className="wm-tick" x={x(t)} y={height - 6} textAnchor="middle">{t}</text>)}
          {hoverRow && <line className="wm-crosshair" x1={x(hoverRow.year)} x2={x(hoverRow.year)} y1={M.top} y2={height - M.bottom} />}
        </svg>
        {hoverRow && (
          <div className="wm-tip" style={{ left: `${(x(hoverRow.year) / W) * 100}%` }}>
            <strong>{hoverRow.year}</strong>
            {series.map(s => (
              <div key={s.key}><span className="wm-swatch" style={{ background: s.color }} />{s.label} {hoverRow[s.key].toFixed(1)}%</div>
            ))}
          </div>
        )}
      </div>
      <Legend items={series.map(s => ({ label: s.label, color: s.color, value: `${lastRow[s.key].toFixed(1)}%` }))} />
    </figure>
  );
}

// ── Single 100% bar of parts (e.g. GDP by sector, latest year) ──────────────
export function ShareBar({ title, parts, note }: {
  title: string; parts: { label: string; value: number; color: string }[]; note?: string;
}) {
  const total = d3.sum(parts, p => p.value);
  if (!total) return null;
  let acc = 0;
  return (
    <figure className="wm-chart">
      <figcaption>{title}{note && <span className="wm-unit"> · {note}</span>}</figcaption>
      <svg viewBox={`0 0 ${W} 20`} className="wm-sharebar">
        {parts.map(p => {
          const x0 = (acc / total) * W;
          acc += p.value;
          const w = (p.value / total) * W;
          return (
            <rect key={p.label} x={x0 + 1} y={0} width={Math.max(0, w - 2)} height={20} rx={3} fill={p.color}>
              <title>{`${p.label}: ${p.value.toFixed(1)}%`}</title>
            </rect>
          );
        })}
      </svg>
      <Legend items={parts.map(p => ({ label: p.label, color: p.color, value: `${p.value.toFixed(1)}%` }))} />
    </figure>
  );
}

// ── Diverging bars for scores centred on 0 (governance indicators) ──────────
export function ScoreBars({ title, note, rows, domain = 2.5 }: {
  title: string; note?: string; rows: { label: string; value: number }[]; domain?: number;
}) {
  const rowH = 22, labelW = 150;
  const h = rows.length * rowH;
  const x = d3.scaleLinear().domain([-domain, domain]).range([labelW, W - 40]);
  return (
    <figure className="wm-chart">
      <figcaption>{title}{note && <span className="wm-unit"> · {note}</span>}</figcaption>
      <svg viewBox={`0 0 ${W} ${h + 14}`}>
        <line className="wm-axis-zero" x1={x(0)} x2={x(0)} y1={0} y2={h} />
        {rows.map((r, i) => {
          const y0 = i * rowH + 5;
          const pos = r.value >= 0;
          const x0 = pos ? x(0) : x(r.value);
          return (
            <g key={r.label}>
              <text className="wm-bar-label" x={0} y={y0 + 6} dominantBaseline="central">{r.label}</text>
              <rect x={x0} y={y0} width={Math.abs(x(r.value) - x(0))} height={12} rx={3}
                fill={pos ? 'var(--wm-div-pos)' : 'var(--wm-div-neg)'}>
                <title>{`${r.label}: ${r.value.toFixed(2)}`}</title>
              </rect>
              <text className="wm-bar-value" x={pos ? x(r.value) + 4 : x(0) + 4} y={y0 + 6} dominantBaseline="central">
                {r.value > 0 ? '+' : ''}{r.value.toFixed(2)}
              </text>
            </g>
          );
        })}
        <text className="wm-tick" x={x(-domain)} y={h + 10} textAnchor="start">weaker</text>
        <text className="wm-tick" x={x(domain)} y={h + 10} textAnchor="end">stronger</text>
      </svg>
    </figure>
  );
}

// ── Parliament seating diagram ───────────────────────────────────────────────
export function Hemicycle({ title, total, groups, source }: {
  title: string; total: number;
  groups: { party: string; color: string; seats: number; link?: string }[];
  source?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const seats = d3.sum(groups, g => g.seats);
  const n = Math.max(seats, 1);
  const H = 150, cx = W / 2, cy = H - 6, R = 140, r0 = 52;

  const dots = useMemo(() => {
    // Rows of concentric arcs; seats per row proportional to radius
    const rows = Math.max(2, Math.min(18, Math.round(Math.sqrt(n / 4.5))));
    const radii = d3.range(rows).map(i => r0 + ((R - r0) * (i + 0.5)) / rows);
    const sumR = d3.sum(radii);
    const counts = radii.map(r => Math.round((n * r) / sumR));
    counts[rows - 1] += n - d3.sum(counts);
    const pts: { a: number; x: number; y: number }[] = [];
    radii.forEach((r, i) => {
      const k = counts[i];
      for (let j = 0; j < k; j++) {
        const a = Math.PI - (k === 1 ? Math.PI / 2 : (Math.PI * j) / (k - 1));
        pts.push({ a, x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) });
      }
    });
    // Fill seats left to right (by angle) in group order
    pts.sort((p, q) => q.a - p.a);
    const dotR = Math.min(6, Math.max(1.2, ((R - r0) / rows) * 0.42));
    let gi = 0, used = 0;
    return pts.map(p => {
      while (gi < groups.length - 1 && used >= groups[gi].seats) { gi++; used = 0; }
      used++;
      return { ...p, r: dotR, group: groups[gi] };
    });
  }, [n, groups, cx, cy]);

  const majority = Math.floor(total / 2) + 1;
  return (
    <figure className="wm-chart">
      <figcaption>{title}<span className="wm-unit"> · {total} seats</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} onPointerLeave={() => setHover(null)}>
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.group.color}
            opacity={hover && hover !== d.group.party ? 0.25 : 1}
            onPointerEnter={() => setHover(d.group.party)} />
        ))}
        <text className="wm-hemi-total" x={cx} y={cy - 18} textAnchor="middle">{seats}</text>
        <text className="wm-tick" x={cx} y={cy - 2} textAnchor="middle">majority {majority}</text>
      </svg>
      <ul className="wm-legend wm-legend-parties">
        {groups.map(g => (
          <li key={g.party} className={hover === g.party ? 'wm-active' : ''}
            onPointerEnter={() => setHover(g.party)} onPointerLeave={() => setHover(null)}>
            <span className="wm-swatch" style={{ background: g.color }} />
            {g.link ? <a href={g.link} target="_blank" rel="noreferrer">{g.party}</a> : g.party}
            <span className="wm-legend-value"> {g.seats}</span>
          </li>
        ))}
      </ul>
      {source && <p className="wm-chart-note">{source}</p>}
    </figure>
  );
}

// ── Stat tiles ───────────────────────────────────────────────────────────────
export function StatGrid({ stats }: { stats: { label: string; value: string; note?: string }[] }) {
  return (
    <dl className="wm-stats">
      {stats.map(s => (
        <div key={s.label}>
          <dt>{s.label}</dt>
          <dd>{s.value}{s.note && <span className="wm-stat-note"> {s.note}</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
