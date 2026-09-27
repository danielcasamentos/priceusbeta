import { supabase } from '../lib/supabase';

export interface ExtraPhotosCheckoutParams {
  galleryId: string;
  extraCount: number;
  totalAmount: number;
  visitorName?: string;
  visitorEmail?: string;
}

export async function createExtraPhotosCheckout(params: ExtraPhotosCheckoutParams): Promise<{ url?: string; error?: string }> {
  try {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://priceus.com.br';
    const successUrl = `${origin}/galeria/${params.galleryId}?payment=success&extras=${params.extraCount}`;
    const cancelUrl = `${origin}/galeria/${params.galleryId}?payment=cancel`;

    const { data, error } = await supabase.functions.invoke('gallery-photos-checkout', {
      body: {
        ...params,
        successUrl,
        cancelUrl,
      },
    });

    if (error) {
      console.error('Erro ao invocar checkout de fotos extras:', error);
      return { error: error.message || 'Falha ao iniciar pagamento' };
    }

    return { url: data?.url };
  } catch (err: any) {
    console.error('Exceção ao criar sessão de fotos extras:', err);
    return { error: err?.message || 'Erro inesperado' };
  }
}
