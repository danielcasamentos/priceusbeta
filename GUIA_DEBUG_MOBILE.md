# 📱 Guia Rápido: Como Debugar no Celular

## 🎯 Objetivo

Este guia ensina como usar o console de debug no celular para verificar se o campo de data e a verificação de disponibilidade estão funcionando corretamente.

## 🚀 Passo a Passo

### 1. Abrir o Link do Orçamento

Abra o link do orçamento no seu celular. Pode ser através de:
- WhatsApp
- Instagram
- Facebook
- Navegador normal (Chrome, Safari)

### 2. Ativar o Console de Debug

**👆 Toque 3 vezes rapidamente no canto superior direito da tela**

```
┌─────────────────────────┐
│ 👆 Toque aqui 3x       │ ← Canto superior direito
├─────────────────────────┤
│                         │
│    Página do            │
│    Orçamento            │
│                         │
│                         │
└─────────────────────────┘
```

Um painel preto aparecerá com informações do sistema.

### 3. Verificar Informações do Navegador

O console mostrará:

```
╔═══════════════════════════════════╗
║   INFORMAÇÕES DO NAVEGADOR        ║
╠═══════════════════════════════════╣
║ Browser:    Instagram             ║
║ OS:         iOS                   ║
║ Mobile:     Sim                   ║
║ In-App:     Sim                   ║
║ Tela:       390x844              ║
║ Online:     ✅ Sim                ║
╚═══════════════════════════════════╝
```

**O que significa cada item:**

- **Browser:** Qual navegador você está usando
- **OS:** Sistema operacional (iOS, Android, etc)
- **Mobile:** Se é dispositivo móvel
- **In-App:** Se está dentro de um app (Instagram, WhatsApp, etc)
- **Tela:** Dimensões da tela
- **Online:** Se está conectado à internet

### 4. Testar o Campo de Data

1. **Feche o console** clicando no X
2. **Role até o campo "Selecione a data que deseja"**
3. **Clique no campo de data**

**O que deve acontecer:**

#### Se "In-App" for "Não" (navegador normal):
- ✅ Abre o seletor de data do sistema
- ✅ Você escolhe a data normalmente
- ✅ Após selecionar, aparece mensagem de disponibilidade

#### Se "In-App" for "Sim" (Instagram, WhatsApp, etc):
- ✅ Abre um calendário customizado na tela
- ✅ Você vê os dias do mês
- ✅ Clica em um dia para selecionar
- ✅ Clica em "Confirmar"
- ✅ Após selecionar, aparece mensagem de disponibilidade

### 5. Verificar os Logs

1. **Ative o console novamente** (3 toques no canto)
2. **Role até a seção de Logs**
3. **Procure por mensagens como:**

```
[INFO] [QuotePage] 📅 Data alterada: 2025-12-25
[INFO] [AGENDA_CHECK_V2] 🔍 Iniciando verificação (tentativa 1/4)
[SUCCESS] [AGENDA_CHECK_V2] ✅ Resposta recebida do banco
[INFO] [AGENDA_CHECK_V2] 🎯 Resultado final
```

**Logs esperados (sucesso):**
- ✅ "Data alterada" quando você seleciona
- ✅ "Iniciando verificação" quando busca disponibilidade
- ✅ "Resposta recebida" quando banco responde
- ✅ "Resultado final" com status da data

**Logs de problema (se houver erro):**
- ❌ "Erro na RPC" se banco falhar
- 🔄 "Aguardando antes de tentar novamente" se fizer retry
- ⚠️ "Usando fallback" se todas as tentativas falharem

### 6. Copiar Logs (Se Houver Problema)

Se algo não estiver funcionando:

1. **No console de debug, clique em "Copiar Logs"**
2. **Aguarde a confirmação "Copiado!"**
3. **Cole em:**
   - WhatsApp para enviar ao suporte
   - Email
   - Bloco de notas para salvar

O texto copiado incluirá:
```
=== MOBILE DEBUG REPORT ===

INFORMAÇÕES DO NAVEGADOR:
{
  "browser": "Instagram",
  "os": "iOS",
  "isMobile": true,
  "isInAppBrowser": true
}

CONEXÃO:
Online: true
User Agent: Mozilla/5.0 (iPhone; CPU iPhone OS...

TELA:
Largura: 390px
Altura: 844px
DPR: 3

LOGS:
[2025-11-07T10:30:15.123Z] [INFO] 📅 Data alterada: 2025-12-25
[2025-11-07T10:30:15.456Z] [INFO] 🔍 Iniciando verificação
...

=== FIM DO RELATÓRIO ===
```

### 7. Forçar Recarga (Se Necessário)

Se a página estiver com problema:

1. **Ative o console de debug**
2. **Clique em "Recarregar"**
3. **Confirme a ação**
4. **A página será recarregada e o cache limpo**

## 🎨 Entendendo as Mensagens de Disponibilidade

### ✅ Data Disponível (Verde)
```
╔═══════════════════════════════════╗
║ ✅ Data disponível!               ║
║                                    ║
║ Podemos reservar este horário     ║
║ para você                          ║
╚═══════════════════════════════════╝
```
**Significado:** Você pode prosseguir com esta data

