const COLS = 16;
const ROWS = 8;
const LED_SIZE = 36;
const GAP = 4;
const PADDING = 10;
const START_TICK_MS = 260;
const MIN_TICK_MS = 145;
const SPEED_STEP_MS = 4;
const SPEED_UP_EVERY_FOOD = 2;
const BOOST_FACTOR = 0.65;
const MIN_BOOST_TICK_MS = 95;
const GAME_OVER_PAUSE_MS = 160;
const FOOD_BLINK_PATTERN = [
  { on: true, duration: 220 },
  { on: false, duration: 90 },
  { on: true, duration: 90 },
  { on: false, duration: 90 },
  { on: true, duration: 90 },
  { on: false, duration: 460 },
  { on: true, duration: 360 },
  { on: false, duration: 420 }
];

const canvas = document.getElementById("matrix");
const ctx = canvas.getContext("2d");
const scoreLabel = document.getElementById("score");
const stateLabel = document.getElementById("state");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const autoBtn = document.getElementById("autoBtn");

const cellStep = LED_SIZE + GAP;
canvas.width = PADDING * 2 + COLS * LED_SIZE + (COLS - 1) * GAP;
canvas.height = PADDING * 2 + ROWS * LED_SIZE + (ROWS - 1) * GAP;

const CARDINAL_DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];

let snake;
let dir;
let nextDir;
let food;
let score;
let isPaused;
let isGameOver;
let tickMs;
let timerId;
let autoMode;
let boostMode;
let foodBlinkOn;
let foodBlinkTimerId;
let foodBlinkStepIndex;
let gameOverAnimationTimerId;
let gameOverFrames;
let gameOverFrameIndex;
let gameOverOverlay;

function startGame() {
  stopGameOverAnimation();
  snake = [
    { x: 3, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 4 }
  ];
  dir = { x: 1, y: 0 };
  nextDir = { ...dir };
  score = 0;
  tickMs = START_TICK_MS;
  isPaused = false;
  isGameOver = false;
  autoMode = false;
  boostMode = false;
  foodBlinkOn = true;
  foodBlinkStepIndex = 0;
  gameOverFrames = [];
  gameOverFrameIndex = 0;
  gameOverOverlay = null;
  placeFood();
  updateHud();
  restartLoop();
  restartFoodBlinkLoop();
  draw();
}

function restartLoop() {
  clearInterval(timerId);
  timerId = setInterval(step, getActiveTickMs());
}

function getActiveTickMs() {
  if (!boostMode) {
    return tickMs;
  }
  return Math.max(MIN_BOOST_TICK_MS, Math.floor(tickMs * BOOST_FACTOR));
}

function restartFoodBlinkLoop() {
  clearTimeout(foodBlinkTimerId);
  foodBlinkStepIndex = 0;
  runFoodBlinkStep();
}

function runFoodBlinkStep() {
  if (isGameOver) {
    return;
  }

  const step = FOOD_BLINK_PATTERN[foodBlinkStepIndex];
  foodBlinkOn = step.on;
  foodBlinkStepIndex = (foodBlinkStepIndex + 1) % FOOD_BLINK_PATTERN.length;

  draw();

  foodBlinkTimerId = setTimeout(() => {
    if (isGameOver) {
      return;
    }
    runFoodBlinkStep();
  }, step.duration);
}

function stopGameOverAnimation() {
  clearTimeout(gameOverAnimationTimerId);
  gameOverAnimationTimerId = null;
  gameOverOverlay = null;
}

function triggerGameOver(headPosition, snakeSnapshot) {
  if (isGameOver) {
    return;
  }

  isGameOver = true;
  clearInterval(timerId);
  clearTimeout(foodBlinkTimerId);
  boostMode = false;
  updateHud();

  const head = {
    x: Math.max(0, Math.min(COLS - 1, headPosition.x)),
    y: Math.max(0, Math.min(ROWS - 1, headPosition.y))
  };
  const snakeCopy = snakeSnapshot.map((part) => ({ x: part.x, y: part.y }));

  gameOverFrames = buildAllGameOverFrames(head, snakeCopy);
  gameOverFrameIndex = 0;
  runNextGameOverFrame();
}

