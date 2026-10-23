'use client'
import { useEffect, useRef, useState } from 'react';
import { HISTORY_END, HISTORY_START } from '../lib/history';

// The slider's last stop is the present-day map
const TODAY = HISTORY_END + 1;
const PLAY_MS = 450;

type Props = {
  // null: present day
  year: number | null;
  onChange: (year: number | null) => void;
  // Territories changed per year, drawn as ticks above the track (null while loading)
  changes: Map<number, number> | null;
  style?: React.CSSProperties;
};

export default function TimeSlider({ year, onChange, changes, style }: Props) {
  const value = year ?? TODAY;
  const [playing, setPlaying] = useState(false);

  // Playing steps one year at a time and stops at the last historical year
  const valueRef = useRef(value);
  valueRef.current = value;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = valueRef.current + 1;
      if (next > HISTORY_END) { setPlaying(false); return; }
      onChange(next);
    }, PLAY_MS);
    return () => clearInterval(id);
  }, [playing, onChange]);

  const togglePlay = () => {
    if (!playing && value >= HISTORY_END) onChange(HISTORY_START);
    setPlaying(p => !p);
  };
  const set = (v: number) => onChange(v >= TODAY ? null : Math.max(HISTORY_START, v));

  const span = TODAY - HISTORY_START;
  const maxChanges = changes ? Math.max(1, ...changes.values()) : 1;
  // Axis labels every 20 years, stopping short of "Now" so the two don't collide
  const decades = Array.from({ length: Math.floor((HISTORY_END - 1890 - 20) / 20) + 1 }, (_, i) => 1890 + i * 20);

  return (
    <div className="wm-time" style={style}>
      <div className="wm-time-head">
        <button className="wm-time-play" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play through the years'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <button className="wm-time-step" onClick={() => set(value - 1)} disabled={value <= HISTORY_START} aria-label="Previous year">‹</button>
        <span className="wm-time-year">{year ?? 'Today'}</span>
        <button className="wm-time-step" onClick={() => set(value + 1)} disabled={value >= TODAY} aria-label="Next year">›</button>
        <span className="wm-time-caption">
          {year == null ? 'Present-day borders' : `Borders on 1 July ${year}`}
        </span>
      </div>
      <div className="wm-time-track">
        {/* One tick per year with border changes, taller for more changes */}
        <svg className="wm-time-ticks" viewBox={`0 0 ${span} 10`} preserveAspectRatio="none" aria-hidden>
          {changes && [...changes].map(([y, n]) => (
            <rect key={y} x={y - HISTORY_START} y={10 - (10 * n) / maxChanges} width={0.8} height={(10 * n) / maxChanges} />
          ))}
        </svg>
        <input
          type="range"
          min={HISTORY_START}
          max={TODAY}
          step={1}
          value={value}
          onChange={e => { setPlaying(false); set(+e.target.value); }}
          aria-label="Year"
          aria-valuetext={year == null ? 'Today' : String(year)}
        />
        <div className="wm-time-axis" aria-hidden>
          {decades.map(d => (
            <span key={d} style={{ left: `${((d - HISTORY_START) / span) * 100}%` }}>{d}</span>
          ))}
          <span style={{ left: '100%' }}>Now</span>
        </div>
      </div>
    </div>
  );
}
