import { useState } from 'react';
import '../styles/orbitControls.css';

type OrbitMode = 'Simple' | 'Elliptical';

type OrbitControlsMenuProps = {
  orbitMode: OrbitMode;
  setOrbitMode: (mode: OrbitMode) => void;
  showOrbits: boolean;
  setShowOrbits: (show: boolean) => void;
  useSimplifiedDistance: boolean;
  setUseSimplifiedDistance: (use: boolean) => void;
  useRealisticSizes: boolean;
  setUseRealisticSizes: (use: boolean) => void;
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
}: OrbitControlsMenuProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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
                onClick={() => setOrbitMode('Simple')}
              >
                Circular
              </button>
              <button
                className={`mode-button ${orbitMode === 'Elliptical' ? 'active' : ''}`}
                onClick={() => setOrbitMode('Elliptical')}
              >
                Realistic
              </button>
            </div>
          </div>

          <div className="control-group">
            <label className="control-label">Distance Mode</label>
            <div className="button-group">
             <button
                className={`mode-button ${useSimplifiedDistance ? 'active' : ''}`}
                onClick={() => setUseSimplifiedDistance(true)}
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
                To Scale
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