function runNextGameOverFrame() {
  if (!isGameOver || !gameOverFrames.length) {
    return;
  }

  const frame = gameOverFrames[gameOverFrameIndex];
  gameOverOverlay = frame.cells;
  draw();

  gameOverFrameIndex = (gameOverFrameIndex + 1) % gameOverFrames.length;
  gameOverAnimationTimerId = setTimeout(runNextGameOverFrame, frame.duration);
}

function createFrame(cells, duration) {
  return { cells, duration };
}

function createCoordsSet(coords) {
  const set = new Set();
  for (const point of coords) {
    if (isInsideBoard(point)) {
      set.add(posKey(point));
    }
  }
  return set;
}

function createSetByPredicate(predicate) {
  const coords = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (predicate(x, y)) {
        coords.push({ x, y });
      }
    }
  }
  return createCoordsSet(coords);
}

function allCellsSet() {
  return createSetByPredicate(() => true);
}

function emptyCellsSet() {
  return new Set();
}

function borderCellsSet() {
  return createSetByPredicate((x, y) => x === 0 || x === COLS - 1 || y === 0 || y === ROWS - 1);
}

function buildAllGameOverFrames(head, snakeSnapshot) {
  const groups = [
    animationFlashAll(),
    animationBorderPulse(),
    animationCollapseToCenter(),
    animationSnakeDissolve(snakeSnapshot),
    animationHeadExplosion(head),
    animationScanner(),
    animationCheckerboard(),
    animationSpiral(),
    animationCrossBlink(),
    animationPseudoFade()
  ];

  const frames = [];
  for (const group of groups) {
    frames.push(...group);
    frames.push(createFrame(emptyCellsSet(), GAME_OVER_PAUSE_MS));
  }
  return frames;
}

function animationFlashAll() {
  const frames = [];
  const all = allCellsSet();
  for (let i = 0; i < 3; i += 1) {
    frames.push(createFrame(all, 110));
    frames.push(createFrame(emptyCellsSet(), 90));
  }
  return frames;
}

function animationBorderPulse() {
  const frames = [];
  const border = borderCellsSet();
  for (let i = 0; i < 4; i += 1) {
    frames.push(createFrame(border, 120));
    frames.push(createFrame(emptyCellsSet(), 100));
  }
  return frames;
}

function animationCollapseToCenter() {
  const frames = [];
  const maxLayer = Math.floor((Math.min(COLS, ROWS) - 1) / 2);

  for (let layer = 0; layer <= maxLayer; layer += 1) {
    const cells = [];
    const left = layer;
    const right = COLS - 1 - layer;
    const top = layer;
    const bottom = ROWS - 1 - layer;

    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        cells.push({ x, y });
      }
    }

    frames.push(createFrame(createCoordsSet(cells), 110));
  }

  frames.push(createFrame(emptyCellsSet(), 120));
  return frames;
}

function animationSnakeDissolve(snakeSnapshot) {
  const frames = [];
  if (!snakeSnapshot.length) {
    return [createFrame(emptyCellsSet(), 120)];
  }

  for (let keep = snakeSnapshot.length; keep >= 1; keep -= 1) {
    const visible = snakeSnapshot.slice(0, keep);
    frames.push(createFrame(createCoordsSet(visible), 95));
  }

  const headOnly = createCoordsSet([snakeSnapshot[0]]);
  frames.push(createFrame(headOnly, 100));
  frames.push(createFrame(emptyCellsSet(), 90));
  frames.push(createFrame(headOnly, 120));
  return frames;
}

function animationHeadExplosion(head) {
  const frames = [];
  const maxDistance = COLS + ROWS;

  for (let distance = 0; distance <= maxDistance; distance += 1) {
    const ring = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const d = Math.abs(x - head.x) + Math.abs(y - head.y);
        if (d === distance) {
          ring.push({ x, y });
        }
      }
    }
    if (ring.length) {
      frames.push(createFrame(createCoordsSet(ring), 55));
    }
  }

  frames.push(createFrame(emptyCellsSet(), 100));
  return frames;
}

