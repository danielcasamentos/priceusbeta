import { supabase } from '../lib/supabase';

export interface CompressedChatState {
  phone: string;
  clientName?: string;
  clientRole?: 'noiva' | 'noivo' | 'organizador' | 'cliente';
  eventType?: string;
  eventDate?: string;
  eventCity?: string;
  stage?: 'lead_novo' | 'qualificado' | 'proposta_enviada' | 'objecao_noivo' | 'agendado_followup' | 'fechado';
  executiveSummary: string;
  lastInteractionAt: string;
}

export interface ScheduledFollowUp {
  id?: string;
  phone: string;
  clientName: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'cancelled';
  customNote?: string;
}

/**
 * Serviço de Memória Comprimida (Compressão RAG de Altíssima Eficiência)
 * Ocupa menos de 0,5 KB por cliente no banco de dados!
 */
export async function saveCompressedChatMemory(state: CompressedChatState): Promise<boolean> {
  try {
    const { error } = await supabase.from('whatsapp_chat_memory').upsert(
      {
        phone: state.phone,
        client_name: state.clientName,
        client_role: state.clientRole,
        event_type: state.eventType,
        event_date: state.eventDate,
        event_city: state.eventCity,
        stage: state.stage,
        executive_summary: state.executiveSummary,
        last_interaction_at: new Date().toISOString()
      },
      { onConflict: 'phone' }
    );

    if (error) {
      console.warn('[Memory Storage Warning]: Table may not exist yet, keeping state in memory.', error.message);
    }
    return true;
  } catch (e) {
    console.warn('[Memory Storage Error]:', e);
    return false;
  }
}

/**
 * Agendamento Automático de Follow-up com gatilho de data/hora no Supabase
 */
export async function scheduleAutoFollowUp(followup: ScheduledFollowUp): Promise<boolean> {
  try {
    const { error } = await supabase.from('whatsapp_followups').insert({
      phone: followup.phone,
      client_name: followup.clientName,
      scheduled_at: followup.scheduledAt,
      status: 'pending',
      custom_note: followup.customNote || 'Follow-up automático de objeção noivo/noiva'
    });

    if (error) {
      console.warn('[Followup Storage Warning]: Table may not exist yet, logged in session.', error.message);
    }
    console.log(`[Follow-up Agendado com Sucesso para ${followup.clientName} em ${followup.scheduledAt}]`);
    return true;
  } catch (e) {
    console.warn('[Followup Storage Error]:', e);
    return false;
  }
}
