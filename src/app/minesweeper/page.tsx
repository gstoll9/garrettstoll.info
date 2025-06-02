"use client"
import { GameBoard } from "./components/GameBoard";
import { GameControls } from "./components/GameControls";
import { useState } from "react";
import { useMinesweeper } from "./hooks/useMinesweeper";
import StandardLayout from "@/layouts/StandardLayout";

export default function Home() {
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [mines, setMines] = useState(10);
  const [hintsEnabled, setHintsEnabled] = useState(false);

  const { 
    board, 
    clickCell, 
    rightClickCell, 
    gameState, 
    remainingMines, 
    resetGame, 
    elapsedTime,
    flagging,
    toggleFlagging,
  } = useMinesweeper(rows, cols, mines);


  const handleRestart = () => {
    resetGame()
  };

  const handleHint = () => {
    setHintsEnabled((prev) => !prev);
  };

  const handleSettings = () => {
    console.log("Opening settings...");
    // Add logic to open settings
  };

  const main = (
    <div className="minesweeper-container">
      <GameControls
        remainingMines={remainingMines}
        elapsedTime={elapsedTime}
        onRestart={handleRestart}
        onHint={handleHint}
        onSettings={handleSettings}
        flagging={flagging}
        onFlagging={toggleFlagging}
      />
      <GameBoard 
        board={board}
        clickCell={clickCell}
        rightClickCell={rightClickCell}
        gameState={gameState}
        defaultMineProbability={mines / (rows * cols)}
        hintsEnabled={hintsEnabled}
      />
    </div>
  );

  return StandardLayout({
    title: "Minesweeper",   
    main
  });
}
  