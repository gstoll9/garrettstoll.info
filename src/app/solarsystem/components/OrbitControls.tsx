import { useState, useEffect } from 'react';
import '../styles/orbitControls.css';
import { simulationState } from '../utils';

function DateTimeControl() {
  const [localDate, setLocalDate] = useState('');

  useEffect(() => {
    const updateDate = () => {
      const d = new Date(simulationState.dateMs);
      const tzoffset = d.getTimezoneOffset() * 60000; // offset in milliseconds
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0,16);
      setLocalDate(localISOTime);
    };
    
    updateDate();
    const interval = setInterval(updateDate, 500); 
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = new Date(e.target.value);
    if (!isNaN(d.getTime())) {
      simulationState.dateMs = d.getTime();
      setLocalDate(e.target.value);
    }
  };

  return (
    <div className="control-group">
      <label className="control-label">Current Date</label>
      <input 
        type="datetime-local" 
        value={localDate} 
        onChange={handleChange}
        style={{ 
          width: '100%', 
          padding: '6px', 
          backgroundColor: '#222', 
          color: '#fff', 
          border: '1px solid #444', 
          borderRadius: '4px',
          colorScheme: 'dark'
        }}
      />
      <div style={{ marginTop: '4px', textAlign: 'right' }}>
        <button 
          onClick={() => { simulationState.dateMs = Date.now(); }}
          style={{
            background: 'none',
            border: 'none',
            color: '#88f',
            cursor: 'pointer',
            fontSize: '0.8rem',
            padding: 0
          }}
        >
          Reset to Now
        </button>
      </div>
    </div>
  );
}

type OrbitControlsMenuProps = {
  useRealisticSizes: boolean;
  setUseRealisticSizes: (use: boolean) => void;
  timeScale: number;
  setTimeScale: (scale: number) => void;
  showOrbits: boolean;
  setShowOrbits: (show: boolean) => void;
  showBackground: boolean;
  setShowBackground: (show: boolean) => void;
};

export default function OrbitControlsMenu({
  showOrbits,
  setShowOrbits,
  useRealisticSizes,
  setUseRealisticSizes,
  timeScale,
  setTimeScale,
  showBackground,
  setShowBackground,
}: OrbitControlsMenuProps) {
  const [isExpanded, setIsExpanded] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 768
  );

  return (
    <div className={`orbit-controls-menu ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button
        type="button"
        className="menu-toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className="menu-toggle-label">Display Options</span>
        <span className="menu-toggle-arrow">▾</span>
      </button>

      {isExpanded && (
        <div className="controls-content">
          <div className="control-group">            
            <label className="control-label">
              Orbital Speed
            </label>
            <div className="slider-stack">
              <input 
                type="range" 
                min={1} 
                max={31536000} 
                step={86400} 
                value={timeScale} 
                onChange={(e) => setTimeScale(parseFloat(e.target.value))} 
              />
              <div className="slider-meta">
                <span>Live</span>
                <span>{timeScale <= 1 ? 'Live' : `${(timeScale / 86400).toFixed(1)} days/sec`}</span>
                <span>1 yr/sec</span>
              </div>
            </div>
          </div>

          <DateTimeControl />

          <div className="control-group">
            <label className="control-label">Planet Sizes</label>
            <div className="button-group">
              <button
                className={`mode-button ${!useRealisticSizes ? 'active' : ''}`}
                onClick={() => setUseRealisticSizes(false)}
              >
                Visible
              </button>
              <button
                className={`mode-button ${useRealisticSizes ? 'active' : ''}`}
                onClick={() => setUseRealisticSizes(true)}
              >
                Realistic
              </button>
            </div>
          </div>

          <div className="control-group">            
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showBackground}
                onChange={(e) => setShowBackground(e.target.checked)}
              />
              <span>Show Background</span>
            </label>
          </div>

          <div className="control-group">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showOrbits}
                onChange={(e) => setShowOrbits(e.target.checked)}
              />
              <span>Show Orbits</span>
            </label>
          </div>

        </div>
      )}
    </div>
  );
}
