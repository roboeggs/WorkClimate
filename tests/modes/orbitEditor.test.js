import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockNrf;

function createEditorDom() {
  document.body.innerHTML = `
    <div class="orbit-dot"><span class="orbit-dot-label">+</span></div>
    <div class="orbit-dot"><span class="orbit-dot-label">+</span></div>
    <div class="orbit-dot"><span class="orbit-dot-label">+</span></div>

    <form id="orbit-editor">
      <select id="orbit-sensor-type">
        <option value="DS18B20">DS18B20</option>
        <option value="DHT11">DHT11</option>
        <option value="DHT22">DHT22</option>
      </select>
      <input id="orbit-temp-input" type="number" />
      <div id="orbit-humidity-wrap">
        <input id="orbit-humidity-input" type="number" />
      </div>
      <button id="orbit-save" type="submit">Save</button>
      <button id="orbit-delete" type="button">Delete</button>
      <button id="orbit-cancel" type="button">Cancel</button>
    </form>
  `;
}

describe('orbitEditor', () => {
  beforeEach(async () => {
    vi.resetModules();
    createEditorDom();

    mockNrf = {
      announceSensor: vi.fn(),
      removeSensor: vi.fn()
    };

    window.deviceNrf = mockNrf;

    await import('../../modes/orbitEditor.js');
    window.dispatchEvent(new Event('DOMContentLoaded'));
  });

  it('announces default sensors on init', () => {
    expect(mockNrf.announceSensor).toHaveBeenCalled();
  });

  it('marks orbit dots as keyboard-accessible buttons', () => {
    const firstDot = document.querySelector('.orbit-dot');
    expect(firstDot.getAttribute('role')).toBe('button');
    expect(firstDot.getAttribute('tabindex')).toBe('0');
    expect(firstDot.getAttribute('aria-label')).toBe('Configure temperature');
  });

  it('clears dot visual state on nrf:sensors-cleared event', () => {
    const firstDot = document.querySelector('.orbit-dot');
    firstDot.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(firstDot.classList.contains('is-selected')).toBe(true);

    window.dispatchEvent(new CustomEvent('nrf:sensors-cleared', {
      detail: { removedCount: 3 }
    }));

    expect(firstDot.classList.contains('is-selected')).toBe(false);
    expect(firstDot.dataset.sensorId).toBeUndefined();
    expect(firstDot.querySelector('.orbit-dot-label').textContent).toBe('+');
  });
});
