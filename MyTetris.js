class TetrisMode extends BaseMode {
    constructor(ctx) {
        super(ctx);
    }
  enter(prevMode) {
    // Инициализация тетриса
    // this.game = new Tetris(this.ctx.matrix);
    // this.game.start();
    console.log("Tetris enter");
  }

  exit(nextMode) {
    // Остановить таймеры/игру
    // if (this.game) this.game.stop();
    console.log("Tetris exit");
  }

  handleInput(btnIdx, pressType) {
    // Пример выхода обратно в часы по combo LEFT+RIGHT
    if (pressType === "combo" && btnIdx === 4) {
      this.ctx.switchMode("clock");
      return;
    }

    // Здесь управление тетрисом:
    // this.game.handleInput(btnIdx, pressType);
  }

  tick() {
    // this.game.update();
  }

  onMinute() {
    // Обычно пусто для тетриса
  }
}