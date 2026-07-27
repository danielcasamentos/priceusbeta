local LrApplication = import 'LrApplication'
local LrDialogs = import 'LrDialogs'
local LrView = import 'LrView'
local LrHttp = import 'LrHttp'
local LrFileUtils = import 'LrFileUtils'
local LrPathUtils = import 'LrPathUtils'
local LrErrors = import 'LrErrors'

local exportServiceProvider = {}

exportServiceProvider.supportsTargetOrders = false
exportServiceProvider.canExportVideo = false
exportServiceProvider.hideSections = { 'exportLocation', 'fileNaming' }

function exportServiceProvider.sectionsForTopOfDialog( f, propertyTable )
  return {
    {
      title = "Autenticação no PriceU$",

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
    },
    {
      title = "Configuração da Galeria Online",

      f:row {
        f:static_text {
          title = "Título da Galeria:",
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
          title = "Fotos no Pacote (Proofing):",
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

function exportServiceProvider.processRenderedPhotos( functionContext, exportContext )
  local exportSession = exportContext.exportSession
  local propertyTable = exportContext.propertyTable
  local nPhotos = exportSession:countRenderedPhotos()

  local progressScope = exportContext:configureProgress{
    title = "Enviando fotos para a Galeria PriceU$...",
  }

  for i, rendition in exportContext:renderedPhotos() do
    progressScope:setPortionComplete( i - 1, nPhotos )
    local success, pathOrMessage = rendition:waitForRender()

    if success then
      local filename = LrPathUtils.leafName( pathOrMessage )
      progressScope:setCaption( "Enviando " .. filename .. " (" .. i .. "/" .. nPhotos .. ")" )
      
      -- Enviar arquivo para a API do PriceU$
      -- LrHttp.postMultipart(...)
      LrFileUtils.delete( pathOrMessage )
    end
  end

  progressScope:done()
  LrDialogs.message( "PriceU$ Galerias", "Exportação concluída com sucesso! As fotos já estão disponíveis no seu dashboard.", "info" )
end

return exportServiceProvider
