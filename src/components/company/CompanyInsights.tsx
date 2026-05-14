import { FileDown, Clock, PiggyBank, TrendingUp, Users } from 'lucide-react';
import { useCompanyTransactions } from '../../hooks/useCompanyTransactions';
import { useCompanyMetrics } from '../../hooks/useCompanyMetrics';
import { useCompanyInsights } from '../../hooks/useCompanyInsights';
import { generateCompanyReport } from '../../services/companyReportService';

interface CompanyInsightsProps {
  userId: string;
}

export function CompanyInsights({ userId }: CompanyInsightsProps) {
  const { transactions, categories, loading } = useCompanyTransactions(userId);
  const { selectedYear, selectedMonth, monthlyMetrics, yearlyMetrics } = useCompanyMetrics(transactions);
  const dynamicInsights = useCompanyInsights(transactions, categories, selectedYear, selectedMonth);

  // Adicionando os novos insights estratégicos
  const staticInsights = [
    {
      id: 'investimento-tempo',
      title: 'Investimento de Tempo Inteligente',
      description: 'Dedique 2 horas por semana para revisar seus orçamentos mais e menos convertidos. Entenda os padrões e otimize seus templates para aumentar a conversão.',
      icon: Clock,
      type: 'info',
    },
    {
      id: 'reserva-emergencia',
      title: 'Crie sua Reserva de Emergência',
      description: 'Baseado na sua média de despesas mensais, sugerimos que você comece a construir uma reserva de emergência. Guarde 10% do seu lucro mensal em uma conta separada, como uma poupança ou CDB de liquidez diária.',
      icon: PiggyBank,
      type: 'info',
    },
    {
      id: 'analise-sazonalidade',
      title: 'Aproveite a Sazonalidade a seu Favor',
      description: 'Seus meses mais fortes são os melhores para focar em marketing e vendas. Para os meses mais fracos, ofereça pacotes promocionais ou workshops para gerar receita extra.',
      icon: TrendingUp,
      type: 'info',
    },
    {
      id: 'upsell-clientes-antigos',
      title: 'Reative Clientes Antigos com Novas Ofertas',
      description: 'Clientes que já te contrataram têm mais chance de comprar novamente. Ofereça um ensaio de família, um álbum de aniversário de casamento ou um "day after" para casais que fecharam com você há mais de um ano.',
      icon: Users,
      type: 'info',
    },
  ];

  const allInsights = [...dynamicInsights, ...staticInsights];

  const handleGenerateReport = async (type: 'monthly' | 'yearly') => {
    try {
      await generateCompanyReport({
        userId,
        type,
        year: selectedYear,
        month: selectedMonth,
        metrics: type === 'monthly' ? monthlyMetrics : yearlyMetrics,
        transactions,
        categories,
      });
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Erro ao gerar relatório');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Insights e Relatórios</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleGenerateReport('monthly')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Relatório Mensal
          </button>
          <button
            onClick={() => handleGenerateReport('yearly')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <FileDown className="w-4 h-4" />
            Relatório Anual
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Sobre os Insights</h3>
        <p className="text-sm text-gray-700">
          Os insights são gerados automaticamente com base nas suas transações e ajudam você a identificar
          oportunidades, alertas e tendências no seu negócio. Revise-os regularmente para tomar decisões mais informadas.
        </p>
      </div>

      {allInsights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allInsights.map((insight) => {
            const Icon = insight.icon;
            const bgColors: Record<string, string> = {
              warning: 'bg-yellow-50 border-yellow-200',
              success: 'bg-green-50 border-green-200',
              info: 'bg-blue-50 border-blue-200',
              neutral: 'bg-gray-50 border-gray-200',
            };
            const iconColors: Record<string, string> = {
              warning: 'text-yellow-600 bg-yellow-100',
              success: 'text-green-600 bg-green-100',
              info: 'text-blue-600 bg-blue-100',
              neutral: 'text-gray-600 bg-gray-100',
            };
            const textColors: Record<string, string> = {
              warning: 'text-yellow-900',
              success: 'text-green-900',
              info: 'text-blue-900',
              neutral: 'text-gray-900',
            };

            return (
              <div
                key={insight.id}
                className={`p-6 rounded-lg border ${bgColors[insight.type]} transition-all hover:shadow-md`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${iconColors[insight.type]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-semibold mb-1 ${textColors[insight.type]}`}>
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-600">{insight.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <p className="text-gray-400 mb-2">Nenhum insight disponível no momento</p>
          <p className="text-sm text-gray-500">
            Continue registrando suas transações para receber sugestões personalizadas
          </p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold mb-4">Como usar os Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-yellow-600 font-semibold">!</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Alertas (Amarelo)</h4>
              <p className="text-sm text-gray-600">
                Situações que requerem sua atenção imediata, como valores pendentes ou quedas significativas.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-green-600 font-semibold">✓</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Sucessos (Verde)</h4>
              <p className="text-sm text-gray-600">
                Indicadores positivos e conquistas, como crescimento de receita ou meses lucrativos.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-blue-600 font-semibold">i</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Informações (Azul)</h4>
              <p className="text-sm text-gray-600">
                Dados úteis e projeções baseadas no seu histórico para ajudar no planejamento.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-gray-600 font-semibold">•</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Neutros (Cinza)</h4>
              <p className="text-sm text-gray-600">
                Observações gerais sobre padrões e estatísticas do seu negócio.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Dica do Dia</h3>
        <p className="text-sm text-gray-700">
          Revise seus insights semanalmente e compare o desempenho mensal. Isso ajuda a identificar
          padrões sazonais e ajustar suas estratégias de precificação e marketing conforme necessário.
        </p>
      </div>
    </div>
  );
}
