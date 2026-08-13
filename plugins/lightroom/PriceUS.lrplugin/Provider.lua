-- PriceU$ Publish Service Provider
-- v2.3 — Auth via Supabase REST API

local LrView      = import 'LrView'
local LrDialogs   = import 'LrDialogs'
local LrFileUtils = import 'LrFileUtils'
local LrHttp      = import 'LrHttp'
local LrTasks     = import 'LrTasks'
local LrPathUtils = import 'LrPathUtils'
local LrDate      = import 'LrDate'

-- Supabase: anon key é pública por design (segurança via RLS, não via chave)
local SUPABASE_URL  = 'https://vkwpcyahwzzeyesyytpa.supabase.co'
local SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrd3BjeWFod3p6ZXllc3l5dHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjkyNjgsImV4cCI6MjA5OTI0NTI2OH0.LgE20A_tWIE0ZgrvYHgzbir-DbnRoaEcFFfhD_SaT1k'
local MAX_ATTEMPTS  = 5       -- tentativas antes de bloquear
local LOCKOUT_SECS  = 300     -- 5 minutos de bloqueio

local provider = {}

-- ══════════════════════════════════════════════════════════════
-- Utilitário: Log no Terminal (/tmp/priceus_plugin.log)
-- ══════════════════════════════════════════════════════════════
local function logMsg( text )
  local logPath = "/tmp/priceus_plugin.log"
  local f = io.open( logPath, "a" )
  if f then
    f:write( os.date( "[%Y-%m-%d %H:%M:%S] " ) .. tostring( text ) .. "\n" )
    f:close()
  end
end

-- ══════════════════════════════════════════════════════════════
-- Publish Service Properties
-- ══════════════════════════════════════════════════════════════
provider.supportsPublish              = true
provider.supportsTargetOrders         = false
provider.supportsIncrementalPublish   = 'only'
provider.canExportVideo               = false
provider.titleForPublishedCollection    = "Galeria PriceU$"
provider.titleForPublishedCollectionSet = "Conjunto de Galerias PriceU$"
provider.titleForPublishSettings        = "PriceU$"

provider.hideSections = { 'exportLocation' }

provider.exportPresetFields = {
  { key = 'export_destinationType', default = 'temp' },
  { key = 'export_useSubfolder',     default = false },
  { key = 'priceus_token',          default = '' },
  { key = 'priceus_refresh_token',  default = '' },
  { key = 'priceus_token_expires',  default = 0 },
  { key = 'priceus_email',          default = '' },
  { key = 'priceus_password',       default = '' },
  { key = 'priceus_name',           default = '' },
  { key = 'priceus_status',         default = 'Não conectado' },
  { key = 'priceus_attempts',       default = 0 },
  { key = 'priceus_locked_until',   default = 0 },
  { key = 'priceus_show_password',  default = false },
}

-- ══════════════════════════════════════════════════════════════
-- Utilitários JSON
-- ══════════════════════════════════════════════════════════════
local function jsonEscape( s )
  if not s then return "" end
  s = s:gsub( '\\', '\\\\' )
  s = s:gsub( '"', '\\"' )
  s = s:gsub( '\n', '\\n' )
  s = s:gsub( '\r', '\\r' )
  s = s:gsub( '\t', '\\t' )
  return s
end

-- Parseia string: "campo":"valor"
local function parseJsonStr( json, field )
  return json and json:match( '"' .. field .. '"%s*:%s*"([^"]+)"' )
end
-- Parseia número: "campo":123
local function parseJsonNum( json, field )
  local v = json and json:match( '"' .. field .. '"%s*:%s*(%d+)' )
  return v and tonumber(v)
end

-- ══════════════════════════════════════════════════════════════
-- Utilitário: segundos restantes de bloqueio (0 = desbloqueado)
-- ══════════════════════════════════════════════════════════════
local function lockedSecsRemaining( propertyTable )
  local lockedUntil = propertyTable.priceus_locked_until or 0
  local now         = LrDate.currentTime()
  local remaining   = math.floor( lockedUntil - now )
  return remaining > 0 and remaining or 0
end

-- ══════════════════════════════════════════════════════════════
-- Utilitário: formata tempo restante "4m 32s"
-- ══════════════════════════════════════════════════════════════
local function formatRemaining( secs )
  if secs >= 60 then
    return math.floor( secs / 60 ) .. 'm ' .. ( secs % 60 ) .. 's'
  end
  return secs .. 's'
