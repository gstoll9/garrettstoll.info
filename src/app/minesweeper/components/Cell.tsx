// components/Cell.tsx
import React from "react";
import type { CellType } from "../types";
import "../styles/Cell.css";

type CellProps = {
    cell: CellType;
    onClick: () => void;
    onRightClick: (e: React.MouseEvent) => void;
    mineProbability: number;
    hintsEnabled: boolean;
};

const getProbabilityColor = (p: number): string => {
    if (p <= 0.3) {
      // Green → Yellow
      const green = Math.round(255 * (1 - p / 0.3));
      return `rgb(0, ${green}, 0)`;
    } else {
      // Yellow → Red
      const red = 255;
      const green = Math.round(255 * (1 - (p - 0.3) / 0.7));
      return `rgb(${red}, ${green}, 0)`;
    }
};

export const Cell: React.FC<CellProps> = ({ cell, onClick, onRightClick, hintsEnabled }) => {

    let className = "cell";
    if (cell.isRevealed) className += " revealed";
    if (cell.isFlagged) className += " flagged";

    let content = "";
    if (cell.isRevealed) {
        content = cell.hasMine ? "💣" : cell.adjacentMines ? cell.adjacentMines.toString() : "";
    } else if (cell.isFlagged) {
        content = "🚩";
    } else if (hintsEnabled && cell.mineProbability && cell.mineProbability > 0) {
        // Show probability as percentage when hints are enabled
        content = `${Math.round(cell.mineProbability * 100)}%`;
    }

    return (
        <button
            onClick={onClick}
            onContextMenu={onRightClick}
            className={className}
            style={{
                backgroundColor: 
                    hintsEnabled && !cell.isRevealed && !cell.isFlagged
                        ? getProbabilityColor(cell.mineProbability ?? 0)
                        : undefined,
                fontSize: hintsEnabled && !cell.isRevealed && !cell.isFlagged ? '10px' : '16px', // Smaller font for percentages
                color: hintsEnabled && !cell.isRevealed && !cell.isFlagged ? 'white' : undefined, // White text for visibility
                fontWeight: hintsEnabled && !cell.isRevealed && !cell.isFlagged ? 'bold' : 'bold',
              }}
        >
            {content}
        </button>
    );
};