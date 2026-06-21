import { Lock, MessageCircle, Instagram, Mail, Award } from 'lucide-react';
import { formatCurrency, formatDuration } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { QuoteHeaderRating } from '../QuoteHeaderRating';

interface QuotePdfElegante2Props {
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

export function QuotePdfElegante2(props: QuotePdfElegante2Props) {
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

  return (
    <div
      style={{
        fontFamily: "'Montserrat', sans-serif",
        background: '#ffffff',
        color: '#1a1a1a',
        minHeight: '100vh',
        padding: 0,
        margin: 0,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
        
        .pdf2-sans {
          font-family: 'Montserrat', sans-serif;
        }

        .pdf2-input {
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
        
        .pdf2-input:focus {
          border-color: #1a1a1a;
          box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.08);
          background: #ffffff;
        }

        .pdf2-prod-card {
          border: 1px solid #e2e8f0;
          transition: all 0.3s ease;
          border-radius: 8px;
          background: #ffffff;
        }

        .pdf2-prod-card.selected {
          border-color: #1a1a1a;
          background: #fafafa;
        }

        .pdf2-btn-qty {
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

        .pdf2-btn-qty:hover:not(:disabled) {
          border-color: #1a1a1a;
          color: #1a1a1a;
          background: #f1f5f9;
        }

        .pdf2-btn-qty:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      `}</style>

      {/* ===== COVER IMAGE — full-bleed, zero top margin/padding ===== */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          lineHeight: 0,
        }}
      >
        {template?.cover_image_url ? (
          <>
            {/* The cover photo */}
            <img
              src={template.cover_image_url}
              alt={template.titulo_template || 'Capa da proposta'}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                objectFit: 'cover',
                aspectRatio: '3/4',
                borderRadius: 0,
              }}
            />

            {/* Dark gradient overlay at the top to guarantee contrast */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
                pointerEvents: 'none',
              }}
            />

            {/* "PROPOSTA" label — in front of everything */}
            <div
              style={{
                position: 'absolute',
                top: 28,
                left: 28,
                zIndex: 10,
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#ffffff',
                textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                lineHeight: 1,
              }}
            >
              PROPOSTA
            </div>
          </>
        ) : (
          /* Placeholder when no cover image is configured */
          <div
            style={{
              width: '100%',
              aspectRatio: '3/4',
              background: '#0f0f0f',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 32,
              position: 'relative',
            }}
          >
            <Award style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.25)', marginBottom: 12 }} />
            {/* "PROPOSTA" always visible on placeholder too */}
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.25em',
                textTransform: 'uppercase',
                color: '#ffffff',
                margin: 0,
              }}
            >
              PROPOSTA
            </p>
            <p
              style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                marginTop: 8,
              }}
            >
              (Imagem de capa editável na aba Aparência)
            </p>
          </div>
        )}
      </div>

      {/* ===== Rest of the proposal — padded content column ===== */}
      <div className="max-w-xl mx-auto px-4 py-8 space-y-8">

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
              <p className="pdf2-sans text-xs text-neutral-500 uppercase tracking-widest mt-1">
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
            <div className="flex gap-4 mt-4 pdf2-sans justify-center">
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
          </div>
        )}

        {/* 3. Proposal Title */}
        <div className="text-center">
          <h1 className="pdf2-sans font-medium text-neutral-800 text-lg tracking-normal">
            {template?.titulo_template || template?.nome_template}
          </h1>
          <p className="pdf2-sans text-xs text-neutral-500 mt-1">
            Orçamento personalizado elaborado exclusivamente para você.
          </p>
        </div>

        {/* 4. Proposal Body */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Client Identification */}
          <div className="space-y-3">
            <h3 className="pdf2-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
              Identificação do Cliente
            </h3>
            
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Nome Completo *"
                  value={formData.nome_cliente}
                  onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })}
                  className="pdf2-input"
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
                    className="pdf2-input"
                    style={fieldErrors?.email ? { borderColor: "#ef4444" } : {}}
                    required
                  />
                  {fieldErrors?.email && <p className="pdf2-sans text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="WhatsApp (Ex: 11999999999) *"
                    value={formData.telefone_cliente}
                    onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })}
                    className="pdf2-input"
                    style={fieldErrors?.telefone ? { borderColor: "#ef4444" } : {}}
                    required
                  />
                  {fieldErrors?.telefone && <p className="pdf2-sans text-xs text-red-500 mt-1">{fieldErrors.telefone}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Event specs */}
          {props.renderLocationDateFields && (
            <div className="space-y-3">
              <h3 className="pdf2-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
                Especificações do Evento / Projeto
              </h3>
              <div className="pdf2-sans text-sm text-neutral-700">
                {props.renderLocationDateFields()}
              </div>
            </div>
          )}

          {/* Additional fields */}
          {camposExtras.length > 0 && (
            <div className="space-y-3">
              <h3 className="pdf2-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
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
                      className="pdf2-input"
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
                      className="pdf2-input"
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Proposed items */}
          <div className="space-y-3">
            <h3 className="pdf2-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
              Itens &amp; Serviços Propostos
            </h3>

            <div className="flex flex-col gap-3">
              {produtos.map((produto) => {
                const isSelected = !!selectedProdutos[produto.id];
                const isHighlighted = produto.destacar_produto === true;
                return (
                  <div
                    key={produto.id}
                    className={`pdf2-prod-card p-4 transition-all relative ${
                      isHighlighted
                        ? 'border-amber-400 bg-amber-50/10 shadow-[0_8px_20px_rgba(245,158,11,0.08)] ring-1 ring-amber-400/20'
                        : isSelected
                        ? 'selected'
                        : ''
                    }`}
                  >
                    <div className={`flex flex-col gap-4 ${template?.layout_produtos_desktop === 'quadro' ? 'sm:items-center' : 'sm:flex-row sm:items-start'}`}>
                      {/* Product image */}
                      {produto.mostrar_imagem && (produto.imagem_url || produto.imagens?.length > 0) && (
                        (() => {
                          const sizeClasses = {
                            pequeno: 'w-24 h-24 sm:w-32 sm:h-32',
                            medio: 'w-32 h-32 sm:w-48 sm:h-48',
                            grande: 'w-full h-48 sm:w-72 sm:h-72',
                          };
                          const imageSize = template?.tamanho_imagem_grid || 'medio';
                          const finalClass = sizeClasses[imageSize as keyof typeof sizeClasses] || sizeClasses.medio;
                          return (
                            <div className={`rounded-none border border-neutral-100 overflow-hidden flex-shrink-0 mx-auto sm:mx-0 ${finalClass}`}>
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
                          );
                        })()
                      )}

                      {/* Service info */}
                      <div className="flex-1 min-w-0" ref={produtos.indexOf(produto) === 0 ? firstProductRef : undefined}>
                        {isHighlighted && produto.destaque_texto && (
                          <div className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded px-2 py-0.5 text-[9px] font-black tracking-wider uppercase mb-1.5 shadow-sm pdf2-sans">
                            ⭐ {produto.destaque_texto}
                          </div>
                        )}
                        <h4 className="text-base font-semibold text-neutral-900 tracking-tight leading-snug flex items-center flex-wrap gap-2">
                          <span>{produto.nome}</span>
                          {template?.exibir_duracao_produto && produto.duracao_minutos && produto.duracao_minutos > 0 && (
                            <span className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 text-[10px] font-normal px-2 py-0.5 rounded border border-neutral-200">
                              ⏱️ {formatDuration(produto.duracao_minutos)}
                            </span>
                          )}
                        </h4>
                        {produto.resumo && (
                          <p className="pdf2-sans text-xs text-neutral-500 mt-1 leading-relaxed">
                            {produto.resumo}
                          </p>
                        )}
                        {!template?.ocultar_valores_intermediarios && (() => {
                          const desconto = produto.desconto_percentual ?? 0;
                          const valorFinal = produto.valor * (1 - desconto / 100);
                          return (
                            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                              {desconto > 0 && (
                                <span className="bg-green-50 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-green-200 pdf2-sans">
                                  🏷️ {desconto}% OFF
                                </span>
                              )}
                              <div className="flex items-center gap-2">
                                {desconto > 0 && (
                                  <span className="text-xs text-neutral-400 line-through">{formatCurrency(produto.valor)}</span>
                                )}
                                <span className="text-sm font-semibold text-neutral-800">{formatCurrency(valorFinal)}</span>
                              </div>
                              {desconto > 0 && (
                                <span className="text-[10px] text-green-600 font-semibold pdf2-sans">Economia de {formatCurrency(produto.valor - valorFinal)}</span>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Quantity */}
                      {(produto.permite_multiplas_unidades ?? true) ? (
                        <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded px-2 py-1 self-stretch sm:self-auto justify-between sm:justify-start">
                          <button
                            type="button"
                            className="pdf2-btn-qty"
                            onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)}
                            disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}
                          >
                            −
                          </button>
                          <span className="pdf2-sans font-semibold text-neutral-800 text-sm min-w-6 text-center">
                            {selectedProdutos[produto.id] || 0}
                          </span>
                          <button
                            type="button"
                            className="pdf2-btn-qty"
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
                      ) : (
                        <div className="flex items-center">
                          {produto.obrigatorio ? (
                            <div className="py-1 px-3 bg-neutral-100 text-neutral-500 rounded border border-neutral-200 text-xs font-semibold pdf2-sans">
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
                              className={`py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider transition-all pdf2-sans ${
                                selectedProdutos[produto.id]
                                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-300'
                              }`}
                            >
                              {selectedProdutos[produto.id] ? '✓ Selecionado' : 'Selecionar'}
                            </button>
                          )}
                        </div>
                      )}
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
              <h3 className="pdf2-sans text-xs font-bold uppercase tracking-wider text-neutral-700 border-b border-neutral-100 pb-1.5">
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

                  const isDefault = forma.is_default === true;

                  return (
                    <label
                      key={forma.id}
                      className={`flex gap-3 items-start p-3 border rounded cursor-pointer transition-all ${
                        selectedFormaPagamento === forma.id
                          ? 'border-neutral-800 bg-neutral-50'
                          : isDefault
                          ? 'border-amber-400 bg-amber-50/15 shadow-[0_4px_12px_rgba(245,158,11,0.06)]'
                          : 'border-neutral-200 bg-neutral-50/40 hover:bg-neutral-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="pdf2-forma-pagamento"
                        value={forma.id}
                        checked={selectedFormaPagamento === forma.id}
                        onChange={() => setSelectedFormaPagamento?.(forma.id)}
                        className="mt-1"
                        style={{ accentColor: '#1a1a1a' }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-neutral-800 text-xs">{forma.nome}</p>
                          {isDefault && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded border border-amber-200 uppercase tracking-wider pdf2-sans">
                              ⭐ Recomendado
                            </span>
                          )}
                        </div>
                        <p className="pdf2-sans text-[11px] text-neutral-500 mt-0.5 leading-normal">
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
                    <p className="pdf2-sans text-[10px] font-semibold text-neutral-700 mb-2 uppercase tracking-wider">
                      Simulação de Parcelamento
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-2.5 rounded border border-neutral-100">
                        <p className="pdf2-sans text-[9px] text-neutral-400 uppercase tracking-wider">Sinal / Entrada</p>
                        <p className="text-sm font-bold text-neutral-800 mt-0.5">{formatCurrency(valorEntrada)}</p>
                      </div>

                      {forma.max_parcelas > 0 && saldoRestante > 0.01 && (
                        <div className="bg-white p-2.5 rounded border border-neutral-100">
                          <p className="pdf2-sans text-[9px] text-neutral-400 uppercase tracking-wider">Parcelas mensais</p>
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
            id="pdf2-total"
            ref={totalSectionRef}
            className="border-y border-neutral-200 py-5 text-center my-6"
          >
            <p className="pdf2-sans text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">
              Investimento Total
            </p>
            <p className="text-3xl font-semibold text-neutral-900 tracking-tight">
              {formatCurrency(calculateTotal())}
            </p>
          </div>

          {/* WhatsApp Button */}
          <div className="text-center pt-2">
            <button
              onClick={handleSubmit}
              type="button"
              disabled={!fieldsValidation.canUseWhatsApp}
              className="pdf2-sans w-full py-4 text-xs font-bold uppercase tracking-widest transition-all duration-300 rounded-md shadow-sm flex items-center justify-center gap-2 cursor-pointer"
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

          {/* Review Button removido */}
        </form>

        {/* Footer Photo */}
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
              <p className="text-xs pdf2-sans uppercase tracking-[0.2em] text-neutral-400">AGRADECEMOS A PREFERÊNCIA</p>
              <p className="text-[10px] text-neutral-500 mt-2 pdf2-sans">(Imagem de rodapé editável na aba Aparência)</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
