class Nrf24l01Emulator {
    constructor() {
        this.data = 0;
        this.sensors = [];
    }

    announceSensor(sensorPayload) {
        const sensorId = String(sensorPayload?.id ?? '').trim();
        const sensorType = String(sensorPayload?.type ?? '').trim();
        const temperature = Number(sensorPayload?.temperature);
        const humidityRaw = sensorPayload?.humidity;
        const humidity = humidityRaw == null ? null : Number(humidityRaw);

        if (!sensorId || !sensorType || !Number.isFinite(temperature)) {
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
        if (existingIdx >= 0) {
            this.sensors[existingIdx] = nextSensor;
        } else {
            this.sensors.push(nextSensor);
        }

        this.data = this.sensors.length;
        console.log('[NRF24L01] Sensor announced:', nextSensor, 'Total:', this.sensors.length);
        return true;
    }

    removeSensor(sensorId) {
        const targetId = String(sensorId ?? '').trim();
        if (!targetId) {
            return false;
        }

        const before = this.sensors.length;
        this.sensors = this.sensors.filter((item) => item.id !== targetId);
        const removed = this.sensors.length !== before;
        this.data = this.sensors.length;

        if (removed) {
            console.log('[NRF24L01] Sensor removed:', targetId, 'Total:', this.sensors.length);
        }

        return removed;
    }

    getSensors() {
        return this.sensors.map((item) => ({ ...item }));
    }
}

window.deviceNrf = window.deviceNrf || new Nrf24l01Emulator();