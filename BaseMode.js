class BaseMode {
  constructor(ctx) {
    this.ctx = ctx; // общий контекст: matrix, userLogic, и т.д.
  }

  enter() {}
  exit() {}
  handleInput(btnIdx, pressType) {}
  tick() {}
  onMinute() {}
}