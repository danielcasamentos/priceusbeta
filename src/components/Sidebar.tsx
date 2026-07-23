import { useState, type ComponentType } from 'react';
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
  Sun,
  Moon,
  Crown,
  ClipboardList,
  Bot,
  Images,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { usePlanLimits } from '../hooks/usePlanLimits';
import { useSubscription } from '../hooks/useSubscription';



interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  userEmail?: string;
  userName?: string;
  userPhoto?: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  currentPage,
  onPageChange,
  userEmail,
  userName,
  userPhoto,
  isMobile = false,
  isOpen = true,
  onClose
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    empresa: true
  });
  const { isDark, toggleTheme } = useTheme();
  
  const planLimits = usePlanLimits();
  const { isActive } = useSubscription();

  const menuSections: { title: string; items: ({ id: string; label: string; icon: ComponentType<{ className?: string }>; section: string; subItems?: { id: string; label: string }[] })[] }[] = [
    {
      title: 'Vendas',
      items: [
        { id: 'meu-dia', label: 'Meu Dia', icon: Sun, section: 'vendas' },
        { id: 'templates', label: 'Meus Templates', icon: FileText, section: 'vendas' },
        { id: 'leads', label: 'Leads', icon: LayoutDashboard, section: 'vendas' },
        { id: 'whatsapp-ia', label: 'IA de Vendas (WhatsApp)', icon: Bot, section: 'vendas' },
        { id: 'workflow', label: 'Workflow', icon: ClipboardList, section: 'vendas' },
        { id: 'entregas', label: 'Entregas', icon: Images, section: 'vendas' },
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
          section: 'gestao'
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
      return currentPage === 'empresa' || currentPage.startsWith('empresa-');
    }
    return currentPage === itemId;
  };




  // ══════════════════════════════════════
  // MOBILE
  // ══════════════════════════════════════
  if (isMobile) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="fixed inset-y-0 left-0 w-80 bg-white dark:bg-[#0a1628] shadow-xl overflow-y-auto transition-colors duration-300">
          <div className="p-4 border-b border-gray-200 dark:border-[rgba(255,255,255,.08)]">
            <div className="flex items-center justify-between">
              <button
                onClick={() => handleItemClick('profile')}
                title="Ir para Meu Perfil"
                className="flex items-center gap-3 text-left cursor-pointer hover:opacity-80 transition-opacity rounded-xl p-1 -m-1 hover:bg-gray-100/50 dark:hover:bg-white/5"
              >
                {userPhoto ? (
                  <img src={userPhoto} alt={userName} className="h-12 w-12 rounded-full object-cover border border-green-500/30" />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-green-500/30 text-gray-700 dark:text-gray-200 font-bold">
                    {(userName || userEmail || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-semibold text-gray-500 dark:text-[rgba(255,255,255,.45)] leading-tight">Seja bem-vindo,</h2>
                  <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {userName || userEmail?.split('@')[0] || 'Usuário'}
                  </p>
                  {userEmail && (
                    <p className="text-xs text-gray-400 dark:text-[rgba(255,255,255,.35)] truncate max-w-[140px]">{userEmail}</p>
                  )}
                </div>
              </button>
              <div className="flex items-center gap-2">
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,.07)] dark:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          <nav className="p-4 space-y-6">
            {menuSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,.35)] uppercase tracking-wider mb-2 px-3">
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
                            : 'text-gray-700 dark:text-[rgba(255,255,255,.7)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,.07)]'
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
                                  ? 'bg-green-100 dark:bg-[rgba(34,197,94,.15)] text-green-700 dark:text-green-400 font-medium'
                                  : 'text-gray-600 dark:text-[rgba(255,255,255,.5)] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,.05)]'
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
            {/* Propaganda / Upgrade Banner no final do Menu Mobile */}
            {!isActive && !planLimits.loading && !planLimits.isPrivileged && (
              <div className="mx-3 my-4 p-4 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-[#1b233a] dark:to-[#2d3748] rounded-xl border border-amber-200 dark:border-[rgba(255,255,255,0.08)] shadow-sm text-center">
                <div className="flex justify-center mb-2">
                  <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-sm animate-pulse">
                    <Crown className="w-5 h-5" />
                  </div>
                </div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Garante o PriceUs PRO</h4>
                <p className="text-xs text-amber-800 dark:text-gray-300 mt-1 leading-relaxed">
                  Desbloqueie todas as vantagens de se ter o sistema assinado oficialmente!
                </p>
                <ul className="text-left text-[11px] text-amber-800 dark:text-gray-300 mt-3 space-y-1.5 pl-1 font-medium">
                  <li className="flex items-center gap-1.5">
                    <span>✨</span> Orçamentos & Leads Ilimitados
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span>📄</span> Assinatura Digital de Contratos
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span>💰</span> Gestão e Cashflow Automático
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span>💬</span> Notificações e Prazos Inteligentes
                  </li>
                </ul>
                <button
                  onClick={() => {
                    window.location.href = '/pricing';
                  }}
                  className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 rounded-lg text-xs font-bold transition shadow-sm"
                >
                  Assinar Agora
                </button>
              </div>
            )}
          </nav>

          {/* Rodapé Mobile — Toggle de Tema (somente admin) */}
          {userEmail === 'odanielfotografo@icloud.com' && (
          <div className="sticky bottom-0 border-t border-gray-200 dark:border-[rgba(255,255,255,.08)] bg-white dark:bg-[#0a1628] p-4">
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isDark
                  ? 'bg-[rgba(34,197,94,.1)] text-green-400 hover:bg-[rgba(34,197,94,.18)] border border-[rgba(34,197,94,.2)]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
          </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════
  // DESKTOP
  // ══════════════════════════════════════
  return (
    <aside className={`hidden lg:flex flex-col bg-white dark:bg-[#0a1628] border-r border-gray-200 dark:border-[rgba(255,255,255,.08)] transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
          <div className="p-4 border-b border-gray-200 dark:border-[rgba(255,255,255,.08)] flex items-center justify-between">
            {!isCollapsed && (
              <button
                onClick={() => handleItemClick('profile')}
                title="Ir para Meu Perfil"
                className="flex items-center gap-3 text-left cursor-pointer hover:opacity-80 transition-opacity rounded-xl p-1.5 -ml-1.5 hover:bg-gray-100/50 dark:hover:bg-white/5"
              >
                {userPhoto ? (
                  <img src={userPhoto} alt={userName} className="h-11 w-11 rounded-full object-cover border border-green-500/30" />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center border border-green-500/30 text-gray-700 dark:text-gray-200 font-bold">
                    {(userName || userEmail || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,.45)] leading-tight">Seja bem-vindo,</p>
                  <p className="text-base font-bold text-gray-900 dark:text-white leading-tight">{userName || userEmail?.split('@')[0] || 'Usuário'}</p>
                  {userEmail && <p className="text-xs text-gray-400 dark:text-[rgba(255,255,255,.35)] truncate max-w-[140px]">{userEmail}</p>}
                </div>
              </button>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,.07)] dark:text-white" title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}>
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {menuSections.map((section) => (
          <div key={section.title}>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-500 dark:text-[rgba(255,255,255,.35)] uppercase tracking-wider mb-2 px-3">
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
                        if (typeof window !== 'undefined' && window.Tawk_API && typeof window.Tawk_API.maximize === 'function') window.Tawk_API.maximize();
                        if (isCollapsed) setIsCollapsed(false);
                      } else {
                        handleItemClick(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isCurrentPage(item.id)
                        ? 'bg-green-600 text-white'
                        : 'text-gray-700 dark:text-[rgba(255,255,255,.7)] hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,.07)]'
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
                              ? 'bg-green-100 dark:bg-[rgba(34,197,94,.15)] text-green-700 dark:text-green-400 font-medium'
                              : 'text-gray-600 dark:text-[rgba(255,255,255,.5)] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,.05)]'
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
 
      {/* Propaganda / Upgrade Banner no final do Menu Desktop */}
      {!isCollapsed && !isActive && !planLimits.loading && !planLimits.isPrivileged && (
        <div className="mx-4 my-4 p-4 bg-gradient-to-br from-amber-50 to-orange-100 dark:from-[#1b233a] dark:to-[#2d3748] rounded-xl border border-amber-200 dark:border-[rgba(255,255,255,0.08)] shadow-md text-center">
          <div className="flex justify-center mb-2">
            <div className="bg-amber-500 text-white p-1.5 rounded-full shadow-sm animate-pulse">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Garante o PriceUs PRO</h4>
          <p className="text-xs text-amber-800 dark:text-gray-300 mt-1 leading-relaxed">
            Desbloqueie todas as vantagens de se ter o sistema assinado oficialmente!
          </p>
          <ul className="text-left text-[11px] text-amber-800 dark:text-gray-300 mt-3 space-y-1.5 pl-1 font-medium">
            <li className="flex items-center gap-1.5">
              <span>✨</span> Orçamentos & Leads Ilimitados
            </li>
            <li className="flex items-center gap-1.5">
              <span>📄</span> Assinatura Digital de Contratos
            </li>
            <li className="flex items-center gap-1.5">
              <span>💰</span> Gestão e Cashflow Automático
            </li>
            <li className="flex items-center gap-1.5">
              <span>💬</span> Notificações e Prazos Inteligentes
            </li>
          </ul>
          <button
            onClick={() => {
              window.location.href = '/pricing';
            }}
            className="mt-4 w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white py-2 rounded-lg text-xs font-bold transition shadow-sm"
          >
            Assinar Agora
          </button>
        </div>
      )}

      {/* Rodapé Desktop — Toggle de Tema (somente admin) */}
      {userEmail === 'odanielfotografo@icloud.com' && (
      <div className="border-t border-gray-200 dark:border-[rgba(255,255,255,.08)] p-3">
        <button
          onClick={toggleTheme}
          title={isDark ? 'Mudar para tema Claro' : 'Mudar para tema Escuro'}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
            isDark
              ? 'bg-[rgba(34,197,94,.1)] text-green-400 hover:bg-[rgba(34,197,94,.18)] border border-[rgba(34,197,94,.2)]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4 flex-shrink-0" /> : <Moon className="w-4 h-4 flex-shrink-0" />}
          {!isCollapsed && <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
        </button>
      </div>
      )}
    </aside>
  );
}
