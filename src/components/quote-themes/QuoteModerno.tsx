import { Send, Lock, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';

interface QuoteModernoProps {
  template: any;
  profile: any;
  produtos: any[];
  selectedProdutos: Record<string, number>;
  formData: any;
  calculateTotal: () => number;
  handleProdutoQuantityChange: (id: string, qty: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFormData: (data: any) => void;
  fieldsValidation: any;
  camposExtras: any[];
  camposExtrasData: Record<string, string>;
  setCamposExtrasData: (data: any) => void;
  renderLocationDateFields?: () => React.ReactNode;
}

export function QuoteModerno(props: QuoteModernoProps) {
  const { template, profile, produtos, selectedProdutos, formData, calculateTotal, handleSubmit, fieldsValidation, camposExtras, camposExtrasData } = props;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-purple-100">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {profile && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 relative border-4 border-cyan-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>

            <div className="relative bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 h-24 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white/30 animate-pulse" />
            </div>
            <div className="relative px-6 sm:px-8 pb-8 -mt-12 text-center">
              {profile.profile_image_url && (
                <div className="relative inline-block group">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-full blur-xl opacity-50"></div>
                  <img
                    src={profile.profile_image_url}
                    alt={profile.nome_profissional}
                    className="relative w-24 h-24 rounded-full border-4 border-white shadow-2xl object-cover"
                  />
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 bg-clip-text text-transparent mt-4 mb-2">
                {profile.nome_profissional}
              </h1>
              {profile.tipo_fotografia && (
                <p className="text-blue-700 font-semibold mb-4">{profile.tipo_fotografia}</p>
              )}
              {profile.apresentacao && (
                <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto mb-4">{profile.apresentacao}</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-4 border-cyan-200">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mb-6 text-center">
            {template.titulo_template || template.nome_template}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nome Completo *"
                value={formData.nome_cliente}
                onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                required
              />
              <input
                type="email"
                placeholder="E-mail *"
                value={formData.email_cliente}
                onChange={(e) => props.setFormData({ ...formData, email_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <input
                type="tel"
                placeholder="Telefone/WhatsApp *"
                value={formData.telefone_cliente}
                onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {props.renderLocationDateFields && props.renderLocationDateFields()}

            {camposExtras.map((campo) => (
              <div key={campo.id}>
                {campo.tipo === 'textarea' ? (
                  <textarea
                    placeholder={campo.placeholder}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                    required={campo.obrigatorio}
                    className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    rows={4}
                  />
                ) : (
                  <input
                    type={campo.tipo}
                    placeholder={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                    required={campo.obrigatorio}
                    className="w-full px-4 py-3 border-2 border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                )}
              </div>
            ))}

            <div className="border-t-2 border-gradient-to-r from-cyan-200 to-purple-200 pt-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mb-4 text-center">
                Serviços Disponíveis
              </h3>
              <div className="space-y-4">
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    className={`border-2 rounded-xl p-4 transition-all ${
                      selectedProdutos[produto.id]
                        ? 'border-cyan-500 bg-gradient-to-r from-cyan-50 to-purple-50 shadow-lg'
                        : 'border-cyan-200 hover:border-cyan-300'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {produto.mostrar_imagem && (produto.imagem_url || (produto.imagens?.length > 0)) && (
                        <div className="w-20 h-20 shrink-0 overflow-hidden rounded-lg">
                          {produto.imagens && produto.imagens.length > 0 ? (
                            <ProductGalleryCarousel
                              images={[produto.imagem_url, ...produto.imagens].filter(Boolean)}
                              autoPlay={produto.carrossel_automatico}
                              productName={produto.nome}
                            />
                          ) : (
                            <ImageWithFallback
                              src={produto.imagem_url}
                              alt={produto.nome}
                              className="w-full h-full object-cover rounded-lg"
                              fallbackClassName="w-full h-full rounded-lg bg-gradient-to-br from-cyan-100 to-purple-100"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-lg text-gray-900">{produto.nome}</h4>
                        {produto.resumo && <p className="text-sm text-gray-600 mt-1">{produto.resumo}</p>}
                        {!template.ocultar_valores_intermediarios && (
                          <p className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent mt-2">
                            {formatCurrency(produto.valor)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                          disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                          className="w-10 h-10 bg-cyan-100 hover:bg-cyan-200 rounded-lg font-bold disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-bold text-xl">{selectedProdutos[produto.id] || 0}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!produto.obrigatorio && !fieldsValidation.canAddProducts) {
                              alert(fieldsValidation.validationMessage);
                              return;
                            }
                            props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) + 1);
                          }}
                          disabled={!produto.obrigatorio && !fieldsValidation.canAddProducts}
                          className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg font-bold disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-cyan-50 to-purple-50 rounded-xl p-6 text-center border-2 border-cyan-200">
              <p className="text-sm text-gray-600 mb-2">Valor Total</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">
                {formatCurrency(calculateTotal())}
              </p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              disabled={!fieldsValidation.canUseWhatsApp}
            >
              {!fieldsValidation.canUseWhatsApp ? <Lock className="w-6 h-6" /> : <Send className="w-6 h-6" />}
              Enviar Orçamento via WhatsApp
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
