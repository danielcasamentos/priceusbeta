import React from 'react';
import { Search, Plus, X, Heart, Sparkles } from 'lucide-react';
import logoPriceUs from '../../assets/logo-priceus.png';
import { VendorMarketplaceCard } from '../../services/brideMarketplaceService';

export interface WorkspaceTab {
  id: string; // 'explore' | 'compare' | vendor.user_id
  title: string;
  category?: string;
  vendor?: VendorMarketplaceCard;
  isExplore?: boolean;
  isCompare?: boolean;
}

interface BrideWorkspaceTabsProps {
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onOpenExplore: () => void;
  onOpenCompare?: () => void;
  onOpenActionPlan?: () => void;
  brideName: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  fotografia: '📸',
  video: '🎬',
  cabelo_make: '💄',
  decoracao: '💐',
  buffet: '🍽️',
  storymaker: '📱',
  area_kids: '🧸',
  default: '⭐',
};

export function BrideWorkspaceTabs({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onOpenExplore,
  onOpenCompare,
  onOpenActionPlan,
  brideName,
}: BrideWorkspaceTabsProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-xs">
      {/* Top Banner do Portal com a Logo Oficial PriceU$ */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between border-b border-stone-100 text-xs">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src={logoPriceUs}
            alt="Price Us"
            className="h-7 sm:h-8 w-auto object-contain cursor-pointer hover:opacity-90 transition-opacity"
            onClick={onOpenExplore}
            title="Ir para Explorar Fornecedores"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/logo-priceus.png'; }}
          />
          <div className="h-4 w-px bg-stone-200 hidden sm:block" />
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-semibold">
            💍 Portal dos Noivos
          </span>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200 text-[10px] font-medium">
            Workspace Multi-Fornecedor
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-stone-500">
          {onOpenActionPlan && (
            <button
              type="button"
              onClick={onOpenActionPlan}
              className="px-2.5 py-1 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="Configurar Orçamento, Estilo, GPS e Profissionais"
            >
              <Sparkles size={11} className="text-rose-500" />
              <span>Plano de Ação</span>
            </button>
          )}

          <span className="flex items-center gap-1.5 text-stone-700">
            <Heart size={13} className="text-rose-500 fill-rose-500/30 flex-shrink-0" />
            <span className="hidden sm:inline">Noiva:</span> <strong className="text-slate-900 font-semibold truncate max-w-[120px] sm:max-w-none">{brideName}</strong>
          </span>
          <span className="text-stone-300 hidden sm:inline">|</span>
          <span className="text-emerald-600 hidden sm:flex items-center gap-1 text-[11px] font-medium whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Orçamentos Sincronizados
          </span>
        </div>
      </div>

      {/* Barra de Abas Estilo Navegador Interno Clean */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 pb-1 bg-stone-50/50 touch-pan-x">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const icon = tab.isExplore
            ? '🔍'
            : tab.isCompare
            ? '⚖️'
            : CATEGORY_ICONS[tab.category || 'default'] || CATEGORY_ICONS.default;

          return (
            <div
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold cursor-pointer transition-all flex-shrink-0 select-none border-t border-x ${
                isActive
                  ? 'bg-white text-slate-900 border-stone-200/90 shadow-xs'
                  : 'bg-stone-100/70 text-stone-500 border-transparent hover:bg-stone-200/60 hover:text-slate-800'
              }`}
            >
              {/* Indicador de Aba Ativa */}
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 rounded-t-full" />
              )}

              <span>{icon}</span>
              <span className="max-w-[130px] truncate">{tab.title}</span>

              {/* Botão de Fechar Aba (Não fecha se for a aba de Explorar ou Comparar) */}
              {!tab.isExplore && !tab.isCompare && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCloseTab(tab.id);
                  }}
                  className="p-0.5 rounded-md hover:bg-stone-200 text-stone-400 hover:text-slate-700 transition-colors"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          );
        })}

        {/* Botão de Adicionar Nova Aba */}
        <button
          type="button"
          onClick={onOpenExplore}
          title="Explorar novos fornecedores para abrir em aba"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all flex-shrink-0 cursor-pointer"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">Nova Aba</span>
        </button>

        {/* Botão de Mesa de Decisão (Comparar Lado a Lado) */}
        {onOpenCompare && (
          <button
            type="button"
            onClick={onOpenCompare}
            title="Comparar propostas dos fornecedores lado a lado"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 transition-all flex-shrink-0 cursor-pointer shadow-2xs ml-auto"
          >
            <span>⚖️</span>
            <span className="hidden sm:inline">Mesa de Decisão (Comparar)</span>
          </button>
        )}
      </div>
    </header>
  );
}
