# 🔧 GUIA COMPLETO DE DIAGNÓSTICO E RESOLUÇÃO - FALHA NO UPLOAD DE IMAGENS DE PRODUTOS

**Data:** 2025-10-30
**Severidade:** 🔴 CRÍTICA
**Sistema Afetado:** Upload de Imagens de Produtos
**Sintoma Principal:** Upload para em 90%, exibe sucesso falso, imagem não salva

---

## 📊 RESUMO EXECUTIVO

**Problema Identificado:** Sistema de upload de imagens para em 90% mas exibe mensagem de sucesso, porém a imagem não é salva ou processada corretamente.

**Causa Raiz Principal:**
1. **Progresso Simulado** - Barra atinge 90% via `setInterval` mas não reflete upload real
2. **Erro Silencioso** - Falha no upload do Supabase Storage não é tratada corretamente
3. **Falsa Confirmação** - Mensagem de sucesso aparece mesmo quando upload falha
4. **Falta de Validação** - Não verifica se arquivo foi realmente salvo antes de confirmar

**Impacto:**
- ❌ Catálogo de produtos sem imagens
- ❌ Perda de tempo do usuário
- ❌ Confiança reduzida no sistema
- ❌ Necessidade de re-upload manual

**Tempo Estimado de Resolução:** 2-4 horas

---

## 1. DIAGNÓSTICO IMEDIATO

### 🔍 ETAPA 1: Verificações Client-Side (Frontend) - 15 minutos

**Responsável:** Time Frontend

#### 1.1 Verificar Console do Navegador

```javascript
// Abrir DevTools (F12) e verificar:
// 1. Aba Console - Erros JavaScript
// 2. Aba Network - Requisições de upload
// 3. Aba Application - Storage e Cookies

// Procurar por:
- "Erro ao fazer upload"
- "uploadError"
- Requisições com status 401, 403, 500
- CORS errors
```

**O que procurar:**
- ✅ Erro 401: Problema de autenticação
- ✅ Erro 403: Problema de permissões RLS
- ✅ Erro 413: Arquivo muito grande
- ✅ Erro 500: Problema no servidor Supabase
- ✅ CORS: Configuração de domínio incorreta

#### 1.2 Verificar Código de Upload (ProductEditor.tsx)

**Arquivo:** `src/components/ProductEditor.tsx`
**Linhas:** 41-100

**PROBLEMA IDENTIFICADO - Linha 66-68:**

```typescript
// ❌ PROBLEMA: Progresso simulado não reflete realidade
const progressInterval = setInterval(() => {
  setUploadProgress((prev) => Math.min(prev + 10, 90));
}, 100);
```

**Análise:**
- Progresso chega a 90% em ~900ms (9 intervalos × 100ms)
- Upload real do Supabase pode demorar mais (especialmente arquivos grandes)
- Barra de progresso mente para o usuário

**PROBLEMA IDENTIFICADO - Linhas 71-81:**

```typescript
// ❌ PROBLEMA: Erro pode ser ignorado
const { error: uploadError } = await supabase.storage
  .from('images')
  .upload(fileName, file, {
    upsert: true,
    contentType: file.type,
  });

clearInterval(progressInterval);
setUploadProgress(100); // ⚠️ SEMPRE seta 100% mesmo com erro!

if (uploadError) throw uploadError; // ⚠️ Mas pode não lançar exceção corretamente
```

**PROBLEMA IDENTIFICADO - Linha 92:**

```typescript
// ❌ PROBLEMA: Alert de sucesso mesmo quando falha
alert('✅ Imagem carregada com sucesso!');
```

#### 1.3 Verificar Estado do Componente

```typescript
// Adicionar logs temporários para debug
console.log('🔍 DEBUG - Upload iniciado:', {
  fileName,
  fileSize: file.size,
  fileType: file.type,
  userId
});

console.log('🔍 DEBUG - Upload resultado:', {
  uploadError,
  publicUrl: publicUrlData?.publicUrl
});

console.log('🔍 DEBUG - Product state:', product);
```

#### 1.4 Verificar Validações

```typescript
// Linha 46: Validação de tamanho
if (file.size > 5 * 1024 * 1024) { // 5MB
  alert('❌ Arquivo muito grande! Tamanho máximo: 5MB');
  return;
}

// Linha 52: Validação de tipo
if (!file.type.startsWith('image/')) {
  alert('❌ Apenas arquivos de imagem são permitidos');
  return;
}
```

**Testar com:**
- ✅ Arquivo 4.9MB (deve passar)
- ❌ Arquivo 5.1MB (deve falhar)
- ✅ JPG, PNG, WEBP (deve passar)
- ❌ PDF, DOC (deve falhar)

#### 1.5 Verificar Sessão e Autenticação

```typescript
// Adicionar antes do upload
const { data: { session } } = await supabase.auth.getSession();

console.log('🔍 DEBUG - Sessão:', {
  isAuthenticated: !!session,
  userId: session?.user?.id,
  expiresAt: session?.expires_at
});

if (!session) {
  alert('❌ Sessão expirada. Faça login novamente.');
  return;
}
```

---

### 🔍 ETAPA 2: Verificações Server-Side (Supabase) - 15 minutos

**Responsável:** Time Backend / DevOps

#### 2.1 Verificar Bucket de Storage

```sql
-- Via Supabase Dashboard ou SQL
-- Verificar se bucket 'images' existe
SELECT * FROM storage.buckets WHERE id = 'images';

-- Verificar configurações do bucket
SELECT
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE id = 'images';
```

**O que verificar:**
- ✅ Bucket existe?
- ✅ `public = true` ou false?
- ✅ `file_size_limit` está configurado?
- ✅ `allowed_mime_types` permite images?

