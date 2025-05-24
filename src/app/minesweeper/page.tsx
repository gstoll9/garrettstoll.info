"use client"
import Head from "next/head";
import { GameBoard } from "./components/GameBoard";
import { GameControls } from "./components/GameControls";
import { useState } from "react";
import { useMinesweeper } from "./hooks/useMinesweeper";

export default function Home() {
  const [rows, setRows] = useState(10);
  const [cols, setCols] = useState(10);
  const [mines, setMines] = useState(10);
  const {board, clickCell, flagCell, gameState, remainingMines, resetGame } = useMinesweeper(rows, cols, mines);

  const [hintsEnabled, setHintsEnabled] = useState(false); // New state for hints

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

  return (
    <div className="app">
      <Head>
        <title>Minesweeper</title>
      </Head>
      <GameControls
        remainingMines={remainingMines}
        onRestart={handleRestart}
        onHint={handleHint}
        onSettings={handleSettings}
      />
      <GameBoard 
        board={board}
        clickCell={clickCell}
        flagCell={flagCell}
        gameState={gameState}
        defaultMineProbability={mines / (rows * cols)}
        hintsEnabled={hintsEnabled}
      />
    </div>
  );
}
  