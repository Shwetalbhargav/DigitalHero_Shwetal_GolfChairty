export default function ScoreProgress({ count, active }) {
  const remaining = Math.max(0, 5 - count);
  return (
    <section className="score-progress" aria-label="Score readiness">
      <h2>Your latest five rounds</h2>
      <p>
        {count} of 5 scores recorded
        {remaining
          ? ` — ${remaining} more ${remaining === 1 ? 'score' : 'scores'} needed for the five-score requirement.`
          : ' — the five-score requirement is met.'}
      </p>
      <progress
        max="5"
        value={count}
        aria-label={`${count} of five scores recorded`}
      />
      <p>
        {active === null
          ? 'Membership status is temporarily unavailable.'
          : active
            ? 'Your demo subscription is active.'
            : 'An active subscription is required to change scores.'}{' '}
        Score readiness does not create a draw entry; published draw rules and
        eligibility checks apply.
      </p>
    </section>
  );
}
