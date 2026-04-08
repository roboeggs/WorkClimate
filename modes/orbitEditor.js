import { deviceNrf } from './../core/nrf24l01.js';

const TEMP_MIN_C = -55;
const TEMP_MAX_C = 125;
const DEFAULT_HUMIDITY = 50;
const DEFAULT_SENSOR_TYPE = 'DS18B20';


/// DEBUG MODE

const DEFAULT_SENSORS = [
  { id: '1', type: 'DHT22', temperature: 24.3, humidity: 48.0 },
  { id: '2', type: 'DS18B20', temperature: 26.1, humidity: null },
  { id: '3', type: 'DHT11', temperature: 23.0, humidity: 56.0 }
];

function seedDefaultSensors(orbitDots, applyDotLabel, updateDotMeta) {
  const dots = Array.from(orbitDots);
  DEFAULT_SENSORS.forEach((sensor, idx) => {
    const dot = dots[idx];
    if (!dot) return;

    dot.dataset.sensorId = sensor.id;
    applyDotLabel(dot, sensor.temperature);
    updateDotMeta(dot, sensor.type, sensor.humidity);

    if (deviceNrf && typeof deviceNrf.announceSensor === 'function') {
      deviceNrf.announceSensor({
        id: sensor.id,
        type: sensor.type,
        temperature: sensor.temperature,
        humidity: sensor.humidity
      });
    }
  });
}

////
function getOrCreateSensorId(dot, orbitDots) {
  const existingRaw = dot.dataset.sensorId;
  const existing = Number.parseInt(existingRaw, 10);

  if (Number.isInteger(existing) && existing >= 1 && existing <= 100) {
    return existing;
  }

  const used = new Set(
    Array.from(orbitDots)
      .map((d) => Number.parseInt(d.dataset.sensorId, 10))
      .filter((n) => Number.isInteger(n) && n >= 1 && n <= 100)
  );

  for (let id = 1; id <= 100; id++) {
    if (!used.has(id)) {
      dot.dataset.sensorId = String(id);
      return id;
    }
  }

  return null;

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

  const clearDotVisualState = (dot) => {
    applyDotLabel(dot, NaN);
    delete dot.dataset.sensorId;
    delete dot.dataset.sensorType;
    delete dot.dataset.humidity;
    dot.title = '';
    dot.classList.remove('is-active');
    dot.classList.remove('is-selected');
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

    const sensorId = getOrCreateSensorId(selectedDot, orbitDots);
    if (sensorId == null) {
      tempInput.setCustomValidity('No free sensor id in range 1..100');
      tempInput.reportValidity();
      return;
    }

    const announcePayload = {
      id: sensorId,
      type: sensorType,
      temperature: parsed,
      humidity
    };

    if (deviceNrf && typeof deviceNrf.announceSensor === 'function') {
      deviceNrf.announceSensor(announcePayload);
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

    const sensorId = selectedDot.dataset.sensorId;
    if (sensorId && deviceNrf && typeof deviceNrf.removeSensor === 'function') {
      deviceNrf.removeSensor(sensorId);
    }
    clearDotVisualState(selectedDot);
    closeEditor();
  });

  cancelButton.addEventListener('click', () => {
    closeEditor();
  });

  ////// ####### DEBUGMODE
  seedDefaultSensors(orbitDots, applyDotLabel, updateDotMeta);
  ////////

  window.addEventListener('nrf:sensors-cleared', () => {
    orbitDots.forEach((dot) => {
      clearDotVisualState(dot);
    });
    closeEditor();
  });

});