end

-- ══════════════════════════════════════════════════════════════
-- Painel de Configuração no Gerenciador de Publicação
-- ══════════════════════════════════════════════════════════════
function provider.sectionsForTopOfDialog( f, propertyTable )
  local pluginPath = _PLUGIN.path

  -- Inicializa propriedades se ainda não existem
  if propertyTable.priceus_token and propertyTable.priceus_token ~= '' then
    local name = propertyTable.priceus_name or propertyTable.priceus_email or 'Usuário'
    propertyTable.priceus_status = "✓ Conectado como: " .. name
  elseif propertyTable.priceus_status == nil then
    propertyTable.priceus_status = "Não conectado"
  end
  if propertyTable.priceus_attempts == nil then propertyTable.priceus_attempts = 0 end

  return {
    {
      title = "PriceU$ — Galerias Online",

      -- ── Logo ──────────────────────────────────────────────
      f:row {
        f:spacer { width = 1 },
        f:picture {
          value  = pluginPath .. '/PriceusLogo.png',
          width  = 220,
          height = 44,
        },
      },

      f:spacer { height = 8 },

      -- ── E-mail ────────────────────────────────────────────
      f:row {
        f:static_text {
          title     = "E-mail:",
          alignment = 'right',
          width     = LrView.share "lbl",
        },
        f:edit_field {
          value              = LrView.bind "priceus_email",
          width_in_chars     = 30,
          placeholder_string = "seu@email.com",
        },
      },

      -- ── Senha + toggle visibilidade ───────────────────────
      f:row {
        f:static_text {
          title     = "Senha:",
          alignment = 'right',
          width     = LrView.share "lbl",
        },

        -- Se "Ver" estiver desmarcado -> exibe password_field
        f:password_field {
          value          = LrView.bind "priceus_password",
          width_in_chars = 25,
          visible        = LrView.bind {
            key       = "priceus_show_password",
            transform = function( v ) return not v end,
          },
        },

        -- Se "Ver" estiver marcado -> exibe edit_field
        f:edit_field {
          value          = LrView.bind "priceus_password",
          width_in_chars = 25,
          visible        = LrView.bind {
            key       = "priceus_show_password",
            transform = function( v ) return v == true end,
          },
        },

        -- Checkbox toggle "Ver"
        f:checkbox {
          title = "Ver",
          value = LrView.bind "priceus_show_password",
        },
      },

      f:spacer { height = 6 },

      -- ── Tentativas restantes ───────────────────────────────
      f:row {
        f:static_text {
          title = LrView.bind {
            key       = "priceus_attempts",
            transform = function( v )
              local attempts = v or 0
              local remaining = MAX_ATTEMPTS - attempts
              if remaining <= 0 then
                return "⛔ Conta bloqueada temporariamente"
              elseif attempts > 0 then
                return "⚠ " .. remaining .. " tentativa(s) restante(s) antes do bloqueio"
              else
                return ""
              end
            end,
          },
          text_color = LrView.bind {
            key       = "priceus_attempts",
            transform = function( v )
              local LrColor = import 'LrColor'
              local attempts = v or 0
              if attempts >= MAX_ATTEMPTS then
                return LrColor( 0.85, 0.1, 0.1 )   -- vermelho forte
              elseif attempts >= 3 then
                return LrColor( 0.9, 0.55, 0.0 )   -- laranja
              else
                return LrColor( 0.5, 0.5, 0.5 )    -- cinza neutro
              end
            end,
          },
        },
      },

      -- ── Botão Login + Status ───────────────────────────────
      f:row {
        f:push_button {
          title  = "Entrar no PriceU$",
          action = function()
            LrTasks.startAsyncTask( function()

              -- Verifica bloqueio ativo
              local secsLeft = lockedSecsRemaining( propertyTable )
              if secsLeft > 0 then
                LrDialogs.message(
                  "PriceU$ — Acesso Bloqueado",
                  "Muitas tentativas incorretas.\nTente novamente em " .. formatRemaining( secsLeft ) .. ".",
                  "critical"
                )
                return
              end

              local emailRaw = propertyTable.priceus_email or ''
              local email    = emailRaw:gsub( "^%s*(.-)%s*$", "%1" ):lower()
              local password = propertyTable.priceus_password or ''

              if email == '' or password == '' then
                LrDialogs.message( "PriceU$", "Preencha e-mail e senha.", "warning" )
                return
              end

              propertyTable.priceus_status = "Conectando..."

              local body = '{"email":"' .. jsonEscape( email ) .. '","password":"' .. jsonEscape( password ) .. '"}'
              local response, headers = LrHttp.post(
                SUPABASE_URL .. '/auth/v1/token?grant_type=password',
                body,
                {
                  { field = 'Content-Type', value = 'application/json' },
                  { field = 'apikey',       value = SUPABASE_ANON },
                }
              )

              if response then
                local token = parseJsonStr( response, 'access_token' )
                local name  = parseJsonStr( response, 'email' ) or email
                -- Supabase retorna erro em JSON com campo "error_code" ou "msg"
                local errCode = parseJsonNum( response, 'code' )
                local errMsg  = parseJsonStr( response, 'msg' ) or parseJsonStr( response, 'error_description' ) or ''

                if token and ( not errCode or errCode < 400 ) then
                  local refreshToken = parseJsonStr( response, 'refresh_token' ) or ''
                  local expiresIn    = parseJsonNum( response, 'expires_in' ) or 3600
                  local now          = LrDate.currentTime()

                  -- Login OK — zera tentativas e salva tokens persistentemente
                  propertyTable.priceus_token         = token
                  propertyTable.priceus_refresh_token = refreshToken
                  propertyTable.priceus_token_expires = now + expiresIn
                  propertyTable.priceus_name          = name
                  propertyTable.priceus_attempts      = 0
                  propertyTable.priceus_locked_until   = 0
                  propertyTable.priceus_status        = "✓ Conectado como: " .. name
                else
                  -- Credenciais inválidas — incrementa contador
                  local attempts = ( propertyTable.priceus_attempts or 0 ) + 1
                  propertyTable.priceus_attempts = attempts
                  propertyTable.priceus_token    = ''

                  if attempts >= MAX_ATTEMPTS then
                    -- Aplica bloqueio de 5 minutos
                    propertyTable.priceus_locked_until = LrDate.currentTime() + LOCKOUT_SECS
                    propertyTable.priceus_status       = "⛔ Bloqueado por 5 minutos"
                    LrDialogs.message(
                      "PriceU$ — Conta Bloqueada",
                      "Você excedeu " .. MAX_ATTEMPTS .. " tentativas.\n\nAcesso bloqueado por 5 minutos por segurança.",
                      "critical"
                    )
                  else
                    local restantes = MAX_ATTEMPTS - attempts
                    propertyTable.priceus_status = "✗ Credenciais inválidas (" .. restantes .. " tentativa(s) restante(s))"
                    
                    local detailMsg = "E-mail ou senha incorretos.\n\nTentativas restantes: " .. restantes
                    if errMsg ~= '' then
                      detailMsg = detailMsg .. "\n\nRetorno do servidor: " .. errMsg
                    end
                    detailMsg = detailMsg .. "\n\n💡 Dica: Se você criou sua conta no PriceU$ usando 'Entrar com Google', precisa cadastrar uma senha de e-mail no painel do PriceU$."

                    LrDialogs.message(
                      "PriceU$ — Falha no Login",
                      detailMsg,
                      "warning"
                    )
                  end
                end
              else
                propertyTable.priceus_token  = ''
                propertyTable.priceus_status = "✗ Sem conexão com o servidor"
                LrDialogs.message(
                  "PriceU$",
                  "Não foi possível conectar ao servidor PriceU$.\nVerifique sua conexão com a internet.",
                  "warning"
                )
              end
            end )
          end,
        },

        f:static_text {
          title = LrView.bind "priceus_status",
          text_color = LrView.bind {
            key       = "priceus_token",
            transform = function( value )
              local LrColor = import 'LrColor'
              if value and value ~= '' then
                return LrColor( 0.1, 0.7, 0.2 )  -- verde
              else
                return LrColor( 0.75, 0.2, 0.2 ) -- vermelho
              end
            end,
          },
        },
      },

      f:spacer { height = 4 },

      -- ── Sair / Trocar conta ────────────────────────────────
      f:row {
        f:push_button {
          title  = "Sair (Trocar Conta)",
          action = function()
            propertyTable.priceus_token         = ''
            propertyTable.priceus_refresh_token = ''
            propertyTable.priceus_token_expires = 0
            propertyTable.priceus_email         = ''
            propertyTable.priceus_password      = ''
            propertyTable.priceus_name          = ''
            propertyTable.priceus_status        = "Desconectado"
            propertyTable.priceus_attempts      = 0
            propertyTable.priceus_locked_until  = 0
            propertyTable.priceus_show_password = false
          end,
        },
      },
    },
  }
