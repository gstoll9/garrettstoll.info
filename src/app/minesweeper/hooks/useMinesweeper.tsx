"use client"
// hooks/useMinesweeper.ts
import { useState, useEffect } from "react";
import type { CellType, GameState } from "../types";

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
  const [flagging, setFlagging] = useState(false);
  const [remainingMines, setRemainingMines] = useState(mines);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const toggleFlagging = () => {
    setFlagging((prev) => !prev);
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState === "playing" && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState, startTime]);

  const resetGame = () => {
    setBoard(generateBoard(rows, cols, mines));
    setGameState("starting");
    setRemainingMines(mines);
    // Reset clock state
    setStartTime(null);
    setElapsedTime(0);
  };

  // click a number with all its flags to reveal the rest
  function chordCell(x: number, y: number, newBoard: CellType[][]) {
    const cell = newBoard[y][x];
    if (!cell.isRevealed || cell.adjacentMines === 0) return;

    const neighbors = getNeighbors(board, x, y);
    const flagged = neighbors.filter(n => n.isFlagged);
    const covered = neighbors.filter(n => !n.isRevealed && !n.isFlagged);

    if (flagged.length === cell.adjacentMines) {
      // Safe to reveal the rest
      for (const neighbor of covered) {
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

    setStartTime(Date.now());
    
    const cell = newBoard[y][x];

    function moveMine(x: number, y: number, newBoard: CellType[][], exclude: CellType[] = []) {

      console.log("Moving mine at", x, y);
      const oldNeighbors = getNeighbors(newBoard, x, y);
      const adjacentMines = oldNeighbors.filter(n => n.hasMine).length;

      let newMinePlaced = false;
      while (!newMinePlaced) {
        
        // random new spot
        const newX = Math.floor(Math.random() * cols);
        const newY = Math.floor(Math.random() * rows);
        
        // make sure there's not a mine there and it's not in the excluded cells
        if (
          newBoard[newY][newX].hasMine ||
          exclude.some(cell => cell.x === newX && cell.y === newY)
        ) continue;

        console.log("New mine at", newX, newY);
        // swap mines
        newBoard[newY][newX].hasMine = true;
        newBoard[y][x].hasMine = false;

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

        // update the cell that had the mine moved
        newBoard[y][x].adjacentMines = adjacentMines;

        // complete
        newMinePlaced = true;
      }
    }
      
      // move mine to a different cell
      if (cell.hasMine && (rows * cols != mines)) {
        moveMine(x, y, newBoard);
      }

      // move any neighbor mines
      if (cell.adjacentMines > 0 && cell.adjacentMines < (rows * cols) - mines - 9) {
        const startingNeighbors = getNeighbors(newBoard, x, y);
        // move adjacent mines
        startingNeighbors.forEach(neighbor => {
          if (neighbor.hasMine) {
            moveMine(neighbor.x, neighbor.y, newBoard, [cell, ...startingNeighbors]);
          }
        });
        newBoard[y][x].adjacentMines = 0;
      }
  }

  // calculate new mine probabilities
  const newMineProbabilities = (newBoard: CellType[][]) => {
    
    // let subsets: [CellType[], number][] = [];
    // let coveredCells: CellType[] = [];
    // // get all subsets and covered cells
    // newBoard.forEach(row => {
    //   row.forEach(cell => {
        
    //     if (!cell.isRevealed && !cell.isFlagged) coveredCells.push(cell);

    //     // use the revealed numbers to find subsets
    //     if (cell.isRevealed && cell.adjacentMines > 0) {
    //       const neighbors = getNeighbors(board, cell.x, cell.y);
    //       let covered = neighbors.filter(n => !n.isRevealed && !n.isFlagged);

    //       // there are cells to reveal, add to subsets
    //       if (covered.length != 0) {
    //         const flagged = neighbors.filter(n => n.isFlagged);
    //         let unfoundMines = cell.adjacentMines - flagged.length;
    //         subsets.push([covered, unfoundMines]);           
    //       }
    //     }
    //   })
    // });

    // // find overlapping subsets
    // let subsetGroups: [CellType[], number][][] = [];
    // // mark ones we've found
    // let processedIndices = new Set<number>();

    // for (let i = 0; i < subsets.length; i++) {
    //   if (processedIndices.has(i)) continue;
    //   if (i < subsets.length - 1) {
    //     // upper triangle search
    //     for (let j = i + 1; j < subsets.length; j++) {
    //       if (processedIndices.has(j)) continue;
          
    //       const subset1 = subsets[i];
    //       const subset2 = subsets[j];
          
    //       if (
    //         subset1[0].some(cell1 =>
    //           subset2[0].some(cell2 => cell1.x === cell2.x && cell1.y === cell2.y)
    //         )
    //       ) {
    //         // Find all subsets that overlap with either subset1 or subset2
    //         const group = [subset1, subset2];
    //         const groupIndices = [i, j];
            
    //         if (j < subsets.length - 1) {
    //           for (let k = j + 1; k < subsets.length; k++) {
    //             if (processedIndices.has(k)) continue;
                
    //             const subset = subsets[k];
    //             if (
    //               subset[0].some(cell1 =>
    //                 subset1[0].some(cell2 => cell1.x === cell2.x && cell1.y === cell2.y)
    //               ) ||
    //               subset[0].some(cell1 =>
    //                 subset2[0].some(cell2 => cell1.x === cell2.x && cell1.y === cell2.y)
    //               )
    //             ) {
    //               group.push(subset);
    //               groupIndices.push(k);
    //             }
    //           }
    //         }
            
    //         subsetGroups.push(group);
    //         groupIndices.forEach(index => processedIndices.add(index));
    //       }
    //     }
    //   } else {
    //     subsetGroups.push([subsets[i]]);
    //   }
    // }

    // subsetGroups.forEach(group => {
    //   const cells = group.reduce((acc, subset) => acc.concat(subset[0]), []);
    //   const totalCells = cells.length;
      

    //   // find all the possible states of the mines
    //   group.forEach(subset => {

    //   });
    // });


    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = newBoard[y][x];
        if (cell.isRevealed && cell.adjacentMines > 0) {
          const neighbors = getNeighbors(newBoard, x, y);
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

    if (flagging) {
      // Place or remove a flag
      if (!cell.isRevealed) {
        cell.isFlagged = !cell.isFlagged;
        setRemainingMines((prev) => prev + (cell.isFlagged ? -1 : 1));
      }
    } else {
      if (gameState == "starting") firstClick(x, y, newBoard);
      if (gameState !== "starting" && gameState !== "playing") return;
      
      if (cell.isRevealed && cell.adjacentMines > 0) {
        chordCell(x, y, newBoard);
      } else {
        revealCell(x, y, newBoard);
      }
    }

    newMineProbabilities(newBoard);
    setBoard(newBoard);
    if (gameState === "starting") setGameState("playing");
  };

  const rightClickCell = (x: number, y: number) => {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = board[y][x];

    if (!flagging) {
      // Place or remove a flag
      if (!cell.isRevealed) {
        cell.isFlagged = !cell.isFlagged;
        setRemainingMines((prev) => prev + (cell.isFlagged ? -1 : 1));
      }
    } else {
      if (gameState == "starting") firstClick(x, y, newBoard);
      if (gameState !== "starting" && gameState !== "playing") return;
      
      if (cell.isRevealed && cell.adjacentMines > 0) {
        chordCell(x, y, newBoard);
      } else {
        revealCell(x, y, newBoard);
      }
    }

    newMineProbabilities(newBoard);
    setBoard(newBoard);
    if (gameState === "starting") setGameState("playing");
  };

  return { 
    board,
    clickCell,
    rightClickCell,
    gameState, 
    remainingMines, 
    resetGame, 
    elapsedTime,
    flagging,
    toggleFlagging,
  };
};

