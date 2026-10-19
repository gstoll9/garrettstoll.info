import React from "react";
import "../styles/GameControls.css";

interface GameControlsProps {
  remainingMines: number;
  elapsedTime: number;
  onRestart: () => void;
  onHint: () => void;
  onSettings: () => void;
  flagging: boolean;
  onFlagging: () => void;
  hintsEnabled?: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({
  remainingMines,
  elapsedTime,
  onRestart,
  onHint,
  flagging,
  onFlagging,
  hintsEnabled = false,
}) => {
  return (
    <div className="game-controls">
      <div className="ms-stats">
        <div className="ms-stat" aria-label="Mines remaining">
          <span className="ms-stat-icon" aria-hidden="true">💣</span>
          <span className="ms-stat-value">{remainingMines}</span>
        </div>
        <div className="ms-stat" aria-label="Elapsed time">
          <span className="ms-stat-icon" aria-hidden="true">⏱️</span>
          <span className="ms-stat-value">{elapsedTime}s</span>
        </div>
      </div>
      <div className="ms-actions">
        <button
          className={`minesweeper-button${flagging ? " active" : ""}`}
          onClick={onFlagging}
          aria-pressed={flagging}
        >
          🚩 <span>Flag</span>
        </button>
        <button
          className={`minesweeper-button${hintsEnabled ? " active" : ""}`}
          onClick={onHint}
          aria-pressed={hintsEnabled}
        >
          💡 <span>Hints</span>
        </button>
        <button className="minesweeper-button minesweeper-button--primary" onClick={onRestart}>
          ↻ <span>Restart</span>
        </button>
      </div>
    </div>
  );
};
