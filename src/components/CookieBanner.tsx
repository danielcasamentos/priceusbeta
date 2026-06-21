/**
 * 🍪 BANNER DE COOKIES E POLÍTICA DE PRIVACIDADE
 *
 * Banner discreto no topo das páginas públicas informando sobre:
 * - Coleta de dados em formulários públicos
 * - Responsabilidade do fotógrafo/profissional
 * - Política de cookies básica
 * - Não interfere no funcionamento do sistema
 */

import { useState, useEffect } from 'react';
import { Cookie } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'priceus_cookie_consent';
const CONSENT_VERSION = '2.0'; // Atualizada com nova política

export interface CookieBannerProps {
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
}

export function CookieBanner({ accentColor = '#2563eb', backgroundColor, textColor }: CookieBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);

    if (!consent) {
      // Aguarda 1 segundo antes de mostrar para não ser intrusivo
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }

    // Verifica versão do consentimento
    try {
      const parsed = JSON.parse(consent);
      if (parsed.version !== CONSENT_VERSION) {
        setShow(true);
      }
    } catch {
      setShow(true);
    }
  }, []);

  const handleAccept = () => {
    const consentData = {
      accepted: true,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    setShow(false);
  };

  const handleDismiss = () => {
    const consentData = {
      accepted: false,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentData));
    setShow(false);
  };

  if (!show) return null;

  const handleShowPolicy = (e: React.MouseEvent) => {
    e.preventDefault();

    const policy = `POLÍTICA DE COOKIES E PRIVACIDADE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 SOBRE ESTE SITE

Esta plataforma é uma ferramenta fornecida para profissionais (fotógrafos, prestadores de serviços) criarem e compartilharem orçamentos personalizados com seus clientes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🍪 USO DE COOKIES

Este site utiliza cookies essenciais para:
• Armazenar temporariamente suas seleções no orçamento
• Manter o funcionamento correto dos formulários
• Melhorar sua experiência de navegação

Tipos de cookies utilizados:
• Cookies técnicos (essenciais para o funcionamento)
• Armazenamento local (para salvar suas preferências)

Não utilizamos cookies de rastreamento ou publicidade.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔒 COLETA E USO DE DADOS

Quando você preenche o formulário de orçamento, os seguintes dados podem ser coletados:
• Nome completo
• E-mail
• Telefone/WhatsApp
• Data do evento
• Localização do evento
• Preferências de serviços

RESPONSABILIDADE PELOS DADOS:
Os dados preenchidos nesta página são coletados e gerenciados EXCLUSIVAMENTE pelo profissional/fotógrafo responsável por este orçamento.

A PLATAFORMA não tem acesso, não armazena e não se responsabiliza pelo tratamento destes dados. O profissional é o único controlador dos dados conforme LGPD (Lei Geral de Proteção de Dados).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ SEGURANÇA E PROTEÇÃO

• Conexão segura (HTTPS/SSL)
• Dados criptografados em trânsito
• Armazenamento seguro em servidores certificados
• Acesso restrito apenas ao profissional responsável

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 SEUS DIREITOS (LGPD)

Você tem direito a:
• Acessar seus dados pessoais
• Corrigir dados incompletos ou desatualizados
• Solicitar exclusão dos seus dados
• Revogar consentimento
• Portabilidade dos dados

Para exercer estes direitos, entre em contato DIRETAMENTE com o profissional/fotógrafo responsável por este orçamento.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ ISENÇÃO DE RESPONSABILIDADE

A plataforma atua apenas como fornecedora da ferramenta tecnológica. O profissional/fotógrafo é o único responsável por:
• Coleta e tratamento dos dados pessoais
• Cumprimento da LGPD e legislação aplicável
• Resposta a solicitações dos titulares de dados
• Segurança e privacidade das informações coletadas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 ÚLTIMA ATUALIZAÇÃO: Novembro de 2024
📄 VERSÃO: 2.0

Ao continuar navegando e preenchendo este formulário, você declara estar ciente desta política.`;

    // Criar modal customizado
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 20px;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      border-radius: 12px;
      max-width: 700px;
      max-height: 80vh;
      overflow-y: auto;
      padding: 0;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 12px 12px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 1;
    `;
    header.innerHTML = `
      <h2 style="margin: 0; font-size: 18px; font-weight: 600;">🍪 Política de Cookies e Privacidade</h2>
      <button onclick="this.closest('[style*=fixed]').remove()" style="
        background: transparent;
        border: none;
        color: white;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: background 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">×</button>
    `;

    const body = document.createElement('div');
    body.style.cssText = `
      padding: 24px;
      white-space: pre-wrap;
      font-family: monospace;
      font-size: 13px;
      line-height: 1.6;
      color: #374151;
    `;
    body.textContent = policy;

    const footer = document.createElement('div');
    footer.style.cssText = `
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      position: sticky;
      bottom: 0;
      background: white;
      border-radius: 0 0 12px 12px;
    `;
    footer.innerHTML = `
      <button onclick="this.closest('[style*=fixed]').remove()" style="
        background: #2563eb;
        color: white;
        border: none;
        padding: 10px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s;
      " onmouseover="this.style.background='#1d4ed8'" onmouseout="this.style.background='#2563eb'">
        Entendi
      </button>
    `;

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    modal.appendChild(content);

    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    document.body.appendChild(modal);
  };

  // Inteligência de cores para o banner
  const isLightTheme = textColor && (
    textColor.toLowerCase() === '#111827' ||
    textColor.toLowerCase() === '#1a1a1a' ||
    textColor.toLowerCase() === '#1e293b' ||
    textColor.toLowerCase() === '#0f172a' ||
    textColor.toLowerCase() === '#000000' ||
    textColor.toLowerCase() === '#374151'
  );

  const defaultBg = isLightTheme ? 'rgba(255, 255, 255, 0.92)' : 'rgba(15, 23, 42, 0.92)';
  const defaultText = isLightTheme ? '#1e293b' : '#f8fafc';

  const bgStyle = backgroundColor 
    ? (backgroundColor.startsWith('#') ? `${backgroundColor}e6` : backgroundColor)
    : defaultBg;

  const textStyle = textColor || defaultText;
  const borderStyle = isLightTheme ? '1px solid rgba(0, 0, 0, 0.08)' : '1px solid rgba(255, 255, 255, 0.1)';

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-slide-up">
      <div 
        style={{
          background: bgStyle,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          color: textStyle,
          border: borderStyle,
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.3)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <Cookie className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: accentColor }} />
            <div className="flex-1">
              <p className="text-xs leading-relaxed opacity-90" style={{ fontFamily: 'sans-serif' }}>
                Este site usa cookies essenciais. Os dados preenchidos são de responsabilidade exclusiva do profissional.
                <button
                  onClick={handleShowPolicy}
                  className="underline ml-1 font-medium hover:opacity-100 transition-opacity"
                  style={{ color: accentColor, opacity: 0.8 }}
                >
                  Ler política completa
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t pt-2.5" style={{ borderColor: isLightTheme ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)' }}>
            <button
              onClick={handleAccept}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-md transition-all active:scale-95"
              style={{
                background: accentColor,
                color: isLightTheme && accentColor === '#fff' ? '#000' : '#fff',
              }}
            >
              Aceitar
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white/10 transition-colors"
              style={{ color: textStyle, opacity: 0.7 }}
            >
              Recusar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Função para limpar consentimento (para testes ou solicitação do usuário)
 */
export function clearCookieConsent() {
  localStorage.removeItem(COOKIE_CONSENT_KEY);
  window.location.reload();
}

/**
 * Função para verificar se usuário deu consentimento
 */
export function hasCookieConsent(): boolean {
  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (!consent) return false;

  try {
    const parsed = JSON.parse(consent);
    return parsed.accepted === true && parsed.version === CONSENT_VERSION;
  } catch {
    return false;
  }
}
