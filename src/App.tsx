import { useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './lib/auth';
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
import { InteractiveTutorialsPage } from './pages/InteractiveTutorialsPage'
import { PublicBookingPage } from './pages/PublicBookingPage'
import { PublicGalleryPage } from './pages/PublicGalleryPage';
import { PublicPortfolioPage } from './pages/PublicPortfolioPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
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
    <ThemeProvider>
      <AuthProvider>
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
              {/* Rotas públicas de tutoriais, galerias, políticas e portfólio */}
              <Route path="/politica-de-privacidade" element={<PrivacyPolicyPage />} />
              <Route path="/termos-de-servico" element={<TermsOfServicePage />} />
              <Route path="/tutoriais" element={<InteractiveTutorialsPage />} />
              <Route path="/agendar/:leadId" element={<PublicBookingPage />} />
              <Route path="/g/:slug" element={<PublicGalleryPage />} />
              <Route path="/:slugUsuario/g/:slugGaleria" element={<PublicGalleryPage />} />
              <Route path="/:slugUsuario/portfolio" element={<PublicPortfolioPage />} />
              <Route path="/:slugUsuario" element={<PublicProfilePage />} />
              <Route path="/:slugUsuario/:slugTemplate" element={<QuotePage />} />
              <Route path="/avaliar/:token" element={<ReviewPage />} />
              <Route path="/contrato/:token" element={<ContractSignPage />} />
              <Route path="/contrato/:token/preview" element={<ContractPreviewPage />} />
              <Route path="/verificar/:token" element={<ContractVerificationPage />} />
              <Route path="/contrato/:token/completo" element={<ContractCompletePage />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App