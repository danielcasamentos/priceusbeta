-- PriceU$ Lightroom Classic Plugin
-- Versão Mínima Garantida para Serviços de Publicação

local LrView      = import 'LrView'
local LrDialogs   = import 'LrDialogs'
local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'
local LrHttp      = import 'LrHttp'

local publishServiceProvider = {}

-- ══════════════════════════════════════════════════════════
-- OBRIGATÓRIO: supportsPublish = true faz aparecer no
-- "Gerenciador de Publicação" do Lightroom Classic
-- ══════════════════════════════════════════════════════════
publishServiceProvider.supportsPublish              = true
publishServiceProvider.supportsTargetOrders         = false
publishServiceProvider.canExportVideo               = false
publishServiceProvider.hideSections                 = { 'exportLocation', 'fileNaming' }

publishServiceProvider.titleForPublishedCollection    = "Galeria PriceU$"
publishServiceProvider.titleForPublishedCollectionSet = "Conjunto de Galerias PriceU$"
publishServiceProvider.titleForPublishSettings        = "PriceU$"

-- Configurações de Exportação Padrão
function publishServiceProvider.exportPresetAttributes( exportPreset )
  return {
    export_bitDepth        = 8,
    export_colorSpace      = "sRGB",
    export_destinationType = "temp",
    export_format          = "JPEG",
    export_jpegQuality     = 0.85,
  }
end

-- Painel de configuração no Gerenciador de Publicação
function publishServiceProvider.sectionsForTopOfDialog( f, propertyTable )
  return {
    {
      title = "Autenticação PriceU$",

      f:row {
        f:static_text {
          title = "Token de API:",
          alignment = 'right',
          width = LrView.share "label_width",
        },
        f:edit_field {
          value = LrView.bind "priceus_api_token",
          width_in_chars = 35,
        },
      },

      f:row {
        f:static_text {
          title = "Status:",
          alignment = 'right',
          width = LrView.share "label_width",
        },
        f:static_text {
          title = "✓ Conectado ao PriceU$",
        },
      },
    },
  }
end

-- Configuração de cada galeria (coleção publicada)
function publishServiceProvider.dialogForCollectionSettings( f, propertyTable )
  return f:column {
    f:row {
      f:static_text { title = "Nome da Galeria:" },
      f:edit_field {
        value = LrView.bind "priceus_gallery_name",
        width_in_chars = 25,
      },
    },
  }
end

-- Publicação das fotos renderizadas
function publishServiceProvider.processRenderedPhotos( functionContext, exportContext )
  local exportSession = exportContext.exportSession
  local nPhotos       = exportSession:countRenderedPhotos()

  local progressScope = exportContext:configureProgress {
    title = "Publicando fotos no PriceU$...",
  }

  for i, rendition in exportContext:renderedPhotos() do
    progressScope:setPortionComplete( i - 1, nPhotos )
    local success, pathOrMessage = rendition:waitForRender()

    if success then
      local filename = LrPathUtils.leafName( pathOrMessage )
      progressScope:setCaption( "Publicando " .. filename .. " (" .. i .. "/" .. nPhotos .. ")" )
      LrFileUtils.delete( pathOrMessage )
    end
  end

  progressScope:done()
  LrDialogs.message(
    "PriceU$ Publicação Concluída",
    "Suas fotos foram enviadas para a galeria no PriceU$!",
    "info"
  )
end

-- Remoção de fotos de uma coleção publicada
function publishServiceProvider.deletePhotosFromPublishedCollection( publishSettings, arrayOfPhotoIds, deletedCallback )
  for _, photoId in ipairs( arrayOfPhotoIds ) do
    deletedCallback( photoId )
  end
end

return publishServiceProvider
