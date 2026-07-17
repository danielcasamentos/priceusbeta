import { useState } from 'react';
import { ConvertLeadModal } from './ConvertLeadModal';
import { ContractGenerator } from '../ContractGenerator';
import { supabase } from '../../lib/supabase';

interface ConvertAndContractModalProps {
  userId: string;
  lead: any;
  initialStep?: 1 | 2;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConvertAndContractModal({ userId, lead, initialStep = 1, onClose, onSuccess }: ConvertAndContractModalProps) {
  const [step, setStep] = useState<1 | 2>(initialStep);
  const [financialPayload, setFinancialPayload] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // When step 1 finishes WITH contract generation, we save financial data and agenda events immediately!
  const handleProceedToContract = async (payload: any) => {
    setIsSaving(true);
    try {
      const { dbRows, planoJson, datasValidas } = payload;

      // 1. Inserir Transações Financeiras (Caixa)
      if (dbRows && dbRows.length > 0) {
        const { data: inserted, error: err } = await supabase.from('company_transactions').insert(dbRows).select('id');
        if (err) throw err;
        
        // Link parent transactions for installments
        if (inserted && inserted.length > 1) {
          const parentId = inserted[0].id;
          await supabase.from('company_transactions')
            .update({ parent_transaction_id: parentId })
            .in('id', inserted.map((t: any) => t.id));
        }
      }

      // 2. Atualizar o plano de pagamento no Lead
      if (planoJson) {
        const { data: leadCurrent } = await supabase.from('leads').select('orcamento_detalhe').eq('id', lead.id).single();
        await supabase.from('leads')
          .update({ 
            orcamento_detalhe: { 
              ...(leadCurrent?.orcamento_detalhe ?? {}), 
              plano_pagamento: planoJson 
            } 
          })
          .eq('id', lead.id);
      }

      // 3. Inserir Datas na Agenda
      if (datasValidas && datasValidas.length > 0) {
        let resolvedCityName = '';
        try {
          const { data: leadData } = await supabase.from('leads').select('cidade_evento').eq('id', lead.id).single();
          resolvedCityName = leadData?.cidade_evento || '';
          if (resolvedCityName && resolvedCityName.length === 36) {
            const { data: cityData } = await supabase
              .from('cidades_ajuste')
              .select('nome')
              .eq('id', resolvedCityName)
              .maybeSingle();
            if (cityData?.nome) {
              resolvedCityName = cityData.nome;
            }
          }
        } catch (cityLookupErr) {
          console.error('Erro ao buscar cidade do lead:', cityLookupErr);
        }

        const getDuracaoMinutos = (inicio?: string | null, fim?: string | null): number | null => {
          if (!inicio || !fim) return null;
          const [h1, m1] = inicio.split(':').map(Number);
          const [h2, m2] = fim.split(':').map(Number);
          if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return null;
          const min1 = h1 * 60 + m1;
          const min2 = h2 * 60 + m2;
          const diff = min2 - min1;
          return diff >= 0 ? diff : diff + 1440;
        };

        // Delete existing eventos_agenda entries for this lead to prevent duplicates
        await supabase.from('eventos_agenda').delete().eq('lead_id', lead.id);

        for (const d of datasValidas) {
          try {
            const duracao = getDuracaoMinutos(d.horario_inicio, d.horario_fim);
            await supabase.from('eventos_agenda').insert({
              user_id: userId,
              lead_id: lead.id,
              data_evento: d.data,
              tipo_evento: d.tipo_evento || 'Evento',
              cliente_nome: lead.nome_cliente || 'Cliente',
              cidade: resolvedCityName,
              status: 'confirmado',
              origem: 'lead_convertido',
              observacoes: `Gerado via conversão e fechamento de contrato.`,
              horario_inicio: d.horario_inicio || null,
              horario_fim: d.horario_fim || null,
              duracao_minutos: duracao
            });
          } catch (agErr) {
            console.error('Erro ao inserir data na agenda:', agErr);
          }
        }
      }

      setFinancialPayload(payload);
      setStep(2);
    } catch (error) {
      console.error('Error saving unified workflow financial data upfront:', error);
      alert('Erro ao salvar as configurações financeiras do lead.');
    } finally {
      setIsSaving(false);
    }
  };

  // When step 2 (Contract) finishes, the database is already fully populated
  const handleFinalizeWorkflow = async () => {
    onSuccess();
  };

  if (step === 1) {
    const orcamentoDetalhe = lead.orcamento_detalhe;
    let paymentMethodData = null;
    if (orcamentoDetalhe) {
      const pmid = orcamentoDetalhe.selecoes?.paymentMethod || orcamentoDetalhe.selectedFormaPagamento || orcamentoDetalhe.forma_pagamento_id;
      paymentMethodData = (orcamentoDetalhe.formasPagamento || []).find((f: any) => f.id === pmid) || null;
    }

    return (
      <ConvertLeadModal
        userId={userId}
        leadId={lead.id}
        leadName={lead.nome_cliente || 'Cliente'}
        templateName={lead.tipo_evento || ''}
        valorTotal={lead.valor_total || 0}
        dataEvento={lead.data_evento}
        paymentMethodData={paymentMethodData}
        onClose={onClose}
        onSuccess={onSuccess} // If they click just "Confirmar", it saves normally and triggers this
        onConfirmWithContract={handleProceedToContract}
      />
    );
  }

  // Step 2
  // We need to inject the updated payment mode into the lead's orcamento_detalhe so the ContractGenerator sees it!
  const updatedLeadForContract = {
    ...lead,
    orcamento_detalhe: {
      ...(lead.orcamento_detalhe || {}),
      plano_pagamento: financialPayload?.planoJson || lead.orcamento_detalhe?.plano_pagamento
    }
  };

  return (
    <>
      <ContractGenerator
        userId={userId}
        lead={updatedLeadForContract}
        onClose={onClose}
        onSuccess={handleFinalizeWorkflow}
      />
      
      {/* Overlay de carregamento enquanto salva o BD */}
      {isSaving && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white dark:bg-[#0a1628] p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-700 dark:text-gray-300 font-medium">Salvando dados no caixa e preparando contrato...</p>
          </div>
        </div>
      )}
    </>
  );
}
