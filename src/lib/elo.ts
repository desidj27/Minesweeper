const K = 32;

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

export function applyElo(
  ratingA: number,
  ratingB: number,
  scoreA: number
): { newA: number; newB: number; deltaA: number; deltaB: number } {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = 1 - expectedA;
  const scoreB = 1 - scoreA;

  const deltaA = Math.round(K * (scoreA - expectedA));
  const deltaB = Math.round(K * (scoreB - expectedB));

  return {
    newA: ratingA + deltaA,
    newB: ratingB + deltaB,
    deltaA,
    deltaB,
  };
}

export const DEFAULT_ELO = 1000;
