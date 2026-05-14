import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CompanyCategory {
  id: string;
  user_id: string;
  nome: string;
  tipo: 'receita' | 'despesa';
  cor: string;
  created_at: string;
}

export interface CompanyTransaction {
  id: string;
  user_id: string;
  tipo: 'receita' | 'despesa';
  origem: 'manual' | 'lead' | 'contrato';
  descricao: string;
  valor: number;
  data: string;
  status: 'pendente' | 'pago' | 'cancelado';
  forma_pagamento?: string;
  categoria_id?: string;
  lead_id?: string;
  contract_id?: string;
  parcelas_info?: {
    total: number;
    atual: number;
    valor_parcela: number;
  } | null;
  is_installment?: boolean;
  installment_number?: number;
  total_installments?: number;
  parent_transaction_id?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
}

export interface TransactionFilters {
  tipo?: 'receita' | 'despesa';
  status?: 'pendente' | 'pago' | 'cancelado';
  categoria_id?: string;
  data_inicio?: string;
  data_fim?: string;
}

export function useCompanyTransactions(userId: string) {
  const [transactions, setTransactions] = useState<CompanyTransaction[]>([]);
  const [categories, setCategories] = useState<CompanyCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    try {
      const { data, error: err } = await supabase
        .from('company_categories')
        .select('*')
        .eq('user_id', userId)
        .order('tipo', { ascending: true })
        .order('nome', { ascending: true });

      if (err) throw err;

      if (data && data.length === 0) {
        await supabase.rpc('seed_default_company_categories', { p_user_id: userId });
        const { data: newData, error: newErr } = await supabase
          .from('company_categories')
          .select('*')
          .eq('user_id', userId)
          .order('tipo', { ascending: true });

        if (newErr) throw newErr;
        setCategories(newData || []);
      } else {
        setCategories(data || []);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      setError('Erro ao carregar categorias');
    }
  }, [userId]);

  const loadTransactions = useCallback(async (filters?: TransactionFilters) => {
    setLoading(true);
    setError(null);

    // Helper to apply filters to a query
    const applyFilters = (q: any) => {
      if (filters?.tipo) q = q.eq('tipo', filters.tipo);
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.categoria_id) q = q.eq('categoria_id', filters.categoria_id);
      if (filters?.data_inicio) q = q.gte('data', filters.data_inicio);
      if (filters?.data_fim) q = q.lte('data', filters.data_fim);
      return q.order('data', { ascending: false });
    };

    try {
      // Tenta primeiro com JOIN para obter o nome do cliente
      const queryWithJoin = applyFilters(
        supabase
          .from('company_transactions')
          .select('*, leads:lead_id(client_name, nome)')
          .eq('user_id', userId)
      );

      const { data, error: joinErr } = await queryWithJoin;

      if (joinErr) {
        // ⚠️ O JOIN falhou (ex: foreign key não configurada no Supabase).
        // Faz fallback sem o JOIN para garantir que as transações carreguem.
        console.warn('JOIN com leads falhou, tentando sem JOIN:', joinErr.message);

        const fallbackQuery = applyFilters(
          supabase
            .from('company_transactions')
            .select('*')
            .eq('user_id', userId)
        );

        const { data: fallbackData, error: fallbackErr } = await fallbackQuery;

        if (fallbackErr) throw fallbackErr;

        const mappedData = fallbackData?.map((t: any) => ({
          ...t,
          cliente_nome: '',
        }));

        setTransactions(mappedData || []);
        return;
      }

      const mappedData = data?.map((t: any) => ({
        ...t,
        cliente_nome: t.leads?.client_name || t.leads?.nome || '',
      }));

      setTransactions(mappedData || []);
    } catch (err) {
      console.error('Error loading transactions:', err);
      setError('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const createTransaction = async (transaction: Omit<CompanyTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: err } = await supabase
        .from('company_transactions')
        .insert([{ ...transaction, user_id: userId }])
        .select()
        .single();

      if (err) throw err;

      await loadTransactions();
      return { data, error: null };
    } catch (err) {
      console.error('Error creating transaction:', err);
      return { data: null, error: 'Erro ao criar transação' };
    }
  };

  const createInstallmentTransactions = async (
    baseTransaction: Omit<CompanyTransaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    numInstallments: number
  ) => {
    try {
      const installmentValue = baseTransaction.valor / numInstallments;
      const baseDate = new Date(baseTransaction.data);

      const installments = Array.from({ length: numInstallments }, (_, index) => {
        const installmentDate = new Date(baseDate);
        installmentDate.setMonth(baseDate.getMonth() + index);

        return {
          ...baseTransaction,
          user_id: userId,
          valor: installmentValue,
          data: installmentDate.toISOString().split('T')[0],
          is_installment: true,
          installment_number: index + 1,
          total_installments: numInstallments,
          descricao: `${baseTransaction.descricao} (${index + 1}/${numInstallments})`,
        };
      });

      const { data, error: err } = await supabase
        .from('company_transactions')
        .insert(installments)
        .select();

      if (err) throw err;

      if (data && data.length > 0) {
        const parentId = data[0].id;
        await supabase
          .from('company_transactions')
          .update({ parent_transaction_id: parentId })
          .in('id', data.map(t => t.id));
      }

      await loadTransactions();
      return { data, error: null };
    } catch (err) {
      console.error('Error creating installment transactions:', err);
      return { data: null, error: 'Erro ao criar parcelas' };
    }
  };

  const updateTransaction = async (id: string, updates: Partial<CompanyTransaction>) => {
    if (!id || id === 'undefined') {
      console.error('Invalid transaction ID for update:', id);
      return { data: null, error: 'ID de transação inválido' };
    }

    // Garante a consistência dos campos de parcela
    const finalUpdates = { ...updates };
    if (finalUpdates.is_installment === false) {
      finalUpdates.installment_number = undefined;
      finalUpdates.total_installments = undefined;
      finalUpdates.parent_transaction_id = undefined;
    }

    try {
      const { data, error: err } = await supabase
        .from('company_transactions')
        .update(finalUpdates)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();

      if (err) throw err;

      await loadTransactions();
      return { data, error: null };
    } catch (err) {
      console.error('Error updating transaction:', err);
      return { data: null, error: 'Erro ao atualizar transação' };
    }
  };

  const updateMultipleTransactionStatus = async (ids: string[], status: 'pendente' | 'pago' | 'cancelado') => {
    if (!ids || ids.length === 0) {
      return { data: null, error: 'Nenhum ID de transação fornecido.' };
    }

    try {
      const { data, error: err } = await supabase
        .from('company_transactions')
        .update({ status: status, updated_at: new Date().toISOString() })
        .in('id', ids)
        .eq('user_id', userId)
        .select();

      if (err) throw err;

      await loadTransactions();
      return { data, error: null };
    } catch (err) {
      console.error('Error updating multiple transaction statuses:', err);
      return { data: null, error: 'Erro ao atualizar status de múltiplas transações.' };
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('company_transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);

      if (err) throw err;

      await loadTransactions();
      return { error: null };
    } catch (err) {
      console.error('Error deleting transaction:', err);
      return { error: 'Erro ao excluir transação' };
    }
  };

  const createCategory = async (category: Omit<CompanyCategory, 'id' | 'user_id' | 'created_at'>) => {
    try {
      const { data, error: err } = await supabase
        .from('company_categories')
        .insert([{ ...category, user_id: userId }])
        .select()
        .single();

      if (err) throw err;

      await loadCategories();
      return { data, error: null };
    } catch (err) {
      console.error('Error creating category:', err);
      return { data: null, error: 'Erro ao criar categoria' };
    }
  };

  useEffect(() => {
    loadCategories();
    loadTransactions();
  }, [loadCategories, loadTransactions]);

  return {
    transactions,
    categories,
    loading,
    error,
    loadTransactions,
    createTransaction,
    createInstallmentTransactions,
    updateTransaction,
    updateMultipleTransactionStatus,
    deleteTransaction,
    createCategory,
    refreshCategories: loadCategories,
  };
}
