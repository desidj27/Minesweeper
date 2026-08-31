export type Difficulty = "beginner" | "intermediate" | "expert";

export type GameMode = "standard" | "no_guess";

export type GameStatus = "playing" | "won" | "lost";

export type MoveAction = "reveal" | "flag" | "chord";

export interface Move {
  x: number;
  y: number;
  action: MoveAction;
  timestamp: number;
}

export interface DifficultyConfig {
  width: number;
  height: number;
  mines: number;
  min3bv: number;
  label: string;
}

export interface CellState {
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
  isMine: boolean;
}

export interface ClientCell {
  revealed: boolean;
  flagged: boolean;
  adjacentMines: number;
  isMine?: boolean;
}

export interface GameSnapshot {
  width: number;
  height: number;
  mineCount: number;
  cells: ClientCell[][];
  status: GameStatus;
  flagsPlaced: number;
  firstClickDone: boolean;
}
