import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import * as authApi from './auth.api.js';
export const AuthContext = createContext(null);
export default function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    subscription: null,
    error: null,
  });
  const generation = useRef(0);
  const refresh = useCallback(async (signal) => {
    const version = ++generation.current;
    try {
      const data = await authApi.getSession(signal);
      if (version === generation.current && !signal?.aborted)
        setState({ ...data, status: 'ready', error: null });
      return data;
    } catch (error) {
      if (version === generation.current && !signal?.aborted)
        setState({
          user: null,
          subscription: null,
          status: error.status === 401 ? 'ready' : 'error',
          error: error.status === 401 ? null : error,
        });
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) refresh(controller.signal);
    });
    return () => {
      controller.abort();
    };
  }, [refresh]);
  async function authenticate(action, body) {
    const version = ++generation.current;
    const data = await authApi[action](body);
    if (version === generation.current)
      setState({ ...data, status: 'ready', subscription: null, error: null });
    return data.user;
  }
  async function signOut() {
    await authApi.logout();
    generation.current++;
    // Private pages unmount when identity clears, disposing their request state.
    setState({ status: 'ready', user: null, subscription: null, error: null });
  }
  return (
    <AuthContext.Provider value={{ ...state, refresh, authenticate, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