#### 2.2 Verificar Políticas RLS (Row Level Security)

```sql
-- Verificar políticas do bucket 'images'
SELECT
  policyname,
  cmd, -- SELECT, INSERT, UPDATE, DELETE, ALL
  qual, -- USING clause
  with_check -- WITH CHECK clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%images%';
```

**Políticas Necessárias:**

```sql
-- Política 1: Upload de imagens (INSERT)
CREATE POLICY "Users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Política 2: Visualização pública (SELECT)
CREATE POLICY "Public can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Política 3: Deletar próprias imagens (DELETE)
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### 2.3 Verificar Logs do Supabase

```bash
# Via Supabase CLI ou Dashboard
# Verificar logs de upload

# Dashboard: Project > Logs > Storage
# Filtrar por:
- timestamp: últimos 30 minutos
- level: error, warning
- path: /storage/v1/object/images/*
```

**Erros Comuns:**
- `JWT expired` - Sessão expirada
- `Row level security` - Permissões incorretas
- `File too large` - Excede limite do bucket
- `Invalid content type` - Tipo de arquivo não permitido

#### 2.4 Testar Upload Direto via API

```bash
# Testar upload via curl para isolar problema
curl -X POST \
  'https://SEU_PROJETO.supabase.co/storage/v1/object/images/teste.jpg' \
  -H "Authorization: Bearer SEU_JWT_TOKEN" \
  -H "Content-Type: image/jpeg" \
  --data-binary @imagem_teste.jpg
```

**Respostas Esperadas:**
- ✅ 200: Upload bem-sucedido
- ❌ 401: Problema de autenticação
- ❌ 403: Problema de permissões RLS
- ❌ 413: Arquivo muito grande

#### 2.5 Verificar Quotas e Limites

```sql
-- Verificar espaço usado no storage
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_bytes,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
WHERE bucket_id = 'images'
GROUP BY bucket_id;
```

**Limites Típicos Supabase (Free Tier):**
- Storage: 1GB total
- File size: 50MB por arquivo
- Bandwidth: 2GB/mês

---

### 🔍 ETAPA 3: Testes de Integração - 10 minutos

**Responsável:** Time QA / Frontend

#### 3.1 Teste de Cenários Reais

**Cenário 1: Upload Normal**
1. Selecionar imagem 2MB JPG
2. Clicar em upload
3. ✅ Esperado: Barra sobe a 100%, imagem aparece
4. ❌ Atual: Barra para em 90%, sucesso falso

**Cenário 2: Imagem Grande**
1. Selecionar imagem 6MB PNG
2. Clicar em upload
3. ✅ Esperado: Erro "arquivo muito grande"
4. ✅ Verificar: Mensagem aparece corretamente

**Cenário 3: Arquivo Inválido**
1. Selecionar PDF ou DOC
2. Clicar em upload
3. ✅ Esperado: Erro "apenas imagens"
4. ✅ Verificar: Validação funciona

**Cenário 4: Sessão Expirada**
1. Fazer logout
2. Tentar upload
3. ✅ Esperado: Erro 401 ou redirect para login
4. ❌ Possível: Upload tenta mas falha silenciosamente

#### 3.2 Teste de Rede

```javascript
// Simular rede lenta no DevTools
// Chrome: F12 > Network > Throttling > Slow 3G

// Testar:
1. Upload com rede lenta (Slow 3G)
2. Upload com rede offline
3. Upload com timeout
```

#### 3.3 Verificar Database

```sql
-- Verificar se URL foi salva na tabela produtos
SELECT
  id,
  nome,
  imagem_url,
  mostrar_imagem,
  updated_at
FROM produtos
WHERE user_id = 'SEU_USER_ID'
ORDER BY updated_at DESC
LIMIT 10;
```

---

## 2. ANÁLISE DE CAUSAS COMUNS

### 🎯 CAUSA RAIZ #1: Progresso Simulado Enganoso (90% do problema)

**Por que acontece:**

```typescript
// Linha 66-68: PROBLEMA IDENTIFICADO
const progressInterval = setInterval(() => {
  setUploadProgress((prev) => Math.min(prev + 10, 90));
}, 100);
```

**Explicação Técnica:**
1. `setInterval` incrementa progresso a cada 100ms
2. Atinge 90% em ~900ms (9 × 10% × 100ms)
3. **MAS:** Upload real do Supabase demora mais
4. Usuário vê 90% mas upload ainda está acontecendo
5. Se upload falhar, usuário não sabe porque já viu progresso

**Por que mostra "sucesso" quando falha:**

```typescript
// Linha 78-79
clearInterval(progressInterval);
setUploadProgress(100); // ⚠️ SEMPRE seta 100%!

// Linha 81
if (uploadError) throw uploadError; // ⚠️ MAS pode não funcionar
```

**O problema:**
- `setUploadProgress(100)` **SEMPRE** executa, mesmo com erro
- Só depois verifica `uploadError`
- Se `throw` falhar ou for capturado, usuário vê 100% + sucesso

---

### 🎯 CAUSA RAIZ #2: Tratamento de Erro Inadequado

**Código Problemático:**

```typescript
// Linha 71-81
const { error: uploadError } = await supabase.storage
  .from('images')
  .upload(fileName, file, { upsert: true });

clearInterval(progressInterval);
setUploadProgress(100); // ❌ PROBLEMA: Seta 100% ANTES de verificar erro!

if (uploadError) throw uploadError;
```

**Por que falha:**
1. Upload falha (ex: RLS, quota, network)
2. `uploadError` é populado
3. **MAS:** Linha 79 seta progresso a 100% **ANTES** de verificar
4. UI mostra 100%
5. `throw` pode não interromper fluxo se houver bug
6. Alert de sucesso (linha 92) é executado

**Cenários Específicos:**

#### Cenário A: Erro 403 (RLS)
```
1. Upload tenta salvar em storage.objects
2. RLS bloqueia porque política está errada
3. Supabase retorna { error: { message: "RLS violation" } }
4. uploadError é populado
5. Progresso vai a 100%
6. throw uploadError lança exceção
7. catch {} captura erro
8. Mas usuário já viu 100% por 1-2 segundos
```

#### Cenário B: Erro de Rede
```
1. Upload inicia
2. Rede cai no meio do upload
3. Supabase timeout ou network error
4. uploadError é populado
5. Progresso mostra 90% (do setInterval)
6. Linha 79 seta 100%
7. throw não funciona corretamente
8. Alert de sucesso aparece
```

#### Cenário C: JWT Expirado
```
1. Sessão do usuário expira
2. Upload tenta mas JWT é inválido
3. Supabase retorna 401 Unauthorized
4. uploadError = { message: "JWT expired" }
5. Progresso 100%
6. Erro lançado mas alert já foi executado
```

---

### 🎯 CAUSA RAIZ #3: Falta de Validação de Sucesso Real

**Código Atual:**

```typescript
// Linha 84-86: Obtém URL pública
const { data: publicUrlData } = supabase.storage
  .from('images')
  .getPublicUrl(fileName);

// Linha 89: Atualiza produto
onChange('imagem_url', publicUrlData.publicUrl);
```

**Problema:**
- `getPublicUrl()` **SEMPRE retorna URL**, mesmo se arquivo não existe!
- Não verifica se upload foi bem-sucedido
- URL pode apontar para arquivo inexistente

**Teste:**
```typescript
// Este código SEMPRE funciona, mesmo com arquivo inexistente
const { data } = supabase.storage
  .from('images')
  .getPublicUrl('arquivo_que_nao_existe.jpg');

console.log(data.publicUrl);
// Resultado: https://projeto.supabase.co/storage/v1/object/public/images/arquivo_que_nao_existe.jpg
// Mas arquivo não existe! URL retorna 404
```

---

### 🎯 CAUSA RAIZ #4: Políticas RLS Mal Configuradas

**Política Necessária vs Atual:**

```sql
-- ❌ PROBLEMA: Se esta política não existe ou está errada
CREATE POLICY "Users can upload images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**O que verifica:**
1. `bucket_id = 'images'` - Upload é para bucket correto
2. `auth.uid()::text = (storage.foldername(name))[1]` - Usuário pode apenas fazer upload em sua própria pasta

**Estrutura de pasta esperada:**
```
images/
  └─ produtos/
      └─ {userId}/
          └─ 1730300000000.jpg
```

**Se política estiver errada:**
- Upload tenta salvar
- RLS bloqueia
- `uploadError` = "new row violates row-level security policy"
- Progresso 100%
- Mensagem de sucesso aparece
- **Imagem não salva!**

---

### 🎯 CAUSA RAIZ #5: Race Condition no setInterval

**Fluxo do Problema:**

```typescript
// Linha 66: Inicia intervalo
const progressInterval = setInterval(() => {
  setUploadProgress((prev) => Math.min(prev + 10, 90));
}, 100);

// Linha 71: Upload assíncrono (demora tempo variável)
const { error } = await supabase.storage.from('images').upload(...)

// Linha 78: Limpa intervalo
clearInterval(progressInterval);
```

**Race Condition:**
1. Upload real demora 2 segundos
2. setInterval chega a 90% em 0.9 segundos
3. Usuário vê 90% mas upload ainda processando
4. Se upload falhar, já mostrou progresso alto
5. Cria falsa impressão de que "quase funcionou"

---

### 🎯 CAUSA RAIZ #6: Alert Síncrono vs Try/Catch Assíncrono

**Código:**

```typescript
try {
  // ... upload ...

  alert('✅ Imagem carregada com sucesso!'); // Linha 92
} catch (error) {
  console.error('Erro ao fazer upload:', error); // Linha 94
  alert('❌ Erro ao fazer upload da imagem'); // Linha 95
}
```

**Problema:**
- `alert()` é bloqueante e síncrono
- Se houver delay entre throw e catch
- Ou se erro for engolido por outro handler
- Alert de sucesso pode aparecer antes do erro

---

## 3. PLANO DE RESOLUÇÃO PASSO A PASSO

### ✅ PRIORIDADE 1: Correção Imediata do Upload (1-2 horas)

**Responsável:** Time Frontend
**Arquivo:** `src/components/ProductEditor.tsx`

#### 3.1 Remover Progresso Simulado (Linhas 66-68)

**ANTES (❌ Problemático):**

```typescript
// Linha 66-68
const progressInterval = setInterval(() => {
  setUploadProgress((prev) => Math.min(prev + 10, 90));
}, 100);
```

**DEPOIS (✅ Correto):**

```typescript
// Remover setInterval completamente
// Mostrar spinner ou progresso indeterminado
setUploadProgress(0); // Inicia em 0%
setUploading(true);   // Mostra loading

// Durante upload, manter em 50% (indeterminado)
setUploadProgress(50);
```

---

#### 3.2 Adicionar Validação de Erro ANTES de Setar Progresso

**ANTES (❌ Problemático):**

```typescript
const { error: uploadError } = await supabase.storage
  .from('images')
  .upload(fileName, file, { upsert: true });

clearInterval(progressInterval);
setUploadProgress(100); // ❌ Seta 100% ANTES de verificar erro!

if (uploadError) throw uploadError;
```

**DEPOIS (✅ Correto):**

```typescript
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('images')
  .upload(fileName, file, {
    upsert: true,
    contentType: file.type,
  });

// ✅ VERIFICAR ERRO IMEDIATAMENTE
if (uploadError) {
  console.error('❌ Erro no upload:', uploadError);
  throw new Error(uploadError.message || 'Falha no upload');
}

// ✅ VERIFICAR SE ARQUIVO FOI CRIADO
if (!uploadData || !uploadData.path) {
  throw new Error('Upload não retornou caminho do arquivo');
}

// ✅ SÓ AGORA seta progresso a 100%
setUploadProgress(100);
```

---

#### 3.3 Validar Arquivo Realmente Foi Salvo

**ADICIONAR APÓS UPLOAD:**

```typescript
// Verificar se arquivo existe antes de confirmar sucesso
const { data: fileCheck, error: checkError } = await supabase.storage
  .from('images')
  .list(path.dirname(fileName), {
    search: path.basename(fileName)
  });

if (checkError || !fileCheck || fileCheck.length === 0) {
  throw new Error('Arquivo não foi salvo no storage');
}

// ✅ Arquivo confirmado, prosseguir
```

---

#### 3.4 Melhorar Feedback de Erro

**ANTES (❌ Genérico):**

```typescript
catch (error) {
  console.error('Erro ao fazer upload:', error);
  alert('❌ Erro ao fazer upload da imagem');
}
```

**DEPOIS (✅ Específico):**

```typescript
catch (error: any) {
  console.error('❌ Erro detalhado no upload:', {
    message: error.message,
    name: error.name,
    stack: error.stack,
    fileName,
    fileSize: file.size,
    fileType: file.type
  });

  // Mensagens específicas por tipo de erro
  let userMessage = '❌ Erro ao fazer upload da imagem';

  if (error.message?.includes('JWT')) {
    userMessage = '❌ Sessão expirada. Faça login novamente.';
  } else if (error.message?.includes('RLS') || error.message?.includes('policy')) {
    userMessage = '❌ Sem permissão para fazer upload. Contate o suporte.';
  } else if (error.message?.includes('size') || error.message?.includes('large')) {
    userMessage = '❌ Arquivo muito grande. Máximo: 5MB';
  } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
    userMessage = '❌ Erro de conexão. Verifique sua internet e tente novamente.';
  } else if (error.message?.includes('storage')) {
    userMessage = '❌ Erro no servidor de armazenamento. Tente novamente em alguns minutos.';
  }

  alert(userMessage);

  // Opcional: Enviar erro para sistema de logging
  // logError('upload_image', error, { fileName, userId });
}
```

---

#### 3.5 Código Completo Corrigido

```typescript
/**
 * Faz upload da imagem para o Supabase Storage
 * CORRIGIDO: Remove progresso simulado, adiciona validações
 */