function animationScanner() {
  const frames = [];

  for (let x = 0; x < COLS; x += 1) {
    const column = [];
    for (let y = 0; y < ROWS; y += 1) {
      column.push({ x, y });
    }
    frames.push(createFrame(createCoordsSet(column), 60));
  }

  for (let x = COLS - 2; x >= 1; x -= 1) {
    const column = [];
    for (let y = 0; y < ROWS; y += 1) {
      column.push({ x, y });
    }
    frames.push(createFrame(createCoordsSet(column), 60));
  }

  return frames;
}

function animationCheckerboard() {
  const frames = [];
  const phaseA = createSetByPredicate((x, y) => (x + y) % 2 === 0);
  const phaseB = createSetByPredicate((x, y) => (x + y) % 2 === 1);

  for (let i = 0; i < 3; i += 1) {
    frames.push(createFrame(phaseA, 140));
    frames.push(createFrame(phaseB, 140));
  }

  return frames;
}

function getSpiralOrder() {
  const order = [];
  let left = 0;
  let right = COLS - 1;
  let top = 0;
  let bottom = ROWS - 1;

  while (left <= right && top <= bottom) {
    for (let x = left; x <= right; x += 1) {
      order.push({ x, y: top });
    }
    top += 1;

    for (let y = top; y <= bottom; y += 1) {
      order.push({ x: right, y });
    }
    right -= 1;

    if (top <= bottom) {
      for (let x = right; x >= left; x -= 1) {
        order.push({ x, y: bottom });
      }
      bottom -= 1;
    }

    if (left <= right) {
      for (let y = bottom; y >= top; y -= 1) {
        order.push({ x: left, y });
      }
      left += 1;
    }
  }

  return order;
}

function animationSpiral() {
  const frames = [];
  const order = getSpiralOrder();
  const chunk = 8;

  for (let count = chunk; count <= order.length; count += chunk) {
    frames.push(createFrame(createCoordsSet(order.slice(0, count)), 70));
  }

  frames.push(createFrame(emptyCellsSet(), 120));
  return frames;
}

function animationCrossBlink() {
  const frames = [];
  const cross = [];

  for (let y = 0; y < ROWS; y += 1) {
    const x1 = Math.round((y * (COLS - 1)) / (ROWS - 1));
    const x2 = Math.round(((ROWS - 1 - y) * (COLS - 1)) / (ROWS - 1));
    cross.push({ x: x1, y });
    cross.push({ x: x2, y });
  }

  const crossSet = createCoordsSet(cross);
  for (let i = 0; i < 4; i += 1) {
    frames.push(createFrame(crossSet, 110));
    frames.push(createFrame(emptyCellsSet(), 90));
  }

  return frames;
}

function animationPseudoFade() {
  return [
    createFrame(allCellsSet(), 130),
    createFrame(createSetByPredicate((x, y) => (x + y) % 2 === 0), 120),
    createFrame(createSetByPredicate((x, y) => (x + 2 * y) % 3 === 0), 120),
    createFrame(createSetByPredicate((x, y) => (x + y) % 5 === 0), 120),
    createFrame(emptyCellsSet(), 150)
  ];
}

function placeFood() {
  const free = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) {
        free.push({ x, y });
      }
    }
  }
  if (!free.length) {
    triggerGameOver(snake[0], snake);
    return;
  }
  food = free[Math.floor(Math.random() * free.length)];
}