end

-- ══════════════════════════════════════════════════════════════
-- Utilitário: garante token válido (renova apenas quando necessário)
-- ══════════════════════════════════════════════════════════════
local function ensureValidToken( propertyTable )
  if not propertyTable then return nil end
  local token        = propertyTable.priceus_token or ''
  local refreshToken = propertyTable.priceus_refresh_token or ''
  local expiresAt    = propertyTable.priceus_token_expires or 0
  local now          = LrDate.currentTime()

  -- 1. Se temos um token e ele ainda está válido (com folga de 5 minutos), usa diretamente sem fazer HTTP
  if token ~= '' and expiresAt > 0 and now < ( expiresAt - 300 ) then
    return token
  end

  -- 2. Se o token expirou (ou está perto de expirar) e temos refresh_token, renova
  if refreshToken ~= '' then
    local body = '{"refresh_token":"' .. jsonEscape( refreshToken ) .. '"}'
    local response = LrHttp.post(
      SUPABASE_URL .. '/auth/v1/token?grant_type=refresh_token',
      body,
      {
        { field = 'Content-Type', value = 'application/json' },
        { field = 'apikey',       value = SUPABASE_ANON },
      }
    )
    if response then
      local newToken   = parseJsonStr( response, 'access_token' )
      local newRefresh = parseJsonStr( response, 'refresh_token' )
      local expiresIn  = parseJsonNum( response, 'expires_in' ) or 3600

      if newToken and newToken ~= '' then
        propertyTable.priceus_token         = newToken
        propertyTable.priceus_token_expires = now + expiresIn
        if newRefresh and newRefresh ~= '' then
          propertyTable.priceus_refresh_token = newRefresh
        end
        return newToken
      end
    end
  end

  -- 3. Fallback: se a renovação falhar por oscilação de rede, reutiliza o token existente se houver
  return token ~= '' and token or nil
