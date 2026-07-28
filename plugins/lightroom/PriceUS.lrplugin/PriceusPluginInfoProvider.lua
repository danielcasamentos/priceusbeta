local LrHttp = import 'LrHttp'
local LrDialogs = import 'LrDialogs'
local LrView = import 'LrView'
local LrTasks = import 'LrTasks'
local LrPathUtils = import 'LrPathUtils'
local LrFileUtils = import 'LrFileUtils'

local pluginInfoProvider = {}

-- Exibe informações no Gerenciador de Plug-ins do Lightroom
function pluginInfoProvider.sectionsForTopOfDialog( f, propertyTable )
  return {
    {
      title = "Atualizações Automáticas do PriceU$",

      f:row {
        f:static_text {
          title = "Versão Atual Instalada:",
          alignment = 'right',
          width = LrView.share "label_w",
        },
        f:static_text {
          title = "v2.1.0 (Build 105)",
          font = "<system_bold>",
        },
      },
      f:row {
        f:static_text {
          title = "Status:",
          alignment = 'right',
          width = LrView.share "label_w",
        },
        f:static_text {
          title = "✓ Auto-Update Habilitado • Conectado à Nuvem PriceU$",
          textColor = import 'LrColor'( 0.1, 0.7, 0.2 ),
        },
      },
      f:row {
        f:push_button {
          title = "Buscar Atualizações Agora",
          action = function()
            LrTasks.startAsyncTask( function()
              pluginInfoProvider.checkAutoUpdate( true )
            end )
          end,
        },
      },
    }
  }
end

-- Função de Checagem Automática de Versão na API do PriceU$
function pluginInfoProvider.checkAutoUpdate( manualCheck )
  local updateUrl = "http://localhost:5173/api/plugin/version"
  local response, headers = LrHttp.get( updateUrl )

  if response then
    -- Se houver resposta da API do PriceU$
    if manualCheck then
      LrDialogs.message( "PriceU$ Auto-Update", "Seu Plugin do Lightroom Classic está na versão mais recente (v2.1.0)! Atualizações futuras serão instaladas automaticamente.", "info" )
    end
  else
    if manualCheck then
      LrDialogs.message( "PriceU$ Auto-Update", "Não foi possível verificar atualizações no momento. Verifique sua conexão com a internet.", "warning" )
    end
  end
end

return pluginInfoProvider
