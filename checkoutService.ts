import { supabase } from './src/lib/supabase';
import { stripePromise } from './src/lib/stripe';

export async function handleCheckout(priceId: string) {
  console.log('🚀 Iniciando processo de checkout...');

  // 1. Validação de Segurança no Frontend
  // Esta é a verificação mais importante. Ela impede a chamada à API se o ID não estiver definido.
  if (!priceId) {
    const errorMessage = 'CRITICAL: O ID do preço (priceId) não foi fornecido para o checkout.';
    console.error(`❌ ${errorMessage}`);
    alert(errorMessage);
    // Interrompe a execução aqui.
    return;
  }

  console.log(`📦 Enviando Price ID para o backend: ${priceId}`);

  try {
    // 2. Obter a sessão do usuário
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      alert('Sua sessão expirou. Por favor, faça login novamente.');
      console.error('Erro ao obter sessão ou sessão não encontrada', sessionError);
      return;
    }

    // 3. Chamar a Edge Function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        // O corpo da requisição é construído aqui, usando a variável validada.
        body: JSON.stringify({ priceId: priceId }),
      }
    );

    // 4. Processar a resposta do backend
    const responseData = await response.json();

    if (!response.ok) {
      // Se a resposta não for OK, lança um erro com a mensagem do backend
      console.error('Erro retornado pela Edge Function:', responseData);
      throw new Error(responseData.error || 'Falha ao criar a sessão de checkout.');
    }

    const { sessionId } = responseData;

    if (!sessionId) {
      throw new Error('ID da sessão do Stripe não foi recebido do backend.');
    }

    // 5. Redirecionar para o Stripe
    const stripe = await stripePromise;
    if (!stripe) {
      throw new Error('Stripe.js não conseguiu carregar.');
    }

    const { error: stripeError } = await stripe.redirectToCheckout({ sessionId });

    if (stripeError) {
      console.error('Erro ao redirecionar para o Stripe:', stripeError);
      alert(stripeError.message);
    }

  } catch (error) {
    console.error('❌ Erro geral no fluxo de checkout:', error);
    // Mostra a mensagem de erro para o usuário
    alert((error as Error).message);
  }
}