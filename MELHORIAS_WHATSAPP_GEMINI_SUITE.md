# 🤖 PRICEUS SALES AI (SISTEMA WHATSAPP + IA GEMINI 24/7)

> **Nome Oficial da Feature**: **Priceus Sales AI** *(Agente IA de Vendas)*
> **Chave da API do Gemini**: Salva e configurada no arquivo `.env.development.local` (`VITE_GEMINI_API_KEY`).
> **Integração de WhatsApp**: **Conexão Simples por QR Code Local (Sem custos, conversas instantâneas para envio e recebimento)**.

---

## ⚡ Resposta à Dúvida sobre Conversas Instantâneas e QR Code

### O sistema por QR Code permite iniciar e receber conversas instantâneas pela IA?
**SIM! 100% SIM!**
- **Envio e Recebimento Instantâneo**: A conexão por QR Code (Node.js Sidecar local em `server/whatsapp-service` rodando em `localhost:3001`) funciona como um cliente WhatsApp Web completo.
- **Início de Atendimento**: O sistema pode enviar mensagens automáticas de follow-up ou primeiro contato para qualquer número no WhatsApp.
- **Leitura de Respostas**: Quando o cliente responde no celular dele, a IA lê em tempo real, executa o cruzamento de dados e responde em segundos.
- **Custo R$ 0,00**: Sem mensalidades da Meta, sem taxas por conversa e sem aprovação de modelos de mensagem.

---

## 🏛️ 1. Organização do Menu & Estrutura das 4 Abas

A funcionalidade fica alocada no menu lateral em **Vendas ➔ IA de Vendas (WhatsApp)**:

1. **🟢 CENTRAL DE COMANDO AO VIVO (Live Sales Command)**
   - Alternador de visualização em um clique: **`🎴 Modo Cards (Grid)`** ou **`💬 Modo Chat (Split)`**.
   - Status dos chats: `🤖 Auto` | `👨‍💻 Copiloto` | `⏸️ Pausar`.
   - Janela de chat flutuante para resposta humana instantânea (Take Over).

2. **🎓 TREINAMENTO & SANDBOX (IA Training Studio & Simulator)**
   - Diretrizes de negócio amigáveis (prazos, políticas de fotos RAW, sinal de 30%).
   - Toggles visuais para injeção de tabelas do Priceus (Produtos, Contratos, Pagamentos e Agenda).
   - Simulador de Chat (Sandbox Test) para testar perguntas e respostas sem código.

3. **📊 DIAGNÓSTICO COMERCIAL & GESTÃO FINANCIAL (Sales Advisory & Empresa)**
   - Cruzamento de faturamento comercial com a **Saúde Financeira da Empresa** (Receitas, Gastos, Margem de Lucro Líquido de 71.1%).
   - Relatório "Onde Você Está Errando": atrasos nos fins de semana, custo de deslocamento rural e upsells de álbum não oferecidos.
   - Lista diária de ações com impacto estimado em faturamento ("To-Do de Vendas").

4. **⚙️ CONFIGURAÇÕES & GOOGLE AUTH (BYOK Setup & Pareamento)**
   - Status da chave `VITE_GEMINI_API_KEY` (1.500 chamadas diárias grátis).
   - Vinculação com Conta Google / Gemini AI Pro.
   - Pareamento do QR Code no `http://localhost:3001`.
   - Palavras-chave de Handoff (`gerente`, `desconto`, `falar com humano`).
