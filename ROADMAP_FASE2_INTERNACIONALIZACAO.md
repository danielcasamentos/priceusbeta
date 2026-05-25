# 🌍 Priceus — Roadmap Fase 2: Internacionalização

> **Status:** Planejado — Iniciar após consolidação no mercado brasileiro  
> **Criado em:** 2026-05-25  
> **Contexto:** O Priceus foi construído com uma arquitetura que escala bem internacionalmente (templates por usuário, sistema geográfico/sazonal, formas de pagamento configuráveis). Este documento descreve o plano de expansão global para a Fase 2.

---

## 🎯 Objetivo

Expandir o Priceus para fotógrafos e profissionais criativos fora do Brasil, começando pelos mercados de menor fricção e maior retorno, com suporte a múltiplos mensageiros, idiomas e moedas.

---

## 📱 1. Suporte a Múltiplos Mensageiros

### Por que é necessário
No Brasil, o WhatsApp é universal. No resto do mundo, cada país tem seu app dominante:

| País / Região       | App dominante  | Link de abertura                          |
|---------------------|----------------|-------------------------------------------|
| 🇧🇷 Brasil           | WhatsApp       | `https://wa.me/55...?text=...`            |
| 🇺🇸 EUA / iOS global | iMessage / SMS | `sms:+1...&body=...`                      |
| 🇷🇺 Rússia / Europa  | Telegram       | `https://t.me/...`                        |
| 🇮🇳 Índia            | WhatsApp       | já funciona!                              |
| 🇨🇳 China            | WeChat         | API proprietária (parceria necessária)    |
| 🌍 Fallback global   | Email          | sempre disponível                         |

### Como implementar
O `whatsappMessageGenerator.ts` já gera **texto puro**, independente de plataforma. A mudança seria:

1. Adicionar campo `canal_mensagem` no template: `'whatsapp' | 'telegram' | 'sms' | 'email'`
2. Gerar o link correto no botão de envio com base no canal configurado
3. O conteúdo da mensagem já é neutro — nenhuma alteração necessária

> ⚠️ **WeChat:** exige cadastro como empresa na China, API proprietária e aprovação manual. Tratar como produto separado se/quando entrar no mercado chinês.

---

## 🌐 2. Internacionalização da Interface (i18n)

### Tecnologia recomendada
- **`i18next`** + **`react-i18next`** — padrão da indústria para React/Vite
- Arquivos de tradução em JSON por idioma (`/public/locales/pt-BR/`, `/public/locales/en-US/`, etc.)

### Idiomas prioritários (por ordem de ROI)

| Idioma       | Mercado alvo              | Esforço | Prioridade |
|--------------|---------------------------|---------|------------|
| Português PT | Portugal                  | ⭐ Mínimo | 🔴 Alta |
| Inglês EN    | EUA, UK, Índia, global    | ⭐⭐ Baixo | 🔴 Alta |
| Espanhol ES  | Espanha, LatAm            | ⭐⭐ Baixo | 🟡 Média |
| Francês FR   | França, Canadá, África    | ⭐⭐⭐ Médio | 🟢 Futura |
| Alemão DE    | Alemanha, Áustria, Suíça  | ⭐⭐⭐ Médio | 🟢 Futura |

### O que precisa ser traduzido
- Toda a UI do sistema (textos, labels, botões, mensagens de erro)
- Templates de mensagem padrão (WhatsApp/texto)
- Emails transacionais
- Landing page / site de marketing

---

## 💱 3. Suporte a Múltiplas Moedas

O sistema já tem `valor_total` e formatação de moeda. A expansão exige:

1. Campo `moeda` no template: `'BRL' | 'USD' | 'EUR' | 'GBP' | 'INR'` etc.
2. Formatação via `Intl.NumberFormat(locale, { style: 'currency', currency: ... })`
3. Adaptar labels (`R$` → `$` → `€`) em toda a UI de orçamento

