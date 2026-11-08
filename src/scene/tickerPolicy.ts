export function shouldTick(input: { hidden: boolean; paused: boolean; reducedMotion: boolean }): boolean {
  return !input.hidden && !input.paused && !input.reducedMotion;
}

export function shouldPoll(input: { paused: boolean }): boolean {
  return input.paused || !input.paused;
}
