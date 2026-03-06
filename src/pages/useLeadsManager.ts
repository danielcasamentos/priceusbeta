import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Lead {
  id: string;
  created_at: string;
  nome_cliente: string;
  telefone_cliente: string;
  email_cliente: string;
  valor_total: number;
  status: 'novo' | 'contatado' | 'convertido' | 'perdido' | 'abandonado';
  template_id: string;
  templates: {
    nome_template: string;
  };
}

export function useLeadsManager(userId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('todos');

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('leads')
        .select(`
          id,
          created_at,
          nome_cliente,
          telefone_cliente,
          email_cliente,
          valor_total,
          status,
          template_id,
          templates (nome_template)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setLeads(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar leads:', err);
      setError('Não foi possível carregar os leads. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [userId, statusFilter]);

  useEffect(() => {
    if (userId) {
      fetchLeads();
    }
  }, [userId, fetchLeads]);

  // 🔥 MELHORIA: Inscrição em tempo real para QUALQUER mudança nos leads.
  // Isso garante que a UI reflita inserções, atualizações (ex: mudança de status) e exclusões.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`leads-updates-for-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Ouve todos os eventos: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Real-time: Mudança nos leads detectada!', payload);
          // A abordagem mais simples e robusta é recarregar a lista.
          // Isso garante que os filtros e a ordenação sejam reaplicados corretamente.
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchLeads]); // Adicionado fetchLeads ao array de dependências

  const deleteLeads = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return false;

    try {
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', ids);

      if (deleteError) {
        throw deleteError;
      }

      // Atualiza a lista de leads na UI removendo os deletados
      setLeads((prevLeads) => prevLeads.filter((lead) => !ids.includes(lead.id)));
      return true;
    } catch (err: any) {
      console.error('Erro ao deletar leads:', err);
      setError('Falha ao deletar os leads selecionados.');
      return false;
    }
  };

  return {
    leads,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    deleteLeads,
  };
}