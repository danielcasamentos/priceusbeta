import { loadStripe, Stripe } from '@stripe/stripe-js';

const stripePublicKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

// --- DEBUG E VALIDAÇÃO DE AMBIENTE ---
let stripePromise: Promise<Stripe | null>;

if (!stripePublicKey || typeof stripePublicKey !== 'string' || stripePublicKey.trim() === '') {
  console.warn('🚨 AVISO: A variável de ambiente VITE_STRIPE_PUBLIC_KEY não está definida ou está vazia.');
  console.warn('   -> O Stripe de checkout e faturamento estará indisponível.');
  stripePromise = Promise.resolve(null);
} else if (!stripePublicKey.startsWith('pk_live_') && !stripePublicKey.startsWith('pk_test_')) {
  console.warn(`❌ ERRO DE CONFIGURAÇÃO: A VITE_STRIPE_PUBLIC_KEY ("${stripePublicKey}") parece estar em um formato inválido.`);
  console.warn('   -> O Stripe de checkout e faturamento estará indisponível.');
  stripePromise = Promise.resolve(null);
} else {
  console.log('✅ Chave pública do Stripe (VITE_STRIPE_PUBLIC_KEY) carregada corretamente.');
  stripePromise = loadStripe(stripePublicKey);
}

export { stripePromise };