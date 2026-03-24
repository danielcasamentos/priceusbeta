import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTrialStatus } from '../hooks/useTrialStatus';
import { useNavigate, useParams } from 'react-router-dom';
import { TrialBanner } from '../components/TrialBanner';
import { FreePlanBanner } from '../components/FreePlanBanner';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { LeadsManager } from '../components/LeadsManager';
import { TemplateEditor } from '../components/TemplateEditor';
import { TemplatesManager } from '../components/TemplatesManager';
import { ProfileEditorWithThemeSelector } from '../components/ProfileEditorWithThemeSelector';
import { HelpCenter } from '../components/HelpCenter';
import { VideoGallery } from '../components/VideoGallery';
import { LogOut, Menu } from 'lucide-react';
import { ContractsManager } from '../components/ContractsManager';
import { AgendaManager } from '../components/AgendaManager';
import { TemplatesContracts } from '../components/TemplatesContracts';
import { Sidebar } from '../components/Sidebar';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { ReviewsManager } from '../components/ReviewsManager';
import { CompanyDashboard } from '../components/company/CompanyDashboard';
import { CompanyTransactions } from '../components/company/CompanyTransactions'; // Já estava aqui
import { CompanyAnalytics } from '../components/company/CompanyAnalytics'; // Adicionado
import { CompanyInsights } from '../components/company/CompanyInsights'; // Adicionado
import { BusinessSettingsEditor } from '../components/BusinessSettingsEditor'; // Adicionado
import NotificationCenter from '../components/NotificationCenter'; // Import NotificationCenter
import { AppInstallBanner } from '../components/AppInstallBanner';
import { TawkToChat } from '../components/TawkToChat';
import { BottomNavigation } from '../components/BottomNavigation';
import { useDeviceType } from '../hooks/useDeviceType';

