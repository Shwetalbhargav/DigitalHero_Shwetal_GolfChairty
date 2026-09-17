import { Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import useFetch from '../../hooks/useFetch.js';
import { getDashboard } from '../../modules/users/user.api.js';
import ScoreProgress from '../../components/scores/ScoreProgress.jsx';
import { displayRoundDate } from '../../components/scores/ScoreCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Card from '../../components/common/Card.jsx';
import SignOutButton from '../../modules/auth/SignOutButton.jsx';
import { formatMoney } from '../../components/draws/DrawComponents.jsx';
function DashboardSection({ title, section, retry, children }) {
  return (
    <Card as="section" className="dashboard-card">
      <h2>{title}</h2>
      {section.status === 'error' ? (
        <ErrorState
          title="Temporarily unavailable"
          message={section.message}
          onRetry={retry}
        />
      ) : (
        children
      )}
    </Card>
  );
}
export default function DashboardPage() {
  const { user } = useAuth();
  const result = useFetch(getDashboard);
  const data = result.data;
  const membership = data?.subscription.data;
  const scores = data?.scores.data;
  const charity = data?.charity.data;
  return (
    <section className="stack-form">
      <p className="eyebrow">YOUR CLUBHOUSE</p>
      <h1>Welcome back, {user.name}</h1>
      <p>Your membership, rounds and charitable pledge in one place.</p>
      <div className="button-row">
        <Link className="button button--primary" to="/dashboard/scores">
          Your scores
        </Link>
        <Link className="button button--secondary" to="/dashboard/profile">
          Profile & settings
        </Link>
      </div>
      {result.status === 'loading' && <Loader label="Loading dashboard…" />}
      {result.status === 'error' && (
        <ErrorState message={result.error.message} onRetry={result.retry} />
      )}
      {data && (
        <section className="card next-action" aria-labelledby="next-action-title">
          <p className="eyebrow">YOUR NEXT STEP</p>
          <h2 id="next-action-title">{data.winnings.data?.needsProof?.length ? 'Your winning entry needs proof' : data.subscription.status !== 'ready' || data.scores.status !== 'ready' ? 'Check your membership status' : !membership?.active ? 'Activate your membership' : scores?.count < 5 ? `Add ${5 - scores.count} more ${scores.count === 4 ? 'round' : 'rounds'}` : 'You are ready for the next draw'}</h2>
          <p>Choose your cause, activate membership and record five scores. Participation is confirmed when a draw is published.</p>
          <ol className="onboarding-checklist"><li>{charity ? '✓' : '○'} Choose your charity</li><li>{membership?.active ? '✓' : '○'} Activate membership</li><li>{scores?.count === 5 ? '✓' : '○'} Record five scores ({scores?.count ?? 0}/5)</li></ol>
          <Link className="button button--primary" to={data.winnings.data?.needsProof?.length ? '/dashboard/winnings/' + data.winnings.data.needsProof[0] : !membership?.active ? '/dashboard/subscription' : scores?.count < 5 ? '/dashboard/scores/new' : '/dashboard/draws'}>{data.winnings.data?.needsProof?.length ? 'Submit winning proof' : !membership?.active ? 'Manage membership' : scores?.count < 5 ? 'Add remaining scores' : 'View draw details'}</Link>
        </section>
      )}
      {data && (
        <div className="dashboard-cards">
          <DashboardSection
            title="Subscription & renewal"
            section={data.subscription}
            retry={result.retry}
          >
            {membership ? (
              <>
                <p className="eyebrow">
                  {membership.status} · {membership.plan} · simulated
                </p>
                <p>
                  Period ends{' '}
                  <time dateTime={membership.periodEnd}>
                    {new Date(membership.periodEnd).toLocaleString('en-GB', {
                      timeZone: 'UTC',
                    })}{' '}
                    UTC
                  </time>
                  .
                </p>
                <p>
                  {membership.cancelAtPeriodEnd
                    ? 'Cancellation is scheduled at period end.'
                    : 'Renewal is manual in demo mode.'}
                </p>
              </>
            ) : (
              <p>No subscription is active.</p>
            )}
            <Link to="/dashboard/subscription">Manage subscription</Link>
          </DashboardSection>
          <DashboardSection
            title="Latest scores"
            section={data.scores}
            retry={result.retry}
          >
            {scores && (
              <>
                <ScoreProgress
                  count={scores.count}
                  active={
                    data.subscription.status === 'error'
                      ? null
                      : !!membership?.active
                  }
                />
                {scores.items.length ? (
                  <ol className="dashboard-rounds">
                    {scores.items.map((score) => (
                      <li key={score.id}>
                        <time dateTime={score.roundDate}>
                          {displayRoundDate(
                            score.roundDate,
                            user.displayDateFormat,
                          )}
                        </time>
                        <strong>{score.value} points</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p>No rounds recorded yet.</p>
                )}
                <Link to="/dashboard/scores">Manage scores</Link>
              </>
            )}
          </DashboardSection>
          <DashboardSection
            title="Your chosen charity"
            section={data.charity}
            retry={result.retry}
          >
            {charity ? (
              <>
                <h3>{charity.name}</h3>
                <p>
                  {charity.contributionPercent}% contribution ·{' '}
                  {charity.isDemo ? 'Demo charity' : charity.category}
                </p>
                {!charity.active && (
                  <p>
                    This charity is inactive. Choose an active charity before
                    your next checkout.
                  </p>
                )}
              </>
            ) : (
              <p>Your selected charity is no longer available.</p>
            )}
            <Link to="/dashboard/charity">Manage charitable pledge</Link>
          </DashboardSection>
          <DashboardSection
            title="Upcoming draw"
            section={data.upcomingDraw}
            retry={result.retry}
          >
            {data.upcomingDraw.status === 'ready' ? (
              <>
                <p>
                  {data.upcomingDraw.data
                    ? `${data.upcomingDraw.data.month} · ${new Date(data.upcomingDraw.data.scheduledAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC`
                    : 'No upcoming draw is configured.'}
                </p>
                <Link to="/dashboard/draws">View published draws</Link>
              </>
            ) : (
              <>
                <p>Unavailable</p>
                <p>
                  {data.upcomingDraw.message} No next-draw date has been
                  announced here.
                </p>
              </>
            )}
          </DashboardSection>
          <DashboardSection
            title="Participation count"
            section={data.participation}
            retry={result.retry}
          >
            {data.participation.status === 'ready' ? (
              <>
                <p>{data.participation.count} published draws entered</p>
                <Link to="/dashboard/draws">Your draw results</Link>
              </>
            ) : (
              <>
                <p>Unavailable</p>
                <p>
                  {data.participation.message} Recorded scores alone do not
                  confirm participation.
                </p>
              </>
            )}
          </DashboardSection>
          <DashboardSection
            title="Winnings"
            section={data.winnings}
            retry={result.retry}
          >
            {data.winnings.status === 'ready' ? (
              <>
                <p>Simulated prize and settlement records</p>
                {data.winnings.data.totals.length ? (
                  data.winnings.data.totals.map((total) => (
                    <p key={total.currency}>
                      Won {formatMoney(total.wonMinor, total.currency)} · Paid{' '}
                      {formatMoney(total.paidMinor, total.currency)}
                    </p>
                  ))
                ) : (
                  <p>No winnings recorded.</p>
                )}
                <Link to="/dashboard/winnings">Manage winnings and proof</Link>
              </>
            ) : (
              <>
                <p>Unavailable</p>
                <p>
                  {data.winnings.message} No winnings total is represented here.
                </p>
              </>
            )}
          </DashboardSection>
        </div>
      )}
      <SignOutButton />
    </section>
  );
}