end

-- ══════════════════════════════════════════════════════════════
-- Configuração de cada Galeria (Coleção Publicada)
-- ══════════════════════════════════════════════════════════════
function provider.dialogForCollectionSettings( f, propertyTable )
  return f:column {
    f:row {
      f:static_text { title = "Nome da Galeria:" },
      f:edit_field {
        value              = LrView.bind "priceus_gallery_name",
        width_in_chars     = 28,
        placeholder_string = "Ex: Casamento João & Maria",
      },
    },
  }
end

-- ══════════════════════════════════════════════════════════════
-- Utilitário: URL Encode
-- ══════════════════════════════════════════════════════════════
local function urlEncode( str )
  if str then
    str = string.gsub( str, "\n", "\r\n" )
    str = string.gsub( str, "([^%w %-%_%.%~])", function( c )
      return string.format( "%%%02X", string.byte( c ) )
    end )
    str = string.gsub( str, " ", "%%20" )
  end
  return str
end

-- ══════════════════════════════════════════════════════════════
-- Utilitário: Geração de Slug
-- ══════════════════════════════════════════════════════════════
local function generateSlug( title )
  local slug = ( title or "galeria" ):lower()
  slug = slug:gsub( "[áàãâä]", "a" )
  slug = slug:gsub( "[éèêë]", "e" )
  slug = slug:gsub( "[íìîï]", "i" )
  slug = slug:gsub( "[óòõôö]", "o" )
  slug = slug:gsub( "[úùûü]", "u" )
  slug = slug:gsub( "[ç]", "c" )
  slug = slug:gsub( "[^a-z0-9]", "-" )
  slug = slug:gsub( "-+", "-" )
  slug = slug:gsub( "^-", "" )
  slug = slug:gsub( "-$", "" )
  if slug == "" then slug = "galeria" end
  return slug .. "-" .. math.floor( LrDate.currentTime() % 100000 )
end

