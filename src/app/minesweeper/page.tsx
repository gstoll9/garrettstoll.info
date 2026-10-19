"use client"
import { GameBoard } from "./components/GameBoard";
import { GameControls } from "./components/GameControls";
import { useState } from "react";
import { useMinesweeper } from "./hooks/useMinesweeper";
import StandardLayout from "@/layouts/standardLayout";
import "./styles/Minesweeper.css";

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
      <header className="ms-header">
        <h1>Minesweeper</h1>
        <p>Click to reveal, flag what you suspect. Turn on hints to see each tile&apos;s mine probability.</p>
      </header>
      <GameControls
        remainingMines={remainingMines}
        elapsedTime={elapsedTime}
        onRestart={handleRestart}
        onHint={handleHint}
        onSettings={handleSettings}
        flagging={flagging}
        onFlagging={toggleFlagging}
        hintsEnabled={hintsEnabled}
      />
      <GameBoard 
        board={board}
        clickCell={clickCell}
        rightClickCell={rightClickCell}
        gameState={gameState}
        defaultMineProbability={mines / (rows * cols)}
        hintsEnabled={hintsEnabled}
        onRestart={handleRestart}
      />
    </div>
  );

  return StandardLayout({
    title: "Minesweeper",   
    main
  });
}
  