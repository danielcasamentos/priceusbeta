import { Lock, MessageCircle, Instagram, Mail, Award } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { RatePhotographerButton } from '../RatePhotographerButton';
import { QuoteHeaderRating } from '../QuoteHeaderRating';
import { PortfolioSection } from '../PortfolioSection';

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
  formasPagamento?: any[];
  selectedFormaPagamento?: string;
  setSelectedFormaPagamento?: (id: string) => void;
  firstProductRef?: React.RefObject<HTMLDivElement>;
  totalSectionRef?: React.RefObject<HTMLDivElement>;
  breakdown?: any;
  fieldErrors?: { email?: string; telefone?: string };
  upsellSection?: React.ReactNode;
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

  const isPremium = profile?.status_assinatura === 'active';

  return (
    <div
      style={{
        fontFamily: "'Montserrat', sans-serif",
        background: '#ffffff',
        color: '#1a1a1a',
        minHeight: '100vh',
        padding: 0,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
        
        .pdf-sans {
          font-family: 'Montserrat', sans-serif;
        }

        .pdf-input {
          font-family: 'Montserrat', sans-serif;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          color: #1a1a1a;
          padding: 12px 16px;
          width: 100%;
          font-size: 14px;
          outline: none;
          transition: all 0.3s ease;
        }
        
        .pdf-input:focus {
          border-color: #1a1a1a;
          box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.08);
          background: #ffffff;
        }

        .pdf-prod-card {
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          border-radius: 8px;
          background: #ffffff;
        }

        .pdf-prod-card.selected {
          border-color: #1a1a1a;
          background: #fafafa;
        }

        .pdf-btn-qty {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 4px;
        }

        .pdf-btn-qty:hover:not(:disabled) {
          border-color: #1a1a1a;
          color: #1a1a1a;
          background: #f1f5f9;
        }

        .pdf-btn-qty:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      `}</style>

      {/* TOP HEADER WATERMARK (only for non-premium accounts) */}
      {!isPremium && (
        <nav style={{
          background: '#121212',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '0 24px',
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <div className="pdf-sans" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
            PROPOSTA
          </div>
        </nav>
      )}

      {/* Unified Column Container */}
      <div className="max-w-xl mx-auto px-4 py-8 space-y-8">
        
        {/* 1. Vertical Cover Photo (borderless, vertical aspect ratio, optimized for mobile) */}
        <div className="w-full relative overflow-hidden rounded-none my-4" style={{ margin: '16px auto' }}>
          {template?.cover_image_url ? (
            <img
              src={template.cover_image_url}
              alt={template.titulo_template || 'Capa da proposta'}
              className="w-full h-auto object-cover rounded-none aspect-[3/4]"
            />
          ) : (
            <div className="w-full aspect-[3/4] bg-neutral-50 flex flex-col items-center justify-center text-center p-8 border border-neutral-200 rounded-none">
              <Award className="w-12 h-12 text-neutral-300 mb-3" />
              <p className="text-xs pdf-sans uppercase tracking-[0.2em] text-neutral-400">PROPOSTA</p>
              <p className="text-[10px] text-neutral-500 mt-2 pdf-sans">(Imagem de capa editável na aba Aparência)</p>
            </div>
          )}
        </div>

        {/* 2. Photographer Profile Section */}
        {profile && (
          <div className="flex flex-col items-center text-center pb-6 border-b border-neutral-100">
            {profile.profile_image_url && (
              <div className="mb-4">
                <img
                  src={profile.profile_image_url}
                  alt={profile.nome_profissional}
                  style={{ width: 88, height: 88, borderRadius: '0px', objectFit: 'cover', border: '2px solid #e2e8f0' }}
                />
              </div>
            )}
            
            <h2 className="text-xl font-semibold text-neutral-900 tracking-tight">{profile.nome_profissional}</h2>
            
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
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
                >
                  <MessageCircle size={13} className="text-neutral-400" /> WhatsApp
                </a>
              )}
              {profile.instagram && (
                <a
                  href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
                >
                  <Instagram size={13} className="text-neutral-400" /> Instagram
                </a>
              )}
              {profile.email_recebimento && (
                <a
                  href={`mailto:${profile.email_recebimento}`}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-950 transition-colors"
                >
                  <Mail size={13} className="text-neutral-400" /> E-mail
                </a>
              )}
            </div>
            <PortfolioSection
              portfolioLink={profile.portfolio_link}
              portfolioFotos={profile.portfolio_fotos}
              isDark={false}
            />
          </div>
        )}

        {/* 3. Proposal Title (explanatory, simple, sans-serif) */}
        <div className="text-center">
          <h1 className="pdf-sans font-medium text-neutral-800 text-lg tracking-normal">
            {template?.titulo_template || template?.nome_template}
          </h1>
          <p className="pdf-sans text-xs text-neutral-500 mt-1">
            Orçamento personalizado elaborado exclusivamente para você.
          </p>
        </div>

        {/* 4. Proposal Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Client Identification */}
          <div className="space-y-3">
            <h3 className="pdf-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
              Identificação do Cliente
            </h3>
            
            <div className="space-y-3">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          </div>

          {/* Event specs */}
          {props.renderLocationDateFields && (
            <div className="space-y-3">
              <h3 className="pdf-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
                Especificações do Evento / Projeto
              </h3>
              <div className="pdf-sans text-sm text-neutral-700">
                {props.renderLocationDateFields()}
              </div>
            </div>
          )}

          {/* Additional fields */}
          {camposExtras.length > 0 && (
            <div className="space-y-3">
              <h3 className="pdf-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
                Informações Adicionais
              </h3>
              <div className="flex flex-col gap-3">
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

          {/* Proposed items */}
          <div className="space-y-3">
            <h3 className="pdf-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
              Itens & Serviços Propostos
            </h3>

            <div className="flex flex-col gap-3">
              {produtos.map((produto) => {
                const isSelected = !!selectedProdutos[produto.id];
                return (
                  <div
                    key={produto.id}
                    className={`pdf-prod-card p-4 ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      {/* Product image */}
                      {produto.mostrar_imagem && (produto.imagem_url || produto.imagens?.length > 0) && (
                        <div className="w-20 h-20 rounded-none border border-neutral-100 overflow-hidden flex-shrink-0 mx-auto sm:mx-0">
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
                              className="w-full h-full object-cover rounded-none"
                              fallbackClassName="w-full h-full rounded-none"
                            />
                          )}
                        </div>
                      )}

                      {/* Service info */}
                      <div className="flex-1 min-w-0" ref={produtos.indexOf(produto) === 0 ? firstProductRef : undefined}>
                        <h4 className="text-base font-semibold text-neutral-900 tracking-tight leading-snug">
                          {produto.nome}
                        </h4>
                        {produto.resumo && (
                          <p className="pdf-sans text-xs text-neutral-500 mt-1 leading-relaxed">
                            {produto.resumo}
                          </p>
                        )}
                        {!template?.ocultar_valores_intermediarios && (
                          <p className="text-sm font-semibold text-neutral-800 mt-1.5">
                            {formatCurrency(produto.valor)}
                          </p>
                        )}
                      </div>

                      {/* Quantity */}
                      <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded px-2 py-1 self-stretch sm:self-auto justify-between sm:justify-start">
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

          {props.upsellSection}

          {/* Payment conditions */}
          {formasPagamento.length > 0 && (
            <div className="space-y-3">
              <h3 className="pdf-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
                Condições de Faturamento
              </h3>
              {!selectedFormaPagamento && (
                <div style={{
                  marginBottom: 12, padding: '10px 12px', borderRadius: 6,
                  fontSize: 12, background: template?.forma_pagamento_obrigatoria ? '#fef2f2' : '#fffbeb',
                  color: template?.forma_pagamento_obrigatoria ? '#991b1b' : '#92400e',
                  border: `1px solid ${template?.forma_pagamento_obrigatoria ? '#fee2e2' : '#fef3c7'}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: "'Montserrat', sans-serif"
                }}>
                  <span>⚠️</span>
                  <span>
                    <strong>{template?.forma_pagamento_obrigatoria ? 'Escolha Obrigatória:' : 'Atenção:'}</strong> Selecione uma das opções abaixo para prosseguir.
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-2">
                {formasPagamento.map((forma) => {
                  const total = calculateTotal();
                  const valorEntrada = forma.entrada_tipo === 'percentual'
                    ? (total * forma.entrada_valor) / 100
                    : forma.entrada_valor;

                  return (
                    <label
                      key={forma.id}
                      className={`flex gap-3 items-start p-3 border rounded cursor-pointer transition-all ${
                        selectedFormaPagamento === forma.id
                          ? 'border-neutral-800 bg-neutral-50'
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
                        style={{ accentColor: '#1a1a1a' }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-neutral-800 text-xs">{forma.nome}</p>
                        <p className="pdf-sans text-[11px] text-neutral-500 mt-0.5 leading-normal">
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

              {/* Installments Simulation */}
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
                  <div className="p-3 bg-neutral-50 border border-neutral-200 rounded mt-2">
                    <p className="pdf-sans text-[10px] font-semibold text-neutral-700 mb-2 uppercase tracking-wider">
                      Simulação de Parcelamento
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-2.5 rounded border border-neutral-100">
                        <p className="pdf-sans text-[9px] text-neutral-400 uppercase tracking-wider">Sinal / Entrada</p>
                        <p className="text-sm font-bold text-neutral-800 mt-0.5">{formatCurrency(valorEntrada)}</p>
                      </div>

                      {forma.max_parcelas > 0 && saldoRestante > 0.01 && (
                        <div className="bg-white p-2.5 rounded border border-neutral-100">
                          <p className="pdf-sans text-[9px] text-neutral-400 uppercase tracking-wider">Parcelas mensais</p>
                          <p className="text-sm font-bold text-neutral-800 mt-0.5">
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
            className="border-y border-neutral-200 py-5 text-center my-6"
          >
            <p className="pdf-sans text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
              Investimento Total
            </p>
            <p className="text-3xl font-semibold text-neutral-900 tracking-tight">
              {formatCurrency(calculateTotal())}
            </p>
          </div>

          {/* 5. WhatsApp Button (Directly below the total/proposal) */}
          <div className="text-center pt-2">
            <button
              onClick={handleSubmit}
              type="button"
              disabled={!fieldsValidation.canUseWhatsApp}
              className="pdf-sans w-full py-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-md shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              style={{
                background: fieldsValidation.canUseWhatsApp
                  ? '#25D366'
                  : '#e2e8f0',
                border: 'none',
                color: fieldsValidation.canUseWhatsApp ? '#ffffff' : '#94a3b8',
                boxShadow: fieldsValidation.canUseWhatsApp ? '0 4px 14px rgba(37, 211, 102, 0.25)' : 'none',
              }}
            >
              {!fieldsValidation.canUseWhatsApp ? <Lock className="w-4 h-4" /> : <MessageCircle className="w-4.5 h-4.5 text-white fill-white" />}
              Negociar Orçamento no WhatsApp
            </button>
          </div>

          {/* 6. Review Button */}
          {profile && (
            <div className="pt-2">
              <RatePhotographerButton
                userId={template.user_id}
                templateId={template.id}
                profileName={profile.nome_profissional}
                aceitaAvaliacoes={profile.aceita_avaliacoes ?? true}
                aprovacaoAutomatica={profile.aprovacao_automatica_avaliacoes ?? false}
                theme={{
                  primaryColor: 'zinc',
                  buttonColor: 'bg-neutral-900 hover:bg-neutral-800 text-white font-medium tracking-widest text-xs uppercase py-4 rounded-md'
                }}
              />
            </div>
          )}
        </form>

        {/* 7. Large Footer Photo (borderless, vertical aspect ratio, at the bottom) */}
        <div className="w-full relative overflow-hidden rounded-none my-6" style={{ margin: '24px auto' }}>
          {template?.footer_image_url ? (
            <img
              src={template.footer_image_url}
              alt="Encerramento"
              className="w-full h-auto object-cover rounded-none aspect-[3/4]"
            />
          ) : (
            <div className="w-full aspect-[3/4] bg-neutral-50 flex flex-col items-center justify-center text-center p-8 border border-neutral-200 rounded-none">
              <Award className="w-12 h-12 text-neutral-300 mb-3" />
              <p className="text-xs pdf-sans uppercase tracking-[0.2em] text-neutral-400">AGRADECEMOS A PREFERÊNCIA</p>
              <p className="text-[10px] text-neutral-500 mt-2 pdf-sans">(Imagem de rodapé editável na aba Aparência)</p>
            </div>
          )}
        </div>

      </div>
      
      {/* 8. Minimalist Powered by PriceUs Branding Footer (hidden for premium accounts) */}
      {!isPremium && (
        <footer style={{ background: '#fafafa', padding: '24px', borderTop: '1px solid #e2e8f0', textAlign: 'center', marginTop: '32px' }}>
          <p className="pdf-sans" style={{ fontSize: 11, color: '#94a3b8' }}>
            Powered by{' '}
            <a href="https://priceus.com.br" target="_blank" rel="noopener noreferrer" style={{ color: '#1a1a1a', fontWeight: 600, textDecoration: 'none' }}>PriceUs</a>
          </p>
        </footer>
      )}
    </div>
  );
}