---

### ⚠️ Disponibilidade Limitada (Amarelo)
```
╔═══════════════════════════════════╗
║ ⚠️ Disponibilidade limitada        ║
║                                    ║
║ 1 de 2 vagas preenchidas          ║
║ ████████░░░░░░░░░░ 50%           ║
║                                    ║
║ Ainda temos disponibilidade       ║
╚═══════════════════════════════════╝
```
**Significado:** Data ainda disponível, mas tem outros eventos

---

### ❌ Data Ocupada (Vermelho)
```
╔═══════════════════════════════════╗
║ ❌ Data ocupada                    ║
║                                    ║
║ Já temos um evento para esta data ║
║                                    ║
║ 💡 Sugestão: Escolha outra data   ║
║ ou entre em contato                ║
║                                    ║
║ [📱 Conversar com fotógrafo]      ║
╚═══════════════════════════════════╝
```
**Significado:** Data não disponível, escolha outra ou contate

---

### 🔒 Data Bloqueada (Cinza)
```
╔═══════════════════════════════════╗
║ 🔒 Data bloqueada                  ║
║                                    ║
║ Esta data está bloqueada           ║
║                                    ║
║ Por favor, escolha outra data ou  ║
║ entre em contato                   ║
║                                    ║
║ [📱 Conversar com fotógrafo]      ║
╚═══════════════════════════════════╝
```
**Significado:** Data bloqueada pelo fotógrafo

---

### 🔄 Verificando (Azul, Animado)
```
╔═══════════════════════════════════╗
║ 🔄 Verificando disponibilidade...  ║
║                                    ║
║ Consultando agenda em tempo real  ║
╚═══════════════════════════════════╝
```
**Significado:** Aguarde, estamos checando no banco de dados

## ❓ FAQ - Perguntas Frequentes

### P: O campo de data não abre
**R:**
1. Ative o console de debug (3 toques)
2. Veja se "In-App" está como "Sim"
3. Deve abrir calendário customizado
4. Se não abrir, copie os logs e envie

### P: Selecionei a data mas não aparece nada
**R:**
1. Ative o console e veja os logs
2. Procure por erros em vermelho
3. Se houver, copie e envie os logs
4. Tente clicar em "Recarregar" no console

### P: Mensagem fica "Verificando..." eternamente
**R:**
1. Verifique se "Online" está como "Sim"
2. Tente mudar de rede WiFi ou usar 4G/5G
3. Clique em "Recarregar" no console
4. Se persistir, copie logs e envie

### P: Como desativar o console?
**R:**
- Clique no X no canto superior direito do painel
- OU toque 3 vezes novamente no canto da tela

### P: O console não abre
**R:**
- Certifique-se de tocar 3 vezes RAPIDAMENTE
- Toque exatamente no CANTO SUPERIOR DIREITO
- Intervalo entre toques deve ser menos de 1 segundo
- Tente tocar um pouco mais para dentro do canto

### P: Posso usar este console em qualquer página?
**R:**
- Não, apenas na página de orçamento
- O console foi implementado especificamente para debug do formulário

## 📞 Quando Enviar Logs para Suporte

Envie os logs se:
- ❌ Campo de data não abre
- ❌ Data selecionada não salva
- ❌ Verificação nunca completa
- ❌ Mensagens de erro aparecem
- ❌ Página trava ou congela
- ❌ Botões não respondem

**Como enviar:**
1. Ative console (3 toques)
2. Clique "Copiar Logs"
3. Cole e envie via WhatsApp/Email

## ✅ Checklist de Teste

Use este checklist para testar:

- [ ] Console abre com 3 toques no canto
- [ ] Informações do navegador aparecem
- [ ] "Online" está como "Sim"
- [ ] Campo de data abre ao clicar
- [ ] Consigo selecionar uma data
- [ ] Mensagem de disponibilidade aparece
- [ ] Logs mostram "Data alterada"
- [ ] Logs mostram "Resposta recebida"
- [ ] Posso copiar os logs
- [ ] Botão "Recarregar" funciona

Se TODOS os itens estiverem ✅, o sistema está funcionando perfeitamente!

## 🎓 Dicas Pro

1. **Teste em dias diferentes:**
   - Teste uma data que você sabe que está livre
   - Teste uma data que você sabe que está ocupada
   - Verifique se as mensagens batem

2. **Teste em navegadores diferentes:**
   - Abra no Chrome normal
   - Abra pelo link do Instagram
   - Abra pelo link do WhatsApp
   - Compare o comportamento

3. **Mantenha o console aberto:**
   - Deixe o console aberto enquanto testa
   - Veja os logs aparecendo em tempo real
   - Isso ajuda a entender o que está acontecendo

4. **Screenshot é seu amigo:**
   - Tire screenshot do console com o erro
   - Tire screenshot da mensagem de disponibilidade
   - Anexe junto com os logs ao enviar para suporte

---

**Lembre-se:** O console de debug foi feito especialmente para você poder entender o que está acontecendo no celular. Use-o sempre que tiver dúvidas!

🎉 **Boa sorte nos testes!**
