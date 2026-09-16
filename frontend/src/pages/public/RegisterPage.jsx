import AuthCard from '../../modules/auth/AuthCard.jsx';
import AuthForm from '../../modules/auth/AuthForm.jsx';
export default function RegisterPage() {
  return (
    <AuthCard title="Begin your journey">
      <AuthForm registration />
    </AuthCard>
  );
}
