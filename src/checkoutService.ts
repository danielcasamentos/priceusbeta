import { supabase } from './lib/supabase';
import { stripePromise } from './lib/stripe';

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

    const { url } = responseData;

    if (!url) {
      throw new Error('URL de checkout do Stripe não foi recebida do backend.');
    }

    // 5. Redirecionar para o Stripe
    // Com a remoção de `redirectToCheckout`, redirecionamos manualmente para a URL da sessão.
    window.location.href = url;

  } catch (error) {
    console.error('❌ Erro geral no fluxo de checkout:', error);
    // Mostra a mensagem de erro para o usuário
    alert((error as Error).message);
  }
}