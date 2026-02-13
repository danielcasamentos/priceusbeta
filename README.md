# 📸 Priceus - Sistema de Orçamentos e Gestão de Leads

> **Sistema completo de orçamentos para fotógrafos profissionais com captura automática de leads, conformidade LGPD e comunicação reversa via WhatsApp.**

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 🎯 O Que é o Priceus?

O **Priceus** é uma plataforma SaaS completa que permite fotógrafos criarem **orçamentos interativos** que funcionam como um "cardápio digital" para seus serviços.

### 🆕 Novo Sistema de Leads

Esta versão inclui um **sistema completo de captura e gestão de leads** com:

✨ **Captura Automática**
- Salva todos os orçamentos (completos e abandonados)
- Auto-save a cada 5 segundos
- Tracking de tempo e comportamento

💬 **Comunicação Reversa**
- Envio de mensagens via WhatsApp com um clique
- Mensagens personalizadas automáticas
- Atualização de status integrada

📊 **Dashboard Completo**
- Estatísticas em tempo real
- Filtros por status
- Taxa de conversão
- Gestão de pipeline

🔒 **LGPD Compliant**
- Modal de consentimento obrigatório
- Registro de aceites
- Transparência total

---

## 🚀 Quick Start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
# Edite o arquivo .env com suas credenciais do Supabase

# 3. Executar em desenvolvimento
npm run dev

# 4. Build para produção
npm run build
```

---

## 📁 Estrutura do Projeto

```
priceus/
├── src/
│   ├── components/
│   │   ├── CookieConsent.tsx      # Modal LGPD
│   │   └── LeadsManager.tsx       # Dashboard de Leads
│   ├── hooks/
│   │   └── useLeadCapture.ts      # Captura automática
│   ├── lib/
│   │   ├── supabase.ts            # Cliente Supabase
│   │   └── utils.ts               # Funções auxiliares
│   ├── App.tsx                    # App principal
│   └── main.tsx                   # Entry point
├── public/                        # Arquivos públicos
├── .env                           # Variáveis de ambiente
├── SISTEMA_LEADS.md              # Documentação do sistema
├── GUIA_IMPLANTACAO.md           # Guia de deploy
└── README.md                      # Este arquivo
```

---

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Type safety
- **Vite** - Build tool ultra-rápido
- **Tailwind CSS** - Estilização utility-first

### Backend & Database
- **Supabase** - Backend as a Service
  - PostgreSQL para dados
  - Row Level Security (RLS)
  - Storage para imagens
  - Authentication

### Bibliotecas
- `@supabase/supabase-js` - Cliente Supabase
- `lucide-react` - Ícones modernos

---

## 📊 Banco de Dados

O sistema utiliza **10 tabelas principais**:

### Core
1. `profiles` - Perfis dos fotógrafos
2. `templates` - Templates de orçamento
3. `produtos` - Produtos/serviços
4. `campos` - Campos extras do formulário

### Pricing
5. `formas_pagamento` - Formas de pagamento
6. `cupons` - Cupons de desconto
7. `acrescimos_sazonais` - Acréscimos por temporada
8. `acrescimos_localidade` - Acréscimos por região

### Leads (Novo)
9. `leads` ⭐ - Captura de orçamentos
10. `cookies_consent` ⭐ - Consentimento LGPD

> **Todas as tabelas possuem RLS habilitado para máxima segurança!**

---

## 🔐 Segurança

### LGPD Compliance
- ✅ Consentimento explícito obrigatório
- ✅ Transparência sobre uso dos dados
- ✅ Armazenamento seguro
- ✅ Direito ao esquecimento

### Row Level Security (RLS)
- ✅ Usuários só acessam seus próprios dados
- ✅ Políticas restritivas por padrão
- ✅ Autenticação obrigatória para operações sensíveis

### Best Practices
- ✅ Variáveis de ambiente para credenciais
- ✅ HTTPS obrigatório em produção
- ✅ Sanitização de inputs
- ✅ CORS configurado

---

## 📱 Funcionalidades

### Para o Fotógrafo
- ✅ Criar templates de orçamento personalizados
- ✅ Gerenciar produtos e serviços
- ✅ Configurar formas de pagamento
- ✅ Criar cupons de desconto
- ✅ **Visualizar todos os leads capturados**
- ✅ **Enviar mensagens via WhatsApp**
- ✅ **Acompanhar taxa de conversão**
- ✅ **Atualizar status dos leads**

### Para o Cliente
- ✅ Visualizar portfólio do fotógrafo
- ✅ Selecionar serviços desejados
- ✅ Calcular orçamento em tempo real
- ✅ Aplicar cupons de desconto
- ✅ Escolher forma de pagamento
- ✅ Gerar link ou WhatsApp direto
- ✅ **Auto-save transparente**

---

## 📖 Documentação Completa

- **[SISTEMA_LEADS.md](./SISTEMA_LEADS.md)** - Documentação técnica detalhada do sistema de leads
- **[GUIA_IMPLANTACAO.md](./GUIA_IMPLANTACAO.md)** - Passo a passo para deploy em produção

---

## 🎨 Screenshots

### Dashboard de Leads
```
┌─────────────────────────────────────────────┐
│  📊 Total: 45   🆕 Novos: 12   ⏸️ Abandonados: 8   │
│  ✅ Conversão: 24.4%                          │
├─────────────────────────────────────────────┤
│  [ Todos ] [ Novo ] [ Contatado ] [ ... ]    │
├─────────────────────────────────────────────┤
│  Cliente  │ Contato       │ Evento │ Ações  │
│  João S.  │ (11) 99999... │ R$ 3k  │ 💬 👁️  │
│  Maria O. │ maria@...     │ R$ 5k  │ 💬 👁️  │
└─────────────────────────────────────────────┘
```

### Modal LGPD
```
┌──────────────────────────────────┐
│   🍪 Política de Cookies          │
│                                   │
│   Valorizamos sua privacidade.   │
│   Este site utiliza cookies...   │
│                                   │
│   [Ver detalhes]                  │
│                                   │
│   [Apenas Necessários] [Aceitar] │
└──────────────────────────────────┘
```

---

## 🧪 Testes

```bash
# Executar testes unitários
npm run test

