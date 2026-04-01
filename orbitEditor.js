const TEMP_MIN_C = -55;
const TEMP_MAX_C = 125;
const DEFAULT_HUMIDITY = 50;
const DEFAULT_SENSOR_TYPE = 'DS18B20';

function getOrCreateSensorId(dot) {
  const existing = dot.dataset.sensorId;
  if (existing && existing.length > 0) {
    return existing;
  }

  const generated = `sensor-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
  dot.dataset.sensorId = generated;
  return generated;
}

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

    sensorTypeInput.value = selectedDot.dataset.sensorType ?? DEFAULT_SENSOR_TYPE;
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
    sensorTypeInput.value = DEFAULT_SENSOR_TYPE;
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

    const sensorId = getOrCreateSensorId(selectedDot);
    const announcePayload = {
      id: sensorId,
      type: sensorType,
      temperature: parsed,
      humidity
    };

    if (window.deviceNrf && typeof window.deviceNrf.announceSensor === 'function') {
      window.deviceNrf.announceSensor(announcePayload);
    }

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
    if (selectedDot.dataset.sensorId && window.deviceNrf && typeof window.deviceNrf.removeSensor === 'function') {
      window.deviceNrf.removeSensor(selectedDot.dataset.sensorId);
    }
    delete selectedDot.dataset.sensorId;
    delete selectedDot.dataset.sensorType;
    delete selectedDot.dataset.humidity;
    selectedDot.title = '';
    selectedDot.classList.remove('is-active');
    closeEditor();
  });

  cancelButton.addEventListener('click', () => {
    closeEditor();
  });
});
