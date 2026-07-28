return {
  LrSdkVersion = 9.0,
  LrSdkMinimumVersion = 6.0,

  LrToolkitIdentifier = 'br.com.priceus.lightroom.plugin',
  LrPluginName = 'PriceU$',
  LrPluginInfoUrl = 'https://priceus.com.br',

  -- 1. Serviço de Exportação (Menu Arquivo > Exportar)
  LrExportServiceProvider = {
    title = 'PriceU$ Galerias Online',
    file = 'PriceusExportServiceProvider.lua',
    icon = 'icon.png',
  },

  -- 2. Serviço de Publicação (Painel de Serviços de Publicação)
  LrPublishServices = {
    priceus = {
      title = 'PriceU$',
      file = 'PriceusPublishServiceProvider.lua',
      id = 'br.com.priceus.lightroom.publish',
      small_icon = 'icon.png',
    },
  },

  -- 3. Atualizações Automáticas & Gerenciador de Plug-ins
  LrPluginInfoProvider = 'PriceusPluginInfoProvider.lua',

  VERSION = { major = 2, minor = 1, revision = 0, build = 108 },
}
