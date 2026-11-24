import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function SignupPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para a nova página de login, que agora centraliza o cadastro.
    navigate('/login');
  }, [navigate]);

  return null; // Não renderiza nada, pois o redirecionamento é imediato.
}