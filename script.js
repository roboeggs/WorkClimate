
const DEFAULT_MATRIX_MODULE_HEIGHT = 220;
const MATRIX_FRAME_PADDING_PX = 26;
const TEMP_MIN_C = -55;
const TEMP_MAX_C = 125;
const DEFAULT_HUMIDITY = 50;

let userInput;
let matrix;

function updateDeviceFrameSize(moduleSizePx, orientation) {
  const device = document.getElementById('device');
  if (!device) {
    return;
  }

  const isVertical = orientation === Orientation.VERTICAL;
  const matrixWidthPx = isVertical ? moduleSizePx : moduleSizePx * 2;
  const matrixHeightPx = isVertical ? moduleSizePx * 2 : moduleSizePx;

  const deviceWidthPx = matrixWidthPx + MATRIX_FRAME_PADDING_PX * 2;
  const deviceHeightPx = matrixHeightPx + MATRIX_FRAME_PADDING_PX * 2;

  device.style.width = `${deviceWidthPx.toFixed(2)}px`;
  device.style.height = `${deviceHeightPx.toFixed(2)}px`;
}

function getMatrixModuleHeight() {
  return DEFAULT_MATRIX_MODULE_HEIGHT;
}

function setup() {
  matrix = new Matrix(undefined, getMatrixModuleHeight(), Orientation.HORIZONTAL);
  userInput = new UserLogic(matrix);

  updateDeviceFrameSize(matrix.moduleSize, matrix.orientation);

  setInterval(() => {
    userInput.keyHandler.update();
    userInput.tick();
  }, 16);

  // Запускаем обновление в начале следующей минуты
  scheduleNextMinuteUpdate();
  userInput.UpdateTime();


}

function scheduleNextMinuteUpdate() {
  const now = new Date();
  // Миллисекунды до следующей минуты: 60 000 − (текущие секунды × 1 000 + миллисекунды)
  const delay = 60000 - (now.getSeconds() * 1000 + now.getMilliseconds());
  setTimeout(() => {
    // Обновляем данные текущего режима
    userInput.onMinute();
    // Перерисовываем экран
    redraw();
    // Планируем следующее обновление
    scheduleNextMinuteUpdate();
  }, delay);
}

function draw() {


  // userInput.UpdateTime();
}

function keyPressed() {
  userInput.keyHandler.keyPressed(keyCode);
}

function keyReleased() {
  userInput.keyHandler.keyReleased(keyCode);
}

window.addEventListener('matrix-layout-change', (event) => {
  const nextOrientation = event.detail?.orientation;
  const nextModuleSize = Number(event.detail?.moduleSize);

  if (!Number.isFinite(nextModuleSize) || nextModuleSize <= 0) {
    return;
  }

  if (nextOrientation !== Orientation.HORIZONTAL && nextOrientation !== Orientation.VERTICAL) {
    return;
  }

  updateDeviceFrameSize(nextModuleSize, nextOrientation);
});

