import type { CellState } from "./types";

function index(width: number, x: number, y: number): number {
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

export function calculate3BV(cells: CellState[], width: number, height: number): number {
  const size = width * height;
  const isNumber: boolean[] = new Array(size).fill(false);
  const isZero: boolean[] = new Array(size).fill(false);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = index(width, x, y);
      const cell = cells[i];
      if (cell.isMine) continue;
      if (cell.adjacentMines > 0) {
        isNumber[i] = true;
      } else {
        isZero[i] = true;
      }
    }
  }

  let count = 0;
  const visited = new Uint8Array(size);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = index(width, x, y);
      if (!isNumber[i] || visited[i]) continue;

      let touchesZero = false;
      for (const [nx, ny] of neighbors(width, height, x, y)) {
        if (isZero[index(width, nx, ny)]) {
          touchesZero = true;
          break;
        }
      }
      if (!touchesZero) {
        count++;
        visited[i] = 1;
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = index(width, x, y);
      if (!isZero[i] || visited[i]) continue;

      count++;
      const stack: [number, number][] = [[x, y]];
      visited[i] = 1;

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        for (const [nx, ny] of neighbors(width, height, cx, cy)) {
          const ni = index(width, nx, ny);
          if (visited[ni]) continue;
          if (isZero[ni]) {
            visited[ni] = 1;
            stack.push([nx, ny]);
          } else if (isNumber[ni]) {
            visited[ni] = 1;
          }
        }
      }
    }
  }

  return count;
}
