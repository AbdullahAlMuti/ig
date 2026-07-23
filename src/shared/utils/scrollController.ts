/**
 * Cancellable auto-scroll engine (runs in the ISOLATED content-script world,
 * which shares the page's DOM/BOM, so `window.scrollTo` drives the page).
 *
 * Scrolling to the bottom triggers Instagram's infinite-scroll fetches, which
 * the MAIN-world interceptor then captures. Swipes are spaced with randomized
 * 3–8 s gaps to emulate a human and avoid rate-limiting, and the whole loop is
 * cancellable mid-flight via a global flag (checked between and *during* waits)
 * so "Stop Scrolling" never locks up the page.
 */
export interface ScrollOptions {
  /** Minimum inter-swipe delay, ms. */
  minGapMs?: number;
  /** Maximum inter-swipe delay, ms. */
  maxGapMs?: number;
}

export interface ScrollRunResult {
  completed: number;
  cancelled: boolean;
}

const DEFAULT_MIN_GAP = 3000;
const DEFAULT_MAX_GAP = 8000;
const POLL_STEP = 100;

function randomBetween(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min));
}

export class ScrollController {
  private isScrollingCancelled = false;
  private running = false;

  get isRunning(): boolean {
    return this.running;
  }

  /** Raise the global cancellation flag; any active loop unwinds promptly. */
  cancel(): void {
    this.isScrollingCancelled = true;
  }

  scrollToTop(): void {
    window.scrollTo(0, 0);
  }

  scrollToBottom(): void {
    window.scrollTo(0, Number.MAX_SAFE_INTEGER);
  }

  /**
   * Perform up to `count` swipes with human-like jitter between them.
   * Resolves once the run finishes or is cancelled. Concurrent calls are
   * ignored (the in-flight run keeps going).
   */
  async swipe(count: number, options: ScrollOptions = {}): Promise<ScrollRunResult> {
    if (this.running) return { completed: 0, cancelled: this.isScrollingCancelled };

    const minGap = options.minGapMs ?? DEFAULT_MIN_GAP;
    const maxGap = options.maxGapMs ?? DEFAULT_MAX_GAP;

    this.running = true;
    this.isScrollingCancelled = false;
    let completed = 0;

    try {
      for (let i = 0; i < count; i++) {
        if (this.isScrollingCancelled) break;
        this.scrollToBottom();
        completed += 1;
        if (i < count - 1) {
          const interrupted = await this.cancellableDelay(randomBetween(minGap, maxGap));
          if (interrupted) break;
        }
      }
    } finally {
      this.running = false;
    }

    return { completed, cancelled: this.isScrollingCancelled };
  }

  /** Wait `ms`, but resolve early (→ true) the moment cancellation is requested. */
  private cancellableDelay(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      let waited = 0;
      const tick = () => {
        if (this.isScrollingCancelled) return resolve(true);
        if (waited >= ms) return resolve(false);
        waited += POLL_STEP;
        setTimeout(tick, POLL_STEP);
      };
      setTimeout(tick, POLL_STEP);
    });
  }
}
