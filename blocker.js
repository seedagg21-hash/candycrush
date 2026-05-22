import { randomCandy } from "./candy.js";

export function damageNearbyLocks(board, clearedCells) {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ];

  for (const [r, c] of clearedCells) {
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;

      if (board[nr]?.[nc]?.locked) {
        board[nr][nc].locked = false;
        board[nr][nc].candy = randomCandy();
        board[nr][nc].special = null;
      }
    }
  }
}