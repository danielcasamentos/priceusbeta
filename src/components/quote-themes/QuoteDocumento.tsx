import { ShoppingCart, Send, Lock, User, AlertCircle, Check, CheckCircle, Copy, X, Trash2, FileText } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { MobileDatePicker } from '../MobileDatePicker';
import { AvailabilityIndicator } from '../AvailabilityIndicator';
import { PublicReviews } from '../PublicReviews';
import { RatePhotographerButton } from '../RatePhotographerButton';
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
    dataEvento,
    cupomAtivo,
    cupomDesconto,
    cupomCodigo,
    cupomMensagem,
    disponibilidade,
    checkingAvailability,
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
                  <div key={produto.id} className={`border p-4 sm:p-5 transition-all ${selectedProdutos[produto.id] ? 'border-black bg-gray-50' : tema.cores.borda}`}>
                    <div className="flex flex-col sm:flex-row gap-4">
                      {produto.mostrar_imagem && (produto.imagem_url || (produto.imagens?.length > 0)) && (
                        <div className="w-full sm:w-48 h-48 flex-shrink-0">
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
                      )}
                      <div className="flex-1">
                        <h4 className={`font-semibold text-lg ${tema.cores.textoPrincipal}`}>{produto.nome}</h4>
                        {produto.resumo && <p className={`text-sm ${tema.cores.textoSecundario} mt-2`}>{produto.resumo}</p>}
                        {!template.ocultar_valores_intermediarios && (
                          <p className="text-lg font-bold text-black mt-3">{formatCurrency(produto.valor)}</p>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-3 mt-4 sm:mt-0">
                        <button type="button" onClick={() => handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)} disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1} className="w-10 h-10 flex items-center justify-center bg-gray-200 hover:bg-gray-300 disabled:opacity-50 text-lg font-bold">
                          -
                        </button>
                        <span className={`text-xl font-bold ${tema.cores.textoPrincipal}`}>{selectedProdutos[produto.id] || 0}</span>
                        <button type="button" onClick={() => handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) + 1)} className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-900 text-white text-lg font-bold">
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Formas de Pagamento */}
            {formasPagamento.length > 0 && fieldsValidation.canUsePaymentMethods && (
              <div className="border-t border-gray-300 pt-8">
                <h3 className={`text-xl font-semibold ${tema.cores.textoPrincipal} mb-4`}>Forma de Pagamento</h3>
                <div className="space-y-3">
                  {formasPagamento.map((forma: any) => (
                    <label key={forma.id} className={`flex items-start gap-3 p-4 border cursor-pointer ${selectedFormaPagamento === forma.id ? 'border-black bg-gray-50' : tema.cores.borda}`}>
                      <input
                        type="radio"
                        name="formaPagamento"
                        value={forma.id}
                        checked={selectedFormaPagamento === forma.id}
                        onChange={(e) => setSelectedFormaPagamento(e.target.value)}
                        className="w-5 h-5 mt-1 text-black focus:ring-black border-gray-400"
                      />
                      <div className="flex-1">
                        <div className={`font-semibold ${tema.cores.textoPrincipal}`}>{forma.nome}</div>
                        <div className={`text-sm ${tema.cores.textoSecundario}`}>
                          Entrada de {forma.entrada_valor}{forma.entrada_tipo === 'percentual' ? '%' : ' (fixo)'}
                          {forma.max_parcelas > 0 && ` + ${forma.max_parcelas}x`}
                          {forma.acrescimo > 0 && ` (+${forma.acrescimo}%)`}
                        </div>
                      </div>
                    </label>
                  ))}
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
                      <span className={`${tema.cores.textoPrincipal} text-xl font-bold`}>Valor Total:</span>
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

      {/* Rate Photographer Button */}
      {profile && (
        <div className="mt-8">
          <RatePhotographerButton userId={template.user_id} templateId={template.id} profileName={profile.nome_profissional} />
        </div>
      )}
    </div>
  );
}