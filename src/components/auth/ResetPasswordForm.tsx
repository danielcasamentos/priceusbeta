import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/button';
import { Input } from '../ui/Input';
import { Alert } from '../ui/Alert';
import { Lock, CheckCircle } from 'lucide-react';

export function ResetPasswordForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password !== confirmPassword) {
      setError('As senhas não correspondem');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
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
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-semibold">Senha redefinida com sucesso!</p>
              <p className="text-sm">
                Você será redirecionado para o painel em instantes...
              </p>
            </div>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <Lock className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Redefinir Senha
        </h2>
        <p className="text-gray-600">
          Crie uma nova senha para sua conta
        </p>
      </div>

      {error && (
        <Alert type="error">
          {error}
        </Alert>
      )}

      <Input
        label="Nova Senha"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        placeholder="Digite sua nova senha (mínimo 6 caracteres)"
        minLength={6}
        autoFocus
      />

      <Input
        label="Confirmar Nova Senha"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        placeholder="Digite a senha novamente"
        minLength={6}
      />

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Dica de segurança:</strong> Use uma senha forte com pelo menos 6 caracteres,
          combinando letras, números e símbolos.
        </p>
      </div>

      <Button
        type="submit"
        loading={loading}
        className="w-full"
      >
        Redefinir Senha
      </Button>
    </form>
  );
}
