import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend';

// Pega a chave da API do Resend que você configurou nas variáveis de ambiente do Supabase
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

serve(async (req) => {
  try {
    // 1. Recebe os dados da notificação que o banco de dados enviou
    const { record: notification } = await req.json();

    // 2. Monta o e-mail com base no tipo de notificação
    let subject = 'Você tem uma nova notificação!';
    let body = `<p>${notification.message}</p>`;

    if (notification.type === 'new_lead') {
      subject = '🎉 Novo Lead Recebido!';
      body = `
        <h1>Você tem um novo lead!</h1>
        <p><strong>${notification.message}</strong></p>
        <p>Acesse seu painel para ver os detalhes e não perca essa oportunidade.</p>
        <a href="https://priceus.com.br${notification.link}" style="padding: 12px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Ver Lead</a>
      `;
    } else if (notification.type === 'contract_signed') {
      subject = '📄 Contrato Assinado!';
      body = `
        <h1>Parabéns!</h1>
        <p><strong>${notification.message}</strong></p>
        <p>O contrato foi assinado digitalmente pelo cliente. Acesse seu painel para baixar o PDF.</p>
        <a href="https://priceus.com.br${notification.link}" style="padding: 12px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Ver Contrato</a>
      `;
    }
    // ... (aqui podemos adicionar lógicas para outros tipos de notificação)

    // 3. Envia o e-mail usando o Resend
    await resend.emails.send({
      from: 'Price Us <nao-responda@seu-dominio-verificado.com>', // Use seu domínio verificado
      to: ['email-do-fotografo@exemplo.com'], // Aqui buscaríamos o e-mail do fotógrafo
      subject: subject,
      html: body,
    });

    return new Response(JSON.stringify({ message: 'Email sent!' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
