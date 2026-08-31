import { calculate3BV } from "./3bv";
import { createRng, shuffle } from "./rng";
import type {
  CellState,
  ClientCell,
  Difficulty,
  GameSnapshot,
  GameStatus,
  Move,
  MoveAction,
} from "./types";
import { DIFFICULTIES } from "./constants";

function idx(width: number, x: number, y: number): number {
  return y * width + x;
}

function neighbors(width: number, height: number, x: number, y: number): [number, number][] {
  const result: [number, number][] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        result.push([nx, ny]);
      }
    }
  }
  return result;
}

export class GameBoard {
  readonly width: number;
  readonly height: number;
  readonly mineCount: number;
  readonly cells: CellState[];
  status: GameStatus = "playing";
  flagsPlaced = 0;
  revealedCount = 0;
  firstClickDone = false;
  private readonly totalSafe: number;

  constructor(
    width: number,
    height: number,
    mineCount: number,
    cells: CellState[]
  ) {
    this.width = width;
    this.height = height;
    this.mineCount = mineCount;
    this.cells = cells;
    this.totalSafe = width * height - mineCount;
  }

  static createEmpty(difficulty: Difficulty): GameBoard {
    const config = DIFFICULTIES[difficulty];
    const size = config.width * config.height;
    const cells: CellState[] = Array.from({ length: size }, () => ({
      revealed: false,
      flagged: false,
      adjacentMines: 0,
      isMine: false,
    }));
    return new GameBoard(config.width, config.height, config.mines, cells);
  }

  /** Same mine layout for all players; cells stay hidden until they click. */
  static layoutFromSeed(
    seed: string,
    difficulty: Difficulty,
    safeX: number,
    safeY: number
  ): GameBoard {
    const config = DIFFICULTIES[difficulty];
    const { width, height, mines } = config;
    const random = createRng(`${seed}:${safeX},${safeY}`);

    const forbidden = new Set<number>();
    forbidden.add(idx(width, safeX, safeY));
    for (const [nx, ny] of neighbors(width, height, safeX, safeY)) {
      forbidden.add(idx(width, nx, ny));
    }

    const candidates: number[] = [];
    for (let i = 0; i < width * height; i++) {
      if (!forbidden.has(i)) candidates.push(i);
    }

    const mineIndices = new Set(shuffle(candidates, random).slice(0, mines));

    const cells: CellState[] = Array.from({ length: width * height }, (_, i) => ({
      revealed: false,
      flagged: false,
      adjacentMines: 0,
      isMine: mineIndices.has(i),
    }));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = idx(width, x, y);
        if (cells[i].isMine) continue;
        let count = 0;
        for (const [nx, ny] of neighbors(width, height, x, y)) {
          if (cells[idx(width, nx, ny)].isMine) count++;
        }
        cells[i].adjacentMines = count;
      }
    }

    const board = new GameBoard(width, height, mines, cells);
    board.firstClickDone = true;
    return board;
  }

  static fromSeed(seed: string, difficulty: Difficulty, safeX: number, safeY: number): GameBoard {
    const board = GameBoard.layoutFromSeed(seed, difficulty, safeX, safeY);
    board.reveal(safeX, safeY);
    return board;
  }

  get3bv(): number {
    return calculate3BV(this.cells, this.width, this.height);
  }

  applyMove(move: Move): boolean {
    if (this.status !== "playing") return false;

    const { x, y, action } = move;
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;

    switch (action) {
      case "reveal":
        return this.reveal(x, y);
      case "flag":
        return this.toggleFlag(x, y);
      case "chord":
        return this.chord(x, y);
      default:
        return false;
    }
  }

  reveal(x: number, y: number): boolean {
    const i = idx(this.width, x, y);
    const cell = this.cells[i];
    if (cell.revealed || cell.flagged) return false;

    if (cell.isMine) {
      cell.revealed = true;
      this.status = "lost";
      return true;
    }

    this.floodReveal(x, y);
    if (this.revealedCount === this.totalSafe) {
      this.status = "won";
    }
    return true;
  }

  private floodReveal(x: number, y: number): void {
    const stack: [number, number][] = [[x, y]];
    const seen = new Set<number>();

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const i = idx(this.width, cx, cy);
      if (seen.has(i)) continue;
      seen.add(i);

      const cell = this.cells[i];
      if (cell.flagged || cell.revealed) continue;

      cell.revealed = true;
      this.revealedCount++;

      if (cell.adjacentMines === 0) {
        for (const [nx, ny] of neighbors(this.width, this.height, cx, cy)) {
          stack.push([nx, ny]);
        }
      }
    }
  }

  toggleFlag(x: number, y: number): boolean {
    const cell = this.cells[idx(this.width, x, y)];
    if (cell.revealed) return false;

    if (cell.flagged) {
      cell.flagged = false;
      this.flagsPlaced--;
    } else {
      cell.flagged = true;
      this.flagsPlaced++;
    }
    return true;
  }

  chord(x: number, y: number): boolean {
    const i = idx(this.width, x, y);
    const cell = this.cells[i];
    if (!cell.revealed || cell.adjacentMines === 0) return false;

    const adj = neighbors(this.width, this.height, x, y);
    const flaggedNeighbors = adj.filter(([nx, ny]) =>
      this.cells[idx(this.width, nx, ny)].flagged
    ).length;

    if (flaggedNeighbors !== cell.adjacentMines) return false;

    let changed = false;
    for (const [nx, ny] of adj) {
      const n = this.cells[idx(this.width, nx, ny)];
      if (!n.revealed && !n.flagged) {
        if (this.reveal(nx, ny)) changed = true;
      }
    }
    return changed;
  }

  toClientSnapshot(revealMines = false): GameSnapshot {
    const rows: ClientCell[][] = [];
    for (let y = 0; y < this.height; y++) {
      const row: ClientCell[] = [];
      for (let x = 0; x < this.width; x++) {
        const cell = this.cells[idx(this.width, x, y)];
        const showMine = revealMines && cell.isMine;
        row.push({
          revealed: cell.revealed || showMine,
          flagged: cell.flagged,
          adjacentMines:
            cell.revealed || showMine ? cell.adjacentMines : 0,
          isMine: revealMines && cell.isMine ? true : undefined,
        });
      }
      rows.push(row);
    }

    return {
      width: this.width,
      height: this.height,
      mineCount: this.mineCount,
      cells: rows,
      status: this.status,
      flagsPlaced: this.flagsPlaced,
      firstClickDone: this.firstClickDone,
    };
  }
}

export function replayMoves(
  seed: string,
  difficulty: Difficulty,
  moves: Move[]
): { board: GameBoard; valid: boolean } {
  const firstIdx = moves.findIndex((m) => m.action === "reveal");
  if (firstIdx === -1) {
    return { board: GameBoard.createEmpty(difficulty), valid: false };
  }

  const first = moves[firstIdx];
  const seeded = GameBoard.fromSeed(seed, difficulty, first.x, first.y);

  for (let i = 0; i < moves.length; i++) {
    if (i === firstIdx) continue;
    seeded.applyMove(moves[i]);
  }

  return { board: seeded, valid: true };
}

export function validateMoves(moves: Move[]): boolean {
  if (moves.length === 0) return false;
  const first = moves.find((m) => m.action === "reveal");
  if (!first) return false;

  let prev = 0;
  for (const move of moves) {
    if (move.timestamp < prev) return false;
    prev = move.timestamp;
  }
  return true;
}
