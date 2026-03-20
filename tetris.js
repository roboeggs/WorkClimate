const TETRIS_COLS = 8;
const TETRIS_ROWS = 16;
const TETRIS_LED_SIZE = 21;
const TETRIS_GAP = 2;
const TETRIS_PADDING = 8;
const TETRIS_START_DROP_MS = 620;
const TETRIS_MIN_DROP_MS = 130;
const TETRIS_DOWN_HOLD_MS = 180;

const tetrisCanvas = document.getElementById("tetrisMatrix");
const tetrisCtx = tetrisCanvas.getContext("2d");
const tetrisScoreLabel = document.getElementById("tetrisScore");
const tetrisStateLabel = document.getElementById("tetrisState");
const tetrisLinesLabel = document.getElementById("tetrisLines");
const tetrisLevelLabel = document.getElementById("tetrisLevel");
const tetrisRestartBtn = document.getElementById("tetrisRestartBtn");
const tetrisPauseBtn = document.getElementById("tetrisPauseBtn");

const tetrisCellStep = TETRIS_LED_SIZE + TETRIS_GAP;
tetrisCanvas.width = TETRIS_PADDING * 2 + TETRIS_COLS * TETRIS_LED_SIZE + (TETRIS_COLS - 1) * TETRIS_GAP;
tetrisCanvas.height = TETRIS_PADDING * 2 + TETRIS_ROWS * TETRIS_LED_SIZE + (TETRIS_ROWS - 1) * TETRIS_GAP;

const TETROMINOES = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1]
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1]
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0]
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1]
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1]
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1]
  ]
};

const TETROMINO_KEYS = Object.keys(TETROMINOES);

let tetrisBoard;
let tetrisCurrent;
let tetrisScore;
let tetrisLines;
let tetrisLevel;
let tetrisDropMs;
let tetrisDropTimerId;
let tetrisIsPaused;
let tetrisIsGameOver;
let tetrisSoftDrop;
let tetrisDownPressed;
let tetrisDownHoldTimerId;

function tetrisStartGame() {
  clearInterval(tetrisDropTimerId);
  clearTimeout(tetrisDownHoldTimerId);
  tetrisBoard = Array.from({ length: TETRIS_ROWS }, () => Array(TETRIS_COLS).fill(0));
  tetrisScore = 0;
  tetrisLines = 0;
  tetrisLevel = 1;
  tetrisDropMs = TETRIS_START_DROP_MS;
  tetrisIsPaused = false;
  tetrisIsGameOver = false;
  tetrisSoftDrop = false;
  tetrisDownPressed = false;

  tetrisCurrent = tetrisCreatePiece();
  if (!tetrisCanPlace(tetrisCurrent.shape, tetrisCurrent.row, tetrisCurrent.col)) {
    tetrisIsGameOver = true;
  }

  tetrisUpdateHud();
  tetrisRestartLoop();
  tetrisDraw();
}

function tetrisRestartLoop() {
  clearInterval(tetrisDropTimerId);
  if (tetrisIsGameOver) {
    return;
  }
  const speed = tetrisSoftDrop ? Math.max(45, Math.floor(tetrisDropMs * 0.2)) : tetrisDropMs;
  tetrisDropTimerId = setInterval(tetrisStep, speed);
}

function tetrisCreatePiece() {
  const type = TETROMINO_KEYS[Math.floor(Math.random() * TETROMINO_KEYS.length)];
  const shape = TETROMINOES[type].map((line) => [...line]);
  const col = Math.floor((TETRIS_COLS - shape[0].length) / 2);
  return { type, shape, row: 0, col };
}

function tetrisRotate(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const result = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      result[x][rows - 1 - y] = shape[y][x];
    }
  }
  return result;
}

