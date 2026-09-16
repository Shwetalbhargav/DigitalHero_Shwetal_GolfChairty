import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import Card from '../../components/common/Card.jsx';
import SectionTitle from '../../components/common/SectionTitle.jsx';
import Loader from '../../components/common/Loader.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import Button from '../../components/common/Button.jsx';
import Badge from '../../components/common/Badge.jsx';
export default function ServiceStatus({ standalone = true }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    api('/ready', { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState(
            data.status === 'ready' && data.database === 'connected'
              ? { status: 'ready' }
              : {
                  status: 'error',
                  message:
                    'The service returned an unexpected readiness response.',
                },
          );
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({
            status: 'error',
            message: error.message,
            requestId: error.requestId,
          });
      });
    return () => controller.abort();
  }, [attempt]);
  function retry() {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }
  return (
    <section className="stack">
      <SectionTitle
        as={standalone ? 'h1' : 'h2'}
        eyebrow="LIVE CONNECTION"
        title="Service status"
        description="A direct check of the API and its database connection."
      />
      <Card className="service-card">
        {state.status === 'loading' ? (
          <>
            <Loader label="Checking the connection…" />
            <Button loading loadingText="Checking…">
              Check connection again
            </Button>
          </>
        ) : state.status === 'error' ? (
          <ErrorState
            title="A moment off the green."
            message={state.message}
            requestId={state.requestId}
            onRetry={retry}
          />
        ) : (
          <div className="feedback">
            <Badge variant="success">Connected</Badge>
            <h3>Ready for what comes next.</h3>
            <p role="status">The API is responding and MongoDB is connected.</p>
            <Button onClick={retry}>Check connection again</Button>
          </div>
        )}
      </Card>
    </section>
  );
}
