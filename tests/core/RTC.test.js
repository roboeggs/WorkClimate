import { beforeEach, describe, expect, it, vi } from 'vitest';
import RTC from '../../core/RTC.js';

describe('RTC', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('loads saved offset from storage', () => {
    localStorage.setItem('snake.rtcOffsetMs', '60000');

    const rtc = new RTC();

    expect(rtc.offsetMs).toBe(60000);
  });

  it('returns false for invalid time values', () => {
    const rtc = new RTC();

    expect(rtc.save(24, 10, 0)).toBe(false);
    expect(rtc.save(10, 60, 0)).toBe(false);
    expect(rtc.save(10, 10, 60)).toBe(false);
  });

  it('computes and stores offset on save', () => {
    const now = new Date('2026-04-09T10:00:00.000Z').getTime();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    const rtc = new RTC();
    const ok = rtc.save(10, 1, 0);

    expect(ok).toBe(true);
    expect(Number(localStorage.getItem('snake.rtcOffsetMs'))).toBe(rtc.offsetMs);
  });

  it('applies offset in now()', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const rtc = new RTC();
    rtc.offsetMs = 5000;

    expect(rtc.now().getTime()).toBe(6000);
  });
});
