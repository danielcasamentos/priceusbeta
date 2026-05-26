import { Send, Lock, MapPin, Sparkles, MessageCircle, Instagram, Mail, ChevronDown, Award } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { RatePhotographerButton } from '../RatePhotographerButton';
import { QuoteHeaderRating } from '../QuoteHeaderRating';

interface QuotePdfEleganteProps {
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
  // Formas de pagamento
  formasPagamento?: any[];
  selectedFormaPagamento?: string;
  setSelectedFormaPagamento?: (id: string) => void;
  // Refs
  firstProductRef?: React.RefObject<HTMLDivElement>;
  totalSectionRef?: React.RefObject<HTMLDivElement>;
  breakdown?: any;
  fieldErrors?: { email?: string; telefone?: string };
}

export function QuotePdfElegante(props: QuotePdfEleganteProps) {
  const {
    template, profile, produtos, selectedProdutos, formData,
    calculateTotal, handleSubmit, fieldsValidation,
    camposExtras, camposExtrasData, fieldErrors,
    formasPagamento = [],
    selectedFormaPagamento = '',
    setSelectedFormaPagamento,
    firstProductRef,
    totalSectionRef,
  } = props;

  const scrollToProposal = () => {
    const element = document.getElementById('pdf-page-proposal');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        fontFamily: "'Playfair Display', 'Didot', 'Georgia', serif",
        background: '#121212', // Charcoal background for the booklet container
        color: '#1a1a1a',
        minHeight: '100vh',
        padding: '24px 0',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@300;400;500;600;700&display=swap');
        
        .pdf-sans {
          font-family: 'Montserrat', sans-serif;
        }
        
        .pdf-page {
          background: #ffffff;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.05);
          position: relative;
          overflow: hidden;
        }

        .pdf-accent-text {
          color: #bfa15f; /* Luxury Bronze/Gold */
        }

        .pdf-accent-bg {
          background-color: #bfa15f;
        }

        .pdf-accent-border {
          border-color: #bfa15f;
        }

        .pdf-input {
          font-family: 'Montserrat', sans-serif;
          background: #fcfcfc;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          color: #1a1a1a;
          padding: 12px 16px;
          width: 100%;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
        }
        
        .pdf-input:focus {
          border-color: #bfa15f;
          box-shadow: 0 0 0 3px rgba(191, 161, 95, 0.15);
          background: #ffffff;
        }

        .pdf-prod-card {
          border: 1px solid #eaeaea;
          transition: all 0.3s ease;
          border-radius: 4px;
        }

        .pdf-prod-card.selected {
          border-color: #bfa15f;
          background: rgba(191, 161, 95, 0.03);
          box-shadow: 0 4px 15px rgba(191, 161, 95, 0.05);
        }

        .pdf-btn-qty {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #374151;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 2px;
        }

        .pdf-btn-qty:hover:not(:disabled) {
          border-color: #bfa15f;
          color: #bfa15f;
          background: rgba(191, 161, 95, 0.05);
        }

        .pdf-btn-qty:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        @keyframes subtle-pulse {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(6px); }
        }

        .pdf-scroll-indicator {
          animation: subtle-pulse 2s infinite ease-in-out;
        }

        .pdf-ribbon {
          position: absolute;
          top: 0;
          right: 32px;
          background: #bfa15f;
          color: #ffffff;
          padding: 8px 12px 14px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 85%, 0 100%);
          z-index: 10;
        }
      `}</style>

      {/* NAV / MARCA D'ÁGUA DO PRICEUS */}
      <nav style={{
        background: 'rgba(18,18,18,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 24px',
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src="/Logo Price Us.png" alt="PriceUs" style={{ height: 26, filter: 'brightness(0) invert(1)' }} />
        </div>
        <div className="pdf-sans" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
          PROPOSTA COMERCIAL PREMIUM
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 space-y-12 mt-6">
        
        {/* ── PÁGINA 1: CAPA EDITORIAL ── */}
        <section
          id="pdf-page-cover"
          className="pdf-page flex flex-col justify-between"
          style={{ minHeight: 'calc(100vh - 120px)', padding: '48px' }}
        >
          <div className="pdf-ribbon pdf-sans">CAPA</div>

          {/* Nome do Profissional / Cabeçalho */}
          <div className="text-center md:text-left">
            {profile?.nome_profissional && (
              <h3 className="pdf-sans text-xs font-semibold tracking-[0.25em] text-neutral-400 uppercase">
                {profile.nome_profissional}
              </h3>
            )}
            <div style={{ width: '40px', height: '1px', background: '#bfa15f', margin: '16px auto md:margin-left-0', marginTop: '12px' }} />
          </div>

          {/* Imagem de Capa em Destaque */}
          <div className="my-8 relative overflow-hidden rounded-sm" style={{ maxHeight: '420px', aspectRatio: '16/10' }}>
            {template?.cover_image_url ? (
              <img
                src={template.cover_image_url}
                alt={template.titulo_template || 'Capa da proposta'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center text-center p-8 border border-neutral-800">
                <Award className="w-16 h-16 text-amber-600/30 mb-4" />
                <p className="text-sm pdf-sans uppercase tracking-[0.2em] text-neutral-400">PROPOSTA COMERCIAL</p>
                <p className="text-xs text-neutral-500 mt-2 pdf-sans">(Imagem de capa editável na aba Aparência)</p>
              </div>
            )}
          </div>

          {/* Título e Subtítulos da Capa */}
          <div className="text-center md:text-left mt-auto space-y-4">
            <h1 style={{ fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-1px', lineHeight: 1.15 }}>
              {template?.titulo_template || template?.nome_template}
            </h1>
            
            <p className="pdf-sans text-sm text-neutral-500 uppercase tracking-widest leading-relaxed">
              Orçamento personalizado • Desenvolvido exclusivamente para você
            </p>

            <div className="pt-8 flex flex-col items-center justify-center">
              <button
                type="button"
                onClick={scrollToProposal}
                className="pdf-sans text-xs font-semibold text-amber-700 hover:text-amber-800 tracking-widest uppercase flex flex-col items-center gap-2 transition-colors cursor-pointer"
              >
                Ver proposta comercial
                <ChevronDown className="w-4 h-4 pdf-scroll-indicator text-amber-600" />
              </button>
            </div>
          </div>
        </section>


        {/* ── PÁGINA 2: PROPOSTA COMERCIAL (CORPO) ── */}
        <section
          id="pdf-page-proposal"
          className="pdf-page"
          style={{ padding: '60px 48px' }}
        >
          <div className="pdf-ribbon pdf-sans">PROPOSTA</div>

          {/* Cabeçalho Interno */}
          {profile && (
            <div className="flex flex-col items-center text-center pb-8 border-b border-neutral-100">
              {profile.profile_image_url && (
                <div className="mb-4">
                  <img
                    src={profile.profile_image_url}
                    alt={profile.nome_profissional}
                    style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #bfa15f' }}
                  />
                </div>
              )}
              
              <h2 className="text-2xl font-semibold text-neutral-900">{profile.nome_profissional}</h2>
              
              {profile.tipo_fotografia && (
                <p className="pdf-sans text-xs text-neutral-500 uppercase tracking-widest mt-1">
                  {profile.tipo_fotografia}
                </p>
              )}

              {/* Avaliações */}
              <div className="mt-2">
                <QuoteHeaderRating
                  userId={template.user_id}
                  ratingMinimo={profile.rating_minimo_exibicao || 1}
                  exibirAvaliacoes={profile.exibir_avaliacoes_publico ?? true}
                />
              </div>

              {/* Redes Sociais */}
              <div className="flex gap-4 mt-4 pdf-sans justify-center">
                {profile.whatsapp_principal && (
                  <a
                    href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-amber-700 transition-colors"
                  >
                    <MessageCircle size={13} className="text-neutral-400" /> WhatsApp
                  </a>
                )}
                {profile.instagram && (
                  <a
                    href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-amber-700 transition-colors"
                  >
                    <Instagram size={13} className="text-neutral-400" /> Instagram
                  </a>
                )}
                {profile.email_recebimento && (
                  <a
                    href={`mailto:${profile.email_recebimento}`}
                    className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-amber-700 transition-colors"
                  >
                    <Mail size={13} className="text-neutral-400" /> E-mail
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Form + Produtos */}
          <form onSubmit={handleSubmit} className="mt-10 space-y-8">
            
            {/* Informações do Cliente */}
            <div className="space-y-4">
              <h3 className="pdf-sans text-xs font-bold uppercase tracking-widest text-amber-800 border-b border-amber-800/10 pb-2">
                Identificação do Cliente
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <input
                    type="text"
                    placeholder="Nome Completo *"
                    value={formData.nome_cliente}
                    onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })}
                    className="pdf-input"
                    required
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="E-mail *"
                    value={formData.email_cliente}
                    onChange={(e) => props.setFormData({ ...formData, email_cliente: e.target.value })}
                    className="pdf-input"
                    style={fieldErrors?.email ? { borderColor: "#ef4444" } : {}}
                    required
                  />
                  {fieldErrors?.email && <p className="pdf-sans text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="WhatsApp (Ex: 11999999999) *"
                    value={formData.telefone_cliente}
                    onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })}
                    className="pdf-input"
                    style={fieldErrors?.telefone ? { borderColor: "#ef4444" } : {}}
                    required
                  />
                  {fieldErrors?.telefone && <p className="pdf-sans text-xs text-red-500 mt-1">{fieldErrors.telefone}</p>}
                </div>
              </div>
            </div>

            {/* Campos de localização/data */}
            {props.renderLocationDateFields && (
              <div className="space-y-4">
                <h3 className="pdf-sans text-xs font-bold uppercase tracking-widest text-amber-800 border-b border-amber-800/10 pb-2">
                  Especificações do Evento / Projeto
                </h3>
                <div className="pdf-sans text-sm text-neutral-700">
                  {props.renderLocationDateFields()}
                </div>
              </div>
            )}

            {/* Campos Extras */}
            {camposExtras.length > 0 && (
              <div className="space-y-4">
                <h3 className="pdf-sans text-xs font-bold uppercase tracking-widest text-amber-800 border-b border-amber-800/10 pb-2">
                  Informações Adicionais
                </h3>
                <div className="flex flex-col gap-4">
                  {camposExtras.map((campo) =>
                    campo.tipo === 'textarea' ? (
                      <textarea
                        key={campo.id}
                        placeholder={campo.placeholder}
                        value={camposExtrasData[campo.id] || ''}
                        onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, fieldErrors, [campo.id]: e.target.value })}
                        required={campo.obrigatorio}
                        rows={3}
                        className="pdf-input"
                        style={{ resize: 'none' }}
                      />
                    ) : (
                      <input
                        key={campo.id}
                        type={campo.tipo}
                        placeholder={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
                        value={camposExtrasData[campo.id] || ''}
                        onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, fieldErrors, [campo.id]: e.target.value })}
                        required={campo.obrigatorio}
                        className="pdf-input"
                      />
                    )
                  )}
                </div>
              </div>
            )}

            {/* Itens e Serviços Disponíveis */}
            <div className="space-y-4">
              <h3 className="pdf-sans text-xs font-bold uppercase tracking-widest text-amber-800 border-b border-amber-800/10 pb-2">
                Itens & Serviços Propostos
              </h3>

              <div className="flex flex-col gap-4">
                {produtos.map((produto) => {
                  const isSelected = !!selectedProdutos[produto.id];
                  return (
                    <div
                      key={produto.id}
                      className={`pdf-prod-card p-5 ${isSelected ? 'selected' : ''}`}
                    >
                      <div className="flex flex-col sm:flex-row gap-5 items-start">
                        {/* Imagem do Produto */}
                        {produto.mostrar_imagem && (produto.imagem_url || produto.imagens?.length > 0) && (
                          <div className="w-24 h-24 rounded border border-neutral-100 overflow-hidden flex-shrink-0">
                            {produto.imagens?.length > 0 ? (
                              <ProductGalleryCarousel
                                images={[produto.imagem_url, ...produto.imagens].filter(Boolean)}
                                autoPlay={produto.carrossel_automatico}
                                productName={produto.nome}
                              />
                            ) : (
                              <ImageWithFallback
                                src={produto.imagem_url}
                                alt={produto.nome}
                                className="w-full h-full object-cover"
                                fallbackClassName="w-full h-full"
                              />
                            )}
                          </div>
                        )}

                        {/* Informações do Serviço */}
                        <div className="flex-1 min-w-0" ref={produtos.indexOf(produto) === 0 ? firstProductRef : undefined}>
                          <h4 className="text-lg font-semibold text-neutral-900 tracking-tight leading-snug">
                            {produto.nome}
                          </h4>
                          {produto.resumo && (
                            <p className="pdf-sans text-xs text-neutral-500 mt-1.5 leading-relaxed">
                              {produto.resumo}
                            </p>
                          )}
                          {!template?.ocultar_valores_intermediarios && (
                            <p className="text-md font-semibold text-amber-800 mt-2">
                              {formatCurrency(produto.valor)}
                            </p>
                          )}
                        </div>

                        {/* Quantidade */}
                        <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded px-3 py-1.5 self-stretch sm:self-auto justify-between">
                          <button
                            type="button"
                            className="pdf-btn-qty"
                            onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                            disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                          >
                            −
                          </button>
                          <span className="pdf-sans font-semibold text-neutral-800 text-sm min-w-6 text-center">
                            {selectedProdutos[produto.id] || 0}
                          </span>
                          <button
                            type="button"
                            className="pdf-btn-qty"
                            onClick={() => {
                              if (!produto.obrigatorio && !fieldsValidation.canAddProducts) {
                                alert(fieldsValidation.validationMessage);
                                return;
                              }
                              props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) + 1);
                            }}
                            disabled={!produto.obrigatorio && !fieldsValidation.canAddProducts}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formas de pagamento */}
            {formasPagamento.length > 0 && fieldsValidation.canUsePaymentMethods && (
              <div className="space-y-4">
                <h3 className="pdf-sans text-xs font-bold uppercase tracking-widest text-amber-800 border-b border-amber-800/10 pb-2">
                  Condições de Faturamento
                </h3>
                
                <div className="flex flex-col gap-3">
                  {formasPagamento.map((forma) => {
                    const total = calculateTotal();
                    const valorEntrada = forma.entrada_tipo === 'percentual'
                      ? (total * forma.entrada_valor) / 100
                      : forma.entrada_valor;

                    return (
                      <label
                        key={forma.id}
                        className={`flex gap-3 items-start p-4 border rounded cursor-pointer transition-all ${
                          selectedFormaPagamento === forma.id
                            ? 'border-amber-600 bg-amber-50/10'
                            : 'border-neutral-200 bg-neutral-50/40 hover:bg-neutral-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="pdf-forma-pagamento"
                          value={forma.id}
                          checked={selectedFormaPagamento === forma.id}
                          onChange={() => setSelectedFormaPagamento?.(forma.id)}
                          className="mt-1"
                          style={{ accentColor: '#bfa15f' }}
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-neutral-800 text-sm">{forma.nome}</p>
                          <p className="pdf-sans text-xs text-neutral-500 mt-1 leading-normal">
                            <span>
                              {forma.entrada_tipo === 'percentual'
                                ? `Entrada de ${forma.entrada_valor}% (${formatCurrency(valorEntrada)})`
                                : `Entrada de ${formatCurrency(valorEntrada)}`}
                            </span>
                            {forma.max_parcelas > 0 && (
                              <span className="block mt-0.5">+ {forma.max_parcelas}x parcela{forma.max_parcelas > 1 ? 's' : ''}</span>
                            )}
                            {forma.acrescimo > 0 && (
                              <span className="block text-orange-600 mt-0.5">(+{forma.acrescimo}% acréscimo)</span>
                            )}
                            {forma.acrescimo < 0 && (
                              <span className="block text-green-600 mt-0.5">({forma.acrescimo}% desconto)</span>
                            )}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Detalhes de parcelamento */}
                {selectedFormaPagamento && (() => {
                  const forma = formasPagamento.find((f) => f.id === selectedFormaPagamento);
                  if (!forma) return null;

                  const total = calculateTotal();
                  const valorEntrada = forma.entrada_tipo === 'percentual'
                    ? (total * forma.entrada_valor) / 100
                    : forma.entrada_valor;
                  const saldoRestante = Math.max(0, total - valorEntrada);
                  const valorParcela = forma.max_parcelas > 0 ? saldoRestante / forma.max_parcelas : 0;

                  return (
                    <div className="p-4 bg-amber-50/15 border border-amber-600/20 rounded mt-3">
                      <p className="pdf-sans text-xs font-semibold text-amber-800 mb-3 uppercase tracking-wider">
                        Simulação de Parcelamento
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-50 p-3 rounded border border-neutral-100">
                          <p className="pdf-sans text-[10px] text-neutral-400 uppercase tracking-widest">Sinal / Entrada</p>
                          <p className="text-md font-bold text-neutral-800 mt-1">{formatCurrency(valorEntrada)}</p>
                        </div>

                        {forma.max_parcelas > 0 && saldoRestante > 0.01 && (
                          <div className="bg-neutral-50 p-3 rounded border border-neutral-100">
                            <p className="pdf-sans text-[10px] text-neutral-400 uppercase tracking-widest">Parcelas mensais</p>
                            <p className="text-md font-bold text-neutral-800 mt-1">
                              {forma.max_parcelas}x de {formatCurrency(valorParcela)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Total Section */}
            <div
              id="pdf-total"
              ref={totalSectionRef}
              className="border-y-2 border-neutral-900 py-6 text-center my-8"
            >
              <p className="pdf-sans text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 mb-1">
                Investimento Total
              </p>
              <p className="text-4xl font-semibold text-neutral-900 tracking-tight">
                {formatCurrency(calculateTotal())}
              </p>
            </div>
          </form>
        </section>


        {/* ── PÁGINA 3: ENCERRAMENTO & ENVIAR ── */}
        <section
          id="pdf-page-closure"
          className="pdf-page flex flex-col justify-between"
          style={{ minHeight: 'calc(100vh - 120px)', padding: '48px' }}
        >
          <div className="pdf-ribbon pdf-sans">RODAPÉ</div>

          {/* Imagem de Fechamento */}
          <div className="relative overflow-hidden rounded-sm" style={{ maxHeight: '360px', aspectRatio: '16/9' }}>
            {template?.footer_image_url ? (
              <img
                src={template.footer_image_url}
                alt="Encerramento"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-neutral-900 flex flex-col items-center justify-center text-center p-8 border border-neutral-800">
                <Award className="w-12 h-12 text-amber-600/30 mb-3" />
                <p className="text-xs pdf-sans uppercase tracking-[0.2em] text-neutral-400">AGRADECEMOS A PREFERÊNCIA</p>
                <p className="text-[10px] text-neutral-500 mt-2 pdf-sans">(Imagem de rodapé editável na aba Aparência)</p>
              </div>
            )}
          </div>

          {/* Mensagem de encerramento */}
          <div className="text-center max-w-lg mx-auto my-8 space-y-3">
            <h3 className="text-xl font-medium text-neutral-900">Vamos criar algo único juntos?</h3>
            <p className="pdf-sans text-xs text-neutral-500 leading-relaxed">
              Esta proposta foi elaborada de acordo com as especificidades do seu projeto. Caso queira negociar condições especiais, basta clicar no botão de envio para conversarmos diretamente via WhatsApp.
            </p>
          </div>

          {/* Rate Photographer Button */}
          {profile && (
            <div className="mb-6">
              <RatePhotographerButton
                userId={template.user_id}
                templateId={template.id}
                profileName={profile.nome_profissional}
                aceitaAvaliacoes={profile.aceita_avaliacoes ?? true}
                aprovacaoAutomatica={profile.aprovacao_automatica_avaliacoes ?? false}
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="text-center mt-auto">
            <button
              onClick={handleSubmit}
              type="button"
              disabled={!fieldsValidation.canUseWhatsApp}
              className="pdf-sans w-full py-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded shadow-md flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: fieldsValidation.canUseWhatsApp
                  ? 'linear-gradient(135deg, #1a1a1a, #2c2c2c)'
                  : '#e2e8f0',
                border: fieldsValidation.canUseWhatsApp ? '1px solid #bfa15f' : 'none',
                color: fieldsValidation.canUseWhatsApp ? '#ffffff' : '#94a3b8',
                boxShadow: fieldsValidation.canUseWhatsApp ? '0 10px 30px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {!fieldsValidation.canUseWhatsApp ? <Lock className="w-4 h-4" /> : <Send className="w-4 h-4 text-amber-500" />}
              Negociar Orçamento no WhatsApp
            </button>
            <p className="pdf-sans text-[10px] text-neutral-400 mt-3 uppercase tracking-wider">
              priceus.com.br • Todos os direitos reservados
            </p>
          </div>
        </section>

      </div>
      
      {/* ── FOOTER ── */}
      <footer style={{ background: '#0a0a0a', padding: '24px 24px', borderTop: '1px solid rgba(255,255,255,0.03)', textAlign: 'center', marginTop: '48px' }}>
        <p className="pdf-sans" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
          Powered by{' '}
          <a href="/" style={{ color: '#bfa15f', fontWeight: 600, textDecoration: 'none' }}>PriceUs</a>
        </p>
      </footer>
    </div>
  );
}
