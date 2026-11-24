import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Falha na autenticação: cabeçalho ausente')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variáveis de ambiente do Supabase ausentes')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    // 1. Validar usuário autenticado
    const token = authHeader.replace(/^Bearer\s+/i, '')
    let userId: string | undefined

    try {
      const authRes = await supabaseAdmin.auth.getUser(token)
      if (authRes?.data?.user) {
        userId = authRes.data.user.id
      }
    } catch (_) {}

    if (!userId) {
      // Fallback: Se o token de sessão expirou durante uma exportação longa (> 1h), extrai o id do usuário do payload do JWT
      try {
        const parts = token.split('.')
        if (parts.length === 3) {
          const base64Url = parts[1]
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
          const padLen = (4 - (base64.length % 4)) % 4
          const paddedBase64 = base64 + '='.repeat(padLen)
          const jsonStr = atob(paddedBase64)
          const payload = JSON.parse(jsonStr)
          userId = payload.sub || payload.user_id
        }
      } catch (e) {
        console.warn('[upload-to-drive] Erro ao extrair user_id do payload JWT:', e)
      }
    }

    if (!userId) {
      throw new Error('Usuário não autenticado ou token inválido')
    }

    const user = { id: userId }

    // 2. Extrair dados da requisição (Multipart ou JSON)
    let galleryId = ''
    let galleryTitle = 'Galeria Lightroom'
    let filename = `foto_${Date.now()}.jpg`
    let fileBuffer: Uint8Array | null = null

    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      galleryId = (formData.get('gallery_id') as string) || ''
      galleryTitle = (formData.get('gallery_title') as string) || galleryTitle
      filename = (formData.get('filename') as string) || filename
      const file = formData.get('file') as File
      if (file) {
        fileBuffer = new Uint8Array(await file.arrayBuffer())
      }
    } else if (contentType.includes('application/json')) {
      const body = await req.json()
      galleryId = body.gallery_id || ''
      galleryTitle = body.gallery_title || galleryTitle
      filename = body.filename || filename
      if (body.base64_data) {
        const base64Str = body.base64_data.replace(/^data:image\/\w+;base64,/, '')
        const binStr = atob(base64Str)
        fileBuffer = new Uint8Array(binStr.length)
        for (let i = 0; i < binStr.length; i++) {
          fileBuffer[i] = binStr.charCodeAt(i)
        }
      }
    } else {
      // Stream ou raw binary direto no body
      galleryId = req.headers.get('x-gallery-id') || ''
      galleryTitle = req.headers.get('x-gallery-title') || galleryTitle
      filename = req.headers.get('x-filename') || filename
      fileBuffer = new Uint8Array(await req.arrayBuffer())
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Arquivo de imagem ausente no envio')
    }

    // 3. Garantir ou Buscar Galeria no Banco de Dados
    if (!galleryId) {
      const slug = galleryTitle.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')
      const { data: existingGallery } = await supabaseAdmin
        .from('galleries')
        .select('id, google_drive_folder_id')
        .eq('user_id', user.id)
        .eq('slug', slug)
        .maybeSingle()

      if (existingGallery) {
        galleryId = existingGallery.id
      } else {
        const { data: newGallery, error: createErr } = await supabaseAdmin
          .from('galleries')
          .insert({
            user_id: user.id,
            title: galleryTitle,
            slug: `${slug}-${Math.random().toString(36).substring(2, 6)}`,
            status: 'active',
            is_public_portfolio: true
          })
          .select()
          .single()

        if (createErr) throw createErr
        galleryId = newGallery.id
      }
    }

    // 4. Buscar credenciais do Google Drive no perfil
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('google_auth_data')
      .eq('id', user.id)
      .single()

    const googleAuthData = profile?.google_auth_data
    let googleAccessToken = googleAuthData?.access_token

    // Renovar access_token se necessário e houver refresh_token
    if (googleAuthData?.refresh_token) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID') || Deno.env.get('SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID')
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') || Deno.env.get('SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET')

      try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId || '',
            client_secret: clientSecret || '',
            refresh_token: googleAuthData.refresh_token,
            grant_type: 'refresh_token',
          })
        })

        if (tokenResponse.ok) {
          const tokenData = await tokenResponse.json()
          googleAccessToken = tokenData.access_token
          // Atualizar token no perfil
          await supabaseAdmin.from('profiles').update({
            google_auth_data: { ...googleAuthData, access_token: googleAccessToken }
          }).eq('id', user.id)
        }
      } catch (e) {
        console.warn('[upload-to-drive] Erro ao renovar token do Google:', e)
      }
    }

    // 5. Se houver token do Google Drive, faz o upload direto para a pasta do Drive
    let googleDriveFileId: string | null = null
    let webUrl = ''
    let thumbUrl = ''

    if (googleAccessToken) {
      console.log(`[upload-to-drive] googleAccessToken presente. Buscando/criando pastas no Drive...`)
      // 5a. Garantir pasta raiz /PriceUS_Galerias
      const rootSearchQuery = encodeURIComponent("name = 'PriceUS_Galerias' and mimeType = 'application/vnd.google-apps.folder' and trashed = false")
      const rootResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${rootSearchQuery}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      })
      const rootData = await rootResp.json()
      let rootFolderId = rootData.files?.[0]?.id

      if (!rootFolderId) {
        console.log('[upload-to-drive] Pasta /PriceUS_Galerias não encontrada. Criando...')
        const createRootResp = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'PriceUS_Galerias', mimeType: 'application/vnd.google-apps.folder' })
        })
        const createdRoot = await createRootResp.json()
        rootFolderId = createdRoot.id
      }
      console.log(`[upload-to-drive] Pasta raiz ID: ${rootFolderId}`)

      // 5b. Garantir subpasta da galeria
      const cleanTitle = galleryTitle.replace(/'/g, "\\'")
      const subSearchQuery = encodeURIComponent(`name = '${cleanTitle}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)
      const subResp = await fetch(`https://www.googleapis.com/drive/v3/files?q=${subSearchQuery}&fields=files(id)`, {
        headers: { Authorization: `Bearer ${googleAccessToken}` }
      })
      const subData = await subResp.json()
      let galleryFolderId = subData.files?.[0]?.id

      if (!galleryFolderId) {
        console.log(`[upload-to-drive] Subpasta '${galleryTitle}' não encontrada. Criando...`)
        const createSubResp = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: galleryTitle, mimeType: 'application/vnd.google-apps.folder', parents: [rootFolderId] })
        })
        const createdSub = await createSubResp.json()
        galleryFolderId = createdSub.id

        // Salvar folder_id na galeria
        await supabaseAdmin.from('galleries').update({ google_drive_folder_id: galleryFolderId }).eq('id', galleryId)
      }
      console.log(`[upload-to-drive] Subpasta galeria ID: ${galleryFolderId}`)

      // 5c. Upload do arquivo via multipart para o Google Drive
      const boundary = '---------------------------PriceUS' + Date.now()
      const metadata = JSON.stringify({ name: filename, parents: [galleryFolderId] })
      
      const encoder = new TextEncoder()
      const part1 = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`)
      const part2 = encoder.encode(`\r\n--${boundary}--\r\n`)

      const fullBody = new Uint8Array(part1.length + fileBuffer.length + part2.length)
      fullBody.set(part1, 0)
      fullBody.set(fileBuffer, part1.length)
      fullBody.set(part2, part1.length + fileBuffer.length)

      const uploadResp = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: fullBody
      })

      if (uploadResp.ok) {
        const uploadData = await uploadResp.json()
        googleDriveFileId = uploadData.id
        console.log(`[upload-to-drive] Upload Google Drive concluído. File ID: ${googleDriveFileId}`)

        // Definir permissão de leitura pública para o arquivo
        await fetch(`https://www.googleapis.com/drive/v3/files/${googleDriveFileId}/permissions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${googleAccessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'reader', type: 'anyone' })
        }).catch(() => null)

        webUrl = `https://lh3.googleusercontent.com/d/${googleDriveFileId}=w1600`
        thumbUrl = `https://lh3.googleusercontent.com/d/${googleDriveFileId}=w600`
      } else {
        const uploadErrText = await uploadResp.text()
        console.error(`[upload-to-drive] Falha no upload para o Google Drive (${uploadResp.status}):`, uploadErrText)
      }
    } else {
      console.warn('[upload-to-drive] googleAccessToken ausente ou inválido.')
    }

    // Fallback: Se não houver Google Drive ou upload falhar, salva no Supabase Storage
    if (!googleDriveFileId) {
      console.log('[upload-to-drive] Executando fallback para Supabase Storage...')
      const storagePath = `${galleryId}/${Date.now()}_${filename.replace(/\s+/g, '_')}`
      const { error: storageErr } = await supabaseAdmin.storage
        .from('gallery-assets')
        .upload(storagePath, fileBuffer, { contentType: 'image/jpeg', upsert: true })

      if (storageErr) throw new Error(`Falha no armazenamento Supabase: ${storageErr.message}`)

      const { data: { publicUrl } } = supabaseAdmin.storage.from('gallery-assets').getPublicUrl(storagePath)
      webUrl = publicUrl
      thumbUrl = publicUrl
    }

    // 6. Inserir registro na tabela gallery_photos
    const { count } = await supabaseAdmin
      .from('gallery_photos')
      .select('*', { count: 'exact', head: true })
      .eq('gallery_id', galleryId)

    const order = (count || 0) + 1

    const { data: photoRecord, error: dbErr } = await supabaseAdmin
      .from('gallery_photos')
      .insert({
        gallery_id: galleryId,
        google_drive_file_id: googleDriveFileId || '',
        supabase_thumb_path: thumbUrl,
        supabase_web_path: webUrl,
        file_name: filename,
        display_order: order
      })
      .select()
      .single()

    if (dbErr) throw dbErr

    // Se for a 1ª foto, define como capa da galeria
    if (order === 1) {
      await supabaseAdmin.from('galleries').update({
        cover_photo_id: photoRecord.id,
        cover_photo_url: webUrl
      }).eq('id', galleryId)
    }

    return new Response(JSON.stringify({
      success: true,
      photo: photoRecord,
      google_drive_file_id: googleDriveFileId,
      publicUrl: webUrl
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (err: any) {
    console.error('[upload-to-drive] Erro:', err)
    return new Response(JSON.stringify({
      success: false,
      error: err.message || 'Erro interno no envio'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    })
  }
})
