import { useContext } from 'react';
import { AuthContext } from '../modules/auth/AuthContext.jsx';
export default function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth requires AuthProvider');
  return context;
}