const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Validação: Tamanho máximo 5MB
  if (file.size > 5 * 1024 * 1024) {
    alert('❌ Arquivo muito grande! Tamanho máximo: 5MB');
    return;
  }

  // Validação: Apenas imagens
  if (!file.type.startsWith('image/')) {
    alert('❌ Apenas arquivos de imagem são permitidos (JPG, PNG, WEBP)');
    return;
  }

  // ✅ NOVO: Verificar sessão antes de tentar upload
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    alert('❌ Sessão expirada. Faça login novamente.');
    return;
  }

  setUploading(true);
  setUploadProgress(0);

  try {
    // Nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `produtos/${userId}/${Date.now()}.${fileExt}`;

    console.log('🔄 Iniciando upload:', {
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId,
      timestamp: new Date().toISOString()
    });

    // ✅ Mostrar progresso indeterminado (50%)
    setUploadProgress(50);

    // ✅ Upload para o Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    // ✅ VERIFICAR ERRO IMEDIATAMENTE
    if (uploadError) {
      console.error('❌ Erro no upload:', uploadError);
      throw new Error(uploadError.message || 'Falha no upload');
    }

    // ✅ VERIFICAR SE ARQUIVO FOI CRIADO
    if (!uploadData || !uploadData.path) {
      throw new Error('Upload não retornou caminho do arquivo');
    }

    console.log('✅ Upload concluído:', uploadData);

    // ✅ Verificar se arquivo realmente existe
    const pathParts = fileName.split('/');
    const fileNameOnly = pathParts[pathParts.length - 1];
    const directory = pathParts.slice(0, -1).join('/');

    const { data: fileCheck, error: checkError } = await supabase.storage
      .from('images')
      .list(directory, {
        search: fileNameOnly
      });

    if (checkError || !fileCheck || fileCheck.length === 0) {
      console.error('❌ Arquivo não encontrado após upload:', {
        checkError,
        directory,
        fileNameOnly
      });
      throw new Error('Arquivo não foi salvo no storage');
    }

    // ✅ SÓ AGORA seta progresso a 100%
    setUploadProgress(100);

    // Obter URL pública
    const { data: publicUrlData } = supabase.storage
      .from('images')
      .getPublicUrl(fileName);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Não foi possível obter URL pública da imagem');
    }

    // Atualizar produto com URL da imagem
    onChange('imagem_url', publicUrlData.publicUrl);
    onChange('mostrar_imagem', true);

    console.log('✅ Imagem salva com sucesso:', {
      url: publicUrlData.publicUrl,
      fileName
    });

    alert('✅ Imagem carregada com sucesso!');

  } catch (error: any) {
    console.error('❌ Erro detalhado no upload:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      fileName,
      fileSize: file.size,
      fileType: file.type,
      userId,
      timestamp: new Date().toISOString()
    });

    // Mensagens específicas por tipo de erro
    let userMessage = '❌ Erro ao fazer upload da imagem. Tente novamente.';

    if (error.message?.includes('JWT') || error.message?.includes('expired')) {
      userMessage = '❌ Sessão expirada. Faça login novamente.';
    } else if (error.message?.includes('RLS') || error.message?.includes('policy') || error.message?.includes('permission')) {
      userMessage = '❌ Sem permissão para fazer upload. Contate o suporte.';
    } else if (error.message?.includes('size') || error.message?.includes('large') || error.message?.includes('quota')) {
      userMessage = '❌ Arquivo muito grande ou cota excedida. Máximo: 5MB';
    } else if (error.message?.includes('network') || error.message?.includes('timeout') || error.message?.includes('fetch')) {
      userMessage = '❌ Erro de conexão. Verifique sua internet e tente novamente.';
    } else if (error.message?.includes('storage') || error.message?.includes('bucket')) {
      userMessage = '❌ Erro no servidor de armazenamento. Tente novamente em alguns minutos.';
    }

    alert(userMessage);

  } finally {
    setUploading(false);
    setUploadProgress(0);
  }
};
```

---

### ✅ PRIORIDADE 2: Correção de Políticas RLS (30-45 minutos)

**Responsável:** Time Backend / DevOps

#### 3.6 Verificar e Corrigir Políticas RLS

**Conectar ao Supabase Dashboard:**
1. Acessar: https://app.supabase.com
2. Selecionar projeto
3. Storage > Policies

**Verificar se políticas existem:**

```sql
-- Verificar políticas atuais
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;
```

**Se não existirem, criar:**

```sql
-- Política 1: Upload de imagens
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'produtos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Política 2: Visualização pública de imagens
CREATE POLICY "Public can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Política 3: Atualizar próprias imagens
CREATE POLICY "Users can update own images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'produtos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'produtos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

