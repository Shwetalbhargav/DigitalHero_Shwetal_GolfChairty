import AuthCard from '../../modules/auth/AuthCard.jsx';
import AuthForm from '../../modules/auth/AuthForm.jsx';
export default function LoginPage() {
  return (
    <AuthCard title="Welcome back to your club">
      <AuthForm />
    </AuthCard>
  );
}
