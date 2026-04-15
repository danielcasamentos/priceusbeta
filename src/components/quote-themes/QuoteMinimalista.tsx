import { Send, Lock } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';

interface QuoteMinimalistaProps {
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

export function QuoteMinimalista(props: QuoteMinimalistaProps) {
  const { template, profile, produtos, selectedProdutos, formData, calculateTotal, handleSubmit, fieldsValidation, camposExtras, camposExtrasData } = props;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {profile && (
          <div className="bg-slate-50 rounded-3xl shadow-2xl overflow-hidden mb-8 border-4 border-slate-400">
            <div className="bg-slate-800 h-24"></div>
            <div className="px-6 sm:px-8 pb-8 -mt-12 text-center">
              {profile.profile_image_url && (
                <img
                  src={profile.profile_image_url}
                  alt={profile.nome_profissional}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-2xl object-cover mx-auto mb-4"
                />
              )}
              <h1 className="text-3xl sm:text-4xl font-extralight tracking-wide text-slate-900 mb-2">
                {profile.nome_profissional}
              </h1>
              {profile.tipo_fotografia && (
                <p className="text-slate-700 font-light tracking-wide mb-4">{profile.tipo_fotografia}</p>
              )}
              {profile.apresentacao && (
                <p className="text-slate-700 leading-loose font-light max-w-2xl mx-auto mb-4">{profile.apresentacao}</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-50 rounded-3xl shadow-2xl p-6 sm:p-8 border-4 border-slate-400">
          <h2 className="text-2xl sm:text-3xl font-extralight tracking-wide text-slate-900 mb-6 text-center">
            {template.titulo_template || template.nome_template}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nome Completo *"
                value={formData.nome_cliente}
                onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white font-light"
                required
              />
              <input
                type="email"
                placeholder="E-mail *"
                value={formData.email_cliente}
                onChange={(e) => props.setFormData({ ...formData, email_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white font-light"
                required
              />
              <input
                type="tel"
                placeholder="Telefone/WhatsApp *"
                value={formData.telefone_cliente}
                onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white font-light"
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
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white font-light"
                    rows={4}
                  />
                ) : (
                  <input
                    type={campo.tipo}
                    placeholder={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                    required={campo.obrigatorio}
                    className="w-full px-4 py-3 border-2 border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white font-light"
                  />
                )}
              </div>
            ))}

            <div className="border-t-2 border-slate-400 pt-6">
              <h3 className="text-xl font-extralight tracking-wide text-slate-900 mb-4 text-center">Serviços Disponíveis</h3>
              <div className="space-y-4">
                {produtos.map((produto) => (
                  <div
                    key={produto.id}
                    className={`border-2 rounded-xl p-4 transition-all ${
                      selectedProdutos[produto.id] ? 'border-slate-600 bg-slate-100' : 'border-slate-300 hover:border-slate-400 bg-white'
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
                              fallbackClassName="w-full h-full rounded-lg bg-slate-200"
                            />
                          )}
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-light text-lg text-slate-900">{produto.nome}</h4>
                        {produto.resumo && <p className="text-sm text-slate-600 font-light mt-1">{produto.resumo}</p>}
                        {!template.ocultar_valores_intermediarios && (
                          <p className="text-xl font-light text-slate-800 mt-2">{formatCurrency(produto.valor)}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                          disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                          className="w-10 h-10 bg-slate-200 hover:bg-slate-300 rounded-lg font-light disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-light text-xl">{selectedProdutos[produto.id] || 0}</span>
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
                          className="w-10 h-10 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-light disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-6 text-center border-2 border-slate-400">
              <p className="text-sm text-slate-600 font-light tracking-wide mb-2">Valor Total</p>
              <p className="text-4xl font-extralight text-slate-900">{formatCurrency(calculateTotal())}</p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-900 text-white px-8 py-4 rounded-xl font-light tracking-wide text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
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
