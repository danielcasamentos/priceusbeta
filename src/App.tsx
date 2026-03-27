import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { DashboardPage } from './pages/DashboardPage'
import { PricingPage } from './pages/PricingPage'
import { SuccessPage } from './pages/SuccessPage'
import { QuotePage } from './pages/QuotePage'
import { PublicProfilePage } from './pages/PublicProfilePage'
import { ContractSignPage } from './pages/ContractSignPage'
import { ContractCompletePage } from './pages/ContractCompletePage'
import { ContractVerificationPage } from './pages/ContractVerificationPage'; // Adicionado
import { ContractPreviewPage } from './pages/ContractPreviewPage' // Adicionado
import { ReviewPage } from './pages/ReviewPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useTawkTo } from './hooks/useTawkTo'
import { checkEnvVariables } from './lib/debug';
import { supabase } from './lib/supabase';

function App() {
  useTawkTo(); // Inicializa o Tawk.to e esconde o widget

  useEffect(() => {
    checkEnvVariables();
    // Fallback: Verifica manualmente se há type=recovery no hash no carregamento
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      window.location.href = '/reset-password' + window.location.hash;
    }

    // Escuta o evento de recuperação de senha e redireciona imediatamente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password' + window.location.hash;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/success" element={<SuccessPage />} />
          <Route path="/orcamento/:templateUuid" element={<QuotePage />} />
          {/* Rotas do Dashboard DEVEM vir antes das rotas dinâmicas com :slugUsuario */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/:page"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          {/* Rotas públicas com slug (perfil público e template) */}
          <Route path="/:slugUsuario" element={<PublicProfilePage />} />
          <Route path="/:slugUsuario/:slugTemplate" element={<QuotePage />} />
          <Route path="/avaliar/:token" element={<ReviewPage />} />
          <Route path="/contrato/:token" element={<ContractSignPage />} />
          <Route path="/contrato/:token/preview" element={<ContractPreviewPage />} />
          <Route path="/verificar/:token" element={<ContractVerificationPage />} />
          <Route path="/contrato/:token/completo" element={<ContractCompletePage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App