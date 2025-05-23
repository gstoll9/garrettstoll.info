// types/types.ts
export type Cell = {
    x: number;
    y: number;
    hasMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    adjacentMines: number;
    mineProbability?: number; // Optional property for mine probability
  };
  
  export type GameState = "playing" | "won" | "lost";