import React from "react";

interface GameControlsProps {
  remainingMines: number;
  elapsedTime: number; // Add this prop
  onRestart: () => void;
  onHint: () => void;
  onSettings: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ 
  remainingMines, 
  elapsedTime, // Use the prop instead of local state
  onRestart, 
  onHint, 
  onSettings 
}) => {
  return (
    <div className="game-controls">
      <button className="minesweeper-button" onClick={onHint}>
        💡 Hint
      </button>
      <div className="timer">⏱️ {elapsedTime}s</div>
      <button className="minesweeper-button" onClick={onRestart}>
        🔄 Restart
      </button>
      <div className="mine-counter">💣 {remainingMines}</div>
      <button className="minesweeper-button" onClick={onSettings}>
        ⚙️ Settings
      </button>
    </div>
  );
};