// components/GameBoard.tsx
import React from "react";
import Image from "next/image";
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
    onRestart?: () => void;
};

export const GameBoard: React.FC<GameBoardProps> = ({board, clickCell, gameState, defaultMineProbability, hintsEnabled, rightClickCell, onRestart }) => {
  const isOver = gameState === "won" || gameState === "lost";


  return (
    <div className="game-container">
      <div
        className={`board${isOver ? " is-over" : ""}`}
        style={{ "--cols": board[0]?.length ?? 10 } as React.CSSProperties}
      >
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
      {isOver && (
        <div className="ms-result" role="status">
          <div className="ms-result-card">
            <Image
              src={gameState === "won" ? "/TyroImages/HighFive.png" : "/TyroImages/PuppyEyes.png"}
              alt=""
              width={152}
              height={gameState === "won" ? 167 : 106}
            />
            <div>
              <strong>{gameState === "won" ? "You won! High five!" : "Boom. Tyro is sorry."}</strong>
              <p>{gameState === "won" ? "Tyro is impressed." : "Puppy eyes won't bring the board back…"}</p>
              {onRestart && (
                <button className="minesweeper-button minesweeper-button--primary" style={{ marginTop: "0.6rem" }} onClick={onRestart}>
                  ↻ <span>Play again</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
