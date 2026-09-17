import { randomInt } from 'node:crypto';
// Integer draws avoid floating-point RNG bias. Tests inject a bounded integer source.
export function sampleNumbers(
  entries,
  strategy = 'random',
  integer = randomInt,
) {
  if (!['random', 'weighted'].includes(strategy))
    throw new Error('Invalid draw strategy');
  const choices = Array.from({ length: 45 }, (_, i) => ({
    number: i + 1,
    weight: 1,
  }));
  if (strategy === 'weighted') {
    for (const entry of entries)
      for (const value of new Set(entry.scores.map((score) => score.value))) {
        if (!Number.isInteger(value) || value < 1 || value > 45)
          throw new Error('Invalid score snapshot');
        choices[value - 1].weight++;
      }
  }
  const numbers = [];
  while (numbers.length < 5) {
    const total = choices.reduce((sum, item) => sum + item.weight, 0);
    let ticket = integer(total);
    if (!Number.isInteger(ticket) || ticket < 0 || ticket >= total)
      throw new Error('Random source out of bounds');
    let index = 0;
    while (ticket >= choices[index].weight) ticket -= choices[index++].weight;
    numbers.push(choices.splice(index, 1)[0].number);
  }
  return numbers.sort((a, b) => a - b);
}
export function distinctMatches(scores, numbers) {
  return [...new Set(scores.map((score) => score.value))]
    .filter((value) => numbers.includes(value))
    .sort((a, b) => a - b);
}
export function calculateDraw(
  { entries, poolMinor, rolloverMinor = 0, strategy = 'random', numbers },
  integer,
) {
  for (const amount of [poolMinor, rolloverMinor, poolMinor + rolloverMinor])
    if (!Number.isSafeInteger(amount) || amount < 0)
      throw new Error('Pool must be nonnegative safe minor units');
  if (
    new Set(entries.map((entry) => entry.user)).size !== entries.length ||
    entries.some((entry) => entry.scores.length !== 5)
  )
    throw new Error('One five-score entry per member is required');
  numbers ||= sampleNumbers(entries, strategy, integer);
  if (
    numbers.length !== 5 ||
    new Set(numbers).size !== 5 ||
    numbers.some((n) => !Number.isInteger(n) || n < 1 || n > 45)
  )
    throw new Error('Five distinct draw numbers required');
  const outcomes = entries.map((entry) => {
    const matches = distinctMatches(entry.scores, numbers);
    return {
      user: entry.user,
      matches,
      tier: matches.length >= 3 ? matches.length : null,
      amountMinor: 0,
    };
  });
  // Allocate floor pennies to 3/4; the residual belongs to the 5 tier, conserving all money.
  const three = Number((BigInt(poolMinor) * 25n) / 100n);
  const four = Number((BigInt(poolMinor) * 35n) / 100n);
  const amounts = {
    3: three,
    4: four,
    5: poolMinor - three - four + rolloverMinor,
  };
  const tiers = [3, 4, 5].map((tier) => {
    const winners = outcomes
      .filter((row) => row.tier === tier)
      .sort((a, b) => a.user.localeCompare(b.user));
    const amountMinor = amounts[tier];
    for (const [index, winner] of winners.entries())
      winner.amountMinor =
        Math.floor(amountMinor / winners.length) +
        (index < amountMinor % winners.length ? 1 : 0);
    return {
      tier,
      percentage: { 3: 25, 4: 35, 5: 40 }[tier],
      amountMinor,
      winnerCount: winners.length,
      awardedMinor: winners.length ? amountMinor : 0,
    };
  });
  return {
    numbers: [...numbers].sort((a, b) => a - b),
    strategy,
    poolMinor,
    incomingRolloverMinor: rolloverMinor,
    tiers,
    outcomes,
    rolloverMinor: tiers[2].winnerCount ? 0 : amounts[5],
    unclaimedMinor: tiers
      .slice(0, 2)
      .reduce(
        (sum, tier) => sum + (tier.winnerCount ? 0 : tier.amountMinor),
        0,
      ),
    awardedMinor: tiers.reduce((sum, tier) => sum + tier.awardedMinor, 0),
  };
}
