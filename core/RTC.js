export default class RTC {
  constructor(storageKey = 'snake.rtcOffsetMs') {
    this.storageKey = storageKey;
    this.offsetMs = 0;
    this.load();
  }

  now() {
    return new Date(Date.now() + this.offsetMs);
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw === null) {
        return this.offsetMs;
      }

      const parsed = Number(raw);
      if (Number.isFinite(parsed)) {
        this.offsetMs = parsed;
      }
    } catch (err) {
      console.warn('RTC offset load failed:', err);
    }

    return this.offsetMs;
  }

  save(hours, minutes, seconds = 0) {
    const h = Number(hours);
    const m = Number(minutes);
    const s = Number(seconds);

    if (
      !Number.isInteger(h) || !Number.isInteger(m) || !Number.isInteger(s) ||
      h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59
    ) {
      console.warn('Invalid RTC time:', { hours, minutes, seconds });
      return false;
    }

    const systemNow = new Date();
    const targetNow = new Date(systemNow);
    targetNow.setHours(h, m, s, 0);

    this.offsetMs = targetNow.getTime() - systemNow.getTime();

    try {
      localStorage.setItem(this.storageKey, String(this.offsetMs));
    } catch (err) {
      console.warn('RTC offset save failed:', err);
    }

    return true;
  }
}
