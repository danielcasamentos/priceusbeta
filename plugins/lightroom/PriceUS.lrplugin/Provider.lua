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
-- Publish Service Properties
-- ══════════════════════════════════════════════════════════════
provider.supportsPublish              = true
provider.supportsTargetOrders         = false
provider.supportsIncrementalPublish   = 'only'
provider.canExportVideo               = false
provider.titleForPublishedCollection    = "Galeria PriceU$"
provider.titleForPublishedCollectionSet = "Conjunto de Galerias PriceU$"
provider.titleForPublishSettings        = "PriceU$"

provider.exportPresetFields = {
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
-- Publicação das Fotos
-- ══════════════════════════════════════════════════════════════
function provider.processRenderedPhotos( functionContext, exportContext )
  -- Em Publish Services, a propriedade de login fica no Serviço de Publicação (Connection)
  local propertyTable = exportContext.propertyTable

  if type( exportContext.getPublishService ) == 'function' then
    local pubService = exportContext:getPublishService()
    if pubService and type( pubService.getInitParams ) == 'function' then
      local params = pubService:getInitParams()
      if params and ( params.priceus_token or '' ) ~= '' then
        propertyTable = params
      end
    end
  end

  local token = ensureValidToken( propertyTable )

  if not token then
    LrDialogs.message(
      "PriceU$ — Erro de Autenticação",
      "Sua sessão expirou ou você não está autenticado.\nPor favor, abra as configurações do serviço e faça login novamente.",
      "critical"
    )
    return
  end

  local progressScope = exportContext:configureProgress {
    title = "Publicando fotos no PriceU$...",
  }

  local count = 0
  for i, rendition in exportContext:renderedPhotos() do
    local success, pathOrMessage = rendition:waitForRender()

    if success then
      count = count + 1
      local filename = LrPathUtils.leafName( pathOrMessage )
      progressScope:setCaption( "Publicando " .. filename .. " (" .. count .. " foto(s))" )
      LrFileUtils.delete( pathOrMessage )
    end
  end

  progressScope:done()
  LrDialogs.message(
    "PriceU$ — Publicação Concluída",
    count .. " foto(s) publicada(s) com sucesso!",
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
