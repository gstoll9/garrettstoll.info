// components/GameBoard.tsx
import React from "react";
import { useMinesweeper } from "../hooks/useMinesweeper";
import { Cell } from "./Cell";
import "../styles/GameBoard.css";

export const GameBoard = () => {
  const { board, clickCell, flagCell, gameState } = useMinesweeper(10, 10, 10);

  return (
    <div className="game-container">
      <h2 className="game-title">Minesweeper ({gameState})</h2>
      <div className="board">
        {board.map((row, y) =>
          row.map((cell, x) => (
            <Cell
              key={`${x}-${y}`}
              cell={cell}
              onClick={() => clickCell(x, y)}
              onRightClick={e => {
                e.preventDefault();
                flagCell(x, y);
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};
