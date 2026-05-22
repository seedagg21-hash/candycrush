export function findMatches(board) {
  const groups = [];
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r++) {
    let start = 0;

    for (let c = 1; c <= cols; c++) {
      const prev = board[r][c - 1];
      const cur = board[r][c];

      if (
        cur &&
        prev &&
        !cur.locked &&
        !prev.locked &&
        cur.candy &&
        prev.candy &&
        cur.special !== "colorBomb" &&
        prev.special !== "colorBomb" &&
        cur.candy === prev.candy
      ) {
        continue;
      }

      const length = c - start;

      if (length >= 3) {
        groups.push({
          dir: "horizontal",
          cells: Array.from({ length }, (_, i) => [r, start + i]),
          length
        });
      }

      start = c;
    }
  }

  for (let c = 0; c < cols; c++) {
    let start = 0;

    for (let r = 1; r <= rows; r++) {
      const prev = board[r - 1]?.[c];
      const cur = board[r]?.[c];

      if (
        cur &&
        prev &&
        !cur.locked &&
        !prev.locked &&
        cur.candy &&
        prev.candy &&
        cur.special !== "colorBomb" &&
        prev.special !== "colorBomb" &&
        cur.candy === prev.candy
      ) {
        continue;
      }

      const length = r - start;

      if (length >= 3) {
        groups.push({
          dir: "vertical",
          cells: Array.from({ length }, (_, i) => [start + i, c]),
          length
        });
      }

      start = r;
    }
  }

  return groups;
}