-- ══════════════════════════════════════════════════════════════
-- Utilitários para Google Drive Integration
-- ══════════════════════════════════════════════════════════════
local function getGoogleDriveToken( token, userId )
  if not userId or userId == '' then return nil end
  local profileUrl = SUPABASE_URL .. '/rest/v1/profiles?id=eq.' .. userId .. '&select=google_auth_data'
  local resp = LrHttp.get( profileUrl, {
    { field = "apikey", value = SUPABASE_ANON },
    { field = "Authorization", value = "Bearer " .. token },
  })

  if resp and resp ~= '' then
    logMsg( "Verificando Google Drive do usuário... Resposta: " .. tostring( resp ) )
    local driveToken = resp:match( '"access_token"%s*:%s*"([^"]+)"' )
    if driveToken and driveToken ~= '' then
      logMsg( "Token do Google Drive encontrado e ativo!" )
      return driveToken
    end
  end
  logMsg( "Nenhum token do Google Drive encontrado no perfil do usuário." )
  return nil
end

local function ensureDriveGalleryFolder( driveToken, galleryTitle )
  logMsg( "Buscando/Criando pasta raiz /PriceUS_Galerias no Google Drive..." )
  -- 1. Buscar ou criar pasta raiz /PriceUS_Galerias no Google Drive
  local rootQuery = urlEncode( "name = 'PriceUS_Galerias' and mimeType = 'application/vnd.google-apps.folder' and trashed = false" )
  local searchUrl = "https://www.googleapis.com/drive/v3/files?q=" .. rootQuery .. "&fields=files(id)"
  local resp = LrHttp.get( searchUrl, { { field = "Authorization", value = "Bearer " .. driveToken } } )
  logMsg( "Resposta busca pasta raiz: " .. tostring( resp ) )
  local rootFolderId = parseJsonStr( resp, 'id' )

  if not rootFolderId or rootFolderId == '' then
    logMsg( "Criando pasta raiz /PriceUS_Galerias no Google Drive..." )
    local createRootResp = LrHttp.post( "https://www.googleapis.com/drive/v3/files", '{"name":"PriceUS_Galerias","mimeType":"application/vnd.google-apps.folder"}', {
      { field = "Authorization", value = "Bearer " .. driveToken },
      { field = "Content-Type", value = "application/json" },
    })
    logMsg( "Resposta criacao pasta raiz: " .. tostring( createRootResp ) )
    rootFolderId = parseJsonStr( createRootResp, 'id' )
  end

  if not rootFolderId or rootFolderId == '' then
    logMsg( "ERRO: Não foi possível obter ou criar a pasta raiz no Google Drive." )
    return nil
  end

  -- 2. Criar ou buscar subpasta do ensaio dentro de /PriceUS_Galerias
  logMsg( "Buscando/Criando subpasta '" .. tostring( galleryTitle ) .. "' no Google Drive (raiz: " .. rootFolderId .. ")..." )
  local subQuery = urlEncode( "name = '" .. galleryTitle .. "' and '" .. rootFolderId .. "' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false" )
  local subResp  = LrHttp.get( "https://www.googleapis.com/drive/v3/files?q=" .. subQuery .. "&fields=files(id)", {
    { field = "Authorization", value = "Bearer " .. driveToken }
  })
  logMsg( "Resposta busca subpasta: " .. tostring( subResp ) )
  local galleryFolderId = parseJsonStr( subResp, 'id' )

  if not galleryFolderId or galleryFolderId == '' then
    logMsg( "Criando subpasta '" .. tostring( galleryTitle ) .. "' no Google Drive..." )
    local createSubResp = LrHttp.post( "https://www.googleapis.com/drive/v3/files", '{"name":"' .. jsonEscape( galleryTitle ) .. '","mimeType":"application/vnd.google-apps.folder","parents":["' .. rootFolderId .. '"]}', {
      { field = "Authorization", value = "Bearer " .. driveToken },
      { field = "Content-Type", value = "application/json" },
    })
    logMsg( "Resposta criacao subpasta: " .. tostring( createSubResp ) )
    galleryFolderId = parseJsonStr( createSubResp, 'id' )
  end

  logMsg( "ID final da pasta da galeria no Google Drive: " .. tostring( galleryFolderId ) )
  return galleryFolderId
end