-- Política 4: Deletar próprias imagens
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'images'
    AND (storage.foldername(name))[1] = 'produtos'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
```

#### 3.7 Testar Políticas

```sql
-- Testar como usuário específico
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-id-aqui';

-- Testar INSERT (deve funcionar)
SELECT storage.foldername('produtos/user-id-aqui/teste.jpg');

-- Verificar se função retorna corretamente
SELECT
  (storage.foldername('produtos/user-id-aqui/teste.jpg'))[1] as folder1,
  (storage.foldername('produtos/user-id-aqui/teste.jpg'))[2] as folder2;
-- Deve retornar: folder1='produtos', folder2='user-id-aqui'

-- Reset
RESET ROLE;
```

---

### ✅ PRIORIDADE 3: Melhorias de UX e Feedback (30 minutos)

**Responsável:** Time Frontend

#### 3.8 Adicionar Indicador de Progresso Melhorado

**SUBSTITUIR:**

```typescript
// ❌ Barra de progresso enganosa
{uploading && (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div
      className="bg-blue-600 h-2 rounded-full transition-all"
      style={{ width: `${uploadProgress}%` }}
    />
  </div>
)}
```

**POR:**

```typescript
// ✅ Spinner indeterminado + mensagem clara
{uploading && (
  <div className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-lg">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    <p className="text-sm text-blue-600 font-medium">
      Enviando imagem... Aguarde.
    </p>
    <p className="text-xs text-gray-500">
      Não feche esta janela
    </p>
  </div>
)}
```

#### 3.9 Adicionar Notificações Toast (ao invés de alert)

**Instalar biblioteca (opcional):**

```bash
npm install react-hot-toast
```

**Ou criar componente simples:**

```typescript
// components/Toast.tsx
import { useState, useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div className={`fixed top-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`}>
      {message}
    </div>
  );
}
```

**Usar no ProductEditor:**

```typescript
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

