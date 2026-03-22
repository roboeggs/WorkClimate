class MultiKeyHandler {
  constructor() {
    this.keys = {};
    this.LONG_PRESS_THRESHOLD = 1000; // 1 секунда для долгого нажатия
  }

  keyPressed(keyCode) {
    // Обрабатываем только стрелки влево, вправо, вниз
    if (![LEFT_ARROW, RIGHT_ARROW, DOWN_ARROW].includes(keyCode)) {
      return;
    }

    if (!this.keys[keyCode]) {
      this.keys[keyCode] = {
        pressed: true,
        pressTime: millis(),
        handled: false
      };
    }
  }

  keyReleased(keyCode) {
    const keyData = this.keys[keyCode];
    if (keyData) {
      const duration = millis() - keyData.pressTime;

      if (duration >= this.LONG_PRESS_THRESHOLD && !keyData.handled) {
        this.onLongPress(keyCode, duration);
      } else if (!keyData.handled) {
        this.onShortPress(keyCode, duration);
      }
      delete this.keys[keyCode]; // Очищаем данные после обработки
    }
  }

  update() {
    // Проверяем долго удерживаемые клавиши (если не отпущены)
    const currentTime = millis();
    for (const keyCode in this.keys) {
      const keyData = this.keys[keyCode];
      if (!keyData.handled && currentTime - keyData.pressTime >= this.LONG_PRESS_THRESHOLD) {
        keyData.handled = true;
        this.onLongPress(keyCode, currentTime - keyData.pressTime);
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

  handleSpecificButton(keyCode, pressType) {
    // Здесь — ваша логика для каждой кнопки
    switch (keyCode) {
      case LEFT_ARROW:
        if (pressType === 'short') {
          console.log("Левая стрелка: короткое нажатие — уменьшаем значение");
          // Ваша логика для короткого нажатия влево
        } else {
          console.log("Левая стрелка: долгое нажатие — сбрасываем значение");
          // Ваша логика для долгого нажатия влево
        }
        break;
      case RIGHT_ARROW:
        if (pressType === 'short') {
          console.log("Правая стрелка: короткое нажатие — увеличиваем значение");
          // Ваша логика для короткого нажатия вправо
        } else {
          console.log("Правая стрелка: долгое нажатие — переходим в другой режим");
          // Ваша логика для долгого нажатия вправо
        }
        break;
      case DOWN_ARROW:
        if (pressType === 'short') {
          console.log("Нижняя стрелка: короткое нажатие — подтверждаем");
          // Ваша логика для короткого нажатия вниз
        } else {
          console.log("Нижняя стрелка: долгое нажатие — отменяем");
          // Ваша логика для долгого нажатия вниз
        }
        break;
    }
  }
}