function tetrisCanPlace(shape, row, col) {
  for (let y = 0; y < shape.length; y += 1) {
    for (let x = 0; x < shape[y].length; x += 1) {
      if (!shape[y][x]) {
        continue;
      }

      const boardX = col + x;
      const boardY = row + y;

      if (boardX < 0 || boardX >= TETRIS_COLS || boardY < 0 || boardY >= TETRIS_ROWS) {
        return false;
      }

      if (tetrisBoard[boardY][boardX]) {
        return false;
      }
    }
  }

  return true;
}

function tetrisMergeCurrent() {
  for (let y = 0; y < tetrisCurrent.shape.length; y += 1) {
    for (let x = 0; x < tetrisCurrent.shape[y].length; x += 1) {
      if (!tetrisCurrent.shape[y][x]) {
        continue;
      }
      const boardX = tetrisCurrent.col + x;
      const boardY = tetrisCurrent.row + y;
      if (boardY >= 0 && boardY < TETRIS_ROWS) {
        tetrisBoard[boardY][boardX] = 1;
      }
    }
  }
}

function tetrisClearLines() {
  let cleared = 0;
  for (let y = TETRIS_ROWS - 1; y >= 0; y -= 1) {
    if (tetrisBoard[y].every((value) => value === 1)) {
      tetrisBoard.splice(y, 1);
      tetrisBoard.unshift(Array(TETRIS_COLS).fill(0));
      cleared += 1;
      y += 1;
    }
  }

  if (!cleared) {
    return;
  }

  const pointsByLines = [0, 120, 320, 520, 900];
  tetrisScore += pointsByLines[cleared] * tetrisLevel;
  tetrisLines += cleared;

  const nextLevel = Math.floor(tetrisLines / 10) + 1;
  if (nextLevel !== tetrisLevel) {
    tetrisLevel = nextLevel;
    tetrisDropMs = Math.max(TETRIS_MIN_DROP_MS, TETRIS_START_DROP_MS - (tetrisLevel - 1) * 40);
    tetrisRestartLoop();
  }
}

function tetrisLockAndSpawn() {
  tetrisMergeCurrent();
  tetrisClearLines();
  tetrisCurrent = tetrisCreatePiece();

  if (!tetrisCanPlace(tetrisCurrent.shape, tetrisCurrent.row, tetrisCurrent.col)) {
    tetrisIsGameOver = true;
    clearInterval(tetrisDropTimerId);
  }

  tetrisUpdateHud();
  tetrisDraw();
}

function tetrisStep() {
  if (tetrisIsPaused || tetrisIsGameOver) {
    return;
  }

  const nextRow = tetrisCurrent.row + 1;
  if (tetrisCanPlace(tetrisCurrent.shape, nextRow, tetrisCurrent.col)) {
    tetrisCurrent.row = nextRow;
  } else {
    tetrisLockAndSpawn();
  }

  tetrisDraw();
}

function tetrisMove(dx) {
  if (tetrisIsPaused || tetrisIsGameOver) {
    return;
  }

  const nextCol = tetrisCurrent.col + dx;
  if (tetrisCanPlace(tetrisCurrent.shape, tetrisCurrent.row, nextCol)) {
    tetrisCurrent.col = nextCol;
    tetrisDraw();
  }
}

function tetrisRotateCurrent() {
  if (tetrisIsPaused || tetrisIsGameOver) {
    return;
  }

  const rotated = tetrisRotate(tetrisCurrent.shape);
  const offsets = [0, -1, 1, -2, 2];
  for (const offset of offsets) {
    if (tetrisCanPlace(rotated, tetrisCurrent.row, tetrisCurrent.col + offset)) {
      tetrisCurrent.shape = rotated;
      tetrisCurrent.col += offset;
      tetrisDraw();
      return;
    }
  }
}

function tetrisHardDrop() {
  if (tetrisIsPaused || tetrisIsGameOver) {
    return;
  }

  while (tetrisCanPlace(tetrisCurrent.shape, tetrisCurrent.row + 1, tetrisCurrent.col)) {
    tetrisCurrent.row += 1;
  }
  tetrisLockAndSpawn();
}