---

## 📞 4. Formatação Internacional de Telefone

O sistema atual valida telefones no formato brasileiro (DDD + 8/9 dígitos). Para internacionalização:

- Usar biblioteca `libphonenumber-js` para validação e formatação universal
- Detectar país pelo template e aplicar máscara correta

---

## 🗺️ Análise de Mercados por Prioridade

| Mercado       | Esforço total | Potencial | Observações chave |
|---------------|---------------|-----------|-------------------|
| 🇵🇹 Portugal  | ⭐ Mínimo     | Alto      | Mesmo idioma, WhatsApp, euro |
| 🇺🇸 EUA       | ⭐⭐⭐ Médio  | Muito alto | Mercado de $70B/ano em casamentos, inglês |
| 🇮🇳 Índia     | ⭐⭐ Baixo    | Alto      | WhatsApp já funciona, inglês, rupia |
| 🇪🇸 LatAm     | ⭐⭐ Baixo    | Alto      | Espanhol, WhatsApp, múltiplas moedas |
| 🇩🇪🇫🇷 Europa | ⭐⭐⭐⭐ Alto | Médio     | GDPR complexo, múltiplos idiomas |
| 🇷🇺 Rússia    | ⭐⭐⭐⭐ Alto | Incerto   | Telegram, sanções, risco legal |
| 🇨🇳 China     | ⭐⭐⭐⭐⭐    | Incerto   | WeChat, Great Firewall, regulação específica |

---

## 🏗️ Fases de Implementação

### Fase 2A — Internacionalização Base (menor esforço, maior impacto)
- [ ] Adicionar suporte a **Telegram** e **SMS/iMessage** como canal de mensagem
- [ ] Configurar `canal_mensagem` no `TemplateEditor`
- [ ] Traduzir UI para **inglês** (EN-US)
- [ ] Suporte a **moeda personalizada** por template
- [ ] Lançar versão beta para **Portugal** e **Índia**

### Fase 2B — Expansão Ativa
- [ ] Configurar `i18next` com suporte a múltiplos idiomas
- [ ] Traduzir para **espanhol** (ES)
- [ ] Formatação de telefone internacional com `libphonenumber-js`
- [ ] Adaptar landing page para EN e ES
- [ ] Campanha de marketing EUA / LatAm

### Fase 2C — Europa e Compliance
- [ ] Tradução para francês e alemão
- [ ] **GDPR compliance** completo (consentimento, direito ao esquecimento, exportação de dados)
- [ ] Política de privacidade por região
- [ ] Suporte a múltiplas timezones na agenda

### Fase 2D — Mercados Especiais (avaliar separadamente)
- [ ] China (WeChat): avaliar parceria com empresa local
- [ ] Rússia: avaliar viabilidade legal e de pagamentos

---

## ⚙️ Pontos Fortes da Arquitetura Atual para Internacionalização

O Priceus já foi construído de forma que facilita a expansão:

- ✅ **Templates por usuário** — cada fotógrafo configura sua própria experiência
- ✅ **Sistema geográfico** — já existe lógica de ajuste por localização
- ✅ **Sistema sazonal** — funciona igual em qualquer país
- ✅ **Formas de pagamento configuráveis** — o usuário cadastra o que quiser
- ✅ **Gerador de mensagem neutro** — texto puro, funciona em qualquer app
- ✅ **Supabase** — infraestrutura global, baixa latência em qualquer região

---

## 📝 Notas

- Priorizar Portugal e EUA como primeiros mercados internacionais
- Inglês é o idioma mais estratégico: alcança EUA, UK, Índia, Austrália, global
- Não entrar na China sem parceiro local — regulação muito específica
- GDPR é obrigatório para qualquer usuário na Europa, mesmo que o servidor não seja lá

---

*Documento criado em 25/05/2026. Revisar e atualizar ao iniciar a Fase 2.*
