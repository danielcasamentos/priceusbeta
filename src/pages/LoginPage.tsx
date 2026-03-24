import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { AppInstallBanner } from '../components/AppInstallBanner';

export function LoginPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <img
          src="/Logo Price Us.png"
          alt="Price Us"
          className="h-16 w-auto mx-auto mb-8"
        />
        <div className="bg-white p-8 rounded-lg shadow-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}</h2>
            <p className="text-gray-600">
              {isLogin ? 'Acesse sua conta para continuar.' : 'Comece seu teste gratuito de 30 dias.'}
            </p>
          </div>
          {isLogin ? (
            <LoginForm onSuccess={handleSuccess} />
          ) : (
            <SignupForm onSuccess={handleSuccess} />
          )}

          <p className="mt-6 text-center text-sm text-gray-600">
            {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
            <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-green-600 hover:text-green-500 ml-1">
              {isLogin ? 'Cadastre-se' : 'Faça login'}
            </button>
          </p>
        </div>
        <div className="mt-6">
          <AppInstallBanner />
        </div>
      </div>
    </div>
  );
}