function step() {
  if (isPaused || isGameOver) {
    return;
  }

  if (autoMode) {
    chooseAutoDirection();
  }

  dir = nextDir;
  const head = snake[0];
  const newHead = {
    x: head.x + dir.x,
    y: head.y + dir.y
  };

  if (!isInsideBoard(newHead)) {
    triggerGameOver(head, snake);
    return;
  }

  const willEat = food && newHead.x === food.x && newHead.y === food.y;
  const bodyToCheck = willEat ? snake : snake.slice(0, -1);
  const hitSelf = bodyToCheck.some((part) => part.x === newHead.x && part.y === newHead.y);

  if (hitSelf) {
    triggerGameOver(newHead, snake);
    return;
  }

  snake.unshift(newHead);

  if (willEat) {
    score += 1;
    restartFoodBlinkLoop();

    if (score % SPEED_UP_EVERY_FOOD === 0) {
      const newTick = Math.max(MIN_TICK_MS, tickMs - SPEED_STEP_MS);
      if (newTick !== tickMs) {
        tickMs = newTick;
        restartLoop();
      }
    }

    placeFood();
  } else {
    snake.pop();
  }

  updateHud();
  draw();
}

function setDirection(newDirection) {
  if (!newDirection || isGameOver) {
    return;
  }

  const opposite = dir.x + newDirection.x === 0 && dir.y + newDirection.y === 0;
  if (!opposite) {
    nextDir = newDirection;
  }
}

function turnLeft() {
  const baseDir = nextDir;
  setDirection({ x: baseDir.y, y: -baseDir.x });
}

function turnRight() {
  const baseDir = nextDir;
  setDirection({ x: -baseDir.y, y: baseDir.x });
}

function isInsideBoard(pos) {
  return pos.x >= 0 && pos.x < COLS && pos.y >= 0 && pos.y < ROWS;
}

function posKey(pos) {
  return `${pos.x}:${pos.y}`;
}

function getNextPosition(from, direction) {
  return {
    x: from.x + direction.x,
    y: from.y + direction.y
  };
}

function torusDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function simulateMove(direction) {
  const head = snake[0];
  const newHead = getNextPosition(head, direction);

  if (!isInsideBoard(newHead)) {
    return null;
  }

  const willEat = food && newHead.x === food.x && newHead.y === food.y;
  const bodyToCheck = willEat ? snake : snake.slice(0, -1);
  const hitSelf = bodyToCheck.some((part) => part.x === newHead.x && part.y === newHead.y);

  if (hitSelf) {
    return null;
  }

  const nextBody = willEat ? [newHead, ...snake] : [newHead, ...snake.slice(0, -1)];
  return { newHead, nextBody };
}

