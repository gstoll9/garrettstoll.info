// components/GameBoard.tsx
import React from "react";
import { Cell } from "./Cell";
import { CellType } from "../types";
import "../styles/GameBoard.css";

type GameBoardProps = {
    board: CellType[][];
    clickCell: (x: number, y: number) => void;
    gameState: string;
    defaultMineProbability: number;
    hintsEnabled: boolean;
    rightClickCell: (x: number, y: number) => void;
};

export const GameBoard: React.FC<GameBoardProps> = ({board, clickCell, gameState, defaultMineProbability, hintsEnabled, rightClickCell }) => {

  return (
    <div className="game-container">
      <div className="board">
        {board.map((row, y) =>
          row.map((cell, x) => (
            <Cell
              key={`${x}-${y}`}
              cell={cell}
              onClick={() => clickCell(x, y)}
              onRightClick={e => {
                e.preventDefault();
                rightClickCell(x, y);
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
