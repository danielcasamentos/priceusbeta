import { useState } from 'react';
import { CompanyDashboard } from './CompanyDashboard';
import { CompanyTransactions } from './CompanyTransactions';
import { CompanyAnalytics } from './CompanyAnalytics';
import { CompanyInsights } from './CompanyInsights';
import { BusinessSettingsEditor } from '../BusinessSettingsEditor';
import { Building2 } from 'lucide-react';

interface CompanyDashboardHubProps {
  userId: string;
}

export function CompanyDashboardHub({ userId }: CompanyDashboardHubProps) {
  const [activeTab, setActiveTab] = useState<'visao-geral' | 'transacoes' | 'analytics' | 'insights' | 'configuracoes'>('visao-geral');

  const tabs = [
    { id: 'visao-geral', label: '📊 Visão Geral', desc: 'Macro financeiro e calculadora por hora' },
    { id: 'transacoes', label: '💸 Transações', desc: 'Histórico de lançamentos e fluxo de caixa' },
    { id: 'analytics', label: '📈 Analytics', desc: 'Gráficos e estatísticas' },
    { id: 'insights', label: '💡 Insights', desc: 'Recomendações e inteligência de negócios' },
    { id: 'configuracoes', label: '⚙️ Configurações', desc: 'Dados e dados contratuais da empresa' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header da Empresa */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-md text-white shadow-indigo-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Minha Empresa</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie finanças, analise o desempenho e edite as configurações institucionais</p>
          </div>
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-200 dark:border-white/10 gap-6 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => {
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-extrabold'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Render with FadeIn Animation */}
      <div className="animate-fadeIn duration-200">
        {activeTab === 'visao-geral' && (
          <CompanyDashboard
            userId={userId}
            onNewTransaction={() => setActiveTab('transacoes')}
          />
        )}
        {activeTab === 'transacoes' && <CompanyTransactions userId={userId} />}
        {activeTab === 'analytics' && <CompanyAnalytics userId={userId} />}
        {activeTab === 'insights' && <CompanyInsights userId={userId} />}
        {activeTab === 'configuracoes' && <BusinessSettingsEditor userId={userId} />}
      </div>
    </div>
  );
}
