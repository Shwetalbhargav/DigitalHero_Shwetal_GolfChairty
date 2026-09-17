import { useRef, useState } from 'react';
import { api } from '../../services/api.js';
export function useAdminAction(onDone) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const pending = useRef(false);
  async function run(path, method, body, success = 'Saved.') {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await api('/admin' + path, {
        method,
        body: JSON.stringify(body),
      });
      setMessage(success);
      onDone?.(data);
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { busy, error, message, run, setError };
}
