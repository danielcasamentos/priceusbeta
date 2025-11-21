import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Mail, ArrowLeft } from 'lucide-react';

interface ForgotPasswordFormProps {
  onBackToLogin?: () => void;
}

export function ForgotPasswordForm({ onBackToLogin }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <Alert type="success">
          <div className="space-y-2">
            <p className="font-semibold">Link de recuperação enviado!</p>
            <p className="text-sm">
              Verifique seu e-mail. Enviamos um link para redefinir sua senha.
            </p>
            <p className="text-sm text-gray-600">
              O link é válido por 1 hora. Se não encontrar o e-mail, verifique a pasta de spam.
            </p>
          </div>
        </Alert>

        {onBackToLogin && (
          <Button
            variant="outline"
            onClick={onBackToLogin}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para o Login
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <Mail className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Esqueceu sua senha?
        </h2>
        <p className="text-gray-600">
          Digite seu e-mail e enviaremos um link para redefinir sua senha
        </p>
      </div>

      {error && (
        <Alert type="error">
          {error}
        </Alert>
      )}

      <Input
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder="seu@email.com"
        autoFocus
      />

      <Button
        type="submit"
        loading={loading}
        className="w-full"
      >
        Enviar Link de Recuperação
      </Button>

      {onBackToLogin && (
        <Button
          type="button"
          variant="outline"
          onClick={onBackToLogin}
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para o Login
        </Button>
      )}
    </form>
  );
}
