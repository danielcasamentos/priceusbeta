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
  Crown
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
  { id: 'empresa', label: 'Empresa', icon: Building },
  { id: 'contratos', label: 'Contratos', icon: FileSignature },
  { id: 'profile', label: 'Perfil', icon: UserCircle },
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
    
    if (itemId === 'empresa') {
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
    return currentPage === itemId;
  };

  return (
    <>
      {/* Menu Inferior Fixo */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 safe-area-pb">
        <div className="flex justify-around items-center h-16 px-2">
          {mainItems.map((item) => {
            const isActive = isCurrentPage(item.id);
            const isExpanded = expandedMenu === 'empresa' && item.id === 'empresa';
            
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-colors ${
                  isActive 
                    ? 'text-green-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-6 h-6 ${isActive ? 'fill-current' : ''}`} />
                  {item.id === 'empresa' && (
                    <ChevronUp 
                      className={`absolute -top-3 -right-2 w-3 h-3 transition-transform ${
                        isExpanded ? 'rotate-0' : 'rotate-180'
                      }`} 
                    />
                  )}
                </div>
                <span className="text-xs mt-1 font-medium truncate max-w-[60px]">
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 rounded-t" />
                )}
              </button>
            );
          })}
        </div>

        {/* Submenu Empresa Expandido */}
        {expandedMenu === 'empresa' && (
          <div className={`absolute left-2 right-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden ${
            showBanner ? 'bottom-[100px]' : 'bottom-16'
          }`}>
            <div className="max-h-64 overflow-y-auto">
              {empresaSubItems.map((subItem) => {
                const isSubItemActive = currentPage === subItem.id;
                return (
                  <button
                    key={subItem.id}
                    onClick={() => handleItemClick(subItem.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isSubItemActive
                        ? 'bg-green-50 text-green-700'
                        : 'text-gray-700 hover:bg-gray-50'
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
          className="fixed bottom-16 left-0 right-0 h-9 z-50 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 border-t border-amber-400/30 flex items-center shadow-lg cursor-pointer overflow-hidden select-none"
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
      <div className={showBanner ? "h-[100px]" : "h-20"} />
    </>
  );
}

