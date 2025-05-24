import React, { useState, useEffect } from "react";

interface GameControlsProps {
  remainingMines: number;
  onRestart: () => void;
  onHint: () => void;
  onSettings: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ remainingMines, onRestart, onHint, onSettings }) => {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTime((prev) => prev + 1), 1000);
    return () => clearInterval(timer); // Cleanup on unmount
  }, []);

  return (
    <div className="game-controls">
      <button className="minesweeper-button" onClick={onHint}>
        💡 Hint
      </button>
      <div className="timer">⏱️ {time}s</div>
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