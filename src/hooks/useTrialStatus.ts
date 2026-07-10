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
  // Normalize: accept full User object or just an id string
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
    if (!user || !user.id) {
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

    // Usuários privilegiados não precisam de verificação de trial
    if (isPrivilegedUser(user.email)) {
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

    async function fetchTrialStatus() {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('status_assinatura, data_expiracao_trial')
          .eq('id', user!.id)
          .maybeSingle();

        if (error) throw error;

        if (!profile || !profile.status_assinatura) {
          // Fallback: se não encontrar o profile ou o status no banco de dados, assume "trial" se a conta foi criada há menos de 30 dias!
          let status: TrialStatus['status'] = null;
          let expirationDate: string | null = null;

          const createdAtStr = user?.created_at;
          if (createdAtStr) {
            const createdAtDate = new Date(createdAtStr);
            const trialExpiration = new Date(createdAtDate);
            trialExpiration.setDate(trialExpiration.getDate() + 30);
            
            const now = new Date();
            if (trialExpiration > now) {
              status = 'trial';
              expirationDate = trialExpiration.toISOString();
            }
          }

          if (status === 'trial') {
            const now = new Date();
            const expiration = new Date(expirationDate!);
            const diffTime = expiration.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            setTrialStatus({
              status,
              daysRemaining: Math.max(0, diffDays),
              expirationDate,
              isExpired: false,
              graceDaysRemaining: null,
              isGraceExpired: false,
              loading: false,
            });
            return;
          }

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

        const status = profile.status_assinatura as TrialStatus['status'];
        const expirationDate = profile.data_expiracao_trial;

        let daysRemaining: number | null = null;
        let isExpired = false;
        let graceDaysRemaining: number | null = null;
        let isGraceExpired = false;

        if (status === 'trial' && expirationDate) {
          const now = new Date();
          const expiration = new Date(expirationDate);
          const diffTime = expiration.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          daysRemaining = Math.max(0, diffDays);
          isExpired = diffDays <= 0;

          if (isExpired) {
            // Calcular carência de 15 dias a partir da data de expiração do trial
            const gracePeriodEnd = new Date(expiration);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 15);
            const diffGraceTime = gracePeriodEnd.getTime() - now.getTime();
            const diffGraceDays = Math.ceil(diffGraceTime / (1000 * 60 * 60 * 24));

            graceDaysRemaining = Math.max(0, diffGraceDays);
            isGraceExpired = diffGraceTime <= 0;
          }
        }

        setTrialStatus({
          status,
          daysRemaining,
          expirationDate,
          isExpired,
          graceDaysRemaining,
          isGraceExpired,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching trial status:', error);
        setTrialStatus({
          status: null,
          daysRemaining: null,
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
