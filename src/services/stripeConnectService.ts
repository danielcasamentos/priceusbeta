import { supabase } from '../lib/supabase';

export interface StripeConnectLinkResponse {
  url?: string;
  accountId?: string;
  isCompleted?: boolean;
  message?: string;
  error?: string;
}

export async function requestStripeConnectOnboarding(): Promise<StripeConnectLinkResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('create-stripe-connect-link', {});

    if (error) {
      console.error('Erro ao chamar create-stripe-connect-link:', error);
      return { error: error.message || 'Falha ao conectar com Stripe' };
    }

    return data as StripeConnectLinkResponse;
  } catch (err: any) {
    console.error('Exceção ao gerar link Stripe Connect:', err);
    return { error: err?.message || 'Erro inesperado ao conectar com a Stripe' };
  }
}
