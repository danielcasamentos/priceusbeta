import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// --- DEBUG E VALIDAÇÃO DE AMBIENTE ---
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('🚨 ERRO CRÍTICO: Variáveis de ambiente do Supabase não encontradas.')
  throw new Error('Missing Supabase environment variables')
}

console.log('🔌 Inicializando Supabase Client...')
console.log('📍 URL do Projeto:', supabaseUrl)

// Validação específica para garantir que estamos no projeto correto
const PROJECT_ID_CORRETO = 'qrqcnrmaatthvyngwfkb'
if (!supabaseUrl.includes(PROJECT_ID_CORRETO)) {
  console.error(`❌ ERRO DE CONFIGURAÇÃO: O frontend está conectado ao projeto errado!`)
  console.error(`   Atual: ${supabaseUrl}`)
  console.error(`   Esperado: https://${PROJECT_ID_CORRETO}.supabase.co`)
  console.warn('⚠️ Verifique as variáveis de ambiente no Netlify (VITE_SUPABASE_URL)')
} else {
  console.log('✅ Conectado ao projeto Supabase correto:', PROJECT_ID_CORRETO)
}
// -------------------------------------

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

export interface Profile {
  id: string;
  nome_admin: string | null;
  nome_profissional: string | null;
  tipo_fotografia: string | null;
  instagram: string | null;
  whatsapp_principal: string | null;
  email_recebimento: string | null;
  profile_image_url: string | null;
  apresentacao: string | null;
  slug_usuario: string | null;
  perfil_publico: boolean | null;
  exibir_botao_perfil_completo: boolean | null;
  meta_description: string | null;
  visualizacoes_perfil: number | null;
  aceita_avaliacoes: boolean | null;
  aprovacao_automatica_avaliacoes: boolean | null;
  exibir_avaliacoes_publico: boolean | null;
  rating_minimo_exibicao: number | null;
  incentivo_avaliacao_ativo: boolean | null;
  incentivo_avaliacao_texto: string | null;
  status_assinatura: string | null;
  data_expiracao_trial: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  template_id: string;
  user_id: string;
  nome_cliente: string | null;
  email_cliente: string | null;
  telefone_cliente: string | null;
  tipo_evento: string | null;
  data_evento: string | null;
  cidade_evento: string | null;
  valor_total: number;
  orcamento_detalhe: any;
  status: 'novo' | 'contatado' | 'convertido' | 'perdido' | 'abandonado' | 'em_negociacao' | 'fazer_followup';
  data_orcamento: string;
  data_ultimo_contato: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'trial';
  is_read: boolean; // Mantido como is_read para consistência com o banco de dados
  created_at: string;
  updated_at: string;
  data?: any;
}
