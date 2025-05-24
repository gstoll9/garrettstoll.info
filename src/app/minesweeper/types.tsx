// types/types.ts
export type CellType = {
    x: number;
    y: number;
    hasMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    adjacentMines: number;
    mineProbability?: number; // Optional property for mine probability
  };
  
  export type GameState = "starting" | "playing" | "won" | "lost";