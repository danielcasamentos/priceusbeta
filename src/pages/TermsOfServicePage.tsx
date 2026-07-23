import { Helmet } from 'react-helmet-async';
import { FileText, ArrowLeft, Shield, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 py-12 px-4 sm:px-6 lg:px-8">
      <Helmet>
        <title>Termos de Serviço | PriceU$</title>
        <meta name="description" content="Termos de Serviço e Condições de Uso da plataforma PriceU$." />
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
            Condições de Uso
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
            Termos de Serviço do PriceU$
          </h1>
          <p className="text-sm text-slate-400">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Content Body */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-8 text-sm leading-relaxed text-slate-300">
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span>1. Aceitação dos Termos</span>
            </h2>
            <p>
              Ao se cadastrar e utilizar a plataforma <strong>PriceU$</strong>, você concorda com estes Termos de Serviço. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">2. Descrição dos Serviços</h2>
            <p>
              O PriceU$ é uma plataforma SaaS desenvolvida para fotógrafos profissionais gerenciarem precificação, propostas comerciais, agendamento de ensaios/eventos, contratos digitais e entrega de galerias virtuais de fotos.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">3. Responsabilidades do Usuário</h2>
            <p>
              O usuário é responsável por manter a confidencialidade de suas credenciais de acesso, pelo conteúdo das imagens enviadas para suas galerias e por obter a devida autorização de uso de imagem de seus clientes finais.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>4. Integrações com Serviços de Terceiros (Google APIs)</span>
            </h2>
            <p>
              O PriceU$ oferece integração opcional com serviços do Google (Google Calendar e Google Drive) para facilitar o fluxo de trabalho do fotógrafo. O uso dessas integrações obedece aos termos e políticas do Google e à nossa Política de Privacidade.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white">5. Cancelamento e Modificações</h2>
            <p>
              O usuário pode cancelar sua assinatura a qualquer momento através do painel da conta. O PriceU$ reserva-se o direito de atualizar estes termos periodicamente, notificando os usuários através do sistema.
            </p>
          </section>

          <section className="space-y-2 border-t border-slate-800 pt-6">
            <h2 className="text-xl font-bold text-white">6. Suporte e Contato</h2>
            <p className="text-slate-400">
              Para dúvidas sobre os Termos de Serviço, entre em contato através do e-mail: <strong className="text-white">suporte@priceus.com.br</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
