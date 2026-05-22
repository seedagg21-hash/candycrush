import { randomCandy } from "./candy.js";
import { findMatches } from "./matches.js";

export function createBoard(level) {
  const board = [];

  for (let r = 0; r < level.rows; r++) {
    const row = [];

    for (let c = 0; c < level.cols; c++) {
      row.push({
        candy: randomCandy(),
        special: null,
        locked: false
      });
    }

    board.push(row);
  }

  for (const [r, c] of level.locks) {
    if (board[r]?.[c]) {
      board[r][c].locked = true;
      board[r][c].candy = null;
      board[r][c].special = null;
    }
  }

  while (findMatches(board).length > 0) {
    for (let r = 0; r < level.rows; r++) {
      for (let c = 0; c < level.cols; c++) {
        if (!board[r][c].locked) {
          board[r][c].candy = randomCandy();
          board[r][c].special = null;
        }
      }
    }
  }

  return board;
}