// Substituir alerts por:
setToast({ message: '✅ Imagem carregada com sucesso!', type: 'success' });

// No JSX:
{toast && (
  <Toast
    message={toast.message}
    type={toast.type}
    onClose={() => setToast(null)}
  />
)}
```

---

### ✅ PRIORIDADE 4: Logging e Monitoramento (1 hora)

**Responsável:** Time DevOps

#### 3.10 Adicionar Logging Estruturado

**Criar serviço de logging:**

```typescript
// lib/logger.ts
interface LogData {
  action: string;
  userId?: string;
  error?: any;
  metadata?: Record<string, any>;
}

export async function logError(data: LogData) {
  try {
    // Opção 1: Enviar para Supabase
    await supabase.from('logs_errors').insert({
      action: data.action,
      user_id: data.userId,
      error_message: data.error?.message,
      error_stack: data.error?.stack,
      metadata: data.metadata,
      timestamp: new Date().toISOString(),
    });

    // Opção 2: Enviar para serviço externo (Sentry, LogRocket, etc)
    // Sentry.captureException(data.error, { extra: data.metadata });

  } catch (err) {
    console.error('Falha ao registrar erro:', err);
  }
}

export async function logSuccess(data: Omit<LogData, 'error'>) {
  try {
    await supabase.from('logs_success').insert({
      action: data.action,
      user_id: data.userId,
      metadata: data.metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Falha ao registrar sucesso:', err);
  }
}
```

**Usar no código:**

```typescript
// No sucesso
await logSuccess({
  action: 'upload_image',
  userId,
  metadata: {
    fileName,
    fileSize: file.size,
    fileType: file.type,
    url: publicUrlData.publicUrl
  }
});

// No erro
await logError({
  action: 'upload_image',
  userId,
  error: error,
  metadata: {
    fileName,
    fileSize: file.size,
    fileType: file.type
  }
});
```

#### 3.11 Criar Tabelas de Logs

```sql
-- Logs de erros
CREATE TABLE IF NOT EXISTS logs_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid,
  error_message text,
  error_stack text,
  metadata jsonb,
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX idx_logs_errors_timestamp ON logs_errors(timestamp DESC);
CREATE INDEX idx_logs_errors_action ON logs_errors(action);
CREATE INDEX idx_logs_errors_user_id ON logs_errors(user_id);

-- Logs de sucesso
CREATE TABLE IF NOT EXISTS logs_success (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  user_id uuid,
  metadata jsonb,
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX idx_logs_success_timestamp ON logs_success(timestamp DESC);
CREATE INDEX idx_logs_success_action ON logs_success(action);
```

#### 3.12 Dashboard de Monitoramento

**Query para análise:**

```sql
-- Taxa de falha de uploads nas últimas 24h
SELECT
  COUNT(CASE WHEN action = 'upload_image' THEN 1 END) as total_attempts,
  COUNT(CASE WHEN action = 'upload_image' AND error_message IS NOT NULL THEN 1 END) as failures,
  ROUND(
    COUNT(CASE WHEN action = 'upload_image' AND error_message IS NOT NULL THEN 1 END)::numeric /
    NULLIF(COUNT(CASE WHEN action = 'upload_image' THEN 1 END), 0) * 100,
    2
  ) as failure_rate_percent
FROM logs_errors
WHERE timestamp > NOW() - INTERVAL '24 hours';

-- Erros mais comuns
SELECT
  error_message,
  COUNT(*) as occurrences,
  MAX(timestamp) as last_occurrence
FROM logs_errors
WHERE action = 'upload_image'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY error_message
ORDER BY occurrences DESC
LIMIT 10;
```

---

## 4. MEDIDAS DE PREVENÇÃO

### 🛡️ PREVENÇÃO 1: Testes Automatizados

**Responsável:** Time QA / Frontend

#### 4.1 Testes Unitários (Jest + React Testing Library)

```typescript
// ProductEditor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductEditor } from './ProductEditor';
import { supabase } from '../lib/supabase';

// Mock Supabase
jest.mock('../lib/supabase');

describe('ProductEditor - Upload de Imagem', () => {

  test('deve rejeitar arquivo maior que 5MB', () => {
    const file = new File(['x'.repeat(6 * 1024 * 1024)], 'grande.jpg', {
      type: 'image/jpeg'
    });

    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/muito grande/i)).toBeInTheDocument();
  });

  test('deve rejeitar arquivo não-imagem', () => {
    const file = new File(['conteudo'], 'documento.pdf', {
      type: 'application/pdf'
    });

    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText(/apenas.*imagem/i)).toBeInTheDocument();
  });

  test('deve fazer upload com sucesso', async () => {
    // Mock upload bem-sucedido
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test.jpg' }, error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'http://test.jpg' } })
    });

    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/upload/i);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/sucesso/i)).toBeInTheDocument();
    });
  });

  test('deve mostrar erro quando upload falha', async () => {
    // Mock upload com erro
    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'RLS violation' }
      })
    });

    const file = new File(['image'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByLabelText(/upload/i);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/erro/i)).toBeInTheDocument();
    });
  });
});
```

#### 4.2 Testes E2E (Playwright ou Cypress)

```typescript
// e2e/upload-image.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Upload de Imagem de Produto', () => {

  test('fluxo completo de upload', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navegar para produtos
    await page.goto('/products');
    await page.click('text=Adicionar Produto');

    // Upload de imagem
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('tests/fixtures/test-image.jpg');

    // Aguardar upload
    await expect(page.locator('text=Imagem carregada com sucesso')).toBeVisible();

    // Verificar preview
    await expect(page.locator('img[alt*="preview"]')).toBeVisible();

    // Salvar produto
    await page.fill('[name="nome"]', 'Produto Teste');
    await page.fill('[name="valor"]', '100');
    await page.click('button:has-text("Salvar")');

    // Verificar que produto foi salvo com imagem
    await page.goto('/products');
    await expect(page.locator('img[src*="supabase"]')).toBeVisible();
  });

  test('deve mostrar erro em upload grande', async ({ page }) => {
    // Criar arquivo simulado de 6MB
    const bigFile = Buffer.alloc(6 * 1024 * 1024);

    await page.goto('/products/new');
    const fileInput = page.locator('input[type="file"]');

    // Playwright permite mock de arquivos
    await fileInput.setInputFiles({
      name: 'big-image.jpg',
      mimeType: 'image/jpeg',
      buffer: bigFile,
    });

    await expect(page.locator('text=muito grande')).toBeVisible();
  });
});
```

---

### 🛡️ PREVENÇÃO 2: Validações no Backend

**Responsável:** Time Backend

#### 4.3 Edge Function para Validação

```typescript
// supabase/functions/validate-upload/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, userId } = await req.json();

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verificar se arquivo existe
    const { data, error } = await supabase.storage
      .from('images')
      .list(path.dirname(fileName), {
        search: path.basename(fileName)
      });

    if (error || !data || data.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Arquivo não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar tamanho do arquivo
    const fileSize = data[0].metadata?.size || 0;
    if (fileSize > 5 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: 'Arquivo muito grande' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, file: data[0] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### 🛡️ PREVENÇÃO 3: Alertas e Monitoramento

**Responsável:** Time DevOps

#### 4.4 Configurar Alertas no Supabase

**Dashboard > Settings > Alerts:**

1. **Alert de Taxa de Erro Alta:**
   - Condição: > 10% de uploads falhando em 1 hora
   - Ação: Email + Slack

2. **Alert de Storage Quota:**
   - Condição: > 80% da quota usada
   - Ação: Email para DevOps

3. **Alert de RLS Violations:**
   - Condição: > 50 violações em 1 hora
   - Ação: Slack + Email urgente

#### 4.5 Criar Dashboard de Métricas

```sql
-- View para métricas de upload
CREATE OR REPLACE VIEW metrics_uploads AS
SELECT
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(*) as total_uploads,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as failed_uploads,
  ROUND(
    COUNT(*) FILTER (WHERE error_message IS NOT NULL)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as failure_rate,
  AVG((metadata->>'fileSize')::numeric) / 1024 / 1024 as avg_file_size_mb
FROM logs_errors
WHERE action = 'upload_image'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;
```

---

### 🛡️ PREVENÇÃO 4: Documentação e Treinamento

**Responsável:** Time Técnico + Product Owner

#### 4.6 Criar Guia de Troubleshooting

**Documentar no README.md:**

```markdown
## Troubleshooting - Upload de Imagens

### Problema: Upload para em 90%

**Causas Comuns:**
1. Sessão expirada
2. Permissões RLS incorretas
3. Quota de storage excedida
4. Problema de rede

**Passos de Diagnóstico:**
1. Abrir DevTools (F12) > Console
2. Verificar mensagens de erro
3. Checar tab Network > Filtrar por "storage"
4. Verificar se JWT está válido

**Soluções:**
- Sessão expirada: Fazer logout e login novamente
- RLS: Verificar políticas em Dashboard > Storage > Policies
- Quota: Verificar uso em Dashboard > Storage
- Rede: Testar com outra conexão

### Problema: Imagem não aparece após upload

**Causas Comuns:**
1. URL pública não acessível
2. Bucket não é público
3. CORS mal configurado

**Soluções:**
- Verificar em Dashboard > Storage > Configuration
- Testar URL diretamente no navegador
- Verificar políticas SELECT no bucket
```

#### 4.7 Treinamento da Equipe

**Workshop (2 horas):**

1. **Introdução (15min)**
   - Arquitetura do sistema de upload
   - Fluxo de dados: Frontend → Supabase → Storage

2. **Demonstração de Problemas (30min)**
   - Replicar erro em ambiente de dev
   - Mostrar onde olhar no DevTools
   - Interpretar mensagens de erro

3. **Hands-on (45min)**
   - Cada desenvolvedor replica problema
   - Diagnostica e corrige
   - Testa solução

4. **Q&A (30min)**
   - Perguntas e respostas
   - Cenários edge cases

---

## 5. TIMELINE E RESPONSABILIDADES

### 📅 CRONOGRAMA DE IMPLEMENTAÇÃO

#### DIA 1: Correções Imediatas (4-6 horas)

| Horário | Tarefa | Responsável | Duração | Status |
|---------|--------|-------------|---------|--------|
| 09:00 - 09:30 | Reunião de Alinhamento | Todo o time | 30min | 🔄 |
| 09:30 - 11:00 | Correção do código de upload | Frontend | 1.5h | 🔄 |
| 11:00 - 11:30 | Code review | Tech Lead | 30min | ⏳ |
| 11:30 - 12:30 | Verificar e corrigir RLS | Backend/DevOps | 1h | ⏳ |
| **12:30 - 13:30** | **ALMOÇO** | - | 1h | - |
| 13:30 - 15:00 | Testes manuais | QA + Frontend | 1.5h | ⏳ |
| 15:00 - 16:00 | Ajustes finais | Frontend | 1h | ⏳ |
| 16:00 - 16:30 | Deploy em staging | DevOps | 30min | ⏳ |
| 16:30 - 17:00 | Testes finais em staging | QA | 30min | ⏳ |

**Entregável Dia 1:**
- ✅ Upload funcional sem progresso simulado
- ✅ Validações de erro apropriadas
- ✅ RLS corrigido
- ✅ Deploy em staging

---

#### DIA 2-3: Melhorias e Prevenção (8 horas)

| Tarefa | Responsável | Duração | Prioridade |
|--------|-------------|---------|------------|
| Implementar logging estruturado | Backend | 2h | Alta |
| Criar testes automatizados | Frontend/QA | 3h | Alta |
| Melhorar UX (spinner, toast) | Frontend | 2h | Média |
| Configurar alertas | DevOps | 1h | Alta |
| Documentação | Tech Lead | 1h | Média |
| Edge function de validação | Backend | 2h | Baixa |

**Entregável Dia 2-3:**
- ✅ Sistema de logging funcional
- ✅ Testes automatizados cobrindo 80%+
- ✅ UX melhorada
- ✅ Alertas configurados
- ✅ Documentação completa

---

#### DIA 4-5: Deploy e Monitoramento (4 horas)

| Tarefa | Responsável | Duração |
|--------|-------------|---------|
| Deploy em produção | DevOps | 1h |
| Monitoramento intensivo (24h) | DevOps + Backend | 2h |
| Análise de métricas | Product + Tech Lead | 1h |
| Retrospectiva | Todo o time | 1h |

**Entregável Dia 4-5:**
- ✅ Sistema em produção
- ✅ Métricas mostrando melhoria
- ✅ Documentação de lições aprendidas

---

### 👥 MATRIZ RACI

| Tarefa | Frontend | Backend | DevOps | QA | Tech Lead | Product |
|--------|----------|---------|--------|-----|-----------|---------|
| Correção código upload | **R** | C | I | I | **A** | I |
| Correção RLS | I | **R** | **R** | I | **A** | I |
| Testes automatizados | **R** | C | I | **R** | **A** | I |
| Logging | C | **R** | **R** | I | **A** | I |
| UX/UI | **R** | I | I | C | **A** | C |
| Deploy | I | C | **R** | I | **A** | I |
| Documentação | C | C | C | C | **R** | **A** |
| Monitoramento | I | C | **R** | I | **A** | I |

**Legenda:**
- **R** = Responsible (Executa)
- **A** = Accountable (Aprova)
- **C** = Consulted (Consultado)
- **I** = Informed (Informado)

---

## 📊 MÉTRICAS DE SUCESSO

### KPIs Antes vs Depois

| Métrica | Antes | Meta | Como Medir |
|---------|-------|------|------------|
| Taxa de Sucesso de Upload | ~50% | >95% | logs_success / logs_errors |
| Tempo Médio de Upload | 5-10s | <3s | timestamp diff |
| Usuários Afetados por Semana | 80+ | <5 | COUNT DISTINCT user_id |
| Tickets de Suporte | 15/sem | <2/sem | Sistema de tickets |
| Satisfação do Usuário | 3.2/5 | >4.5/5 | Survey após upload |

### Queries de Monitoramento

```sql
-- Taxa de sucesso nas últimas 24h
SELECT
  COUNT(*) FILTER (WHERE error_message IS NULL) as successful,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) as failed,
  ROUND(
    COUNT(*) FILTER (WHERE error_message IS NULL)::numeric /
    COUNT(*)::numeric * 100,
    2
  ) as success_rate
FROM logs_errors
WHERE action = 'upload_image'
  AND timestamp > NOW() - INTERVAL '24 hours';

-- Tempo médio de upload
SELECT
  AVG(EXTRACT(EPOCH FROM (timestamp - (metadata->>'start_time')::timestamptz))) as avg_duration_seconds
FROM logs_success
WHERE action = 'upload_image'
  AND timestamp > NOW() - INTERVAL '24 hours';
```

---

## 🎓 LIÇÕES APRENDIDAS E RECOMENDAÇÕES

### ✅ O Que Funcionou

1. **Progresso Indeterminado:**
   - Spinner é mais honesto que barra falsa
   - Usuários preferem esperar com informação clara

2. **Validação Dupla:**
   - Client-side para UX
   - Server-side para segurança

3. **Logging Estruturado:**
   - Facilita debug
   - Permite análise de padrões

### ❌ O Que Evitar

1. **Nunca Simular Progresso:**
   - Cria expectativa falsa
   - Mascara problemas reais

2. **Nunca Ignorar Erros:**
   - `if (error) throw error` nem sempre funciona
   - Sempre verificar sucesso explicitamente

3. **Nunca Confiar em URL Sem Validar:**
   - `getPublicUrl()` sempre retorna URL
   - Não significa que arquivo existe

### 💡 Recomendações Futuras

1. **Implementar Webhooks:**
   - Notificar backend quando upload completa
   - Processar imagens (resize, optimize)

2. **Upload Progressivo:**
   - Usar tus.io ou similar
   - Permite pausar/resumir
   - Progresso real do servidor

3. **CDN para Imagens:**
   - Integrar com Cloudflare ou similar
   - Cache e otimização automática

4. **Compressão Client-Side:**
   - Comprimir antes de enviar
   - Reduz tempo de upload
   - Economiza bandwidth

---

## 📞 CONTATOS E SUPORTE

### Equipe Responsável

**Tech Lead:** [Nome]
📧 email@empresa.com
📱 WhatsApp: +55 11 9XXXX-XXXX

**Frontend Lead:** [Nome]
📧 frontend@empresa.com

**Backend Lead:** [Nome]
📧 backend@empresa.com

**DevOps:** [Nome]
📧 devops@empresa.com

### Canais de Comunicação

- **Slack:** #upload-fix-2025
- **Jira:** Projeto UPLOAD
- **Docs:** Confluence > Technical > Storage

### Suporte 24/7

**Emergências:** DevOps On-Call
📱 +55 11 9YYYY-YYYY
📧 oncall@empresa.com

---

## ✅ CHECKLIST FINAL

### Antes de Marcar como Resolvido

- [ ] Código corrigido e testado localmente
- [ ] Code review aprovado
- [ ] Testes automatizados passando
- [ ] RLS verificado e corrigido
- [ ] Deploy em staging realizado
- [ ] Testes manuais em staging OK
- [ ] Logging implementado
- [ ] Alertas configurados
- [ ] Documentação atualizada
- [ ] Treinamento da equipe realizado
- [ ] Deploy em produção realizado
- [ ] Monitoramento 24h sem incidentes
- [ ] Métricas atingindo targets
- [ ] Feedback positivo dos usuários

### Após Resolução

- [ ] Post-mortem realizado
- [ ] Lições aprendidas documentadas
- [ ] Melhorias futuras priorizadas
- [ ] Tickets de suporte resolvidos
- [ ] Comunicado enviado aos usuários

---

**Documento criado:** 2025-10-30
**Última atualização:** 2025-10-30
**Versão:** 1.0
**Status:** 🟢 PRONTO PARA IMPLEMENTAÇÃO

---

## 🚨 PRÓXIMOS PASSOS IMEDIATOS

1. ✅ **AGORA:** Agendar reunião de alinhamento (30min)
2. ✅ **HOJE:** Implementar correções prioritárias (4h)
3. ✅ **HOJE:** Deploy em staging (1h)
4. ✅ **AMANHÃ:** Testes e validação (2h)
5. ✅ **AMANHÃ:** Deploy em produção (1h)

**Responsável por coordenar:** Tech Lead
**Data de início:** IMEDIATO
**Data de conclusão:** Em 2-3 dias úteis
