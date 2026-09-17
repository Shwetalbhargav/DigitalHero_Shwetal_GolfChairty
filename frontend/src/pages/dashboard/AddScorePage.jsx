import { Link, useNavigate } from 'react-router-dom';
import useFetch from '../../hooks/useFetch.js';
import { getScores } from '../../modules/scores/score.api.js';
import ScoreForm from '../../components/scores/ScoreForm.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
export default function AddScorePage() {
  const result = useFetch(getScores);
  const navigate = useNavigate();
  return (
    <section className="stack-form score-editor">
      <Link to="/dashboard/scores">← Your scores</Link>
      <h1>Add a round</h1>
      <p>One whole Stableford score from 1 to 45 per round date.</p>
      {result.status === 'loading' && <Loader label="Checking score access…" />}
      {result.status === 'error' && (
        <ErrorState message={result.error.message} onRetry={result.retry} />
      )}
      {result.data &&
        (result.data.subscription?.active ? (
          <>
            <p>
              {result.data.count === 5
                ? `Your oldest round (${result.data.items.at(-1).roundDate}) will be replaced if you add a newer score.`
                : `${result.data.remaining} more scores are needed for the five-score requirement.`}
            </p>
            <ScoreForm
              allowAnother={result.data.count < 4}
              today={result.data.today}
              onSaved={(response, another) =>
                another ? result.retry() : navigate('/dashboard/scores', {
                  replace: true,
                  state: {
                    notice: response.evictedId
                      ? 'Score saved and oldest round replaced.'
                      : 'Score saved.',
                  },
                })
              }
            />
          </>
        ) : (
          <p>
            Your subscription is inactive.{' '}
            <Link to="/dashboard/subscription">Manage membership</Link> to
            record a round.
          </p>
        ))}
    </section>
  );
}
