import { useState, useEffect } from 'react';
import '../styles/orbitControls.css';
import { simulationState } from '../utils';

type OrbitMode = 'Simple' | 'Elliptical' | 'RealLive';

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
  orbitMode: OrbitMode;
  setOrbitMode: (mode: OrbitMode) => void;
  showOrbits: boolean;
  setShowOrbits: (show: boolean) => void;
  useSimplifiedDistance: boolean;
  setUseSimplifiedDistance: (use: boolean) => void;
  useRealisticSizes: boolean;
  setUseRealisticSizes: (use: boolean) => void;
  timeScale: number;
  setTimeScale: (scale: number) => void;
};

export default function OrbitControlsMenu({
  orbitMode,
  setOrbitMode,
  showOrbits,
  setShowOrbits,
  useSimplifiedDistance,
  setUseSimplifiedDistance,
  useRealisticSizes,
  setUseRealisticSizes,
  timeScale,
  setTimeScale,
}: OrbitControlsMenuProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleOrbitModeChange = (mode: OrbitMode) => {
    setOrbitMode(mode);
    if (mode === 'RealLive') {
      setUseSimplifiedDistance(false);
      setTimeScale(1); // Default to live time scale
    } else {
      setTimeScale(1);
    }
  };

  return (
    <div className={`orbit-controls-menu ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <button 
        className="toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? 'Collapse menu' : 'Expand menu'}
      >
        {isExpanded ? '−' : '+'}
      </button>
      
      {isExpanded && (
        <div className="controls-content">
          <h3>Orbit Settings</h3>
          
          <div className="control-group">
            <label className="control-label">Orbit Type</label>
            <div className="button-group">
              <button
                className={`mode-button ${orbitMode === 'Simple' ? 'active' : ''}`}
                onClick={() => handleOrbitModeChange('Simple')}
              >
                Circular
              </button>
              <button
                className={`mode-button ${orbitMode === 'RealLive' ? 'active' : ''}`}
                onClick={() => handleOrbitModeChange('RealLive')}
              >
                Live
              </button>
            </div>
          </div>

          <div className="control-group">            
            <label className="control-label">
              Orbital Speed
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <input 
                type="range" 
                min={orbitMode === 'RealLive' ? 1 : 0} 
                max={orbitMode === 'RealLive' ? 31536000 : 20} 
                step={orbitMode === 'RealLive' ? 86400 : 0.5} 
                value={timeScale} 
                onChange={(e) => setTimeScale(parseFloat(e.target.value))} 
                style={{ width: '100%', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#ccc' }}>
                <span>{orbitMode === 'RealLive' ? 'Live' : '0.0x'}</span>
                <span>{orbitMode === 'RealLive' ? (timeScale <= 1 ? 'Live' : `${(timeScale / 86400).toFixed(1)} days/sec`) : `${timeScale}x`}</span>
                <span>{orbitMode === 'RealLive' ? '1 yr/sec' : '20x'}</span>
              </div>
            </div>
          </div>

          {orbitMode === 'RealLive' && <DateTimeControl />}

          <div className="control-group">
            <label className="control-label">Distance Mode</label>
            <div className="button-group">
             <button
                className={`mode-button ${useSimplifiedDistance ? 'active' : ''}`}
                onClick={() => orbitMode === 'RealLive' ? null : setUseSimplifiedDistance(true)}
                disabled={orbitMode === 'RealLive'}
                style={{ opacity: orbitMode === 'RealLive' ? 0.5 : 1, cursor: orbitMode === 'RealLive' ? 'not-allowed' : 'pointer' }}
              >
                Even Spacing
              </button>
              <button
                className={`mode-button ${!useSimplifiedDistance ? 'active' : ''}`}
                onClick={() => setUseSimplifiedDistance(false)}
              >
                Realistic
              </button>
            </div>
          </div>

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
