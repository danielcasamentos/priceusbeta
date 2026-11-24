# Debug - Vídeos nos Modais

## 🔍 Como Verificar se Está Funcionando

### Teste 1: Galeria de Vídeos (Principal)

1. **Ir para**: Dashboard → Aba "Tutoriais em Vídeo"
2. **Ver**: Grid com 12 cards de vídeos
3. **Clicar**: Em qualquer card (ex: "Apresentação do Priceus")
4. **Esperado**:
   - Modal aparece sobre a página
   - Vídeo do YouTube carrega no centro
   - Vídeo começa a tocar automaticamente
   - Botão X no canto superior direito

**❌ Se não funcionar:**
- Abra F12 (Console do navegador)
- Procure erros em vermelho
- Veja se há mensagem relacionada ao YouTube
- Me envie o erro

### Teste 2: TemplateEditor (Botão Verde)

1. **Ir para**: Editar qualquer template
2. **Ver**: Botão verde "Ver Tutorial em Vídeo" no topo
3. **Clicar**: No botão verde
4. **Esperado**:
   - Modal aparece
   - Vídeo contextual da aba atual
   - Descrição do tutorial embaixo

**❌ Se não funcionar:**
- Verificar se botão verde aparece
- Se não aparecer, pode ser que não há vídeo para aquela aba

### Teste 3: Central de Ajuda (Botão Vermelho)

1. **Abrir**: Central de Ajuda (ícone de interrogação)
2. **Expandir**: Qualquer pergunta com ícone de vídeo
3. **Clicar**: Botão vermelho "Ver Tutorial em Vídeo"
4. **Esperado**:
   - Modal aparece sobre a central de ajuda
   - Vídeo relacionado à pergunta

### Teste 4: Tutorial Completo (Passo-a-Passo)

1. **Ir para**: Editar Template
2. **Clicar**: Botão azul "Tutorial Completo"
3. **Ver**: Vídeo embutido na primeira etapa
4. **Esperado**:
   - Vídeo aparece direto no tutorial
   - Não abre modal (é embutido)
   - Player do YouTube visível

## 🎯 Checklist de Funcionamento

Marque o que está funcionando:

- [ ] Galeria de vídeos - Cards clicáveis
- [ ] Galeria - Modal abre ao clicar
- [ ] Galeria - Vídeo carrega no modal
- [ ] Galeria - Vídeo reproduz automaticamente
- [ ] TemplateEditor - Botão verde aparece
- [ ] TemplateEditor - Modal abre ao clicar no botão
- [ ] TemplateEditor - Vídeo correto para a aba
- [ ] HelpCenter - Botões vermelhos aparecem
- [ ] HelpCenter - Modal abre ao clicar
- [ ] Tutorial Guide - Vídeos embutidos aparecem
- [ ] Tutorial Guide - Vídeos reproduzem

## 🐛 Problemas Comuns

### "Clico mas nada acontece"

**Possíveis causas:**
1. JavaScript com erro (ver Console F12)
2. Conflito de z-index (modal fica atrás)
3. Event listener não funcionando

**Solução:**
- Abrir Console (F12)
- Clicar no elemento
- Ver se há erro JavaScript
- Me enviar print ou copiar erro

### "Modal abre mas vídeo não carrega"

**Possíveis causas:**
1. Vídeo no YouTube não permite embed
2. ID do vídeo incorreto
3. Problema de rede/firewall

**Solução:**
- Ver erro no Console
- Testar URL manualmente:
  ```
  https://www.youtube-nocookie.com/embed/5epUNCZcf3o
  ```
- Se abrir no navegador mas não no modal, é problema de embed
- Ir ao YouTube Studio → Vídeo → Permitir incorporação

### "Modal abre mas dá erro do YouTube"

**Erro comum**: "Vídeo não disponível"

**Causa**: Vídeo está como Privado ou Embed desabilitado

**Solução no YouTube Studio:**
1. Selecionar vídeo
2. Detalhes → Visibilidade
3. Mudar para "Público" ou "Não listado"
4. Mais opções → ✅ "Permitir incorporação"
5. Salvar

