'use client'
// "Focus" box: pick a themed set of places to draw over the map, then show/hide its categories
import { useEffect, useState } from 'react';
import { FOCUSES, FocusData, FocusId } from '../lib/focus';

type Props = {
  focusId: FocusId | null;
  onChange: (id: FocusId | null) => void;
  data: FocusData | null;          // null while loading
  hidden: Set<string>;             // hidden category ids
  onToggle: (cat: string) => void;
  shown: number;                   // places currently drawn
  year: number | null;
  // Collapses the box when this turns true (an info box opened beside it)
  collapse?: boolean;
};

export default function FocusControl({ focusId, onChange, data, hidden, onToggle, shown, year, collapse }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { if (collapse) setCollapsed(true); }, [collapse]);
  const focus = FOCUSES.find(f => f.id === focusId);
  const counts = new Map<string, number>();
  for (const it of data?.points ?? []) counts.set(it.cat, (counts.get(it.cat) ?? 0) + 1);

  return (
    <div className="wm-focusctl">
      <div className="wm-colorby-head">
        <button className="wm-colorby-toggle" onClick={() => setCollapsed(c => !c)} aria-expanded={!collapsed}>
          {collapsed ? '▸' : '▾'} Focus{collapsed && focus ? `: ${focus.label}` : ''}
        </button>
      </div>
      {!collapsed && (
        <>
          <div className="wm-seg-buttons" role="group" aria-label="Focus">
            <button aria-pressed={!focusId} className={!focusId ? 'wm-active' : ''} onClick={() => onChange(null)}>None</button>
            {FOCUSES.map(f => (
              <button key={f.id} aria-pressed={focusId === f.id} className={focusId === f.id ? 'wm-active' : ''} onClick={() => onChange(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          {focus && <div className="wm-colorby-note">{focus.blurb}</div>}
          {focus && !data && <div className="wm-colorby-note">Loading…</div>}
          {focus && data && (
            <div className="wm-colorby-legend">
              <ul className="wm-focus-cats">
                {data.categories.map(c => (
                  <li key={c.id}>
                    <label>
                      <input type="checkbox" checked={!hidden.has(c.id)} onChange={() => onToggle(c.id)} />
                      <span className="wm-focus-dot" style={{ background: c.color }} />
                      {c.label}
                      <span className="wm-legend-value"> {counts.get(c.id) ?? 0}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="wm-colorby-note">
                {shown.toLocaleString()} shown{year != null ? ` · ${focusId === 'archaeology' ? 'discovered by' : 'operating in'} ${year} (or date unknown)` : ''} ·
                larger dots have a Wikipedia article · data:{' '}
                <a href={data.source.url} target="_blank" rel="noreferrer">{data.source.name}</a> ({data.source.license}), {data.generated}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
