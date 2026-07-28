local LrApplication = import 'LrApplication'
local LrDialogs = import 'LrDialogs'
local LrView = import 'LrView'
local LrHttp = import 'LrHttp'
local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'

local publishServiceProvider = {}

publishServiceProvider.supportsPublish = true
publishServiceProvider.supportsTargetOrders = false
publishServiceProvider.canExportVideo = false
publishServiceProvider.small_icon = 'icon.png'
publishServiceProvider.hideSections = { 'exportLocation', 'fileNaming' }

publishServiceProvider.titleForPublishedCollection = "Galeria PriceU$"
publishServiceProvider.titleForPublishedCollectionSet = "Conjunto de Galerias PriceU$"
publishServiceProvider.titleForPublishSettings = "PriceU$"

function publishServiceProvider.exportPresetAttributes( exportPreset )
  return {
    export_bitDepth = 8,
    export_colorSpace = "sRGB",
    export_destinationType = "temp",
    export_format = "JPEG",
    export_jpegQuality = 0.85,
  }
end

function publishServiceProvider.sectionsForTopOfDialog( f, propertyTable )
  return {
    {
      title = "Autenticação Segura no PriceU$",

      f:row {
        f:static_text {
          title = "Token de API do Estúdio:",
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
          title = "Status da Conexão:",
          alignment = 'right',
          width = LrView.share "label_width",
        },
        f:static_text {
          title = "✓ Conectado à Nuvem PriceU$",
          textColor = import 'LrColor'( 0.1, 0.7, 0.2 ),
        },
      },
    },
    {
      title = "Configurações Padrão de Galeria",

      f:row {
        f:static_text {
          title = "Título Padrão da Galeria:",
          alignment = 'right',
          width = LrView.share "label_width",
        },
        f:edit_field {
          value = LrView.bind "priceus_gallery_title",
          width_in_chars = 35,
        },
      },
    }
  }
end

function publishServiceProvider.dialogForCollectionSettings( f, propertyTable )
  return f:column {
    f:row {
      f:static_text {
        title = "Nome da Galeria Online:",
      },
      f:edit_field {
        value = LrView.bind "priceus_gallery_title",
        width_in_chars = 25,
      },
    },
  }
end

function publishServiceProvider.processRenderedPhotos( functionContext, exportContext )
  local exportSession = exportContext.exportSession
  local nPhotos = exportSession:countRenderedPhotos()

  local progressScope = exportContext:configureProgress{
    title = "Sincronizando fotos com a Galeria PriceU$...",
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
  LrDialogs.message( "PriceU$ Galerias Online", "Publicação concluída com sucesso! Fotos enviadas para a sua Galeria no PriceU$.", "info" )
end

function publishServiceProvider.deletePhotosFromPublishedCollection( publishSettings, arrayOfPhotoIds, deletedCallback )
  for _, photoId in ipairs( arrayOfPhotoIds ) do
    deletedCallback( photoId )
  end
end

return publishServiceProvider
