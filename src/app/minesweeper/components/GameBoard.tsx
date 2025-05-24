// components/GameBoard.tsx
import React from "react";
import { Cell } from "./Cell";
import { CellType } from "../types";
import "../styles/GameBoard.css";

type GameBoardProps = {
    board: CellType[][];
    clickCell: (x: number, y: number) => void;
    flagCell: (x: number, y: number) => void;
    gameState: string;
    defaultMineProbability: number;
    hintsEnabled: boolean;
};

export const GameBoard: React.FC<GameBoardProps> = ({board, clickCell, flagCell, gameState, defaultMineProbability, hintsEnabled }) => {

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
              mineProbability={defaultMineProbability}
              hintsEnabled={hintsEnabled}
            />
          ))
        )}
      </div>
    </div>
  );
};
