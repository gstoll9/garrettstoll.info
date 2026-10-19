'use client'
import { useState } from 'react';
import { Category, METRICS, NO_DATA, Scale, ViewData } from '../lib/choropleth';

const CATEGORIES: Category[] = ['Government', 'Economy', 'Demographics'];
const VIEW_NAMES = ['countries', 'subregions', 'districts'];

type Props = {
  level: 0 | 1 | 2;
  data: ViewData | null;     // null while loading
  metricId: string | null;
  onChange: (id: string | null) => void;
  scale: Scale | null;
  style?: React.CSSProperties;
};

// "Color map by" box: one dropdown per category (choosing in one clears the others) and a legend
export default function ColorByControl({ level, data, metricId, onChange, scale, style }: Props) {
  const metric = METRICS.find(m => m.id === metricId);
  const [collapsed, setCollapsed] = useState(false);
  const count = (id: string) => data?.get(id)?.size ?? 0;

  return (
    <div className="wm-colorby" style={style}>
      <div className="wm-colorby-head">
        <button className="wm-colorby-toggle" onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed}>
          {collapsed ? '▸' : '▾'} Color {VIEW_NAMES[level]} by{collapsed && metric ? `: ${metric.label}` : ''}
        </button>
        {metricId && <button onClick={() => onChange(null)} aria-label="Clear colouring">Clear</button>}
      </div>
      {!collapsed && CATEGORIES.map(cat => {
        const options = METRICS.filter(m => m.category === cat);
        const selected = metric?.category === cat ? metric.id : '';
        return (
          <label key={cat} className="wm-colorby-row">
            <span>{cat}</span>
            <select value={selected} onChange={e => onChange(e.target.value || null)} disabled={!data}>
              <option value="">—</option>
              {options.map(m => (
                <option key={m.id} value={m.id} disabled={!count(m.id)}>
                  {m.label}{data && !count(m.id) ? ' (no data)' : ''}
                </option>
              ))}
            </select>
          </label>
        );
      })}

      {metric && !collapsed && (
        <div className="wm-colorby-legend">
          {scale ? (
            <>
              <div className="wm-colorby-title">
                {metric.label}{metric.unit && metric.kind !== 'categorical' && <span> · {metric.unit}</span>}
              </div>
              <ul>
                {scale.legend.map(item => (
                  <li key={item.label}><span className="wm-swatch" style={{ background: item.color }} />{item.label}</li>
                ))}
                <li><span className="wm-swatch" style={{ background: NO_DATA }} />No data</li>
              </ul>
              <div className="wm-colorby-note">
                {metric.kind === 'sequential' ? 'Bins hold equal numbers of places · latest year available'
                  : metric.kind === 'diverging' ? 'Centred on zero · latest year available' : ''}
              </div>
            </>
          ) : <div className="wm-colorby-note">No data for this view</div>}
        </div>
      )}
    </div>
  );
}