local function uploadToGoogleDrive( driveToken, folderId, filename, binaryData )
  logMsg( "Iniciando upload multipart para Google Drive: " .. filename .. " (Folder ID: " .. tostring( folderId ) .. ")" )
  local boundary = "---------------------------PriceUS" .. math.floor( LrDate.currentTime() * 1000 )
  local metadata = '{"name":"' .. jsonEscape( filename ) .. '","parents":["' .. folderId .. '"]}'

  local body = "--" .. boundary .. "\r\n" ..
               "Content-Type: application/json; charset=UTF-8\r\n\r\n" ..
               metadata .. "\r\n" ..
               "--" .. boundary .. "\r\n" ..
               "Content-Type: image/jpeg\r\n\r\n" ..
               binaryData .. "\r\n" ..
               "--" .. boundary .. "--\r\n"

  local url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id"
  local resp, headers = LrHttp.post( url, body, {
    { field = "Authorization", value = "Bearer " .. driveToken },
    { field = "Content-Type", value = "multipart/related; boundary=" .. boundary },
  })

  logMsg( "Resposta upload Google Drive para " .. filename .. ": " .. tostring( resp ) )
  if resp then
    local fileId = parseJsonStr( resp, 'id' )
    if fileId and fileId ~= '' then
      -- Define permissão de leitura pública para download no portal do cliente
      LrHttp.post( "https://www.googleapis.com/drive/v3/files/" .. fileId .. "/permissions", '{"role":"reader","type":"anyone"}', {
        { field = "Authorization", value = "Bearer " .. driveToken },
        { field = "Content-Type", value = "application/json" },
      })
      return fileId
    end
  end
  return nil
end

