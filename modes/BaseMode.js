export default class BaseMode {
  constructor(ctx) {
    this.ctx = ctx; // Shared context: matrix, userLogic, etc.
  }

  enter() {}
  exit() {}
  handleInput(btnIdx, pressType) {}
  tick() {}
  onMinute() {}
}