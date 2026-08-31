import { DIFFICULTIES } from "./constants";
import type { Difficulty } from "./types";

export function duelSafeCell(difficulty: Difficulty): { x: number; y: number } {
  const { width, height } = DIFFICULTIES[difficulty];
  return {
    x: Math.floor(width / 2),
    y: Math.floor(height / 2),
  };
}