function countReachable(start, blocked) {
  const visited = new Set();
  const queue = [start];
  visited.add(posKey(start));

  while (queue.length) {
    const current = queue.shift();
    for (const direction of CARDINAL_DIRECTIONS) {
      const next = getNextPosition(current, direction);
      if (!isInsideBoard(next)) {
        continue;
      }
      const key = posKey(next);
      if (visited.has(key) || blocked.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push(next);
    }
  }

  return visited.size;
}

function directionFromTo(from, to) {
  for (const direction of CARDINAL_DIRECTIONS) {
    const candidate = getNextPosition(from, direction);
    if (candidate.x === to.x && candidate.y === to.y) {
      return direction;
    }
  }
  return null;
}

function findPathDirectionToFood() {
  if (!food) {
    return null;
  }

  const head = snake[0];
  const blocked = new Set(snake.slice(1, -1).map(posKey));
  const queue = [head];
  const visited = new Set([posKey(head)]);
  const parent = new Map();

  while (queue.length) {
    const current = queue.shift();
    if (current.x === food.x && current.y === food.y) {
      break;
    }

    for (const direction of CARDINAL_DIRECTIONS) {
      const next = getNextPosition(current, direction);
      if (!isInsideBoard(next)) {
        continue;
      }
      const key = posKey(next);
      if (visited.has(key) || blocked.has(key)) {
        continue;
      }
      visited.add(key);
      parent.set(key, current);
      queue.push(next);
    }
  }

  const foodKey = posKey(food);
  if (!visited.has(foodKey)) {
    return null;
  }

  let stepNode = food;
  let parentNode = parent.get(posKey(stepNode));
  while (parentNode && !(parentNode.x === head.x && parentNode.y === head.y)) {
    stepNode = parentNode;
    parentNode = parent.get(posKey(stepNode));
  }

  return directionFromTo(head, stepNode);
}

function chooseSafeFallbackDirection() {
  let bestDirection = null;
  let bestScore = -Infinity;

  for (const direction of CARDINAL_DIRECTIONS) {
    const simulated = simulateMove(direction);
    if (!simulated) {
      continue;
    }

    const blocked = new Set(simulated.nextBody.slice(1).map(posKey));
    const freeCells = countReachable(simulated.newHead, blocked);
    const distance = food ? torusDistance(simulated.newHead, food) : 0;
    const score = freeCells * 10 - distance;

    if (score > bestScore) {
      bestScore = score;
      bestDirection = direction;
    }
  }

  return bestDirection;
}

function chooseAutoDirection() {
  const pathDirection = findPathDirectionToFood();
  if (pathDirection && simulateMove(pathDirection)) {
    setDirection(pathDirection);
    return;
  }

  const fallbackDirection = chooseSafeFallbackDirection();
  if (fallbackDirection) {
    setDirection(fallbackDirection);
  }
}

function toggleAutoMode() {
  autoMode = !autoMode;
  if (autoMode && isPaused) {
    isPaused = false;
  }
  updateHud();
}

function updateHud() {
  scoreLabel.textContent = `Счёт: ${score}`;
  if (isGameOver) {
    stateLabel.textContent = "Конец игры";
  } else if (isPaused) {
    stateLabel.textContent = autoMode ? "Пауза (Авто)" : "Пауза";
  } else {
    stateLabel.textContent = autoMode ? "Игра (Авто)" : "Игра";
  }
  pauseBtn.textContent = isPaused ? "Продолжить" : "Пауза";
  autoBtn.textContent = autoMode ? "Авто: вкл" : "Авто: выкл";
}

function drawLed(x, y, on) {
  const centerX = PADDING + x * cellStep + LED_SIZE / 2;
  const centerY = PADDING + y * cellStep + LED_SIZE / 2;
  const radius = LED_SIZE / 2;

  ctx.fillStyle = on ? "#ff2d2d" : "#d9d9d9";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      drawLed(x, y, false);
    }
  }

  if (isGameOver && gameOverOverlay) {
    for (const key of gameOverOverlay) {
      const [x, y] = key.split(":").map(Number);
      drawLed(x, y, true);
    }
    return;
  }

  for (const part of snake) {
    drawLed(part.x, part.y, true);
  }

  if (food && foodBlinkOn) {
    drawLed(food.x, food.y, true);
  }
}

document.addEventListener("keydown", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

  if (key === " ") {
    if (!isGameOver) {
      isPaused = !isPaused;
      updateHud();
    }
    return;
  }

  if (key === "m") {
    toggleAutoMode();
    return;
  }

  if (key === "ArrowLeft" || key === "a") {
    event.preventDefault();
    if (autoMode) {
      autoMode = false;
    }
    if (isPaused) {
      isPaused = false;
    }
    turnLeft();
    updateHud();
    return;
  }

  if (key === "ArrowRight" || key === "d") {
    event.preventDefault();
    if (autoMode) {
      autoMode = false;
    }
    if (isPaused) {
      isPaused = false;
    }
    turnRight();
    updateHud();
    return;
  }

  if (key === "ArrowDown" || key === "s") {
    event.preventDefault();
    if (!boostMode) {
      boostMode = true;
      restartLoop();
    }
    updateHud();
  }
});

document.addEventListener("keyup", (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (key === "ArrowDown" || key === "s") {
    if (boostMode) {
      boostMode = false;
      restartLoop();
    }
  }
});

window.addEventListener("blur", () => {
  if (boostMode) {
    boostMode = false;
    restartLoop();
  }
});

restartBtn.addEventListener("click", () => {
  startGame();
});

pauseBtn.addEventListener("click", () => {
  if (isGameOver) {
    return;
  }
  isPaused = !isPaused;
  updateHud();
});

autoBtn.addEventListener("click", () => {
  if (isGameOver) {
    return;
  }
  toggleAutoMode();
});

startGame();