export function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const trialStatus = useTrialStatus(user?.id);
  const planLimits = usePlanLimits();
  const { isMobile } = useDeviceType();
  
  console.log('[DashboardPage] Tipo de dispositivo:', { isMobile });
  
  // Captura a página da URL ou usa 'templates' como padrão
  const urlPage = params.page;
  const [currentPage, setCurrentPage] = useState<string>(urlPage || 'templates');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [contractTab, setContractTab] = useState<'templates' | 'manager'>('templates');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sincroniza o estado com a URL quando a página mudar
  useEffect(() => {
    if (urlPage) {
      setCurrentPage(urlPage);
    }
  }, [urlPage]);

  // A verificação do usuário deve vir DEPOIS de todos os hooks.
  if (!user) {
    return null; // ou um componente de loading
  }

  const handlePageChange = (page: string) => {
    setCurrentPage(page);
    setEditingTemplateId(null);
    // Navega para a URL correspondente
    navigate(`/dashboard/${page}`);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'templates':
        return 'Meus Templates';
      case 'leads':
        return 'Gestão de Leads';
      case 'contratos':
        return 'Contratos';
      case 'agenda':
        return 'Agenda';
      case 'avaliacoes':
        return 'Avaliações de Clientes';
      case 'profile':
        return 'Meu Perfil';
      case 'videos':
        return 'Tutoriais em Vídeo';
      case 'ajuda':
        return 'FAQ e Ajuda';
      case 'empresa-dashboard':
        return 'Visão Geral da Empresa';
      case 'empresa-transacoes':
        return 'Transações';
      case 'empresa-analytics':
        return 'Analytics';
      case 'empresa-insights':
        return 'Insights';
      case 'empresa-dados':
        return 'Dados Empresariais';
      default:
        return '';
    }
  };

  const getBreadcrumbs = () => {
    const crumbs = [{ label: 'Dashboard' }];

    if (currentPage.startsWith('empresa-')) {
      crumbs.push({ label: 'Empresa', onClick: () => handlePageChange('empresa-dashboard') });
      crumbs.push({ label: getPageTitle() });
    } else if (editingTemplateId) {
      crumbs.push({ label: 'Meus Templates', onClick: () => setEditingTemplateId(null) });
      crumbs.push({ label: 'Editar Template' });
    } else {
      crumbs.push({ label: getPageTitle() });
    }

    return crumbs;
  };

  // Condição para exibir o Tawk.to
  const showTawkTo = currentPage === 'ajuda' || currentPage === 'videos';

  return (
    <div className="min-h-screen bg-gray-50">
      {
        !planLimits.isPrivileged && trialStatus.status === 'trial' && trialStatus.daysRemaining !== null && !trialStatus.isExpired && (
          <TrialBanner daysRemaining={trialStatus.daysRemaining} isExpired={trialStatus.isExpired} />
        )
      }

      {planLimits.showUpgradeBanner && trialStatus.status !== 'trial' && (
        <FreePlanBanner />
      )}

      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Botão hamburger só aparece em desktop (não em mobile) */}
            {!isMobile && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
            )}
            {/* Logo e título - oculto em desktop (aparece na sidebar) */}
            {isMobile && (
              <div className="flex items-center gap-3">
                <img
                  src="/Logo Price Us.png"
                  alt="Price Us"
                  className="h-10 w-auto"
                />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Price Us</h1>
                  <p className="text-xs text-gray-600 hidden sm:block">
                    {user?.email?.split('@')[0]}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {user?.id && (
              <NotificationCenter userId={user.id} onNavigate={handlePageChange} />
            )}
            <button
              onClick={signOut}
              title="Sair"
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      <Sidebar
        currentPage={currentPage}
        onPageChange={handlePageChange}
        userEmail={user.email}
        // Sidebar mobile só aparece quando NÃO é mobile (para não conflitar com BottomNavigation)
        isMobile={!isMobile}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex">
        {/* Sidebar desktop - só aparece em desktop */}
        {!isMobile && (
          <Sidebar
            currentPage={currentPage}
            onPageChange={handlePageChange}
            userEmail={user.email}
          />
        )}

        <main className={`flex-1 overflow-y-auto ${isMobile ? 'pb-4' : ''}`}>
          {/* Renderiza o Tawk.to condicionalmente */}
          {showTawkTo && <TawkToChat />}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Breadcrumbs items={getBreadcrumbs()} />

            <div className="mb-6">
              <AppInstallBanner variant="mini" />
            </div>

            {editingTemplateId ? (

              <TemplateEditor
                templateId={editingTemplateId}
                onBack={() => setEditingTemplateId(null)}
              />
            ) : currentPage === 'templates' ? (
              <TemplatesManager userId={user.id} onEditTemplate={setEditingTemplateId} />
            ) : currentPage === 'agenda' ? (
              <AgendaManager userId={user.id} />
            ) : currentPage === 'leads' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestão de Leads</h2>
                  <p className="text-gray-600">
                    Acompanhe todos os orçamentos gerados e gerencie seus contatos.
                  </p>
                </div>
                <LeadsManager userId={user.id} />
              </>
            ) : currentPage === 'videos' ? (
              <VideoGallery />
            ) : currentPage === 'ajuda' ? (
              <HelpCenter onClose={() => setCurrentPage('templates')} />
            ) : currentPage === 'avaliacoes' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Avaliações de Clientes</h2>
                  <p className="text-gray-600">
                    Gerencie as avaliações recebidas e controle sua visibilidade pública.
                  </p>
                </div>
                <ReviewsManager userId={user.id} />
              </>
            ) : currentPage === 'contratos' ? (
              <div>
                <div className="border-b border-gray-200 mb-6">
                  <nav className="-mb-px flex gap-6">
                    <button
                      onClick={() => setContractTab('templates')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        contractTab === 'templates'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Modelos de Contrato
                    </button>
                    <button
                      onClick={() => setContractTab('manager')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        contractTab === 'manager'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Contratos Gerados
                    </button>
                  </nav>
                </div>
                {contractTab === 'templates' ? <TemplatesContracts userId={user.id} /> : <ContractsManager userId={user.id} />}
              </div>
            ) : currentPage === 'empresa-transacoes' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Transações</h2>
                  <p className="text-gray-600">
                    Gerencie transações, dados empresariais, analytics e insights do seu negócio.
                  </p>
                </div>
                <CompanyTransactions userId={user.id} />
              </>
            ) : currentPage === 'empresa-dashboard' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Visão Geral da Empresa</h2>
                  <p className="text-gray-600">
                    Acompanhe o desempenho financeiro do seu negócio.
                  </p>
                </div>
                <CompanyDashboard
                  userId={user.id}
                  onNewTransaction={() => handlePageChange('empresa-transacoes')}
                />
              </>
            ) : currentPage === 'empresa-analytics' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h2>
                  <p className="text-gray-600">
                    Análise detalhada do desempenho financeiro.
                  </p>
                </div>
                <CompanyAnalytics userId={user.id} />
              </>
            ) : currentPage === 'empresa-insights' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Insights</h2>
                  <p className="text-gray-600">
                    Recomendações inteligentes para otimizar seu negócio.
                  </p>
                </div>
                <CompanyInsights userId={user.id} />
              </>
            ) : currentPage === 'empresa-dados' ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Dados Empresariais</h2>
                  <p className="text-gray-600">
                    Configure os dados da sua empresa para usar nos contratos digitais.
                  </p>
                </div>
                <BusinessSettingsEditor userId={user.id} />
              </>
            ) : currentPage === 'profile' ? (
              <ProfileEditorWithThemeSelector userId={user.id} />
            ) : null}
          </div>
        </main>
      </div> {/* Esta div fecha o <div className="flex"> */}

      {/* Menu inferior para dispositivos móveis */}
      {isMobile && (
        <BottomNavigation 
          currentPage={currentPage} 
          onPageChange={handlePageChange} 
        />
      )}

      <footer className={`bg-white border-t border-gray-200 ${isMobile ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
          <p>© 2025 Price Us. Sistema de Orçamentos Inteligente.</p>
        </div>
      </footer>
    </div> // Esta div fecha o <div className="min-h-screen bg-gray-50">
  );
}
