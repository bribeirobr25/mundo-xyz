/** Events that arrive together, such as visibility and focus, share one poll. */
export const POLL_BURST_MS = 50;

export function createPollBurst(windowMs: number, run: () => void): { push: (now: number) => void } {
  let last = Number.NEGATIVE_INFINITY;
  return {
    push(now: number) {
      if (now - last < windowMs) return;
      last = now;
      run();
    },
  };
}

export function beginPoll(latest: { n: number }): number {
  latest.n += 1;
  return latest.n;
}

export function isLatestPoll(id: number, latest: { n: number }): boolean {
  return id === latest.n;
}
