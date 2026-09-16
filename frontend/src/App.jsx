import { useEffect, useState } from 'react';
import { api } from './services/api.js';
export default function App() {
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
    <>
      <header>
        <a className="brand" href="/">
          Digital Heroes<span>Feel, not fairway.</span>
        </a>
        <span className="pill">Project foundation</span>
      </header>
      <main>
        <p className="eyebrow">PURPOSE IN EVERY ROUND</p>
        <h1>
          A strong foundation.
          <br />A greater impact.
        </h1>
        <p className="intro">
          Golf, community and giving — built on a connected platform.
        </p>
        <section aria-labelledby="service-title">
          <div className="symbol" aria-hidden="true">
            ↗
          </div>
          <p className="eyebrow">LIVE SERVICE STATUS</p>
          <h2 id="service-title">
            {state.status === 'loading'
              ? 'Checking the connection…'
              : state.status === 'ready'
                ? 'Ready for what comes next.'
                : 'A moment off the green.'}
          </h2>
          <div role="status" aria-live="polite">
            <p>
              {state.status === 'loading'
                ? 'Contacting the API and checking the database.'
                : state.status === 'ready'
                  ? 'The API is responding and MongoDB is connected.'
                  : state.message}
            </p>
            {state.requestId && (
              <p className="request">Reference: {state.requestId}</p>
            )}
          </div>
          <button onClick={retry} disabled={state.status === 'loading'}>
            {state.status === 'loading'
              ? 'Checking…'
              : 'Check connection again'}
          </button>
        </section>
        <p className="note">
          This setup screen verifies the platform connection. Membership,
          scores, draws and payments are not available in this release.
        </p>
      </main>
      <footer>Digital Heroes · Built for purposeful play.</footer>
    </>
  );
}
