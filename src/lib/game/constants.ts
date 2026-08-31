import type { Difficulty, DifficultyConfig } from "./types";

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    width: 9,
    height: 9,
    mines: 10,
    min3bv: 5,
    label: "Beginner",
  },
  intermediate: {
    width: 16,
    height: 16,
    mines: 40,
    min3bv: 30,
    label: "Intermediate",
  },
  expert: {
    width: 30,
    height: 16,
    mines: 99,
    min3bv: 100,
    label: "Expert",
  },
};

export function currentSeasonId(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}
