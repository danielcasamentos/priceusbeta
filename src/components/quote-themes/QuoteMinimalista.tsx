import { Send, Lock } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { FormattedDescription } from '../ui/FormattedDescription';
import { BrindesCountdown } from '../BrindesCountdown';

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
  upsellSection?: React.ReactNode;
  brindesProdutos?: any[];
  leadCreatedAt?: string | null;
}

export function QuoteMinimalista(props: QuoteMinimalistaProps) {
  const {
    template,
    profile,
    produtos,
    selectedProdutos,
    formData,
    calculateTotal,
    handleSubmit,
    fieldsValidation,
    camposExtras,
    camposExtrasData,
    upsellSection,
    brindesProdutos = [],
    leadCreatedAt,
  } = props;

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-200 via-gray-200 to-slate-300">
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
                    className={`border-2 rounded-xl p-4 transition-all relative ${
                      produto.destacar_produto
                        ? 'border-slate-800 bg-slate-50/50 shadow-md ring-1 ring-slate-800/10 scale-[1.01]'
                        : selectedProdutos[produto.id]
                        ? 'border-slate-600 bg-slate-100'
                        : 'border-slate-300 hover:border-slate-400 bg-white'
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
                                  fallbackClassName="w-full h-full rounded-lg bg-slate-200"
                                />
                              )}
                            </div>
                          );
                        })()
                      )}
                      <div className="flex-1 w-full">
                        {produto.destacar_produto && produto.destaque_texto && (
                          <div className="inline-flex items-center gap-1 bg-slate-800 text-white rounded-md px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase mb-1 shadow-sm">
                            ✦ {produto.destaque_texto}
                          </div>
                        )}
                        <h4 className="font-light text-lg text-slate-900">{produto.nome}</h4>
                        {produto.resumo && (
                          <FormattedDescription text={produto.resumo} className="text-sm text-slate-600 font-light mt-1" />
                        )}
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
                                <span className="text-xl font-light text-slate-800">{formatCurrency(valorFinal)}</span>
                              </div>
                              {desconto > 0 && (
                                <span className="text-xs text-green-600 font-semibold">Economia de {formatCurrency(produto.valor - valorFinal)}</span>
                              )}
                            </div>
                          );
                        })()}
                        {/* Brindes Vinculados em Sub-Cards */}
                        {produto.brindes_vinculados && Array.isArray(produto.brindes_vinculados) && produto.brindes_vinculados.length > 0 && (
                          <div className="mt-3.5 space-y-2 border-t border-dashed border-slate-200 pt-3 text-left">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                                🎁 {produto.brindes_titulo_personalizado || 'Brinde Incluso'}:
                              </span>
                              <BrindesCountdown
                                brindesExpira={produto.brindes_expira}
                                brindesExpiraTipo={produto.brindes_expira_tipo}
                                brindesExpiraDias={produto.brindes_expira_dias}
                                brindesExpiraData={produto.brindes_expira_data}
                                leadCreatedAt={leadCreatedAt}
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                              {produto.brindes_vinculados.map((brindeId: string) => {
                                const brinde = (brindesProdutos || []).find((u: any) => u.id === brindeId);
                                if (!brinde) return null;
                                const mostrarValores = produto.brindes_mostrar_valores ?? true;
                                const quantidade = (produto.brindes_quantidades as Record<string, number> | undefined)?.[brindeId] ?? 1;
                                return (
                                  <div
                                    key={brindeId}
                                    className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50/50 shadow-sm"
                                  >
                                    {brinde.imagem_url && (
                                      <img
                                        src={brinde.imagem_url}
                                        alt={brinde.nome}
                                        className="w-10 h-10 object-cover rounded-lg flex-shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0 flex-1">
                                      <div className="text-xs font-bold text-slate-800 truncate">
                                        {brinde.nome}{quantidade > 1 && <span className="ml-1 text-emerald-600 font-bold">(x{quantidade})</span>}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        {mostrarValores && brinde.valor > 0 && (
                                          <span className="text-[10px] text-slate-400 line-through">
                                            {formatCurrency(brinde.valor * quantidade)}
                                          </span>
                                        )}
                                        <span className="text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                                          Grátis
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                      {(produto.permite_multiplas_unidades ?? true) ? (
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
                      ) : (
                        <div className="flex items-center">
                          {produto.obrigatorio ? (
                            <div className="py-2 px-4 bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold">
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
                                props.handleProdutoQuantityChange(
                                  produto.id,
                                  selectedProdutos[produto.id] ? 0 : 1
                                );
                              }}
                              className={`py-2 px-4 rounded-lg text-sm font-semibold transition-all ${
                                selectedProdutos[produto.id]
                                  ? 'bg-slate-800 text-white hover:bg-slate-900'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
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
            {upsellSection}

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
              {template?.texto_botao_envio || 'Enviar Orçamento via WhatsApp'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
