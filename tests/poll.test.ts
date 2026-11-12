import { expect, test } from "vitest";
import { beginPoll, createPollBurst, isLatestPoll, POLL_BURST_MS } from "../src/web/poll.js";

test("t.perf.poll-burst and adjacent", () => {
  const calls: number[] = [];
  const burst = createPollBurst(POLL_BURST_MS, () => calls.push(calls.length));
  burst.push(1_000);
  burst.push(1_010);
  burst.push(1_000 + POLL_BURST_MS - 1);
  burst.push(1_000 + POLL_BURST_MS);
  burst.push(2_000);
  expect(calls).toEqual([0, 1, 2]);
  const every = createPollBurst(0, () => calls.push(9));
  every.push(0);
  every.push(0);
  expect(calls.filter((value) => value === 9)).toHaveLength(2);
  const latest = { n: 0 };
  const first = beginPoll(latest);
  const second = beginPoll(latest);
  expect(isLatestPoll(first, latest)).toBe(false);
  expect(isLatestPoll(second, latest)).toBe(true);
  expect(isLatestPoll(0, latest)).toBe(false);
  expect(POLL_BURST_MS).toBe(50);
});
