import { ShoppingCart, Trash2 } from 'lucide-react';
import { formatCurrency, formatDuration } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { FormattedDescription } from '../ui/FormattedDescription';

import { QuoteHeaderRating } from '../QuoteHeaderRating';

export function QuoteDocumento(props: any) {
  const {
    template,
    profile,
    produtos,
    formasPagamento,
    camposExtras,
    selectedProdutos,
    formData,
    camposExtrasData,
    selectedFormaPagamento,
    dataEvento: _dataEvento,
    cupomAtivo,
    cupomDesconto: _cupomDesconto,
    cupomCodigo,
    cupomMensagem,
    disponibilidade: _disponibilidade,
    checkingAvailability: _checkingAvailability,
    fieldsValidation,
    calculateTotal,
    handleProdutoQuantityChange,
    handleSubmit,
    setFormData,
    setCamposExtrasData,
    setSelectedFormaPagamento,
    setCupomCodigo,
    handleValidarCupom,
    renderLocationDateFields,
    isSubmitting, // Adicionado para o estado do botão
    handleResetQuote,
    upsellSection,
    upsellProdutos = [],
  } = props;

  const tema = {
    cores: {
      bgPrincipal: 'bg-gray-100',
      bgCard: 'bg-white',
      textoPrincipal: 'text-gray-900',
      textoSecundario: 'text-gray-600',
      textoDestaque: 'text-black',
      borda: 'border-gray-300',
      primaria: 'bg-gray-800',
      primariaHover: 'hover:bg-gray-900',
      secundaria: 'bg-gray-100',
    },
    estilos: {
      borderRadius: 'rounded-none',
      shadow: 'shadow-md',
      shadowHover: 'hover:shadow-lg',
      fontHeading: 'font-serif',
    },
  };

  const breakdown = props.getPriceBreakdown ? props.getPriceBreakdown() : {};

  return (
    <div className={`min-h-screen ${tema.cores.bgPrincipal} py-4 sm:py-8 px-4`}>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Imagem de Apresentação (Exclusiva do Tema) */}
        {template?.imagem_apresentacao_url && (
          <ImageWithFallback
            src={template.imagem_apresentacao_url}
            alt="Apresentação"
            className="w-full h-auto object-cover shadow-lg"
          />
        )}

        {/* Perfil do Fotógrafo */}
        {profile && (
          <div className={`${tema.cores.bgCard} ${tema.estilos.shadow} p-5 sm:p-6 mb-6 border-t-4 border-black`}>
            <div className="text-center">
              {profile.profile_image_url && (
                <ImageWithFallback
                  src={profile.profile_image_url}
                  alt={profile.nome_profissional}
                  className="w-32 h-32 rounded-full mx-auto mb-4 object-cover border-4 border-black"
                />
              )}
              <h1 className={`text-3xl sm:text-4xl ${tema.estilos.fontHeading} ${tema.cores.textoPrincipal} mb-2 leading-tight`}>
                {profile.nome_profissional || 'Fotógrafo Profissional'}
              </h1>
              {profile.tipo_fotografia && (
                <p className="text-gray-600 mb-2 text-sm sm:text-base">{profile.tipo_fotografia}</p>
              )}
              {profile.apresentacao && (
                <p className="text-gray-700 mt-3 mb-4 text-sm sm:text-base leading-relaxed px-2">{profile.apresentacao}</p>
              )}
              <div className="flex justify-center">
                <QuoteHeaderRating
                  userId={template.user_id}
                  ratingMinimo={profile.rating_minimo_exibicao || 1}
                  exibirAvaliacoes={profile.exibir_avaliacoes_publico ?? true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Formulário Principal */}
        <div className={`${tema.cores.bgCard} ${tema.estilos.shadow} p-4 sm:p-6 mb-6 border-t-4 border-black`}>
          <h2 className={`text-2xl sm:text-3xl ${tema.estilos.fontHeading} ${tema.cores.textoPrincipal} mb-6 text-center`}>
            {template.titulo_template || template.nome_template}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* ... (código dos campos do formulário: nome, email, telefone) ... */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="nome-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  id="nome-cliente"
                  name="nome_cliente"
                  value={formData.nome_cliente}
                  onChange={(e) =>
                    setFormData({ ...formData, nome_cliente: e.target.value })
                  }
                  className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} focus:ring-2 focus:ring-black focus:border-black`}
                  required
                />
              </div>

              <div>
                <label htmlFor="email-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  E-mail *
                </label>
                <input
                  type="email"
                  id="email-cliente"
                  name="email_cliente"
                  value={formData.email_cliente}
                  onChange={(e) =>
                    setFormData({ ...formData, email_cliente: e.target.value })
                  }
                  className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} focus:ring-2 focus:ring-black focus:border-black`}
                  required
                />
              </div>

              <div>
                <label htmlFor="telefone-cliente" className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  Telefone/WhatsApp *
                </label>
                <input
                  type="tel"
                  id="telefone-cliente"
                  name="telefone_cliente"
                  value={formData.telefone_cliente}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone_cliente: e.target.value })
                  }
                  className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} focus:ring-2 focus:ring-black focus:border-black`}
                  required
                />
              </div>
            </div>

            {renderLocationDateFields && renderLocationDateFields()}

            {/* ... (código dos campos extras) ... */}
            {camposExtras.map((campo: any) => (
              <div key={campo.id}>
                <label className={`block text-sm font-medium ${tema.cores.textoSecundario} mb-2`}>
                  {campo.label} {campo.obrigatorio && '*'}
                </label>
                {campo.tipo === 'textarea' ? (
                  <textarea
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) =>
                      setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })
                    }
                    placeholder={campo.placeholder}
                    required={campo.obrigatorio}
                    className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} focus:ring-2 focus:ring-black focus:border-black`}
                    rows={4}
                  />
                ) : (
                  <input
                    type={campo.tipo}
                    value={camposExtrasData[campo.id] || ''}
                    onChange={(e) =>
                      setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })
                    }
                    placeholder={campo.placeholder}
                    required={campo.obrigatorio}
                    className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} focus:ring-2 focus:ring-black focus:border-black`}
                  />
                )}
              </div>
            ))}

            {/* Seção de Produtos */}
            <div className="border-t border-gray-300 pt-8">
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-xl font-semibold ${tema.cores.textoPrincipal} flex items-center gap-2`}>
                  <ShoppingCart className="w-6 h-6" />
                  Selecione os Serviços
                </h3>
                <button
                  type="button"
                  onClick={handleResetQuote}
                  className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar Orçamento
                </button>
              </div>
              <div className="space-y-4">
                {produtos.map((produto: any) => (
                  <div key={produto.id} className={`border p-4 sm:p-5 transition-all relative ${produto.destacar_produto ? 'border-black border-[3px] bg-gray-50/50 shadow-md scale-[1.01]' : selectedProdutos[produto.id] ? 'border-black bg-gray-50' : tema.cores.borda}`}>
                    <div className={`flex flex-col gap-4 ${template?.layout_produtos_desktop === 'quadro' ? 'sm:items-center' : 'sm:flex-row sm:items-start'}`}>
                      {/* Product image */}
                      {produto.mostrar_imagem && (produto.imagem_url || (produto.imagens?.length > 0)) && (
                        (() => {
                          const sizeClasses = {
                            pequeno: 'w-32 h-32 sm:w-48 sm:h-48',
                            medio: 'w-48 h-48 sm:w-64 sm:h-64',
                            grande: 'w-full h-48 sm:w-80 sm:h-80',
                          };
                          const imageSize = template?.tamanho_imagem_grid || 'medio';
                          const finalClass = sizeClasses[imageSize as keyof typeof sizeClasses] || sizeClasses.medio;
                          return (
                            <div className={`flex-shrink-0 mx-auto sm:mx-0 overflow-hidden ${finalClass}`}>
                              {produto.imagens && produto.imagens.length > 0 ? (
                                <ProductGalleryCarousel
                                  images={[produto.imagem_url, ...produto.imagens].filter(Boolean)}
                                  autoPlay={produto.carrossel_automatico}
                                  productName={produto.nome}
                                />
                              ) : (
                                <ImageWithFallback src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" />
                              )}
                            </div>
                          );
                        })()
                      )}
                      <div className="flex-1">
                        {produto.destacar_produto && produto.destaque_texto && (
                          <div className="inline-flex items-center gap-1 bg-black text-white rounded px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase mb-1 shadow-sm font-serif">
                            ★ {produto.destaque_texto}
                          </div>
                        )}
                        <h4 className={`font-semibold text-lg ${tema.cores.textoPrincipal} flex items-center flex-wrap gap-2`}>
                          <span>{produto.nome}</span>
                          {template?.exibir_duracao_produto && produto.duracao_minutos && produto.duracao_minutos > 0 && (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-normal">
                              ⏱️ {formatDuration(produto.duracao_minutos)}
                            </span>
                          )}
                        </h4>
                        {produto.resumo && (
                          <FormattedDescription text={produto.resumo} className="mt-2 text-xs" />
                        )}

                        {/* Brindes Vinculados em Sub-Cards */}
                        {produto.brindes_vinculados && Array.isArray(produto.brindes_vinculados) && produto.brindes_vinculados.length > 0 && (
                          <div className="mt-3.5 space-y-2 border-t border-dashed border-gray-200 dark:border-white/10 pt-3">
                            <span className="text-[10px] font-bold text-emerald-650 dark:text-emerald-450 flex items-center gap-1 uppercase tracking-wider">
                              🎁 Brinde Incluso:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                              {produto.brindes_vinculados.map((brindeId: string) => {
                                const brinde = (upsellProdutos || []).find((u: any) => u.id === brindeId);
                                if (!brinde) return null;
                                return (
                                  <div
                                    key={brindeId}
                                    className="flex items-center gap-3 p-2 rounded-lg border border-emerald-100 bg-emerald-50/10 shadow-sm"
                                  >
                                    {brinde.imagem_url && (
                                      <img
                                        src={brinde.imagem_url}
                                        alt={brinde.nome}
                                        className="w-8 h-8 object-cover rounded flex-shrink-0"
                                      />
                                    )}
                                    <div className="min-w-0 flex-1 text-left">
                                      <div className="text-[11px] font-bold text-gray-800 truncate">
                                        {brinde.nome}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className="text-[9px] text-gray-400 line-through">
                                          {formatCurrency(brinde.valor)}
                                        </span>
                                        <span className="text-[9px] text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
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
                        {!template.ocultar_valores_intermediarios && (() => {
                          const desconto = produto.desconto_percentual ?? 0;
                          const valorFinal = produto.valor * (1 - desconto / 100);
                          return (
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {desconto > 0 && (
                                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded">
                                  🏷️ {desconto}% OFF
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                {desconto > 0 && (
                                  <span className="text-sm text-gray-400 line-through">{formatCurrency(produto.valor)}</span>
                                )}
                                <span className="text-lg font-bold text-black">{formatCurrency(valorFinal)}</span>
                              </div>
                              {desconto > 0 && (
                                <span className="text-xs text-green-600 font-semibold">Economia de {formatCurrency(produto.valor - valorFinal)}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      {(produto.permite_multiplas_unidades ?? true) ? (
                        <div className="flex items-center justify-center gap-3 mt-4 sm:mt-0">
                          <button type="button" onClick={() => handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)} disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1} className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-lg font-bold">
                            -
                          </button>
                          <span className={`text-xl font-bold ${tema.cores.textoPrincipal}`}>{selectedProdutos[produto.id] || 0}</span>
                          <button type="button" onClick={() => handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) + 1)} className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white text-lg font-bold">
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center mt-4 sm:mt-0">
                          {produto.obrigatorio ? (
                            <div className="py-2 px-4 bg-gray-100 text-gray-500 rounded text-sm font-semibold">
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
                              className={`py-2.5 px-4 rounded text-sm font-semibold transition-all ${
                                selectedProdutos[produto.id]
                                  ? 'bg-black text-white hover:bg-gray-900'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

            {/* 🎁 Upselling */}
            {upsellSection}

            {/* Formas de Pagamento */}
            {formasPagamento.length > 0 && (
              <div className="border-t border-gray-300 pt-8">
                <h3 className={`text-xl font-semibold ${tema.cores.textoPrincipal} mb-4`}>Forma de Pagamento</h3>
                <div className="space-y-3">
                  {formasPagamento.map((forma: any) => {
                    const isDefault = forma.is_default;
                    const isSelected = selectedFormaPagamento === forma.id;
                    
                    let borderClass = tema.cores.borda + ' bg-white hover:bg-gray-50';
                    if (isSelected) {
                      borderClass = isDefault ? 'border-amber-500 bg-amber-50/10 ring-2 ring-amber-500' : 'border-black bg-gray-50 ring-1 ring-black';
                    } else if (isDefault) {
                      borderClass = 'border-amber-300 bg-amber-50/5 hover:bg-amber-50/10';
                    }
                    
                    return (
                      <label 
                        key={forma.id} 
                        className={`flex items-start gap-3 p-4 border cursor-pointer transition-all ${borderClass}`}
                      >
                        <input
                          type="radio"
                          name="formaPagamento"
                          value={forma.id}
                          checked={isSelected}
                          onChange={(e) => setSelectedFormaPagamento(e.target.value)}
                          className="w-5 h-5 mt-1 text-black focus:ring-black border-gray-400"
                        />
                        <div className="flex-1">
                          <div className={`font-semibold ${tema.cores.textoPrincipal} flex items-center flex-wrap gap-2`}>
                            <span>{forma.nome}</span>
                            {isDefault && (
                              <span className="inline-flex items-center gap-1 bg-amber-500 text-black text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                                ⭐ Recomendado
                              </span>
                            )}
                          </div>
                          <div className={`text-sm ${tema.cores.textoSecundario} mt-1`}>
                            Entrada de {forma.entrada_valor}{forma.entrada_tipo === 'percentual' ? '%' : ' (fixo)'}
                            {forma.max_parcelas > 0 && ` + ${forma.max_parcelas}x`}
                            {forma.acrescimo > 0 && ` (+${forma.acrescimo}%)`}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Cupom de Desconto */}
            {fieldsValidation.canUseCoupons && (
              <div className="border-t border-gray-300 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  🎟️ Cupom de Desconto
                </h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={cupomCodigo}
                      onChange={(e) => setCupomCodigo(e.target.value.toUpperCase())}
                      placeholder="Digite o código do cupom"
                      disabled={cupomAtivo}
                      className={`w-full px-4 py-3 text-base border ${tema.cores.borda} ${tema.cores.bgCard} ${tema.cores.textoPrincipal} focus:ring-2 focus:ring-black focus:border-black disabled:bg-gray-100 uppercase`}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (cupomAtivo) {
                        props.setCupomAtivo(false);
                        props.setCupomDesconto(0);
                        setCupomCodigo('');
                        props.setCupomMensagem('');
                      } else {
                        handleValidarCupom();
                      }
                    }}
                    className={`px-6 py-3 font-medium transition-colors ${
                      cupomAtivo
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-gray-800 hover:bg-gray-900 text-white'
                    }`}
                  >
                    {cupomAtivo ? 'Remover' : 'Aplicar'}
                  </button>
                </div>
                {cupomMensagem && (
                  <p className={`text-sm mt-2 ${cupomAtivo ? 'text-green-600' : 'text-red-600'}`}>
                    {cupomMensagem}
                  </p>
                )}
              </div>
            )}

            {/* Totalizador */}
            {fieldsValidation.canSeeTotals && (
              <div className="border-t border-gray-300 pt-8">
                <div className="bg-gray-50 p-4 sm:p-6 space-y-3 border border-gray-200">
                  {!template?.ocultar_valores_intermediarios && (
                    <>
                      {Object.entries(breakdown).map(([key, value]) => {
                        if (typeof value === 'number' && value !== 0 && key !== 'total') {
                          return (
                            <div key={key} className="flex items-start justify-between text-sm gap-2">
                              <span className={`${tema.cores.textoSecundario} flex-1`}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</span>
                              <span className={`${tema.cores.textoPrincipal} font-semibold text-right`}>{formatCurrency(value)}</span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </>
                  )}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`${tema.cores.textoPrincipal} text-xl font-bold`}>{template?.usar_termo_investimento ? 'Investimento Total:' : 'Valor Total:'}</span>
                      <span className="text-black text-2xl font-bold">{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão de Envio */}
            <button
              type="submit"
              className={`w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white px-6 py-4 font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={isSubmitting || !fieldsValidation.canUseWhatsApp}
            >
              {isSubmitting ? 'Enviando...' : (template?.texto_botao_envio || 'Negociar no WhatsApp')}
            </button>
          </form>
        </div>
      </div>

      {/* Imagem de Despedida (Exclusiva do Tema) */}
      {template?.imagem_despedida_url && (
        <ImageWithFallback
          src={template.imagem_despedida_url}
          alt="Despedida"
          className="w-full h-auto object-cover shadow-lg mt-8"
        />
      )}

      {/* Rate Photographer Button removido */}
    </div>
  );
}