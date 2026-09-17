import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDraw,
  sampleNumbers,
  distinctMatches,
} from '../src/modules/draws/draw.engine.js';
const entry = (user, values) => ({
  user,
  scores: values.map((value) => ({ value })),
});
test('draw fixtures produce distinct 0/3/4/5 intersections and only the highest tier', () => {
  const entries = [
    entry('a', [6, 7, 8, 9, 10]),
    entry('b', [1, 2, 3, 8, 9]),
    entry('c', [1, 2, 3, 4, 9]),
    entry('d', [1, 2, 3, 4, 5]),
  ];
  const result = calculateDraw({
    entries,
    poolMinor: 10001,
    rolloverMinor: 99,
    numbers: [1, 2, 3, 4, 5],
  });
  assert.deepEqual(
    result.outcomes.map((row) => row.tier),
    [null, 3, 4, 5],
  );
  assert.deepEqual(
    result.outcomes.map((row) => row.amountMinor),
    [0, 2500, 3500, 4100],
  );
  assert.equal(
    result.awardedMinor + result.unclaimedMinor + result.rolloverMinor,
    10100,
  );
  assert.equal(result.rolloverMinor, 0);
  assert.equal(
    distinctMatches(entry('e', [1, 1, 1, 2, 2]).scores, [1, 2, 3, 4, 5]).length,
    2,
  );
});
test('integer remainders are deterministic and only unclaimed five-tier carries forward', () => {
  const entries = [entry('z', [1, 2, 3, 9, 10]), entry('a', [1, 2, 3, 7, 8])];
  const first = calculateDraw({
    entries,
    poolMinor: 101,
    rolloverMinor: 40,
    numbers: [1, 2, 3, 4, 5],
  });
  assert.deepEqual(
    first.outcomes.map((row) => row.amountMinor),
    [12, 13],
  );
  assert.equal(first.unclaimedMinor, 35);
  assert.equal(first.rolloverMinor, 81);
  const next = calculateDraw({
    entries: [],
    poolMinor: 100,
    rolloverMinor: first.rolloverMinor,
    numbers: [1, 2, 3, 4, 5],
  });
  assert.equal(next.rolloverMinor, 121);
  assert.equal(next.unclaimedMinor, 60);
  assert.equal(next.rolloverMinor + next.unclaimedMinor, 181);
});
test('random and frequency-weighted sampling stays distinct and supports every boundary', () => {
  for (const strategy of ['random', 'weighted']) {
    const entries = [entry('a', [1, 1, 1, 2, 3])];
    assert.deepEqual(
      sampleNumbers(entries, strategy, () => 0),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(
      sampleNumbers(entries, strategy, (max) => max - 1),
      [41, 42, 43, 44, 45],
    );
    for (let i = 0; i < 100; i++) {
      const row = sampleNumbers(entries, strategy);
      assert.equal(new Set(row).size, 5);
      assert.ok(row.every((n) => n >= 1 && n <= 45));
    }
  }
  assert.throws(() => sampleNumbers([], 'random', (max) => max), /bounds/);
  assert.throws(
    () => calculateDraw({ entries: [], poolMinor: -1 }),
    /minor units/,
  );
});
test('calculation is pure: simulations do not mutate entries or allocation input', () => {
  const source = {
    entries: [entry('a', [1, 2, 3, 4, 5])],
    poolMinor: 1000,
    strategy: 'weighted',
  };
  const before = JSON.stringify(source);
  calculateDraw(source, () => 0);
  calculateDraw(source, (max) => max - 1);
  assert.equal(JSON.stringify(source), before);
});
