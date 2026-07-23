import { Helmet } from 'react-helmet-async';
import { Shield, ArrowLeft, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Política de Privacidade | PriceU$</title>
        <meta name="description" content="Política de Privacidade de dados e uso de integrações do PriceU$." />
      </Helmet>

      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao início</span>
          </Link>
          <div className="flex items-center space-x-2 text-blue-400 font-bold text-lg">
            <Shield className="w-6 h-6" />
            <span>PriceU$</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-4">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
            Sua Privacidade em Primeiro Lugar
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Política de Privacidade e Proteção de Dados
          </h1>
          <p className="text-sm text-slate-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR')} | Em conformidade com a LGPD e a Política de Dados de Usuário das APIs do Google.
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Lock className="w-5 h-5 text-blue-400" />
              <span>1. Introdução e Compromisso</span>
            </h2>
            <p>
              O <strong>PriceU$</strong> tem o compromisso de proteger a privacidade e os dados pessoais de seus usuários (fotógrafos e clientes finais). Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações de acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018) e com os requisitos das plataformas de terceiros integradas.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span>2. Coleta e Uso de Dados Pessoais</span>
            </h2>
            <p>
              Coletamos informações necessárias para a prestação dos serviços de precificação, gestão de agendamentos, geração de propostas, envio de contratos e entrega de galerias fotográficas.
            </p>
            <ul className="list-disc pl-6 space-y-1 text-slate-400">
              <li><strong>Dados de Cadastro:</strong> Nome profissional, e-mail, telefone/WhatsApp, cidade de atuação e logotipo.</li>
              <li><strong>Dados de Clientes (Leads):</strong> Nome, contato e data de evento informados no preenchimento dos formulários.</li>
            </ul>
          </section>

          <section className="space-y-4 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>3. Uso de Dados das APIs do Google (Google OAuth, Drive e Calendar)</span>
            </h2>
            <p>
              Ao conectar sua conta do Google ao PriceU$, solicitamos escopos estritamente necessários para o funcionamento das ferramentas integradas:
            </p>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
              <div>
                <strong className="text-white block mb-1">Google Calendar (Agenda):</strong>
                <p className="text-xs text-slate-400">
                  Utilizamos o escopo <code className="text-blue-400 font-mono">https://www.googleapis.com/auth/calendar</code> exclusivamente para criar, atualizar e verificar compromissos na agenda do fotógrafo, evitando conflitos de datas nos agendamentos públicos.
                </p>
              </div>
              <div className="border-t border-slate-800 pt-3">
                <strong className="text-white block mb-1">Google Drive (Armazenamento):</strong>
                <p className="text-xs text-slate-400">
                  Utilizamos o escopo <code className="text-blue-400 font-mono">https://www.googleapis.com/auth/drive.file</code> estritamente para criar a pasta exclusiva <code className="text-white">/PriceUS_Galerias</code> e salvar os arquivos de foto em alta resolução enviados pelo fotógrafo.
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-300 space-y-2">
              <p className="font-bold text-white">Requisito da Política de Dados de Usuário das APIs do Google:</p>
              <p>
                O uso e a transferência de informações recebidas das APIs do Google para qualquer outro aplicativo estarão em conformidade com a <strong>Política de Dados de Usuário dos Serviços de API do Google</strong>, incluindo os requisitos de <em>Uso Limitado (Limited Use Requirements)</em>.
              </p>
              <p>
                Os dados obtidos via Google APIs <strong>nunca</strong> são vendidos, compartilhados com terceiros ou utilizados para treinamento de modelos de inteligência artificial sem o seu consentimento explícito.
              </p>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">4. Segurança dos Dados</h2>
            <p>
              Adotamos criptografia SSL/TLS em todas as comunicações, autenticação segura via tokens OAuth2, banco de dados protegido por RLS (Row Level Security) e padrões de segurança de classe mundial.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Seus Direitos e Desconexão</h2>
            <p>
              Você pode revogar a permissão de acesso ao Google ou solicitar a exclusão de seus dados pessoais a qualquer momento nas configurações do seu perfil no aplicativo ou diretamente na página de permissões da sua Conta Google (<a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="text-blue-400 underline font-semibold">myaccount.google.com/permissions</a>).
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-white">6. Contato do Encarregado de Dados (DPO)</h2>
            <p className="text-slate-400">
              Para dúvidas sobre esta política ou para exercer seus direitos de privacidade, entre em contato pelo e-mail: <strong className="text-white">suporte@priceus.com.br</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
