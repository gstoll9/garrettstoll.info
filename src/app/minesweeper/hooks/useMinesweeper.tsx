"use client"
// hooks/useMinesweeper.ts
import { useState, useEffect } from "react";
import type { Cell, GameState } from "../types";

// Count adjacent mines
const directions: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1],
];

function getNeighbors(board: Cell[][], x: number, y: number): Cell[] {
  const neighbors: Cell[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < board[0].length && ny < board.length) {
        neighbors.push(board[ny][nx]);
      }
    }
  }
  return neighbors;
}

const generateBoard = (rows: number, cols: number, mines: number): Cell[][] => {
  const board: Cell[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({
      x,
      y,
      hasMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );

  // Randomly place mines
  let placed = 0;
  while (placed < mines) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    if (!board[y][x].hasMine) {
      board[y][x].hasMine = true;
      placed++;
    }
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (board[y][x].hasMine) continue;
      directions.forEach(([dy, dx]) => {
        const ny = y + dy;
        const nx = x + dx;
        if (board[ny]?.[nx]?.hasMine) {
          board[y][x].adjacentMines++;
        }
      });
    }
  }

  return board;
};

export const useMinesweeper = (rows: number, cols: number, mines: number) => {
  const [board, setBoard] = useState<Cell[][]>(() => generateBoard(rows, cols, mines));
  const [gameState, setGameState] = useState<GameState>("playing");

  function chordCell(x: number, y: number, newBoard: Cell[][]) {
    const cell = newBoard[y][x];
    if (!cell.isRevealed || cell.adjacentMines === 0) return;

    const neighbors = getNeighbors(board, x, y);
    const flagged = neighbors.filter(n => n.isFlagged);
    const covered = neighbors.filter(n => !n.isRevealed && !n.isFlagged);

    if (flagged.length === cell.adjacentMines) {
      // Safe to reveal the rest
      for (let neighbor of covered) {
        revealCell(neighbor.x, neighbor.y, newBoard);
      }
    }
  }

  const revealCell = (x: number, y: number , newBoard: Cell[][]) => {
    
    const cell = newBoard[y][x];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;
    if (cell.hasMine) {
      setGameState("lost");
      return;
    }

    if (cell.adjacentMines === 0) {
      const queue = [[y, x]];
      const visited = new Set();

      while (queue.length > 0) {
        const [cy, cx] = queue.pop()!;
        visited.add(`${cy}-${cx}`);

        directions.forEach(([dy, dx]) => {
          const ny = cy + dy;
          const nx = cx + dx;
          const neighbor = newBoard[ny]?.[nx];
          if (
            neighbor &&
            !neighbor.isRevealed &&
            !neighbor.hasMine &&
            !visited.has(`${ny}-${nx}`)
          ) {
            neighbor.isRevealed = true;
            if (neighbor.adjacentMines === 0) {
              queue.push([ny, nx]);
            }
          }
        });
      }
    }

    return newBoard;
  };

  const clickCell = (x: number, y: number) => {
    if (gameState !== "playing") return;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = board[y][x];
    if (cell.isRevealed && cell.adjacentMines > 0) {
      chordCell(cell.x, cell.y, newBoard);
    } else {
      revealCell(cell.x, cell.y, newBoard);
    }
    setBoard(newBoard);
  };

  const flagCell = (x: number, y: number) => {
    if (gameState !== "playing") return;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = newBoard[y][x];
    if (!cell.isRevealed) cell.isFlagged = !cell.isFlagged;
    setBoard(newBoard);
  };

  return { board, clickCell, flagCell, gameState };
};
