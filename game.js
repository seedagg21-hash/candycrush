import { LEVEL } from "./levels.js";
import { createBoard } from "./board.js";
import { candyImage, randomCandy } from "./candy.js";
import { findMatches } from "./matches.js";
import { damageNearbyLocks } from "./blocker.js";
import { getSpecialCreation, specialBlastCells } from "./specials.js";

export function createGame(root) {
  let currentLevel = 1;
  let gameEnded = false;

  let board = createBoard(LEVEL);
  let selected = null;
  let moves = LEVEL.moves;
  let score = 0;
  let busy = false;

  const collected = {};
  for (const key of Object.keys(LEVEL.goals)) {
    collected[key] = 0;
  }

  root.innerHTML = `
    <div class="game">
      <aside class="sidebar">
        <div class="panel">
          <div class="title">Hedefler</div>
          <div id="goals"></div>
        </div>

        <div class="panel">
          <div class="title">Hamle</div>
          <div id="moves" class="big"></div>
        </div>

        <div class="panel">
          <div class="title">Skor</div>
          <div id="score" class="big"></div>
        </div>
      </aside>

      <main>
        <div id="message"></div>
        <div id="board" class="board"></div>
      </main>

      <div id="modal" class="modal hidden">
        <div class="modal-card">
          <div id="modalTitle" class="modal-title"></div>
          <div id="modalText" class="modal-text"></div>
          <button id="modalButton" class="modal-button"></button>
        </div>
      </div>
    </div>
  `;

  const boardEl = root.querySelector("#board");
  const movesEl = root.querySelector("#moves");
  const scoreEl = root.querySelector("#score");
  const goalsEl = root.querySelector("#goals");

  const modalEl = root.querySelector("#modal");
  const modalTitleEl = root.querySelector("#modalTitle");
  const modalTextEl = root.querySelector("#modalText");
  const modalButtonEl = root.querySelector("#modalButton");

  render();

  function render() {
    boardEl.style.gridTemplateColumns = `repeat(${LEVEL.cols}, var(--cell-size))`;
    boardEl.innerHTML = "";

    for (let r = 0; r < LEVEL.rows; r++) {
      for (let c = 0; c < LEVEL.cols; c++) {
        const cell = board[r][c];
        const btn = document.createElement("button");

        btn.className = "cell";

        if (selected?.r === r && selected?.c === c) {
          btn.classList.add("selected");
        }

        if (cell.locked) {
          btn.classList.add("locked");
        }

        btn.innerHTML = `
          ${
            !cell.locked && (cell.candy || cell.special === "colorBomb")
              ? `<img class="candy" src="${candyImage(cell)}">`
              : ""
          }
          ${
            cell.locked
              ? `<img class="lock" src="/assets/blockers/licorice-lock.png">`
              : ""
          }
        `;

        btn.onclick = () => onCellClick(r, c);
        boardEl.appendChild(btn);
      }
    }

    movesEl.textContent = moves;
    scoreEl.textContent = score;

    goalsEl.innerHTML = Object.entries(LEVEL.goals)
      .map(([type, amount]) => `<div>${type}: ${collected[type]}/${amount}</div>`)
      .join("");

    checkEndGame();
  }

  async function onCellClick(r, c) {
    if (busy) return;
    if (gameEnded) return;
    if (moves <= 0) return;
    if (board[r][c].locked) return;

    if (!selected) {
      selected = { r, c };
      render();
      return;
    }

    const first = selected;
    selected = null;

    if (first.r === r && first.c === c) {
      render();
      return;
    }

    if (!isNeighbor(first, { r, c })) {
      selected = { r, c };
      render();
      return;
    }

    await trySwap(first, { r, c });
  }

  async function trySwap(a, b) {
    busy = true;

    const cellA = board[a.r][a.c];
    const cellB = board[b.r][b.c];

    await animateSwap(a, b);
    swap(a, b);
    render();

    if (cellA.special === "colorBomb" || cellB.special === "colorBomb") {
      moves--;

      const target =
        cellA.special === "colorBomb"
          ? board[a.r][a.c].candy
          : board[b.r][b.c].candy;

      if (target) {
        await clearColor(target);
      }

      board[a.r][a.c].candy = null;
      board[a.r][a.c].special = null;
      board[b.r][b.c].candy = null;
      board[b.r][b.c].special = null;

      await afterClear();

      busy = false;
      render();
      return;
    }

    const matches = findMatches(board);

    if (matches.length === 0) {
      await wait(120);
      await animateSwap(a, b);
      swap(a, b);

      busy = false;
      render();
      return;
    }

    moves--;
    await resolveBoard(b);

    busy = false;
    render();
  }

  async function resolveBoard(swappedCell = null) {
    let matches = findMatches(board);

    while (matches.length > 0) {
      const specialCreate = getSpecialCreation(matches, swappedCell);
      const clearSet = new Set();

      for (const group of matches) {
        for (const [r, c] of group.cells) {
          clearSet.add(`${r},${c}`);
        }
      }

      if (specialCreate) {
        clearSet.delete(`${specialCreate.r},${specialCreate.c}`);
      }

      let changed = true;

      while (changed) {
        changed = false;

        for (const key of [...clearSet]) {
          const [r, c] = key.split(",").map(Number);
          const cell = board[r][c];

          if (cell.special === "striped" || cell.special === "wrapped") {
            for (const [rr, cc] of specialBlastCells(board, r, c)) {
              const newKey = `${rr},${cc}`;

              if (!clearSet.has(newKey)) {
                clearSet.add(newKey);
                changed = true;
              }
            }
          }
        }
      }

      const clearedCells = [...clearSet].map((x) => x.split(",").map(Number));

      for (const [r, c] of clearedCells) {
        const cell = board[r][c];

        if (cell.locked) continue;

        if (cell.candy && collected[cell.candy] !== undefined) {
          collected[cell.candy]++;
        }

        cell.candy = null;
        cell.special = null;
      }

      if (specialCreate) {
        const cell = board[specialCreate.r][specialCreate.c];
        cell.special = specialCreate.special;

        if (specialCreate.special === "colorBomb") {
          cell.candy = "color";
        }
      }

      damageNearbyLocks(board, clearedCells);

      score += clearedCells.length * 60;

      render();
      await wait(300);

      dropCandies();

      render();
      await wait(300);

      matches = findMatches(board);
      swappedCell = null;
    }
  }

  async function clearColor(type) {
    const cells = [];

    for (let r = 0; r < LEVEL.rows; r++) {
      for (let c = 0; c < LEVEL.cols; c++) {
        if (!board[r][c].locked && board[r][c].candy === type) {
          cells.push([r, c]);
        }
      }
    }

    for (const [r, c] of cells) {
      if (collected[type] !== undefined) {
        collected[type]++;
      }

      board[r][c].candy = null;
      board[r][c].special = null;
    }

    score += cells.length * 100;

    damageNearbyLocks(board, cells);

    render();
    await wait(300);
  }

  async function afterClear() {
    render();

    await wait(300);

    dropCandies();

    render();

    await wait(300);

    await resolveBoard();
  }

  function dropCandies() {
    for (let c = 0; c < LEVEL.cols; c++) {
      for (let r = LEVEL.rows - 1; r >= 0; r--) {
        if (board[r][c].locked) continue;

        if (board[r][c].candy === null) {
          let source = r - 1;

          while (
            source >= 0 &&
            (board[source][c].locked || board[source][c].candy === null)
          ) {
            source--;
          }

          if (source >= 0) {
            board[r][c].candy = board[source][c].candy;
            board[r][c].special = board[source][c].special;

            board[source][c].candy = null;
            board[source][c].special = null;
          } else {
            board[r][c].candy = randomCandy();
            board[r][c].special = null;
          }
        }
      }
    }
  }

  function swap(a, b) {
    const temp = board[a.r][a.c];

    board[a.r][a.c] = board[b.r][b.c];
    board[b.r][b.c] = temp;
  }

  function isNeighbor(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  function isLevelComplete() {
    return Object.entries(LEVEL.goals).every(
      ([type, amount]) => collected[type] >= amount
    );
  }

  function checkEndGame() {
    if (gameEnded) return;

    if (isLevelComplete()) {
      gameEnded = true;

      showModal(
        "Kazandınız!",
        `Level ${currentLevel} tamamlandı.`,
        "Sonraki Level",
        nextLevel
      );

      return;
    }

    if (moves <= 0) {
      gameEnded = true;

      showModal(
        "Hamle Bitti!",
        "Hedef tamamlanamadı.",
        "Yeniden Başla",
        restartLevel
      );
    }
  }

  function showModal(title, text, buttonText, action) {
    modalTitleEl.textContent = title;
    modalTextEl.textContent = text;
    modalButtonEl.textContent = buttonText;

    modalButtonEl.onclick = action;

    modalEl.classList.remove("hidden");
  }

  function hideModal() {
    modalEl.classList.add("hidden");
  }

  function restartLevel() {
    hideModal();

    gameEnded = false;
    board = createBoard(LEVEL);
    moves = LEVEL.moves;
    score = 0;

    for (const key of Object.keys(collected)) {
      collected[key] = 0;
    }

    render();
  }

  function nextLevel() {
    hideModal();

    gameEnded = false;
    currentLevel++;

    LEVEL.moves = Math.max(18, 33 - currentLevel);

    LEVEL.goals.blue = 10 + currentLevel * 3;
    LEVEL.goals.red = 10 + currentLevel * 3;
    LEVEL.goals.yellow = 10 + currentLevel * 3;

    LEVEL.locks = generateLocks(currentLevel);

    board = createBoard(LEVEL);
    moves = LEVEL.moves;
    score = 0;

    for (const key of Object.keys(collected)) {
      collected[key] = 0;
    }

    render();
  }

  function generateLocks(level) {
    const locks = [];
    const count = Math.min(18, 6 + level * 2);

    while (locks.length < count) {
      const r = Math.floor(Math.random() * LEVEL.rows);
      const c = Math.floor(Math.random() * LEVEL.cols);

      if (r < 2) continue;

      const exists = locks.some(([lr, lc]) => lr === r && lc === c);

      if (!exists) {
        locks.push([r, c]);
      }
    }

    return locks;
  }

  async function animateSwap(a, b) {
    const indexA = a.r * LEVEL.cols + a.c;
    const indexB = b.r * LEVEL.cols + b.c;

    const cellA = boardEl.children[indexA];
    const cellB = boardEl.children[indexB];

    if (!cellA || !cellB) return;

    const rectA = cellA.getBoundingClientRect();
    const rectB = cellB.getBoundingClientRect();

    const dxA = rectB.left - rectA.left;
    const dyA = rectB.top - rectA.top;

    const dxB = rectA.left - rectB.left;
    const dyB = rectA.top - rectB.top;

    cellA.classList.add("swap-anim");
    cellB.classList.add("swap-anim");

    cellA.style.transform = `translate(${dxA}px, ${dyA}px)`;
    cellB.style.transform = `translate(${dxB}px, ${dyB}px)`;

    await wait(230);

    cellA.style.transform = "";
    cellB.style.transform = "";

    cellA.classList.remove("swap-anim");
    cellB.classList.remove("swap-anim");
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}