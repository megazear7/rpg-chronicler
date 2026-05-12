import { STANDARD_DEBOUNCE_DURATION, STANDARD_FORCE_DURATION } from "../shared/util.time.js";

export class DebounceHandler {
  private debounceDuration: number;
  private forceDuration: number;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  protected registrationTime?: number;

  constructor(debounceDuration: number = STANDARD_DEBOUNCE_DURATION, forceDuration: number = STANDARD_FORCE_DURATION) {
    this.debounceDuration = debounceDuration;
    this.forceDuration = forceDuration;
  }

  debounce(func: () => void): void {
    if (this.forceExpired()) {
      func();
      this.timeoutId = null;
      this.registrationTime = undefined;
    } else {
      if (!this.registrationTime) this.registrationTime = Date.now();
      if (this.timeoutId !== null) clearTimeout(this.timeoutId);
      this.timeoutId = setTimeout(() => func(), this.debounceDuration);
    }
  }

  forceExpired(): boolean {
    return !!(this.timeoutId && this.registrationTime && Date.now() - this.registrationTime > this.forceDuration);
  }
}
