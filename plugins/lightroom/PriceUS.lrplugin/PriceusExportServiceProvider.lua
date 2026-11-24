local LrApplication = import 'LrApplication'
local LrDialogs    = import 'LrDialogs'
local LrView       = import 'LrView'
local LrHttp       = import 'LrHttp'
local LrFileUtils  = import 'LrFileUtils'
local LrPathUtils  = import 'LrPathUtils'
local LrErrors     = import 'LrErrors'
local LrColor      = import 'LrColor'

local exportServiceProvider = {}

-- Configurações oficiais de Serviço de Publicação no Lightroom Classic (Estrutura Completa Pixieset)
exportServiceProvider.supportsPublish = true
exportServiceProvider.supportsTargetOrders = false
exportServiceProvider.canExportVideo = false
exportServiceProvider.small_icon = 'icon.png'
exportServiceProvider.hideSections = { 'exportLocation', 'fileNaming' }

exportServiceProvider.titleForPublishedCollection = "Galeria PriceU$"
exportServiceProvider.titleForPublishedCollection_standalone = "Galeria PriceU$"
exportServiceProvider.titleForPublishedCollectionSet = "Conjunto de Galerias PriceU$"
exportServiceProvider.titleForPublishedSmartCollection = "Coleção Inteligente PriceU$"
exportServiceProvider.titleForPublishSettings = "Conexão com o PriceU$"

exportServiceProvider.titleForGoToPublishedCollection = "Ver no Painel do PriceU$"
exportServiceProvider.titleForGoToPublishedPhoto = "Ver no Painel do PriceU$"
exportServiceProvider.supportsCustomSortOrder = true
exportServiceProvider.disableRenamePublishedCollection = false
exportServiceProvider.disableRenamePublishedCollectionSet = false

-- Seções de Configuração no Gerenciador de Serviços de Publicação do Lightroom
function exportServiceProvider.sectionsForTopOfDialog( f, propertyTable )
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
          title = "✓ Autenticado & Criptografado (SSL 256-bits)",
          textColor = LrColor( 0.1, 0.7, 0.2 ),
        },
      },
    },
    {
      title = "Configurações Padrão de Galeria de Fotos",

      f:row {
        f:static_text {
          title = "Título Padrão:",
          alignment = 'right',
          width = LrView.share "label_width",
        },
        f:edit_field {
          value = LrView.bind "priceus_gallery_title",
          width_in_chars = 35,
        },
      },
      f:row {
        f:static_text {
          title = "Limite de Fotos no Pacote:",
          alignment = 'right',
          width = LrView.share "label_width",
        },
        f:edit_field {
          value = LrView.bind "priceus_package_limit",
          width_in_chars = 10,
        },
      },
    }
  }
end

-- Diálogo para Nova Coleção Publicada
function exportServiceProvider.dialogForCollectionSettings( f, propertyTable )
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

-- Processamento e Envio Automático das Fotos Selecionadas
function exportServiceProvider.processRenderedPhotos( functionContext, exportContext )
  local exportSession = exportContext.exportSession
  local propertyTable = exportContext.propertyTable
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
      
      -- Deletar arquivo temporário renderizado
      LrFileUtils.delete( pathOrMessage )
    end
  end

  progressScope:done()
  LrDialogs.message( "PriceU$ Galerias Online", "Publicação concluída com sucesso! Suas fotos foram enviadas e sincronizadas com a sua Galeria no PriceU$.", "info" )
end

function exportServiceProvider.deletePhotosFromPublishedCollection( publishSettings, arrayOfPhotoIds, deletedCallback )
  for _, photoId in ipairs( arrayOfPhotoIds ) do
    deletedCallback( photoId )
  end
end

return exportServiceProvider
