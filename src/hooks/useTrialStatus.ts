import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { isPrivilegedUser } from '../config/privilegedUsers';

type UserArg = User | { id: string; email?: string } | string | null | undefined;

interface TrialStatus {
  status: 'trial' | 'active' | 'expired' | 'canceled' | 'past_due' | null;
  daysRemaining: number | null;
  expirationDate: string | null;
  isExpired: boolean;
  loading: boolean;
}

export function useTrialStatus(userArg: UserArg): TrialStatus {
  // Normalize: accept full User object or just an id string
  const user: { id: string; email?: string } | null = userArg
    ? typeof userArg === 'string'
      ? { id: userArg }
      : userArg
    : null;

  const [trialStatus, setTrialStatus] = useState<TrialStatus>({
    status: null,
    daysRemaining: null,
    expirationDate: null,
    isExpired: false,
    loading: true,
  });

  useEffect(() => {
    if (!user || !user.id) {
      setTrialStatus({
        status: null,
        daysRemaining: null,
        expirationDate: null,
        isExpired: false,
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

        if (!profile) {
          setTrialStatus({
            status: null,
            daysRemaining: null,
            expirationDate: null,
            isExpired: false,
            loading: false,
          });
          return;
        }

        const status = profile.status_assinatura as TrialStatus['status'];
        const expirationDate = profile.data_expiracao_trial;

        let daysRemaining: number | null = null;
        let isExpired = false;

        if (status === 'trial' && expirationDate) {
          const now = new Date();
          const expiration = new Date(expirationDate);
          const diffTime = expiration.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          daysRemaining = Math.max(0, diffDays);
          isExpired = diffDays <= 0;
        }

        setTrialStatus({
          status,
          daysRemaining,
          expirationDate,
          isExpired,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching trial status:', error);
        setTrialStatus({
          status: null,
          daysRemaining: null,
          expirationDate: null,
          isExpired: false,
          loading: false,
        });
      }
    }

    fetchTrialStatus();

    const interval = setInterval(fetchTrialStatus, 60000);

    return () => clearInterval(interval);
  }, [userArg]);

  return trialStatus;
}
