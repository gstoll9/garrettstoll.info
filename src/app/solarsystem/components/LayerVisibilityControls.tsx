import '../styles/orbitControls.css';

type LayerVisibilityControlsProps = {
  showAtmosphere: boolean;
  setShowAtmosphere: (show: boolean) => void;
  showCrust: boolean;
  setShowCrust: (show: boolean) => void;
};

export default function LayerVisibilityControls({
  showAtmosphere,
  setShowAtmosphere,
  showCrust,
  setShowCrust,
}: LayerVisibilityControlsProps) {
  return (
    <div className="layer-visibility-controls">
      <button
        type="button"
        className={`layer-toggle-pill ${showAtmosphere ? 'active' : ''}`}
        onClick={() => setShowAtmosphere(!showAtmosphere)}
        aria-pressed={showAtmosphere}
      >
        Show Atmosphere
      </button>
      <button
        type="button"
        className={`layer-toggle-pill ${showCrust ? 'active' : ''}`}
        onClick={() => setShowCrust(!showCrust)}
        aria-pressed={showCrust}
      >
        Show Crust
      </button>
    </div>
  );
}
