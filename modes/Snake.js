class SnakeMode extends BaseMode {
  constructor(ctx) {
    super(ctx);

    this.cols = 16;
    this.rows = 8;

    this.stepMs = 320;
    this.fastStepMs = 140;
    this.timerId = null;

    this.snake = [];
    this.food = null;
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.isGameOver = false;
  }

  enter(prevMode) {
    this.startGame();
  }

  exit(nextMode) {
    this.stopLoop();
  }

  tick() {
    // Snake updates by internal interval.
  }

  onMinute() {
    // No-op for snake mode.
  }

  handleInput(btnIdx, pressType) {
    if (pressType === 'combo' && btnIdx === 3) {
      this.ctx.switchMode(AppMode.CLOCK);
      return;
    }

    if (pressType === 'combo' && btnIdx === 4) {
      this.ctx.switchMode(AppMode.CLOCK);
      return;
    }

    if (this.isGameOver) {
      if (pressType === 'short' || pressType === 'long' || pressType === 'hold') {
        this.startGame();
      }
      return;
    }

    // LEFT/RIGHT rotate direction relative to current movement
    if (pressType === 'short') {
      if (btnIdx === 0) {
        this.turnRight();
      } else if (btnIdx === 2) {
        this.turnLeft();
      } else if (btnIdx === 1) {
        // Down button keeps direction; immediate step for quick control
        this.step();
      }
    }

    // Hold Down accelerates movement
    if (btnIdx === 1 && pressType === 'hold') {
      this.step();
    }

    if (btnIdx === 1 && pressType === 'long') {
      this.step();
    }
  }

  startGame() {
    this.stopLoop();

    this.snake = [
      { x: 4, y: 3 },
      { x: 3, y: 3 },
      { x: 2, y: 3 }
    ];

    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.isGameOver = false;
    this.food = this.spawnFood();

    this.render();

    this.timerId = setInterval(() => {
      this.step();
    }, this.stepMs);
  }

  stopLoop() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  turnLeft() {
    const { x, y } = this.dir;
    this.nextDir = { x: y, y: -x };
  }

  turnRight() {
    const { x, y } = this.dir;
    this.nextDir = { x: -y, y: x };
  }

  step() {
    if (this.isGameOver) {
      return;
    }

    this.dir = { ...this.nextDir };

    const head = this.snake[0];
    const nextHead = {
      x: head.x + this.dir.x,
      y: head.y + this.dir.y
    };

    // Walls are solid for snake
    if (nextHead.x < 0 || nextHead.x >= this.cols || nextHead.y < 0 || nextHead.y >= this.rows) {
      this.setGameOver();
      return;
    }

    const hitSelf = this.snake.some((part) => part.x === nextHead.x && part.y === nextHead.y);
    if (hitSelf) {
      this.setGameOver();
      return;
    }

    this.snake.unshift(nextHead);

    const ateFood = this.food && nextHead.x === this.food.x && nextHead.y === this.food.y;
    if (ateFood) {
      this.food = this.spawnFood();
    } else {
      this.snake.pop();
    }

    this.render();
  }

  setGameOver() {
    this.isGameOver = true;
    this.stopLoop();
    this.render(true);
  }

  spawnFood() {
    const freeCells = [];

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const occupied = this.snake.some((part) => part.x === x && part.y === y);
        if (!occupied) {
          freeCells.push({ x, y });
        }
      }
    }

    if (freeCells.length === 0) {
      return null;
    }

    const idx = Math.floor(Math.random() * freeCells.length);
    return freeCells[idx];
  }

  render(gameOver = false) {
    const rows16 = Array(this.rows).fill(0);

    for (const part of this.snake) {
      rows16[part.y] |= (1 << (15 - part.x));
    }

    if (this.food) {
      rows16[this.food.y] |= (1 << (15 - this.food.x));
    }

    for (let r = 0; r < this.rows; r++) {
      const value = rows16[r];
      const high = (value >> 8) & 0xFF;
      const low = value & 0xFF;

      this.ctx.matrix.maxWrite(8 - r, high);
      this.ctx.matrix.maxWrite(16 - r, low);
    }

    this.ctx.matrix.draw();
  }
}
