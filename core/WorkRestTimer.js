import { BlinkState, DeviceState } from './AppConstants.js';

export default class WorkRestTimer {
  constructor(matrix, getTimeSeparatorState) {
    this.matrix = matrix;
    this.getTimeSeparatorState = getTimeSeparatorState;
    this.reset();
  }

  reset() {
    this.workHours = 0;
    this.workMinutes = 0;
    this.restHours = 0;
    this.restMinutes = 0;
  }

  getWorkTime() {
    return {
      hours: this.workHours,
      minutes: this.workMinutes
    };
  }

  getRestTime() {
    return {
      hours: this.restHours,
      minutes: this.restMinutes
    };
  }

  tick(state) {
    if (state === DeviceState.DEVICE_STATE_WORKING) {
      this.#incrementWorkTime();
      this.matrix.drawNumber(
        this.workHours,
        this.workMinutes,
        this.getTimeSeparatorState(),
        BlinkState.BLINK_HOURS
      );
      return;
    }

    if (state === DeviceState.DEVICE_STATE_RESTING) {
      this.#incrementRestTime();
      this.matrix.drawNumber(
        this.restHours,
        this.restMinutes,
        this.getTimeSeparatorState(),
        BlinkState.BLINK_MINUTES
      );
    }
  }

  #incrementWorkTime() {
    this.workMinutes++;
    if (this.workMinutes >= 60) {
      this.workMinutes = 0;
      this.workHours = this.workHours >= 99 ? 0 : this.workHours + 1;
    }
  }

  #incrementRestTime() {
    this.restMinutes++;
    if (this.restMinutes >= 60) {
      this.restMinutes = 0;
      this.restHours = this.restHours >= 99 ? 0 : this.restHours + 1;
    }
  }
}