window.addEventListener('DOMContentLoaded', () => {
  const orbitDots = document.querySelectorAll('.orbit-dot');
  const editor = document.getElementById('orbit-editor');
  const tempInput = document.getElementById('orbit-temp-input');
  const sensorTypeInput = document.getElementById('orbit-sensor-type');
  const humidityWrap = document.getElementById('orbit-humidity-wrap');
  const humidityInput = document.getElementById('orbit-humidity-input');
  const deleteButton = document.getElementById('orbit-delete');
  const cancelButton = document.getElementById('orbit-cancel');

  if (!editor || !tempInput || !sensorTypeInput || !humidityWrap || !humidityInput || !deleteButton || !cancelButton) {
    return;
  }

  editor.hidden = true;

  let selectedDot = null;

  const sensorRequiresHumidity = (sensorType) => {
    return sensorType === 'DHT11' || sensorType === 'DHT22';
  };

  const updateHumidityVisibility = () => {
    humidityWrap.hidden = !sensorRequiresHumidity(sensorTypeInput.value);
  };

  const getDotLabelNode = (dot) => {
    let label = dot.querySelector('.orbit-dot-label');
    if (!label) {
      label = document.createElement('span');
      label.className = 'orbit-dot-label';
      dot.appendChild(label);
    }
    return label;
  };

  const openEditor = (dot) => {
    if (selectedDot) {
      selectedDot.classList.remove('is-selected');
    }

    selectedDot = dot;
    selectedDot.classList.add('is-selected');

    sensorTypeInput.value = selectedDot.dataset.sensorType ?? 'DS18B20';
    updateHumidityVisibility();

    const storedValue = selectedDot.dataset.tempValue;
    tempInput.value = storedValue ?? '';

    const storedHumidity = selectedDot.dataset.humidity;
    humidityInput.value = storedHumidity ?? '';

    editor.hidden = false;
    tempInput.focus();
    tempInput.select();
  };

  const closeEditor = () => {
    if (selectedDot) {
      selectedDot.classList.remove('is-selected');
    }
    selectedDot = null;
    editor.hidden = true;
    tempInput.value = '';
    humidityInput.value = '';
    sensorTypeInput.value = 'DS18B20';
    updateHumidityVisibility();
  };

  const applyDotLabel = (dot, tempValue) => {
    const label = getDotLabelNode(dot);

    if (typeof tempValue !== 'number' || Number.isNaN(tempValue)) {
      label.textContent = '+';
      delete dot.dataset.tempValue;
      return;
    }

    const compact = Number(tempValue.toFixed(1));
    dot.dataset.tempValue = String(compact);
    label.textContent = `${compact}°`;
  };

  const isTemperatureInRange = (value) => {
    return Number.isFinite(value) && value >= TEMP_MIN_C && value <= TEMP_MAX_C;
  };

  const getHumidityValue = () => {
    const parsed = Number.parseFloat(humidityInput.value);
    if (Number.isFinite(parsed)) {
      return Math.min(100, Math.max(0, Number(parsed.toFixed(1))));
    }
    return DEFAULT_HUMIDITY;
  };

  const updateDotMeta = (dot, sensorType, humidityValue) => {
    dot.dataset.sensorType = sensorType;

    if (sensorRequiresHumidity(sensorType)) {
      dot.dataset.humidity = String(humidityValue);
      dot.title = `${sensorType}: ${dot.dataset.tempValue}°C, ${humidityValue}%`;
    } else {
      delete dot.dataset.humidity;
      dot.title = `${sensorType}: ${dot.dataset.tempValue}°C`;
    }
  };

  orbitDots.forEach((dot) => {
    dot.setAttribute('role', 'button');
    dot.setAttribute('tabindex', '0');
    dot.setAttribute('aria-label', 'Configure temperature');

    const activate = () => {
      dot.classList.add('is-active');
      setTimeout(() => {
        dot.classList.remove('is-active');
      }, 180);

      openEditor(dot);
    };

    dot.addEventListener('click', activate);

    dot.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });

  sensorTypeInput.addEventListener('change', () => {
    updateHumidityVisibility();
  });

  editor.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!selectedDot) {
      return;
    }

    const parsed = Number.parseFloat(tempInput.value);
    if (!isTemperatureInRange(parsed)) {
      tempInput.setCustomValidity(`Temperature range: ${TEMP_MIN_C}..${TEMP_MAX_C} °C`);
      tempInput.reportValidity();
      tempInput.focus();
      return;
    }

    tempInput.setCustomValidity('');

    applyDotLabel(selectedDot, parsed);

    const sensorType = sensorTypeInput.value;
    const humidity = sensorRequiresHumidity(sensorType) ? getHumidityValue() : null;
    updateDotMeta(selectedDot, sensorType, humidity);

    closeEditor();
  });

  tempInput.addEventListener('input', () => {
    tempInput.setCustomValidity('');
  });

  updateHumidityVisibility();

  deleteButton.addEventListener('click', () => {
    if (!selectedDot) {
      return;
    }

    applyDotLabel(selectedDot, NaN);
    selectedDot.classList.remove('is-active');
    closeEditor();
  });

  cancelButton.addEventListener('click', () => {
    closeEditor();
  });
});