# Executar testes E2E
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 🚢 Deploy

### Vercel (Recomendado)
```bash
# Instalar CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify
```bash
# Build
npm run build

# Deploy
netlify deploy --prod --dir=dist
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

---

## 📝 Changelog

### v2.0.0 (2025-01) - Sistema de Leads
- ✨ Novo sistema completo de captura de leads
- ✨ Modal LGPD com consentimento de cookies
- ✨ Dashboard administrativo de gestão
- ✨ Comunicação reversa via WhatsApp
- ✨ Auto-save e tracking de comportamento
- ✨ Estatísticas e métricas de conversão
- 🔧 Migração completa para React + TypeScript
- 🔧 Atualização para Vite 5.4
- 🔧 Supabase RLS configurado em todas as tabelas

### v1.0.0 (2024) - MVP
- 🎉 Lançamento inicial
- Criação de templates de orçamento
- Sistema de produtos e serviços
- Calculadora de preços
- Integração WhatsApp básica

---

## 📄 Licença

Este projeto é proprietário e de uso exclusivo do Priceus.

---

## 👥 Equipe

Desenvolvido com ❤️ por profissionais apaixonados por fotografia e tecnologia.

---

## 📞 Suporte

Para suporte técnico:
- 📧 Email: suporte@priceus.com.br
- 💬 WhatsApp: (11) 99999-9999
- 📖 Documentação: [docs.priceus.com.br](https://docs.priceus.com.br)

---

## 🌟 Features Futuras

- [ ] Notificações push para novos leads
- [ ] Integração com Google Analytics
- [ ] Exportação de relatórios em PDF
- [ ] Funil de vendas visual
- [ ] Automação de follow-up por email
- [ ] Integração com CRMs externos
- [ ] App mobile nativo
- [ ] Dashboard de métricas avançado

---

**⭐ Se este projeto te ajudou, considere dar uma estrela no GitHub!**

---

Made with 💙 by **Priceus Team**
# priceusbeta
