import { debugLog } from './debug.js';

export class Nrf24l01Emulator {
    constructor() {
        this.data = 0;
        this.sensors = [];
    }

    announceSensor(sensorPayload) {
        const sensorId = Number.parseInt(sensorPayload?.id, 10);
        const sensorType = String(sensorPayload?.type ?? '').trim();
        const temperature = Number(sensorPayload?.temperature);
        const humidityRaw = sensorPayload?.humidity;
        const humidity = humidityRaw == null ? null : Number(humidityRaw);
        
        if (!Number.isInteger(sensorId) || sensorId < 1 || sensorId > 100 || !sensorType || !Number.isFinite(temperature)) {
            return false;
        }

        const nextSensor = {
            id: sensorId,
            type: sensorType,
            temperature,
            humidity: Number.isFinite(humidity) ? humidity : null,
            updatedAt: Date.now()
        };

        const existingIdx = this.sensors.findIndex((item) => item.id === sensorId);
        const isNew = existingIdx < 0;
        if (existingIdx >= 0) {
            this.sensors[existingIdx] = nextSensor;
        } else {
            this.sensors.push(nextSensor);
        }

        this.data = this.sensors.length;
        debugLog('[NRF24L01] Sensor announced:', nextSensor, 'Total:', this.sensors.length);

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('nrf:sensor-announced', {
                    detail: {
                        sensor: { ...nextSensor },
                        isNew
                    }
                })
            );
        }

        return true;
    }

    removeSensor(sensorId) {
        const targetId = Number.parseInt(sensorId, 10);
        if (!Number.isInteger(targetId) || targetId < 1 || targetId > 100) {
            return false;
        }

        const before = this.sensors.length;
        this.sensors = this.sensors.filter((item) => item.id !== targetId);
        const removed = this.sensors.length !== before;
        this.data = this.sensors.length;

        if (removed) {
            debugLog('[NRF24L01] Sensor removed:', targetId, 'Total:', this.sensors.length);
        }

        return removed;
    }

    clearSensors() {
        const removedCount = this.sensors.length;
        if (removedCount === 0) {
            return 0;
        }

        this.sensors = [];
        this.data = 0;
        debugLog('[NRF24L01] All sensors cleared. Total: 0');

        if (typeof window !== 'undefined') {
            window.dispatchEvent(
                new CustomEvent('nrf:sensors-cleared', {
                    detail: { removedCount }
                })
            );
        }

        return removedCount;
    }

    getSensors() {
        return this.sensors.map((item) => ({ ...item }));
    }
}

export const deviceNrf = window.deviceNrf || new Nrf24l01Emulator();
window.deviceNrf = deviceNrf;