function tetrisTogglePause() {
  if (tetrisIsGameOver) {
    return;
  }

  tetrisIsPaused = !tetrisIsPaused;
  tetrisUpdateHud();
}

function tetrisUpdateHud() {
  tetrisScoreLabel.textContent = `Очки: ${tetrisScore}`;
  tetrisLinesLabel.textContent = `Линии: ${tetrisLines}`;
  tetrisLevelLabel.textContent = `Уровень: ${tetrisLevel}`;

  if (tetrisIsGameOver) {
    tetrisStateLabel.textContent = "Конец игры";
  } else if (tetrisIsPaused) {
    tetrisStateLabel.textContent = "Пауза";
  } else {
    tetrisStateLabel.textContent = "Игра";
  }

  tetrisPauseBtn.textContent = tetrisIsPaused ? "Продолжить" : "Пауза";
}

function tetrisDrawLed(x, y, on) {
  const centerX = TETRIS_PADDING + x * tetrisCellStep + TETRIS_LED_SIZE / 2;
  const centerY = TETRIS_PADDING + y * tetrisCellStep + TETRIS_LED_SIZE / 2;
  const radius = TETRIS_LED_SIZE / 2;

  tetrisCtx.fillStyle = on ? "#ff2d2d" : "#d9d9d9";
  tetrisCtx.beginPath();
  tetrisCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  tetrisCtx.fill();
}

function tetrisDraw() {
  tetrisCtx.fillStyle = "#000";
  tetrisCtx.fillRect(0, 0, tetrisCanvas.width, tetrisCanvas.height);

  for (let y = 0; y < TETRIS_ROWS; y += 1) {
    for (let x = 0; x < TETRIS_COLS; x += 1) {
      tetrisDrawLed(x, y, tetrisBoard[y][x] === 1);
    }
  }

  if (!tetrisCurrent) {
    return;
  }

  for (let y = 0; y < tetrisCurrent.shape.length; y += 1) {
    for (let x = 0; x < tetrisCurrent.shape[y].length; x += 1) {
      if (!tetrisCurrent.shape[y][x]) {
        continue;
      }
      const boardX = tetrisCurrent.col + x;
      const boardY = tetrisCurrent.row + y;
      if (boardY >= 0 && boardY < TETRIS_ROWS && boardX >= 0 && boardX < TETRIS_COLS) {
        tetrisDrawLed(boardX, boardY, true);
      }
    }
  }
}

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (key === "ArrowLeft") {
    event.preventDefault();
    tetrisMove(-1);
    return;
  }

  if (key === "ArrowRight") {
    event.preventDefault();
    tetrisMove(1);
    return;
  }

  if (key === "ArrowDown") {
    event.preventDefault();
    if (!tetrisDownPressed) {
      tetrisDownPressed = true;
      clearTimeout(tetrisDownHoldTimerId);
      tetrisDownHoldTimerId = setTimeout(() => {
        if (tetrisDownPressed && !tetrisIsPaused && !tetrisIsGameOver) {
          tetrisSoftDrop = true;
          tetrisRestartLoop();
        }
      }, TETRIS_DOWN_HOLD_MS);
    }
    return;
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === "ArrowDown") {
    clearTimeout(tetrisDownHoldTimerId);
    if (!tetrisDownPressed) {
      return;
    }

    const wasSoftDrop = tetrisSoftDrop;
    tetrisDownPressed = false;

    if (wasSoftDrop) {
      tetrisSoftDrop = false;
      tetrisRestartLoop();
    } else {
      tetrisRotateCurrent();
    }
  }
});

window.addEventListener("blur", () => {
  clearTimeout(tetrisDownHoldTimerId);
  tetrisDownPressed = false;
  if (tetrisSoftDrop) {
    tetrisSoftDrop = false;
    tetrisRestartLoop();
  }
});

tetrisRestartBtn.addEventListener("click", () => {
  tetrisStartGame();
});

tetrisPauseBtn.addEventListener("click", () => {
  tetrisTogglePause();
});

tetrisStartGame();