-- ══════════════════════════════════════════════════════════════
-- Publicação das Fotos
-- ══════════════════════════════════════════════════════════════
function provider.processRenderedPhotos( functionContext, exportContext )
  -- Em Publish Services, a propriedade de login fica no Serviço de Publicação (Connection)
  local propertyTable = exportContext.propertyTable

  if type( exportContext.getPublishService ) == 'function' then
    local pubService = exportContext:getPublishService()
    if pubService then
      if type( pubService.getPublishSettings ) == 'function' then
        local settings = pubService:getPublishSettings()
        if settings and ( settings.priceus_token or '' ) ~= '' then
          propertyTable = settings
        end
      end
    end
  end

  local token = ensureValidToken( propertyTable )

    if not token then
      LrDialogs.message(
        "PriceU$ — Erro de Autenticação",
        "Sua sessão expirou ou você não está autenticado.\nPor favor, clique duas vezes no Serviço de Publicação 'PriceU$' no painel esquerdo do Lightroom e faça login.",
        "critical"
      )
      return
    end

  -- Obter nome da coleção no Lightroom (ex: "Bruna e Gustavo")
  local collectionName = "Galeria Lightroom"
  if exportContext.publishedCollection and type( exportContext.publishedCollection.getName ) == 'function' then
    collectionName = exportContext.publishedCollection:getName()
  end

  local progressScope = exportContext:configureProgress {
    title = "Sincronizando Galeria '" .. collectionName .. "' com o PriceU$...",
  }

  -- 1. Obter ID do usuário autenticado
  local userId = propertyTable.priceus_user_id or ''
  if userId == '' then
    local userResp = LrHttp.get( SUPABASE_URL .. '/auth/v1/user', {
      { field = "apikey", value = SUPABASE_ANON },
      { field = "Authorization", value = "Bearer " .. token },
    })
    if userResp then
      userId = parseJsonStr( userResp, 'id' ) or ''
      if userId ~= '' then propertyTable.priceus_user_id = userId end
    end
  end

  -- 2. Buscar ou Criar Galeria no Supabase REST API
  local galleryId = nil
  local searchUrl = SUPABASE_URL .. '/rest/v1/galleries?title=eq.' .. urlEncode( collectionName ) .. '&select=id'
  local searchResp = LrHttp.get( searchUrl, {
    { field = "apikey", value = SUPABASE_ANON },
    { field = "Authorization", value = "Bearer " .. token },
  })

  if searchResp and searchResp ~= '' then
    galleryId = parseJsonStr( searchResp, 'id' )
  end

  if not galleryId or galleryId == '' then
    -- Criar nova galeria no PriceU$
    progressScope:setCaption( "Criando nova galeria no PriceU$..." )
    local slug = generateSlug( collectionName )
    local createUrl = SUPABASE_URL .. '/rest/v1/galleries'
    local bodyJson  = '{"title":"' .. jsonEscape( collectionName ) .. '","slug":"' .. slug .. '","user_id":"' .. userId .. '","status":"active","is_public_portfolio":true}'
    local createResp, cHeaders = LrHttp.post( createUrl, bodyJson, {
      { field = "apikey", value = SUPABASE_ANON },
      { field = "Authorization", value = "Bearer " .. token },
      { field = "Content-Type", value = "application/json" },
      { field = "Prefer", value = "return=representation" },
    })
    if createResp then
      galleryId = parseJsonStr( createResp, 'id' )
      if not galleryId then
        local errDetail = parseJsonStr( createResp, 'message' ) or createResp
        LrDialogs.message(
          "PriceU$ — Erro no Banco de Dados",
          "O Supabase recusou a criação da galeria:\n" .. tostring( errDetail ),
          "critical"
        )
        progressScope:done()
        return
      end
    end
  end

  if not galleryId or galleryId == '' then
    progressScope:done()
    LrDialogs.message(
      "PriceU$ — Erro de Sincronização",
      "Não foi possível criar a galeria '" .. collectionName .. "' no PriceU$. Verifique suas credenciais.",
      "critical"
    )
    return
  end

  -- 2. Verificar conexão com Google Drive
  progressScope:setCaption( "Verificando integração com Google Drive..." )
  local driveToken = getGoogleDriveToken( token, userId )
  local driveFolderId = nil

  if driveToken then
    driveFolderId = ensureDriveGalleryFolder( driveToken, collectionName )
    if driveFolderId then
      logMsg( "Pasta do Google Drive pronta. ID: " .. tostring( driveFolderId ) )
      local updateFolderJson = '{"google_drive_folder_id":"' .. driveFolderId .. '"}'
      LrHttp.post( SUPABASE_URL .. "/rest/v1/galleries?id=eq." .. galleryId, updateFolderJson, {
        { field = "apikey", value = SUPABASE_ANON },
        { field = "Authorization", value = "Bearer " .. token },
        { field = "Content-Type", value = "application/json" },
        { field = "X-HTTP-Method-Override", value = "PATCH" },
      })
    end
  else
    logMsg( "Google Drive não conectado no perfil do usuário. Fotos serão enviadas para o Supabase Storage." )
  end

  -- 3. Renderizar e Fazer Upload das Fotos
  local count = 0
  logMsg( "Iniciando renderização de fotos para a galeria: " .. collectionName .. " (ID: " .. tostring( galleryId ) .. ")" )

  for i, rendition in exportContext:renditions() do
    if progressScope:isCanceled() then
      logMsg( "Exportação cancelada pelo usuário no Lightroom." )
      break
    end

    -- Renova token se necessário durante exportações longas (> 1 hora)
    token = ensureValidToken( propertyTable ) or token

    logMsg( "Renderizando foto #" .. i .. "..." )
    local success, pathOrMessage = rendition:waitForRender()

    if success then
      local filename = LrPathUtils.leafName( pathOrMessage )
      logMsg( "Foto #" .. i .. " renderizada com sucesso: " .. pathOrMessage .. " (Tamanho: " .. tostring( LrFileUtils.fileAttributes( pathOrMessage ).fileSize ) .. " bytes)" )
      progressScope:setCaption( "Enviando " .. filename .. " (" .. ( count + 1 ) .. " foto(s))..." )

      local photoData = LrFileUtils.readFile( pathOrMessage )
      if photoData then
        local uploadedDrive = false

        -- 1º TENTATIVA: Upload direto do Lightroom para o Google Drive
        if driveToken and driveFolderId then
          logMsg( "Enviando " .. filename .. " diretamente para o Google Drive..." )
          local fileId = uploadToGoogleDrive( driveToken, driveFolderId, filename, photoData )
          if fileId and fileId ~= '' then
            uploadedDrive = true
            count = count + 1
            logMsg( "✓ Upload direto para Google Drive concluído: ID " .. tostring( fileId ) )

            local driveUrl = "https://lh3.googleusercontent.com/d/" .. fileId
            local photoJson = '{"gallery_id":"' .. galleryId .. '",' ..
                              '"google_drive_file_id":"' .. jsonEscape( fileId ) .. '",' ..
                              '"supabase_thumb_path":"' .. jsonEscape( driveUrl ) .. '",' ..
                              '"supabase_web_path":"' .. jsonEscape( driveUrl ) .. '",' ..
                              '"file_name":"' .. jsonEscape( filename ) .. '",' ..
                              '"display_order":' .. count .. '}'

            LrHttp.post( SUPABASE_URL .. "/rest/v1/gallery_photos", photoJson, {
              { field = "apikey", value = SUPABASE_ANON },
              { field = "Authorization", value = "Bearer " .. token },
              { field = "Content-Type", value = "application/json" },
            })
          else
            logMsg( "⚠ Falha no upload direto para Google Drive. Tentando ponte..." )
          end
        end

        -- 2º TENTATIVA: Ponte Edge Function /upload-to-drive
        if not uploadedDrive then
          logMsg( "Enviando " .. filename .. " via Ponte PriceU$..." )
          local bridgeUrl = SUPABASE_URL .. "/functions/v1/upload-to-drive"

          local bResp, bHeaders = LrHttp.post( bridgeUrl, photoData, {
            { field = "apikey", value = SUPABASE_ANON },
            { field = "Authorization", value = "Bearer " .. token },
            { field = "Content-Type", value = "image/jpeg" },
            { field = "x-gallery-id", value = galleryId },
            { field = "x-gallery-title", value = collectionName },
            { field = "x-filename", value = filename },
          })

          if bResp and bResp ~= '' and bResp:match( '"success"%s*:%s*true' ) then
            uploadedDrive = true
            count = count + 1
            logMsg( "✓ Envio via Ponte PriceU$ concluído para: " .. filename )
          else
            logMsg( "⚠ Ponte PriceU$ indisponível ou desativada: " .. tostring( bResp ) )
          end
        end

        -- 3º TENTATIVA (FALLBACK): Supabase Storage Bucket
        if not uploadedDrive then
          logMsg( "Executando fallback Supabase Storage para " .. filename .. "..." )
          local safeFilename = filename:gsub( "[%s]", "_" )
          local storagePath  = galleryId .. "/" .. safeFilename
          local uploadUrl    = SUPABASE_URL .. "/storage/v1/object/gallery-assets/" .. storagePath

          local sResp, sHeaders = LrHttp.post( uploadUrl, photoData, {
            { field = "apikey", value = SUPABASE_ANON },
            { field = "Authorization", value = "Bearer " .. token },
            { field = "Content-Type", value = "image/jpeg" },
            { field = "x-upsert", value = "true" },
          })
          local publicUrl = SUPABASE_URL .. "/storage/v1/object/public/gallery-assets/" .. storagePath

          count = count + 1
          local photoJson = '{"gallery_id":"' .. galleryId .. '",' ..
                            '"supabase_thumb_path":"' .. jsonEscape( publicUrl ) .. '",' ..
                            '"supabase_web_path":"' .. jsonEscape( publicUrl ) .. '",' ..
                            '"file_name":"' .. jsonEscape( filename ) .. '",' ..
                            '"display_order":' .. count .. '}'

          LrHttp.post( SUPABASE_URL .. "/rest/v1/gallery_photos", photoJson, {
            { field = "apikey", value = SUPABASE_ANON },
            { field = "Authorization", value = "Bearer " .. token },
            { field = "Content-Type", value = "application/json" },
          })
        end
      end

      -- Excluir arquivo temporário exportado pelo Lightroom e liberar memória RAM do Lua
      LrFileUtils.delete( pathOrMessage )
      photoData = nil
      collectgarbage( "collect" )
    else
      if tostring(pathOrMessage):find("canceled") then
        logMsg( "Exportação de fotos cancelada no Lightroom." )
        break
      else
        logMsg( "ERRO: Rendition de foto falhou no Lightroom: " .. tostring( pathOrMessage ) )
      end
    end
  end

  progressScope:done()
  local destText = driveFolderId and "Google Drive (pasta /PriceUS_Galerias/" .. collectionName .. ")" or "PriceU$ Storage"
  LrDialogs.message(
    "PriceU$ — Galeria Publicada!",
    "Sincronização concluída!\n\nGaleria '" .. collectionName .. "' com " .. count .. " foto(s) enviada(s) para " .. destText .. ".",
    "info"
  )
end

-- ══════════════════════════════════════════════════════════════
-- Remoção de fotos de uma coleção publicada
-- ══════════════════════════════════════════════════════════════
function provider.deletePhotosFromPublishedCollection( publishSettings, arrayOfPhotoIds, deletedCallback )
  for _, photoId in ipairs( arrayOfPhotoIds ) do
    deletedCallback( photoId )
  end
end

return provider
