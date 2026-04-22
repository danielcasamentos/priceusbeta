import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileText,
  User as UserIcon,
  Calendar,
  Video,
  FileSignature,
  Building,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Star,
  HelpCircle,
} from 'lucide-react';


interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  userEmail?: string;
  userName?: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  currentPage,
  onPageChange,
  userEmail,
  userName,
  isMobile = false,
  isOpen = true,
  onClose
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    empresa: true
  });

  const menuSections = [
    {
      title: 'Vendas',
      items: [
        { id: 'templates', label: 'Meus Templates', icon: FileText, section: 'vendas' },
        { id: 'leads', label: 'Leads', icon: LayoutDashboard, section: 'vendas' },
        { id: 'contratos', label: 'Contratos', icon: FileSignature, section: 'vendas' },
        { id: 'avaliacoes', label: 'Avaliações', icon: Star, section: 'vendas' },
      ]
    },
    {
      title: 'Gestão Financeira',
      items: [
        {
          id: 'empresa',
          label: 'Empresa',
          icon: Building,
          section: 'gestao',
          subItems: [
            { id: 'empresa-dashboard', label: 'Visão Geral' },
            { id: 'empresa-transacoes', label: 'Transações' },
            { id: 'empresa-analytics', label: 'Analytics' },
            { id: 'empresa-insights', label: 'Insights' },
            { id: 'empresa-dados', label: 'Dados Empresariais' },
          ]
        },
      ]
    },
    {
      title: 'Configurações',
      items: [
        { id: 'agenda', label: 'Agenda', icon: Calendar, section: 'config' },
        { id: 'profile', label: 'Meu Perfil', icon: UserIcon, section: 'config' },
        { id: 'videos', label: 'Tutoriais em Vídeo', icon: Video, section: 'config' },
        { id: 'ajuda', label: 'FAQ e Ajuda', icon: HelpCircle, section: 'config' },
      ]
    }
  ];

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }));
  };

  const handleItemClick = (itemId: string) => {
    onPageChange(itemId);
    if (isMobile && onClose) {
      onClose();
    }
  };

  const isCurrentPage = (itemId: string) => {
    if (itemId === 'empresa') {
      return currentPage.startsWith('empresa-');
    }
    return currentPage === itemId;
  };

  if (isMobile) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="fixed inset-y-0 left-0 w-80 bg-white shadow-xl overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/Logo Price Us.png"
                alt="Price Us"
                className="h-[46px] w-auto"
              />
              <div>
                <h2 className="text-sm font-semibold text-gray-500 leading-tight">Seja bem-vindo,</h2>
                <p className="text-base font-bold text-gray-900 leading-tight">
                  {userName || userEmail?.split('@')[0] || 'Usuário'}
                </p>
                {userEmail && (
                  <p className="text-xs text-gray-400 truncate max-w-[140px]">{userEmail}</p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="p-4 space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div key={item.id}>
                      <button
                        onClick={() => {
                          if (item.subItems) {
                            toggleMenu(item.id);
                          } else {
                            handleItemClick(item.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isCurrentPage(item.id)
                            ? 'bg-green-600 text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </div>
                        {item.subItems && (
                          expandedMenus[item.id] ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )
                        )}
                      </button>

                      {item.subItems && expandedMenus[item.id] && (
                        <div className="mt-1 ml-4 space-y-1">
                          {item.subItems.map((subItem) => (
                            <button
                              key={subItem.id}
                              onClick={() => handleItemClick(subItem.id)}
                              className={`w-full flex items-center px-6 py-2 rounded-lg text-sm transition-colors ${
                                currentPage === subItem.id
                                  ? 'bg-green-100 text-green-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              {subItem.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </div>
    );
  }

  return (
    <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img
              src="/Logo Price Us.png"
              alt="Price Us"
              className="h-[46px] w-auto"
            />
            <div>
              <p className="text-xs font-semibold text-gray-500 leading-tight">Seja bem-vindo,</p>
              <p className="text-base font-bold text-gray-900 leading-tight">
                {userName || userEmail?.split('@')[0] || 'Usuário'}
              </p>
              {userEmail && (
                <p className="text-xs text-gray-400 truncate max-w-[140px]">{userEmail}</p>
              )}
            </div>
          </div>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100"
          title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title}>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <div key={item.id}>
                  <button
                    onClick={() => {
                      if (item.subItems) {
                        if (isCollapsed) {
                          setIsCollapsed(false);
                        }
                        toggleMenu(item.id);
                      } else if (item.id === 'chat') {
                        window.Tawk_API?.maximize();
                        if (isCollapsed) setIsCollapsed(false);
                      } else {
                        handleItemClick(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isCurrentPage(item.id)
                        ? 'bg-green-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && item.subItems && (
                      expandedMenus[item.id] ? (
                        <ChevronDown className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 flex-shrink-0" />
                      )
                    )}
                  </button>

                  {item.subItems && expandedMenus[item.id] && !isCollapsed && (
                    <div className="mt-1 ml-4 space-y-1">
                      {item.subItems.map((subItem) => (
                        <button
                          key={subItem.id}
                          onClick={() => handleItemClick(subItem.id)}
                          className={`w-full flex items-center px-6 py-2 rounded-lg text-sm transition-colors ${
                            currentPage === subItem.id
                              ? 'bg-green-100 text-green-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {subItem.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
