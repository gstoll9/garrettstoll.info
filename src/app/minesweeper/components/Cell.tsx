// components/Cell.tsx
import React from "react";
import type { Cell as CellType } from "../types";
import "../styles/Cell.css";

type Props = {
    cell: CellType;
    onClick: () => void;
    onRightClick: (e: React.MouseEvent) => void;
};

const getProbabilityColor = (p: number): string => {
    if (p <= 0.3) {
      // Green → Yellow
      const green = Math.round(255 * (1 - p / 0.3));
      return `rgb(255, 255, ${green})`;
    } else {
      // Yellow → Red
      const red = 255;
      const green = Math.round(255 * (1 - (p - 0.3) / 0.7));
      return `rgb(${red}, ${green}, 0)`;
    }
};

export const Cell: React.FC<Props> = ({ cell, onClick, onRightClick }) => {

    let className = "cell";
    if (cell.isRevealed) className += " revealed";
    if (cell.isFlagged) className += " flagged";

    let content = "";
    if (cell.isRevealed) {
        content = cell.hasMine ? "💣" : cell.adjacentMines ? cell.adjacentMines.toString() : "";
    } else if (cell.isFlagged) {
        content = "🚩";
    }

    return (
        <button
            onClick={onClick}
            onContextMenu={onRightClick}
            className={className}
            style={{
                backgroundColor: !cell.isRevealed && !cell.isFlagged
                  ? getProbabilityColor(cell.mineProbability ?? 0)
                  : undefined,
              }}
        >
            {content}
        </button>
    );
};