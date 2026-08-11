import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { isPrivilegedUser } from '../config/privilegedUsers';

type UserArg = User | { id: string; email?: string; created_at?: string } | string | null | undefined;

interface TrialStatus {
  status: 'trial' | 'active' | 'expired' | 'canceled' | 'past_due' | null;
  daysRemaining: number | null;
  expirationDate: string | null;
  isExpired: boolean;
  graceDaysRemaining: number | null;
  isGraceExpired: boolean;
  loading: boolean;
}

export function useTrialStatus(userArg: UserArg): TrialStatus {
  const user: { id: string; email?: string; created_at?: string } | null = userArg
    ? typeof userArg === 'string'
      ? { id: userArg }
      : userArg
    : null;

  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    status: null,
    daysRemaining: null,
    expirationDate: null,
    isExpired: false,
    graceDaysRemaining: null,
    isGraceExpired: false,
    loading: true,
  });

  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setTrialStatus(prev => prev.loading ? { ...prev, loading: false } : prev);
    }, 2500);

    if (!user || !user.id) {
      clearTimeout(safetyTimer);
      setTrialStatus({
        status: null,
        daysRemaining: null,
        expirationDate: null,
        isExpired: false,
        graceDaysRemaining: null,
        isGraceExpired: false,
        loading: false,
      });
      return;
    }

    if (isPrivilegedUser(user.email)) {
      clearTimeout(safetyTimer);
      setTrialStatus({
        status: 'active',
        daysRemaining: 999,
        expirationDate: null,
        isExpired: false,
        graceDaysRemaining: null,
        isGraceExpired: false,
        loading: false,
      });
      return;
    }

    async function fetchTrialStatus() {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('status_assinatura, data_expiracao_trial, created_at')
          .eq('id', user!.id)
          .maybeSingle();

        if (error) throw error;

        // Se perfil não existe ou status é nulo, assume trial ativo de 30 dias a partir da criação
        const createdAtDate = profile?.created_at
          ? new Date(profile.created_at)
          : (user?.created_at ? new Date(user.created_at) : new Date());

        let expirationDateStr = profile?.data_expiracao_trial;
        if (!expirationDateStr) {
          const exp = new Date(createdAtDate);
          exp.setDate(exp.getDate() + 30);
          expirationDateStr = exp.toISOString();
        }

        const expiration = new Date(expirationDateStr);
        const now = new Date();
        const diffTime = expiration.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        const isExpired = diffTime <= 0 && profile?.status_assinatura !== 'active';
        const status = profile?.status_assinatura === 'active' ? 'active' : 'trial';

        clearTimeout(safetyTimer);
        setTrialStatus({
          status,
          daysRemaining: Math.max(0, diffDays),
          expirationDate: expirationDateStr,
          isExpired,
          graceDaysRemaining: null,
          isGraceExpired: false,
          loading: false,
        });
      } catch (err) {
        console.error('Error in fetchTrialStatus:', err);
        clearTimeout(safetyTimer);
        // Em caso de erro, concede acesso ao trial de 30 dias por padrão
        setTrialStatus({
          status: 'trial',
          daysRemaining: 30,
          expirationDate: null,
          isExpired: false,
          graceDaysRemaining: null,
          isGraceExpired: false,
          loading: false,
        });
      }
    }

    fetchTrialStatus();
  }, [userArg]);

  return trialStatus;
}
