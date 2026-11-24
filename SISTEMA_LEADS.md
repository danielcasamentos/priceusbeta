# 📋 Sistema de Captura e Gestão de Leads - Priceus

## 🎯 Visão Geral

Sistema completo de **captura automática de leads** e **gestão de orçamentos** para fotógrafos profissionais, com funcionalidades avançadas de tracking, conformidade LGPD e comunicação reversa via WhatsApp.

---

## ✨ Funcionalidades Principais

### 1. 🍪 **Conformidade com LGPD e Cookies**
- ✅ Modal de consentimento obrigatório
- ✅ Registro de aceites no banco de dados
- ✅ Cookies necessários, analíticos e de marketing
- ✅ Texto claro sobre coleta de dados
- ✅ Armazenamento seguro de preferências

### 2. 📊 **Captura Automática de Leads**
- ✅ **Captura em tempo real** de todos os orçamentos
- ✅ **Auto-save** a cada 5 segundos de inatividade
- ✅ **Tracking de abandono** quando usuário sai da página
- ✅ **Captura de orçamentos parciais** (abandonados)
- ✅ **Captura de orçamentos completos** (finalizados)
- ✅ Armazenamento de:
  - Nome, telefone, email
  - Tipo de evento, data, cidade
  - Produtos selecionados
  - Valor total do orçamento
  - Tempo de preenchimento
  - IP, user agent, session ID

### 3. 📱 **Comunicação Reversa via WhatsApp**
- ✅ Botão "Enviar WhatsApp" no painel admin
- ✅ Mensagem personalizada automática com:
  - Nome do cliente
  - Detalhes do evento
  - Serviços selecionados
  - Valor do orçamento
- ✅ Abertura automática do WhatsApp Web/App
- ✅ Atualização de status para "contatado"

### 4. 🎛️ **Painel Administrativo Completo**
- ✅ Dashboard com estatísticas:
  - Total de leads
  - Leads novos
  - Leads abandonados
  - Taxa de conversão
- ✅ Filtros por status:
  - Todos
  - Novo
  - Abandonado
  - Contatado
  - Convertido
  - Perdido
- ✅ Visualização detalhada de cada lead
- ✅ Atualização de status com um clique
- ✅ Tabela responsiva com todas as informações

### 5. 🔐 **Segurança e Performance**
- ✅ RLS (Row Level Security) habilitado
- ✅ Políticas restritivas por padrão
- ✅ Autenticação via Supabase
- ✅ Sessões seguras e persistentes
- ✅ Debounce para evitar sobrecarga

---

## 🗂️ Estrutura do Banco de Dados

