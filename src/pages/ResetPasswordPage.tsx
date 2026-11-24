import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
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
          <ResetPasswordForm />
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Após redefinir sua senha, você será automaticamente conectado
          </p>
        </div>
      </div>
    </div>
  );
}
