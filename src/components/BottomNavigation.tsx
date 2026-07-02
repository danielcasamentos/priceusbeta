import { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Building, 
  ChevronUp,
  Home,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Settings,
  UserCircle,
  Sun,
  FileSignature,
  Crown,
  Calendar,
  ClipboardList,
  CheckCircle2
} from 'lucide-react';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { useSubscription } from '../hooks/useSubscription';

interface BottomNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

// Itens principais do menu
const mainItems = [
  { id: 'meu-dia', label: 'Meu Dia', icon: Sun },
  { id: 'leads', label: 'Leads', icon: LayoutDashboard },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'empresa', label: 'Empresa', icon: Building },
  { id: 'contratos', label: 'Contratos', icon: FileSignature },
  { id: 'profile', label: 'Perfil', icon: UserCircle },
];

// Sub-itens do menu Leads
const leadsSubItems = [
  { id: 'leads-timeline', label: 'Timeline de Leads', icon: LayoutDashboard },
  { id: 'leads-workflow', label: 'Workflow', icon: ClipboardList },
  { id: 'leads-finalizados', label: 'Finalizados', icon: CheckCircle2 },
];

// Sub-itens do menu Empresa
const empresaSubItems = [
  { id: 'empresa-dashboard', label: 'Visão Geral', icon: Home },
  { id: 'empresa-transacoes', label: 'Transações', icon: TrendingUp },
  { id: 'empresa-analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'empresa-insights', label: 'Insights', icon: Lightbulb },
  { id: 'empresa-dados', label: 'Dados', icon: Settings },
];

export function BottomNavigation({ currentPage, onPageChange }: BottomNavigationProps) {
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null);
  const planLimits = usePlanLimits();
  const { isActive } = useSubscription();

  const showBanner = !isActive && !planLimits.loading && !planLimits.isPrivileged;

  console.log('[BottomNavigation] Renderizando, página atual:', currentPage);

  const handleItemClick = (itemId: string) => {
    console.log('[BottomNavigation] Item clicado:', itemId);
    
    if (itemId === 'leads') {
      // Toggle do submenu Leads
      if (expandedMenu === 'leads') {
        setExpandedMenu(null);
      } else {
        setExpandedMenu('leads');
      }
    } else if (itemId === 'leads-timeline') {
      onPageChange('leads');
      setExpandedMenu(null);
      window.history.pushState(null, '', '/dashboard/leads?tab=leads');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (itemId === 'leads-workflow') {
      onPageChange('leads');
      setExpandedMenu(null);
      window.history.pushState(null, '', '/dashboard/leads?tab=producao');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (itemId === 'leads-finalizados') {
      onPageChange('leads');
      setExpandedMenu(null);
      window.history.pushState(null, '', '/dashboard/leads?tab=finalizados');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (itemId === 'empresa') {
      // Toggle do submenu Empresa
      if (expandedMenu === 'empresa') {
        setExpandedMenu(null);
      } else {
        setExpandedMenu('empresa');
      }
    } else if (itemId.startsWith('empresa-')) {
      // É um sub-item de Empresa
      onPageChange(itemId);
      setExpandedMenu(null);
    } else {
      // Navegação normal
      onPageChange(itemId);
      setExpandedMenu(null);
    }
  };

  const isCurrentPage = (itemId: string): boolean => {
    if (itemId === 'empresa') {
      return currentPage.startsWith('empresa-');
    }
    if (itemId === 'leads') {
      return currentPage === 'leads' || currentPage.startsWith('leads-');
    }
    return currentPage === itemId;
  };

  return (
    <>
      {/* Menu Inferior Fixo com design Liquid Glass Flutuante */}
      <nav className="fixed bottom-4 left-4 right-4 bg-[#032416]/85 border border-emerald-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.5)] z-50 rounded-2xl safe-area-pb backdrop-blur-md">
        <div className="flex justify-around items-center h-16 px-1">
          {mainItems.map((item) => {
            const isActive = isCurrentPage(item.id);
            const isExpanded = (expandedMenu === 'empresa' && item.id === 'empresa') || (expandedMenu === 'leads' && item.id === 'leads');
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1.5 transition-all relative ${
                  isActive 
                    ? 'text-emerald-400' 
                    : 'text-emerald-100/60 hover:text-emerald-100'
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px] drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]' : ''}`} />
                  {(item.id === 'empresa' || item.id === 'leads') && (
                    <ChevronUp 
                      className={`absolute -top-3 -right-2 w-3 h-3 transition-transform ${
                        isExpanded ? 'rotate-0' : 'rotate-180'
                      }`} 
                    />
                  )}
                </div>
                <span className="text-[9px] mt-0.5 font-medium truncate max-w-[42px] leading-tight">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-emerald-400 rounded-full shadow-[0_0_8px_#34d399]" />
                )}
              </button>
            );
          })}
        </div>

        {/* Submenu Leads Expandido */}
        {expandedMenu === 'leads' && (
          <div className="absolute left-0 right-0 bottom-20 bg-[#022215]/95 backdrop-blur-md rounded-2xl border border-emerald-500/20 overflow-hidden shadow-2xl z-50">
            <div className="max-h-64 overflow-y-auto">
              {leadsSubItems.map((subItem) => {
                const params = new URLSearchParams(window.location.search);
                const currentTab = params.get('tab') || 'leads';
                const isSubItemActive = currentPage === 'leads' && (
                  (subItem.id === 'leads-timeline' && currentTab === 'leads') ||
                  (subItem.id === 'leads-workflow' && currentTab === 'producao') ||
                  (subItem.id === 'leads-finalizados' && currentTab === 'finalizados')
                );
                return (
                  <button
                    key={subItem.id}
                    onClick={() => handleItemClick(subItem.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSubItemActive
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                        : 'text-emerald-100/80 hover:text-emerald-100 hover:bg-emerald-500/10'
                    }`}
                  >
                    <subItem.icon className="w-5 h-5" />
                    <span className="font-medium">{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Submenu Empresa Expandido */}
        {expandedMenu === 'empresa' && (
          <div className="absolute left-0 right-0 bottom-20 bg-[#022215]/95 backdrop-blur-md rounded-2xl border border-emerald-500/20 overflow-hidden shadow-2xl z-50">
            <div className="max-h-64 overflow-y-auto">
              {empresaSubItems.map((subItem) => {
                const isSubItemActive = currentPage === subItem.id;
                return (
                  <button
                    key={subItem.id}
                    onClick={() => handleItemClick(subItem.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSubItemActive
                        ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                        : 'text-emerald-100/80 hover:text-emerald-100 hover:bg-emerald-500/10'
                    }`}
                  >
                    <subItem.icon className="w-5 h-5" />
                    <span className="font-medium">{subItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Faixa Animada (Upgrade) acima do bottom menu */}
      {showBanner && (
        <div 
          onClick={() => {
            window.location.href = '/pricing';
          }}
          className="fixed bottom-[88px] left-4 right-4 h-9 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border border-amber-400/30 flex items-center rounded-xl shadow-lg cursor-pointer overflow-hidden select-none"
        >
          {/* Badge PRO Fixo à Esquerda */}
          <div className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded text-[10px] font-extrabold ml-3 flex items-center gap-1 z-10 shadow-sm flex-shrink-0">
            <Crown className="w-3.5 h-3.5 fill-current" />
            PRO
          </div>

          {/* Container do Texto Deslizante */}
          <div className="flex-1 overflow-hidden relative flex items-center h-full">
            <div className="flex animate-marquee whitespace-nowrap">
              <span className="text-[11px] font-semibold tracking-wider text-white uppercase px-4">
                ✨ PRICEUS PRO: Libere orçamentos e leads ilimitados, assinatura digital de contratos e fluxo de caixa automático! Clique aqui e assine agora. ✨
              </span>
              <span className="text-[11px] font-semibold tracking-wider text-white uppercase px-4">
                ✨ PRICEUS PRO: Libere orçamentos e leads ilimitados, assinatura digital de contratos e fluxo de caixa automático! Clique aqui e assine agora. ✨
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Espaçamento para evitar que o conteúdo seja coberto */}
      <div className={showBanner ? "h-36" : "h-24"} />
    </>
  );
}

