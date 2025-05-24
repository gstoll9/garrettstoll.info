"use client"
// hooks/useMinesweeper.ts
import { useState, useEffect } from "react";
import type { CellType, GameState } from "../types";
import { cover } from "three/src/extras/TextureUtils.js";

// Count adjacent mines
const directions: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [ 0, -1],          [ 0, 1],
    [ 1, -1], [ 1, 0], [ 1, 1],
];

function getNeighbors(board: CellType[][], x: number, y: number): CellType[] {
  const neighbors: CellType[] = [];
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

const generateBoard = (rows: number, cols: number, mines: number): CellType[][] => {
  const board: CellType[][] = Array.from({ length: rows }, (_, y) =>
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
  const [board, setBoard] = useState<CellType[][]>(() => generateBoard(rows, cols, mines));
  const [gameState, setGameState] = useState<GameState>("starting");
  const [remainingMines, setRemainingMines] = useState(mines);

  const resetGame = () => {
    setBoard(generateBoard(rows, cols, mines)); // Regenerate the board
    setGameState("starting"); // Reset the game state
    setRemainingMines(mines); // Reset the mine counter
  };

  function chordCell(x: number, y: number, newBoard: CellType[][]) {
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

  const revealCell = (x: number, y: number , newBoard: CellType[][]) => {
    
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

  const firstClick = (x: number, y: number, newBoard: CellType[][]) => {
    
    const cell = newBoard[y][x];

    function moveMine(x: number, y: number, newBoard: CellType[][]) {

      const oldNeighbors = getNeighbors(newBoard, x, y);
      const adjacentMines = oldNeighbors.filter(n => n.hasMine).length;

      let newMinePlaced = false;
      while (!newMinePlaced) {
        
        // random new spot
        const newX = Math.floor(Math.random() * cols);
        const newY = Math.floor(Math.random() * rows);
        
        // no mine already there
        if (newBoard[newY][newX].hasMine) continue;
        
        // swap mines
        newBoard[newY][newX].hasMine = true;
        newBoard[y][x].hasMine = false;
        newBoard[y][x].adjacentMines = adjacentMines;

        // update adjacent mines for the new mine
        const newNeighbors = getNeighbors(newBoard, newX, newY);
        newNeighbors.forEach(neighbor => {
          if (!neighbor.hasMine) {
            newBoard[neighbor.y][neighbor.x].adjacentMines++;
          }
        });

        // update adjacent mines for the old mine
        oldNeighbors.forEach(neighbor => {
          if (!neighbor.hasMine) {
            newBoard[neighbor.y][neighbor.x].adjacentMines--;
          }
        });
        newMinePlaced = true;
      }
    }
      
      // move mine to a different cell
      if (cell.hasMine && (rows * cols != mines)) {
        moveMine(x, y, newBoard);
      }

      // open on an empty cell
      if (cell.adjacentMines > 0 && cell.adjacentMines < (rows * cols) - mines - 9) {
        const startingNeighbors = getNeighbors(newBoard, x, y);
        // move adjacent mines
        startingNeighbors.forEach(neighbor => {
          if (neighbor.hasMine) {
            moveMine(neighbor.x, neighbor.y, newBoard);
          }
        });
        newBoard[y][x].adjacentMines = 0;
      }
  }

  // calculate new mine probabilities
  const newMineProbabilities = (newBoard: CellType[][]) => {
    // let subsets: [CellType[], number][] = [];
    // let coveredCells: CellType[] = [];
    // newBoard.forEach(row => {
    //   row.forEach(cell => {
        
    //     if (!cell.isRevealed && !cell.isFlagged) coveredCells.push(cell);

    //     // use the revealed numbers to calculate mine probabilities
    //     if (cell.isRevealed && cell.adjacentMines > 0) {
    //       const neighbors = getNeighbors(board, cell.x, cell.y);
    //       const flagged = neighbors.filter(n => n.isFlagged);
    //       let covered = neighbors.filter(n => !n.isRevealed && !n.isFlagged);

    //       // there are mines to be found
    //       if (flagged.length < cell.adjacentMines) {
            
    //         let adjacentMines = cell.adjacentMines - flagged.length;

    //         // check subsets for overlapping cells
    //         subsets.forEach(subset => {
    //           const cells = subset[0]
    //           // every cell in the subset is this cell's neighbor
    //           if (cells.every(n => covered.includes(n))) {
    //             const subsetMines = subset[1];
    //             adjacentMines -= subsetMines;
    //             // remove the subset from the covered cells
    //             covered = covered.filter(n => !cells.includes(n));
    //           }
    //         });

    //         // calculate mine probability
    //         covered.forEach(n => {
    //           const probability = covered.length > 0 ? adjacentMines / covered.length : 0;
    //           newBoard[n.y][n.x].mineProbability = Math.max(probability, n.mineProbability ?? 0);
    //         })
    //       }
    //     }
    //   })
    // });
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = board[y][x];
        if (cell.isRevealed && cell.adjacentMines > 0) {
          const neighbors = getNeighbors(board, x, y);
          const flagged = neighbors.filter(n => n.isFlagged);
          const covered = neighbors.filter(n => !n.isRevealed && !n.isFlagged);
          if (flagged.length < cell.adjacentMines) {
            // calculate mine probability
            covered.forEach(n => {
              const probability = (cell.adjacentMines - flagged.length) / covered.length;
              newBoard[n.y][n.x].mineProbability = Math.max(probability, n.mineProbability ?? 0);
            })
          }
        }
      }
    }
  }

  const clickCell = (x: number, y: number) => {

    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = board[y][x];

    if (gameState == "starting") firstClick(x, y, newBoard);
    if (gameState !== "starting" && gameState !== "playing") return;
    
    if (cell.isRevealed && cell.adjacentMines > 0) {
      chordCell(x, y, newBoard);
    } else {
      revealCell(x, y, newBoard);
    }
    newMineProbabilities(newBoard);
    setBoard(newBoard);
    if (gameState === "starting") setGameState("playing");
  };

  const flagCell = (x: number, y: number) => {
    if (gameState !== "playing") return;
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = newBoard[y][x];
    if (!cell.isRevealed) {
      cell.isFlagged = !cell.isFlagged;
      setRemainingMines((prev) => prev + (cell.isFlagged ? -1 : 1));
    }
    setBoard(newBoard);
  };

  return { board, clickCell, flagCell, gameState, remainingMines, resetGame };
};