### "Vídeo carrega mas não dá play"

**Causa**: Navegador bloqueia autoplay

**Solução**:
- Isso é normal em alguns navegadores
- Usuário precisa clicar no play manualmente
- Não há como forçar (política dos navegadores)

## 🔧 Debug Avançado

### Verificar IDs dos Vídeos

Abra o arquivo: `src/config/videoTutorials.ts`

Verifique se os IDs estão corretos:

```typescript
{
  id: 'intro-priceus',
  youtubeId: '5epUNCZcf3o',  // ← Este é o ID do YouTube
  title: 'Apresentação do Priceus',
  ...
}
```

**Como pegar o ID correto:**
1. Abrir vídeo no YouTube
2. URL será: `youtube.com/watch?v=5epUNCZcf3o`
3. ID é o que vem depois de `v=`
4. Copiar apenas: `5epUNCZcf3o`

### Testar Embed Manualmente

Para cada vídeo, teste a URL de embed:

```
https://www.youtube-nocookie.com/embed/SEU_VIDEO_ID
```

Exemplos:
- https://www.youtube-nocookie.com/embed/5epUNCZcf3o
- https://www.youtube-nocookie.com/embed/5zSkIkKTzHc
- https://www.youtube-nocookie.com/embed/Qbxf9s3EdfQ

**Se a URL não abrir:**
- O vídeo não permite embed
- Configure no YouTube Studio

**Se a URL abrir:**
- O embed está OK
- Problema pode ser no código do modal

## 📱 Testar em Diferentes Navegadores

Os modais devem funcionar em:
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Mobile (Chrome/Safari)

Se funcionar em um mas não em outro:
- Problema específico do navegador
- Verificar configurações de privacidade
- Testar modo anônimo

## 🎯 Qual é o Problema Exato?

Para eu ajudar melhor, me diga:

1. **Onde você está clicando?**
   - [ ] Card na galeria de vídeos
   - [ ] Botão verde no TemplateEditor
   - [ ] Botão vermelho na Central de Ajuda
   - [ ] Outro lugar?

2. **O que acontece quando clica?**
   - [ ] Nada acontece
   - [ ] Modal abre mas vazio
   - [ ] Modal abre mas vídeo não carrega
   - [ ] Abre o YouTube em nova aba
   - [ ] Outro comportamento?

3. **Algum erro no Console (F12)?**
   - [ ] Sim (copie o erro)
   - [ ] Não aparece erro
   - [ ] Não sei verificar

4. **Em qual navegador?**
   - [ ] Chrome
   - [ ] Firefox
   - [ ] Safari
   - [ ] Edge
   - [ ] Mobile

## 💡 Resposta Rápida

Se **ainda abre em nova aba do YouTube**, significa que:

1. Algum link `<a href>` ainda existe
2. Ou o código não foi atualizado corretamente

Neste caso, me avise **exatamente onde** isso acontece que vou corrigir imediatamente!

Se **o modal não abre**, pode ser:

1. Problema de JavaScript
2. Console tem erro
3. Preciso ver o erro para corrigir

## 🎬 Comportamento Correto

**Ao clicar no card da galeria:**
```
1. Tela escurece (overlay preto transparente)
2. Modal branco aparece no centro
3. Vídeo do YouTube carrega dentro do modal
4. Vídeo começa a tocar automaticamente
5. Descrição aparece embaixo do vídeo
6. Botão X no canto superior direito
7. Clicar em X ou fora fecha o modal
```

**Ao clicar no botão verde (TemplateEditor):**
```
1. Mesmo comportamento acima
2. Vídeo é contextual à aba atual
3. Ex: Aba "Produtos" → Vídeo "Produtos e Serviços"
```

**Ao clicar no botão vermelho (HelpCenter):**
```
1. Mesmo comportamento
2. Modal aparece sobre a central de ajuda (z-index maior)
3. Vídeo relacionado à pergunta
```

---

**Me diga qual teste falhou e eu corrijo imediatamente!** 🚀
