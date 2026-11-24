import { useNavigate } from 'react-router-dom';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            PriceUs
          </h1>
          <p className="text-gray-600">
            Sistema de Orçamentos Profissional
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <ForgotPasswordForm onBackToLogin={() => navigate('/login')} />
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Lembrou sua senha?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Fazer login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
