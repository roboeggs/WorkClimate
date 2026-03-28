class MultiKeyHandler {
  constructor(callback) {
    this.keys = {};
    this.LONG_PRESS_THRESHOLD = 1000;
    this.HOLD_START_DELAY = 280;
    this.HOLD_REPEAT_INTERVAL = 90;
    this.onButtonAction = callback;

    this.comboHandled = false; // <--- новое
  }

  keyPressed(keyCode) {
    if (![LEFT_ARROW, RIGHT_ARROW, DOWN_ARROW].includes(keyCode)) return;

    if (!this.keys[keyCode]) {
      this.keys[keyCode] = {
        pressed: true,
        pressTime: millis(),
        handled: false,
        inCombo: false,
        holdStarted: false,
        lastHoldTick: 0
      };
    }

    this.comboHandled = false; // сбрасываем при новом нажатии
  }

  keyReleased(keyCode) {
    const keyData = this.keys[keyCode];
      // Если клавиша участвовала в комбо — игнорируем
    if (!keyData) return;
    if (keyData.inCombo) {
      delete this.keys[keyCode];
      return;
    }
    if (keyData.holdStarted) {
      delete this.keys[keyCode];
      return;
    }

    if (keyData) {
      const duration = millis() - keyData.pressTime;

      if (!this.comboHandled) {
        if (duration >= this.LONG_PRESS_THRESHOLD && !keyData.handled) {
          this.onLongPress(keyCode, duration);
        } else if (!keyData.handled) {
          this.onShortPress(keyCode, duration);
        }
      }

      delete this.keys[keyCode];
    }
  }

  update() {
    const currentTime = millis();

    const pressedKeys = Object.keys(this.keys).map(k => Number(k));

    // === Проверка комбинации из двух клавиш ===
    if (pressedKeys.length === 2 && !this.comboHandled) {
      const [k1, k2] = pressedKeys;
      const d1 = currentTime - this.keys[k1].pressTime;
      const d2 = currentTime - this.keys[k2].pressTime;

      if (d1 >= this.LONG_PRESS_THRESHOLD && d2 >= this.LONG_PRESS_THRESHOLD) {
        this.comboHandled = true;

        console.log(`LONG COMBO: ${this.getPressedButton(k1)} + ${this.getPressedButton(k2)}`);

        this.onButtonAction(this.getPressedButton(k1) + this.getPressedButton(k2) + 2, 'combo');

        // помечаем обе клавиши как обработанные
        this.keys[k1].handled = true;
        this.keys[k2].handled = true;
        this.keys[k1].inCombo = true;
        this.keys[k2].inCombo = true;
        return;
      }
    }

    const downData = this.keys[DOWN_ARROW];
    if (downData && !downData.inCombo && !this.comboHandled) {
      const heldMs = currentTime - downData.pressTime;

      if (heldMs >= this.HOLD_START_DELAY) {
        if (!downData.holdStarted) {
          downData.holdStarted = true;
          downData.lastHoldTick = currentTime;
        }

        if (currentTime - downData.lastHoldTick >= this.HOLD_REPEAT_INTERVAL) {
          downData.lastHoldTick = currentTime;
          this.onButtonAction(this.getPressedButton(DOWN_ARROW), 'hold');
        }
      }
    }

  
  }

  onShortPress(keyCode, duration) {
    console.log(`SHORT PRESS: ${this.getDirection(keyCode)} (${duration}ms)`);
    this.handleSpecificButton(keyCode, 'short');
  }

  onLongPress(keyCode, duration) {
    console.log(`LONG PRESS: ${this.getDirection(keyCode)} (${duration}ms)`);
    this.handleSpecificButton(keyCode, 'long');
  }

  getDirection(keyCode) {
    switch (keyCode) {
      case LEFT_ARROW: return "LEFT";
      case RIGHT_ARROW: return "RIGHT";
      case DOWN_ARROW: return "DOWN";
      default: return `KEY_${keyCode}`;
    }
  }

  getPressedButton(keyCode) {
    let buttonIndex = -1;
    if (keyCode === LEFT_ARROW) buttonIndex = 0;
    if (keyCode === DOWN_ARROW) buttonIndex = 1;
    if (keyCode === RIGHT_ARROW) buttonIndex = 2;
    return buttonIndex;
  }

  handleSpecificButton(keyCode, pressType) {
    let buttonIndex = this.getPressedButton(keyCode);

    if (buttonIndex !== -1 && this.onButtonAction) {
      this.onButtonAction(buttonIndex, pressType);
    }
  }
}
