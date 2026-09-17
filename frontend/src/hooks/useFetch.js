import { useCallback, useEffect, useState } from 'react';
// Callers memoize load. Cleanup protects state even when a transport ignores abort.
export default function useFetch(load) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
  });
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    Promise.resolve()
      .then(() => {
        if (current) setState({ status: 'loading', data: null, error: null });
        return load(controller.signal);
      })
      .then((data) => {
        if (current) setState({ status: 'ready', data, error: null });
      })
      .catch((error) => {
        if (current) setState({ status: 'error', data: null, error });
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [load, attempt]);
  return { ...state, retry };
}