### Tabela: `leads`
```sql
CREATE TABLE leads (
  id uuid PRIMARY KEY,
  template_id uuid REFERENCES templates(id),
  user_id uuid REFERENCES auth.users(id),

  -- Dados do Cliente
  nome_cliente text,
  email_cliente text,
  telefone_cliente text,

  -- Dados do Evento
  tipo_evento text,
  data_evento date,
  cidade_evento text,

  -- Orçamento
  valor_total numeric(10,2),
  orcamento_detalhe jsonb,
  url_origem text,

  -- Status e Tracking
  status text, -- 'novo', 'contatado', 'convertido', 'perdido', 'abandonado'
  origem text DEFAULT 'web',
  data_orcamento timestamptz DEFAULT now(),
  data_ultimo_contato timestamptz,
  observacoes text,

  -- Metadados
  ip_address inet,
  user_agent text,
  session_id text,
  tempo_preenchimento_segundos integer,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Tabela: `cookies_consent`
```sql
CREATE TABLE cookies_consent (
  id uuid PRIMARY KEY,
  session_id text NOT NULL,
  ip_address inet,
  user_agent text,
  consent_analytics boolean DEFAULT false,
  consent_marketing boolean DEFAULT false,
  consent_necessary boolean DEFAULT true,
  consent_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
```

---

## 🚀 Como Usar

### 1. **Setup Inicial**

```bash
# Instalar dependências
npm install

# Verificar variáveis de ambiente
cat .env
```

### 2. **Executar em Desenvolvimento**

```bash
npm run dev
```

### 3. **Build para Produção**

```bash
npm run build
npm run preview
```

---

## 📱 Fluxo de Uso

### Para o Fotógrafo (Admin):

1. **Login** no sistema
2. Acessa o **Dashboard de Leads**
3. Visualiza **estatísticas** em tempo real
4. **Filtra leads** por status
5. **Visualiza detalhes** de cada lead
6. **Envia mensagem** via WhatsApp com um clique
7. **Atualiza status** do lead

### Para o Cliente:

1. Acessa o link do orçamento
2. Aceita **cookies e termos** (LGPD)
3. Preenche dados de contato
4. Seleciona serviços desejados
5. Sistema **salva automaticamente** (auto-save)
6. Se **abandonar**, lead fica como "abandonado"
7. Se **finalizar**, lead fica como "novo"

---

## 🛠️ Componentes Principais

### `CookieConsent.tsx`
Modal de consentimento LGPD com:
- Detalhes sobre tipos de cookies
- Botões "Apenas Necessários" e "Aceitar Todos"
- Salvamento no banco e localStorage

### `LeadsManager.tsx`
Painel completo de gestão com:
- Estatísticas de leads
- Filtros por status
- Tabela de leads
- Modal de detalhes
- Integração WhatsApp

### `useLeadCapture.ts`
Hook customizado para captura automática:
- Auto-save debounced
- Tracking de tempo
- Captura ao sair da página
- Armazenamento em sessionStorage

### `useFormTracking.ts`
Hook para tracking de interação:
- Campos visitados
- Tempo em cada campo
- Estatísticas de engajamento

---

## 📊 Métricas e Análises

O sistema coleta e armazena automaticamente:

1. **Métricas de Conversão**
   - Total de leads capturados
   - Taxa de conversão
   - Leads por status

2. **Análise de Comportamento**
   - Tempo médio de preenchimento
   - Campos mais visitados
   - Taxa de abandono

3. **Dados Demográficos**
   - Tipos de eventos mais solicitados
   - Cidades com mais demanda
   - Faixa de valores dos orçamentos

---

## 🔒 Segurança e Privacidade

### LGPD Compliant
- ✅ Consentimento explícito antes da coleta
- ✅ Transparência sobre uso dos dados
- ✅ Direito ao esquecimento (exclusão)
- ✅ Dados armazenados de forma segura
- ✅ Nunca compartilhados com terceiros

### Supabase RLS
Todas as tabelas possuem Row Level Security:
- Usuários só acessam seus próprios leads
- Políticas restritivas por padrão
- Autenticação obrigatória para admin
- Acesso público apenas para submissão de orçamentos

---

## 🎨 Interface do Usuário

### Design Moderno
- ✅ Responsivo (mobile-first)
- ✅ Tailwind CSS para estilização
- ✅ Animações suaves
- ✅ Feedback visual claro
- ✅ Acessibilidade

### Experiência do Usuário
- ✅ Carregamento rápido
- ✅ Auto-save transparente
- ✅ Mensagens de sucesso/erro claras
- ✅ Fluxo intuitivo

---

## 📞 Funcionalidade WhatsApp

### Mensagem Padrão Gerada:
```
Olá [Nome do Cliente]! 👋

Vi que você fez um orçamento em nosso site e gostaria de ajudá-lo(a) a finalizar.

*Detalhes do seu orçamento:*
📅 Data do evento: 15/03/2025
📍 Local: São Paulo
📸 Serviços: 2x Ensaio Fotográfico, 1x Álbum Premium
💰 Valor: R$ 3.500,00

Estou à disposição para esclarecer dúvidas e fechar o orçamento!

Como posso ajudar?
```

---

## 🚨 Tratamento de Erros

O sistema lida graciosamente com:
- ❌ Falha na conexão com Supabase
- ❌ Timeout de sessão
- ❌ Dados incompletos
- ❌ Erros de autenticação
- ❌ Navegador sem suporte a localStorage

---

## 📈 Próximas Melhorias

1. **Notificações Push** para novos leads
2. **Integração com Google Analytics**
3. **Exportação de relatórios em PDF**
4. **Funil de vendas visual**
5. **Automação de follow-up**
6. **Integração com CRM externo**

---

## 🆘 Suporte

Para dúvidas ou problemas:
1. Verifique o console do navegador
2. Confira as variáveis de ambiente
3. Teste a conexão com Supabase
4. Revise as políticas de RLS

---

## 📝 Licença

Sistema desenvolvido para uso exclusivo do Priceus.

---

**✅ Sistema 100% Funcional e Pronto para Produção!**

Desenvolvido com ❤️ usando React + TypeScript + Supabase + Tailwind CSS
