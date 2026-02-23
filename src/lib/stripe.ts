import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// --- DEBUG E VALIDAÇÃO DE AMBIENTE ---
if (!stripePublicKey || typeof stripePublicKey !== 'string' || stripePublicKey.trim() === '') {
  console.error('🚨 ERRO CRÍTICO: A variável de ambiente VITE_STRIPE_PUBLIC_KEY não está definida ou está vazia.');
  console.error('   -> Verifique as configurações no painel do Netlify (ou no seu arquivo .env local).');
  throw new Error('VITE_STRIPE_PUBLIC_KEY is not configured. Check your environment variables.');
}

// Validação para garantir que a chave tem o formato correto (começa com pk_live_ ou pk_test_)
if (!stripePublicKey.startsWith('pk_live_') && !stripePublicKey.startsWith('pk_test_')) {
    console.error(`❌ ERRO DE CONFIGURAÇÃO: A VITE_STRIPE_PUBLIC_KEY ("${stripePublicKey}") parece estar em um formato inválido.`);
    console.error('   -> O valor deve ser apenas a chave, começando com "pk_live_" ou "pk_test_".');
    console.warn('⚠️ Verifique se você não copiou "VITE_STRIPE_PUBLIC_KEY=" junto com o valor no painel do Netlify.');
    throw new Error('Invalid Stripe public key format.');
} else {
    console.log('✅ Chave pública do Stripe (VITE_STRIPE_PUBLIC_KEY) carregada corretamente.');
}
// -------------------------------------

/**
 * Promessa do Stripe que pode ser importada em qualquer lugar da aplicação.
 * `loadStripe` é chamado apenas uma vez.
 */
export const stripePromise: Promise<Stripe | null> = loadStripe(stripePublicKey);