import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useSubscription } from './useSubscription';
import { useTrialStatus } from './useTrialStatus';
import { supabase } from '../lib/supabase';
import { isPrivilegedUser } from '../config/privilegedUsers';

interface PlanLimits {
  isPremium: boolean;
  isPrivileged: boolean;
  canCreateTemplate: boolean;
  templatesUsed: number;
  templatesLimit: number;
  leadsUsed: number;
  leadsLimit: number | 'unlimited';
  productsLimit: number;
  eventsUsed: number;
  eventsLimit: number | 'unlimited';
  canImportCalendar: boolean;
  contractTemplatesUsed: number;
  contractTemplatesLimit: number;
  contractsSignedUsed: number;
  contractsSignedLimit: number;
  canCreateContractTemplate: boolean;
  canGenerateContract: boolean;
  showUpgradeBanner: boolean;
  loading: boolean;
}

export function usePlanLimits(): PlanLimits {
  const { user } = useAuth();
  const { isActive, isTrialing, loading: subscriptionLoading } = useSubscription();
  const trialStatus = useTrialStatus(user?.id);
  const [templatesCount, setTemplatesCount] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [eventsCount, setEventsCount] = useState(0);
  const [contractTemplatesCount, setContractTemplatesCount] = useState(0);
  const [contractsSignedCount, setContractsSignedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Verificar se é usuário privilegiado
  const isPrivileged = isPrivilegedUser(user?.email);

  // Definir se é premium (assinatura ativa, trialing, trial ativo de 30 dias ou privilegiado)
  const isPremium = isPrivileged || isActive || isTrialing || (trialStatus.status === 'trial' && !trialStatus.isExpired);

  // Definir limites baseado no plano (premium = ilimitado)
  const templatesLimit = isPremium ? Infinity : 1;
  const leadsLimit = isPremium ? 'unlimited' as const : 10;
  const productsLimit = isPremium ? Infinity : 7;
  const eventsLimit = isPremium ? 'unlimited' as const : 20;
  const canImportCalendar = isPremium;
  const contractTemplatesLimit = isPremium ? Infinity : 3;
  const contractsSignedLimit = isPremium ? Infinity : 10;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchCounts = async () => {
      try {
        // Contar templates
        const { count: templatesCount } = await supabase
          .from('templates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Contar leads
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Contar eventos ativos (confirmados e pendentes) com data futura ou atual
        const today = new Date().toISOString().split('T')[0];
        const { count: eventsCount } = await supabase
          .from('eventos_agenda')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('status', ['confirmado', 'pendente'])
          .gte('data_evento', today);

        // Contar contract templates
        const { count: contractTemplatesCount } = await supabase
          .from('contract_templates')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Contar contratos assinados
        const { count: contractsSignedCount } = await supabase
          .from('contracts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'signed');

        setTemplatesCount(templatesCount || 0);
        setLeadsCount(leadsCount || 0);
        setEventsCount(eventsCount || 0);
        setContractTemplatesCount(contractTemplatesCount || 0);
        setContractsSignedCount(contractsSignedCount || 0);
      } catch (error) {
        console.error('Error fetching plan limits:', error);
        // Não faz nada no erro, apenas loga. O próximo intervalo tentará novamente.
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, [user]);

  const canCreateTemplate = isPremium
    ? true
    : templatesCount < 1;

  const canCreateContractTemplate = isPremium
    ? true
    : contractTemplatesCount < 3;

  const canGenerateContract = isPremium
    ? true
    : contractsSignedCount < 10;

  const showUpgradeBanner = !isPremium && !subscriptionLoading;

  return {
    isPremium,
    isPrivileged,
    canCreateTemplate,
    templatesUsed: templatesCount,
    templatesLimit,
    leadsUsed: leadsCount,
    leadsLimit,
    productsLimit,
    eventsUsed: eventsCount,
    eventsLimit,
    canImportCalendar,
    contractTemplatesUsed: contractTemplatesCount,
    contractTemplatesLimit,
    contractsSignedUsed: contractsSignedCount,
    contractsSignedLimit,
    canCreateContractTemplate,
    canGenerateContract,
    showUpgradeBanner,
    loading: loading || subscriptionLoading,
  };
}
