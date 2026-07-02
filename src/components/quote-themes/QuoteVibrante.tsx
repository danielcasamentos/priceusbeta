import { Send, Lock, Sparkles } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';

interface QuoteVibranteProps {
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

export function QuoteVibrante(props: QuoteVibranteProps) {
  const { template, profile, produtos, selectedProdutos, formData, calculateTotal, handleSubmit, fieldsValidation, camposExtras, camposExtrasData, setFormData, setCamposExtrasData, handleProdutoQuantityChange } = props;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 font-sans">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {profile && (
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 relative border-4 border-pink-200">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-indigo-400/20 to-pink-400/20 rounded-full blur-3xl"></div>

            <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 h-24 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white/30 animate-pulse" />
            </div>
            <div className="relative px-6 sm:px-8 pb-8 -mt-12 text-center">
              {profile.profile_image_url && (
                <div className="relative inline-block group">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full blur-xl opacity-50"></div>
                  <img
                    src={profile.profile_image_url}
                    alt={profile.nome_profissional}
                    className="relative w-24 h-24 rounded-full border-4 border-white shadow-2xl object-cover"
                  />
                </div>
              )}
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mt-4 mb-2">
                {profile.nome_profissional}
              </h1>
              {profile.tipo_fotografia && (
                <p className="text-purple-700 font-semibold mb-4">{profile.tipo_fotografia}</p>
              )}
              {profile.apresentacao && (
                <p className="text-gray-700 leading-relaxed max-w-2xl mx-auto mb-4">{profile.apresentacao}</p>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 border-4 border-pink-200">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent mb-6 text-center">
            {template.titulo_template || template.nome_template}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nome Completo *"
                value={formData.nome_cliente}
                onChange={(e) => setFormData({ ...formData, nome_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                required
              />
              <input
                type="email"
                placeholder="E-mail *"
                value={formData.email_cliente}
                onChange={(e) => setFormData({ ...formData, email_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <input
                type="tel"
                placeholder="Telefone/WhatsApp *"
                value={formData.telefone_cliente}
                onChange={(e) => setFormData({ ...formData, telefone_cliente: e.target.value })}
                className="w-full px-4 py-3 border-2 border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            {props.renderLocationDateFields && props.renderLocationDateFields()}

            {camposExtras.map((campo: any) => (
              <div key={campo.id}>
                {campo.tipo === 'textarea' ? (
                  <textarea
                    placeholder={campo.placeholder}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) => setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                    required={campo.obrigatorio}
                    className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    rows={4}
                  />
                ) : (
                  <input
                    type={campo.tipo}
                    placeholder={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) => setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })}
                    required={campo.obrigatorio}
                    className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                )}
              </div>
            ))}

            <div className="border-t-2 border-gradient-to-r from-pink-200 to-purple-200 pt-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent mb-4 text-center">
                Serviços Disponíveis
              </h3>
              <div className="space-y-4">
                {produtos.map((produto: any) => (
                  <div
                    key={produto.id}
                    className={`border-2 rounded-xl p-4 transition-all relative ${
                      produto.destacar_produto
                        ? 'border-pink-500 bg-gradient-to-r from-pink-50/50 to-purple-50/50 shadow-[0_8px_30px_rgba(236,72,153,0.22)] ring-2 ring-pink-500/30 scale-[1.01]'
                        : selectedProdutos[produto.id]
                        ? 'border-pink-500 bg-gradient-to-r from-pink-50 to-purple-50 shadow-lg'
                        : 'border-pink-200 hover:border-pink-300'
                    }`}
                  >
                    <div className={`flex flex-col gap-4 ${template?.layout_produtos_desktop === 'quadro' ? 'sm:items-center' : 'sm:flex-row sm:items-start'}`}>
                      {produto.mostrar_imagem && (produto.imagem_url || (produto.imagens?.length > 0)) && (
                        (() => {
                          const sizeClasses = {
                            pequeno: 'w-24 h-24 sm:w-32 sm:h-32',
                            medio: 'w-32 h-32 sm:w-48 sm:h-48',
                            grande: 'w-full h-48 sm:w-72 sm:h-72',
                          };
                          const imageSize = template?.tamanho_imagem_grid || 'medio';
                          const finalClass = sizeClasses[imageSize as keyof typeof sizeClasses] || sizeClasses.medio;
                          return (
                            <div className={`rounded-lg overflow-hidden flex-shrink-0 mx-auto sm:mx-0 ${finalClass}`}>
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
                                  fallbackClassName="w-full h-full rounded-lg bg-gradient-to-br from-pink-100 to-purple-100"
                                />
                              )}
                            </div>
                          );
                        })()
                      )}
                      <div className="flex-1 w-full">
                        {produto.destacar_produto && produto.destaque_texto && (
                          <div className="inline-flex items-center gap-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wider uppercase mb-1 shadow-sm">
                            💖 {produto.destaque_texto}
                          </div>
                        )}
                        <h4 className="font-bold text-lg text-gray-900">{produto.nome}</h4>
                        {produto.resumo && <p className="text-sm text-gray-600 mt-1">{produto.resumo}</p>}
                        {!template.ocultar_valores_intermediarios && (() => {
                          const desconto = produto.desconto_percentual ?? 0;
                          const valorFinal = produto.valor * (1 - desconto / 100);
                          return (
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              {desconto > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                  🏷️ {desconto}% OFF
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                {desconto > 0 && (
                                  <span className="text-sm text-gray-400 line-through">{formatCurrency(produto.valor)}</span>
                                )}
                                <span className="text-xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">{formatCurrency(valorFinal)}</span>
                              </div>
                              {desconto > 0 && (
                                <span className="text-xs text-green-600 font-semibold">Economia de {formatCurrency(produto.valor - valorFinal)}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {(produto.permite_multiplas_unidades ?? true) ? (
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                            disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                            className="w-10 h-10 bg-pink-100 hover:bg-pink-200 rounded-lg font-bold disabled:opacity-50"
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
                              handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) + 1);
                            }}
                            disabled={!produto.obrigatorio && !fieldsValidation.canAddProducts}
                            className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-lg font-bold disabled:opacity-50"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          {produto.obrigatorio ? (
                            <div className="py-2 px-4 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg text-sm font-semibold">
                              Incluído
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (!fieldsValidation.canAddProducts && !selectedProdutos[produto.id]) {
                                  alert(fieldsValidation.validationMessage);
                                  return;
                                }
                                handleProdutoQuantityChange(
                                  produto.id,
                                  selectedProdutos[produto.id] ? 0 : 1
                                );
                              }}
                              className={`py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                                selectedProdutos[produto.id]
                                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700'
                                  : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                              }`}
                            >
                              {selectedProdutos[produto.id] ? '✓ Selecionado' : 'Selecionar'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 text-center border-2 border-pink-200">
              <p className="text-sm text-gray-600 mb-2">Valor Total</p>
              <p className="text-4xl font-bold bg-gradient-to-r from-pink-600 to-indigo-600 bg-clip-text text-transparent">
                {formatCurrency(calculateTotal())}
              </p>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              disabled={!fieldsValidation.canUseWhatsApp}
            >
              {!fieldsValidation.canUseWhatsApp ? <Lock className="w-6 h-6" /> : <Send className="w-6 h-6" />}
              {template?.texto_botao_envio || 'Enviar Orçamento via WhatsApp'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}