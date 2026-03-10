import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Building, 
  Calendar, 
  FileSignature,
  ChevronUp,
  Home,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Settings
} from 'lucide-react';

interface BottomNavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

// Itens principais do menu
const mainItems = [
  { id: 'leads', label: 'Leads', icon: LayoutDashboard },
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'empresa', label: 'Empresa', icon: Building },
  { id: 'agenda', label: 'Agenda', icon: Calendar },
  { id: 'contratos', label: 'Contratos', icon: FileSignature },
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
          <div className="absolute bottom-16 left-2 right-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
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

      {/* Espaçamento para evitar que o conteúdo seja coberto */}
      <div className="h-20" />
    </>
  );
}

