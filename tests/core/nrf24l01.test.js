import { describe, expect, it, vi } from 'vitest';
import { Nrf24l01Emulator } from '../../core/nrf24l01.js';

describe('Nrf24l01Emulator', () => {
  it('announces valid sensor and emits event', () => {
    const emu = new Nrf24l01Emulator();
    const listener = vi.fn();
    window.addEventListener('nrf:sensor-announced', listener);

    const ok = emu.announceSensor({ id: 1, type: 'DHT22', temperature: 23.5, humidity: 40 });

    expect(ok).toBe(true);
    expect(emu.getSensors()).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
  });

  it('rejects invalid sensor payload', () => {
    const emu = new Nrf24l01Emulator();

    const ok = emu.announceSensor({ id: 0, type: '', temperature: Number.NaN });

    expect(ok).toBe(false);
    expect(emu.getSensors()).toHaveLength(0);
  });

  it('removes a sensor by id', () => {
    const emu = new Nrf24l01Emulator();
    emu.announceSensor({ id: 1, type: 'DHT11', temperature: 21.1, humidity: 50 });

    const removed = emu.removeSensor(1);

    expect(removed).toBe(true);
    expect(emu.getSensors()).toHaveLength(0);
  });

  it('clears all sensors and emits clear event', () => {
    const emu = new Nrf24l01Emulator();
    const listener = vi.fn();
    window.addEventListener('nrf:sensors-cleared', listener);
    emu.announceSensor({ id: 1, type: 'DHT22', temperature: 20, humidity: 40 });

    const count = emu.clearSensors();

    expect(count).toBe(1);
    expect(emu.getSensors()).toHaveLength(0);
    expect(listener).toHaveBeenCalled();
  });
});
