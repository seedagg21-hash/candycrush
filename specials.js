export function getSpecialCreation(matches, swappedCell) {
  const wrapped = findWrapped(matches, swappedCell);

  if (wrapped) return wrapped;

  for (const group of matches) {
    if (group.length >= 5) {
      return {
        r: swappedCell?.r ?? group.cells[2][0],
        c: swappedCell?.c ?? group.cells[2][1],
        special: "colorBomb"
      };
    }

    if (group.length === 4) {
      return {
        r: swappedCell?.r ?? group.cells[1][0],
        c: swappedCell?.c ?? group.cells[1][1],
        special: "striped"
      };
    }
  }

  return null;
}

function findWrapped(matches, swappedCell) {
  for (const a of matches) {
    for (const b of matches) {
      if (a === b) continue;
      if (a.dir === b.dir) continue;

      for (const [ar, ac] of a.cells) {
        for (const [br, bc] of b.cells) {
          if (ar === br && ac === bc) {
            return {
              r: swappedCell?.r ?? ar,
              c: swappedCell?.c ?? ac,
              special: "wrapped"
            };
          }
        }
      }
    }
  }

  return null;
}

export function specialBlastCells(board, r, c) {
  const cell = board[r][c];
  const rows = board.length;
  const cols = board[0].length;
  const cells = [];

  if (cell.special === "striped") {
    for (let cc = 0; cc < cols; cc++) cells.push([r, cc]);
    for (let rr = 0; rr < rows; rr++) cells.push([rr, c]);
  }

  if (cell.special === "wrapped") {
    for (let rr = r - 1; rr <= r + 1; rr++) {
      for (let cc = c - 1; cc <= c + 1; cc++) {
        if (board[rr]?.[cc]) cells.push([rr, cc]);
      }
    }
  }

  return cells;
}

