export default function VerificationTimeline({ events }) {
  const labels = {
    winner_declared: 'Winner declared',
    proof_submitted: 'Proof submitted',
    approved: 'Verification approved',
    rejected: 'Verification rejected',
    simulated_payout_paid: 'Simulated payout recorded',
  };
  return (
    <section>
      <h2>Verification timeline</h2>
      <ol className="verification-timeline">
        {events.map((event, index) => (
          <li key={index}>
            <strong>{labels[event.kind] || event.kind}</strong>
            <time dateTime={event.at}>
              {new Date(event.at).toLocaleString('en-GB', { timeZone: 'UTC' })}{' '}
              UTC
            </time>
            {event.reason && <p>{event.reason}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}
