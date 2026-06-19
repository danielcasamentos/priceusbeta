import { Send, Lock, MapPin, Sparkles, MessageCircle, Instagram, Mail, Star } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { ImageWithFallback } from '../ImageWithFallback';
import { ProductGalleryCarousel } from '../ui/ProductGalleryCarousel';
import { RatePhotographerButton } from '../RatePhotographerButton';
import { QuoteHeaderRating } from '../QuoteHeaderRating';
import { PortfolioSection } from '../PortfolioSection';

interface QuoteRevellonProps {
  template: any; profile: any; produtos: any[]; selectedProdutos: Record<string, number>; formData: any;
  calculateTotal: () => number; handleProdutoQuantityChange: (id: string, qty: number) => void;
  handleSubmit: (e: React.FormEvent) => void; setFormData: (data: any) => void; fieldsValidation: any;
  camposExtras: any[]; camposExtrasData: Record<string, string>; setCamposExtrasData: (data: any) => void;
  renderLocationDateFields?: () => React.ReactNode;
  formasPagamento?: any[]; selectedFormaPagamento?: string; setSelectedFormaPagamento?: (id: string) => void;
  firstProductRef?: React.RefObject<HTMLDivElement>; totalSectionRef?: React.RefObject<HTMLDivElement>;
  breakdown?: any; fieldErrors?: { email?: string; telefone?: string };
  upsellSection?: React.ReactNode;
}

export function QuoteRevellon(props: QuoteRevellonProps) {
  const { template, profile, produtos, selectedProdutos, formData, calculateTotal, handleSubmit, fieldsValidation, camposExtras, camposExtrasData, fieldErrors, formasPagamento = [], selectedFormaPagamento = '', setSelectedFormaPagamento, firstProductRef, totalSectionRef } = props;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#03030f', color: '#fff', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes rvIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes rvGlow { 0%,100% { box-shadow:0 0 20px rgba(245,158,11,.2); } 50% { box-shadow:0 0 60px rgba(245,158,11,.5); } }
        @keyframes rvStar { 0%,100% { opacity:0.2; transform:scale(.8); } 50% { opacity:1; transform:scale(1.1); } }
        @keyframes rvConfetti { 0% { transform: translateY(0) rotate(0); opacity:1; } 100% { transform: translateY(100px) rotate(720deg); opacity:0; } }
        .rv-in { animation: rvIn .55s ease both; }
        .rv-in-1 { animation: rvIn .55s ease .1s both; }
        .rv-in-2 { animation: rvIn .55s ease .2s both; }
        .rv-in-3 { animation: rvIn .55s ease .3s both; }
        .rv-card { transition: transform .25s ease, box-shadow .25s ease; }
        .rv-card:hover { transform: translateY(-3px); box-shadow: 0 16px 48px rgba(0,0,0,.5), 0 0 0 1px rgba(245,158,11,.15); }
        .rv-prod { transition: border-color .2s, background .2s; }
        .rv-prod.selected { border-color: rgba(245,158,11,.5) !important; background: rgba(245,158,11,.06) !important; }
        .rv-input { background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; color: #fff; padding: 12px 16px; width: 100%; font-size: 15px; outline: none; transition: border-color .2s; }
        .rv-input::placeholder { color: rgba(255,255,255,.35); }
        .rv-input:focus { border-color: rgba(245,158,11,.5); box-shadow: 0 0 0 3px rgba(245,158,11,.1); }
        .rv-qty-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); color: #fff; font-size: 18px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; }
        .rv-qty-btn:hover:not(:disabled) { background: rgba(245,158,11,.15); border-color: rgba(245,158,11,.3); }
        .rv-qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .star-deco { position: absolute; animation: rvStar ease-in-out infinite; pointer-events: none; }
      `}</style>

      {/* NAV */}
      <nav style={{ background: 'rgba(3,3,15,.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(245,158,11,.12)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ fontSize: 18 }}>🥂</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Proposta Especial de Réveillon</div>
        <div style={{ fontSize: 18 }}>🎆</div>
      </nav>

      {/* BANNER */}
      <div style={{ background: 'linear-gradient(135deg, #78350f, #b45309, #92400e)', padding: '10px 24px', textAlign: 'center', fontSize: 13, fontWeight: 700, letterSpacing: '1px' }}>
        ✨ Réveillon Special — Eternize a virada mais especial da sua vida! 🎆
      </div>

      {/* HERO */}
      {profile && (
        <section className="rv-in" style={{ padding: '60px 24px 48px', background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,.10), transparent 55%), #03030f', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(245,158,11,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(245,158,11,.03) 1px,transparent 1px)', backgroundSize: '64px 64px', zIndex: 0 }} />
          {['✦','⭐','✧','💫','✦','⭐'].map((s, i) => (
            <span key={i} className="star-deco" style={{ left: `${5 + i * 18}%`, top: `${15 + (i % 3) * 25}%`, fontSize: `${10 + (i % 3) * 6}px`, animationDuration: `${2 + i * .5}s`, animationDelay: `${i * .4}s` }}>{s}</span>
          ))}
          <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
            {profile.profile_image_url && (
              <div style={{ marginBottom: 20, display: 'inline-block', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', background: 'conic-gradient(from 0deg, #f59e0b, #fbbf24, #e2e8f0, #f59e0b)', opacity: 0.5, filter: 'blur(8px)', animation: 'rvGlow 3s ease infinite' }} />
                <img src={profile.profile_image_url} alt={profile.nome_profissional} style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(245,158,11,.7)', position: 'relative', display: 'block' }} />
                <div style={{ position: 'absolute', bottom: -4, right: -4, background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🥂</div>
              </div>
            )}
            <h1 className="rv-in-1" style={{ fontSize: 'clamp(24px,5vw,42px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 6, lineHeight: 1.1 }}>{profile.nome_profissional}</h1>
            {profile.tipo_fotografia && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.3)', borderRadius: 999, padding: '4px 14px', marginBottom: 16, fontSize: 12, fontWeight: 700, color: '#fbbf24', letterSpacing: '1px', textTransform: 'uppercase' }}>
                <MapPin size={12} /> {profile.tipo_fotografia}
              </div>
            )}
            {profile.apresentacao && <p className="rv-in-2" style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 24px' }}>{profile.apresentacao}</p>}
            <div style={{ marginBottom: 20 }}><QuoteHeaderRating userId={template.user_id} ratingMinimo={profile.rating_minimo_exibicao || 1} exibirAvaliacoes={profile.exibir_avaliacoes_publico ?? true} /></div>
            <div className="rv-in-3" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {profile.whatsapp_principal && <a href={`https://wa.me/${profile.whatsapp_principal.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#16a34a,#22c55e)', color: '#fff', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}><MessageCircle size={14} /> WhatsApp</a>}
              {profile.instagram && <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#e1306c,#f77737)', color: '#fff', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}><Instagram size={14} /> Instagram</a>}
              {profile.email_recebimento && <a href={`mailto:${profile.email_recebimento}`} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}><Mail size={14} /> E-mail</a>}
            </div>
            <PortfolioSection
              portfolioLink={profile.portfolio_link}
              portfolioFotos={profile.portfolio_fotos}
              isDark={true}
            />
          </div>
        </section>
      )}

      {/* FORM */}
      <section style={{ padding: '0 24px 80px', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', padding: '48px 0 32px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', color: '#fbbf24', textTransform: 'uppercase', marginBottom: 10 }}>
            <Star size={12} style={{ display: 'inline', marginRight: 6 }} /> Réveillon Special
          </div>
          <h2 style={{ fontSize: 'clamp(22px,4vw,36px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1 }}>{template?.titulo_template || template?.nome_template}</h2>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="rv-card" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,158,11,.1)', borderRadius: 16, padding: '24px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>🥂 Seus Dados</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12 }}>
              <input id="rv-nome" type="text" placeholder="Nome Completo *" value={formData.nome_cliente} onChange={(e) => props.setFormData({ ...formData, nome_cliente: e.target.value })} className="rv-input" required />
              <div>
                <input id="email-cliente" type="email" placeholder="E-mail *" value={formData.email_cliente} onChange={(e) => props.setFormData({ ...formData, email_cliente: e.target.value })} className="rv-input" style={fieldErrors?.email ? { borderColor: '#ef4444' } : {}} required />
                {fieldErrors?.email && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>{fieldErrors.email}</p>}
              </div>
              <div>
                <input id="telefone-cliente" type="tel" placeholder="WhatsApp (Ex: 11999999999) *" value={formData.telefone_cliente} onChange={(e) => props.setFormData({ ...formData, telefone_cliente: e.target.value })} className="rv-input" style={fieldErrors?.telefone ? { borderColor: '#ef4444' } : {}} required />
                {fieldErrors?.telefone && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px', fontWeight: 600 }}>{fieldErrors.telefone}</p>}
              </div>
            </div>
          </div>

          {props.renderLocationDateFields && (
            <div className="rv-card" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,158,11,.1)', borderRadius: 16, padding: '24px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>📅 Evento</h3>
              <div style={{ color: 'rgba(255,255,255,.85)' }}>{props.renderLocationDateFields()}</div>
            </div>
          )}

          {camposExtras.length > 0 && (
            <div className="rv-card" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,158,11,.1)', borderRadius: 16, padding: '24px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>Informações Adicionais</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {camposExtras.map((campo) => campo.tipo === 'textarea' ? (
                  <textarea key={campo.id} placeholder={campo.placeholder} value={camposExtrasData[campo.id] || ''} onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })} required={campo.obrigatorio} rows={3} className="rv-input" style={{ resize: 'none' }} />
                ) : (
                  <input key={campo.id} type={campo.tipo} placeholder={`${campo.label}${campo.obrigatorio ? ' *' : ''}`} value={camposExtrasData[campo.id] || ''} onChange={(e) => props.setCamposExtrasData({ ...camposExtrasData, [campo.id]: e.target.value })} required={campo.obrigatorio} className="rv-input" />
                ))}
              </div>
            </div>
          )}

          <div className="rv-card" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,158,11,.1)', borderRadius: 16, padding: '24px' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 20 }}>
              <Sparkles size={13} style={{ display: 'inline', marginRight: 6 }} /> Pacotes de Réveillon
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {produtos.map((produto) => {
                const isSelected = !!selectedProdutos[produto.id];
                return (
                  <div
                    key={produto.id}
                    className={`rv-prod${isSelected ? ' selected' : ''}`}
                    style={{
                      border: produto.destacar_produto ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,.09)',
                      borderRadius: 12,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      ...(produto.destacar_produto
                        ? {
                            boxShadow: '0 8px 30px rgba(245,158,11,0.3)',
                            background: 'rgba(245,158,11,0.06)',
                            transform: 'scale(1.01)',
                            position: 'relative' as const,
                          }
                        : {}),
                    }}
                  >
                    <div ref={produtos.indexOf(produto) === 0 ? firstProductRef : undefined} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      {produto.mostrar_imagem && (produto.imagem_url || produto.imagens?.length > 0) && (
                        <div style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
                          {produto.imagens?.length > 0 ? <ProductGalleryCarousel images={[produto.imagem_url, ...produto.imagens].filter(Boolean)} autoPlay={produto.carrossel_automatico} productName={produto.nome} /> : <ImageWithFallback src={produto.imagem_url} alt={produto.nome} className="w-full h-full object-cover" fallbackClassName="w-full h-full" />}
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {produto.destacar_produto && produto.destaque_texto && (
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                            borderRadius: 999,
                            padding: '2px 10px',
                            marginBottom: 6,
                            fontSize: 10,
                            fontWeight: 900,
                            color: '#03030f',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            boxShadow: '0 2px 10px rgba(245,158,11,.3)',
                          }}>
                            ✨ {produto.destaque_texto}
                          </div>
                        )}
                        <h4 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 2, wordBreak: 'break-word' }}>{produto.nome}</h4>
                        {produto.resumo && <p style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', lineHeight: 1.5 }}>{produto.resumo}</p>}
                        {!template?.ocultar_valores_intermediarios && <p style={{ fontSize: 17, fontWeight: 800, color: '#fbbf24', marginTop: 4 }}>{formatCurrency(produto.valor)}</p>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,.04)', borderRadius: 10, padding: '10px 14px' }}>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,.45)', fontWeight: 500 }}>{isSelected ? `${selectedProdutos[produto.id]}x selecionado${selectedProdutos[produto.id] > 1 ? 's' : ''}` : 'Não selecionado'}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button type="button" className="rv-qty-btn" onClick={() => props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) - 1)} disabled={produto.obrigatorio && selectedProdutos[produto.id] === 1}>−</button>
                        <span style={{ width: 28, textAlign: 'center', fontWeight: 800, fontSize: 17 }}>{selectedProdutos[produto.id] || 0}</span>
                        <button type="button" className="rv-qty-btn" onClick={() => { if (!produto.obrigatorio && !fieldsValidation.canAddProducts) { alert(fieldsValidation.validationMessage); return; } props.handleProdutoQuantityChange(produto.id, (selectedProdutos[produto.id] || 0) + 1); }} disabled={!produto.obrigatorio && !fieldsValidation.canAddProducts}>+</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {props.upsellSection}

          {formasPagamento.length > 0 && (
            <div className="rv-card" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(245,158,11,.1)', borderRadius: 16, padding: '24px' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>💳 Forma de Pagamento</h3>
              {!selectedFormaPagamento && (
                <div style={{
                  marginBottom: 16, padding: '12px 16px', borderRadius: 10,
                  fontSize: 13, background: template?.forma_pagamento_obrigatoria ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.06)',
                  color: template?.forma_pagamento_obrigatoria ? '#fca5a5' : '#fde047',
                  border: `1.5px solid ${template?.forma_pagamento_obrigatoria ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.2)'}`,
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span>⚠️</span>
                  <span>
                    <strong>{template?.forma_pagamento_obrigatoria ? 'Escolha Obrigatória:' : 'Atenção:'}</strong> Selecione uma das opções abaixo para prosseguir.
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {formasPagamento.map((forma) => {
                  const total = calculateTotal();
                  const valorEntrada = forma.entrada_tipo === 'percentual' ? (total * forma.entrada_valor) / 100 : forma.entrada_valor;
                  return (
                    <label key={forma.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', borderRadius: 12, border: selectedFormaPagamento === forma.id ? '1px solid rgba(245,158,11,.5)' : '1px solid rgba(255,255,255,.08)', background: selectedFormaPagamento === forma.id ? 'rgba(245,158,11,.07)' : 'rgba(255,255,255,.02)', cursor: 'pointer', transition: 'all .2s' }}>
                      <input type="radio" name="rv-forma-pagamento" value={forma.id} checked={selectedFormaPagamento === forma.id} onChange={() => setSelectedFormaPagamento?.(forma.id)} style={{ marginTop: 3, accentColor: '#fbbf24', width: 16, height: 16, flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 4 }}>{forma.nome}</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
                          <div>{forma.entrada_tipo === 'percentual' ? `Entrada de ${forma.entrada_valor}% (${formatCurrency(valorEntrada)})` : `Entrada de ${formatCurrency(valorEntrada)}`}</div>
                          {forma.max_parcelas > 0 && <div>+ {forma.max_parcelas}x parcela{forma.max_parcelas > 1 ? 's' : ''}</div>}
                          {forma.acrescimo > 0 && <div style={{ color: '#fb923c' }}>(+{forma.acrescimo}% acréscimo)</div>}
                          {forma.acrescimo < 0 && <div style={{ color: '#4ade80' }}>({forma.acrescimo}% desconto)</div>}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div id="rv-total" ref={totalSectionRef} style={{ background: 'linear-gradient(135deg, rgba(245,158,11,.1), rgba(226,232,240,.05))', border: '1px solid rgba(245,158,11,.3)', borderRadius: 16, padding: '24px', textAlign: 'center', animation: 'rvGlow 3s ease infinite' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(251,191,36,.8)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 8 }}>🥂 Investimento Total para o Réveillon</p>
            <p style={{ fontSize: 'clamp(32px,6vw,52px)', fontWeight: 900, background: 'linear-gradient(135deg,#f59e0b,#e2e8f0)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px', lineHeight: 1 }}>{formatCurrency(calculateTotal())}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 8 }}>🎆 Reserve agora e comece o ano novo com memórias inesquecíveis!</p>
          </div>

          <button type="submit" disabled={!fieldsValidation.canUseWhatsApp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: fieldsValidation.canUseWhatsApp ? 'linear-gradient(135deg,#b45309,#f59e0b,#fbbf24)' : 'rgba(255,255,255,.1)', border: 'none', color: '#000', padding: '16px 32px', borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: fieldsValidation.canUseWhatsApp ? 'pointer' : 'not-allowed', boxShadow: fieldsValidation.canUseWhatsApp ? '0 4px 24px rgba(245,158,11,.4)' : 'none', transition: 'all .2s', opacity: fieldsValidation.canUseWhatsApp ? 1 : 0.5 }}>
            {!fieldsValidation.canUseWhatsApp ? <Lock size={20} style={{ color: '#fff' }} /> : <Send size={20} />}
            🎆 Enviar Proposta de Réveillon via WhatsApp
          </button>
        </form>
      </section>

      {profile && (
        <div style={{ padding: '0 24px 32px', maxWidth: 760, margin: '0 auto' }}>
          <RatePhotographerButton
            userId={template.user_id}
            templateId={template.id}
            profileName={profile.nome_profissional}
            aceitaAvaliacoes={profile.aceita_avaliacoes ?? true}
            aprovacaoAutomatica={profile.aprovacao_automatica_avaliacoes ?? false}
            theme={{
              primaryColor: 'amber',
              buttonColor: 'bg-amber-600 hover:bg-amber-700 text-white'
            }}
          />
        </div>
      )}
      {!(profile?.status_assinatura === 'active') && (
        <footer style={{ background: '#010108', padding: '28px 24px', borderTop: '1px solid rgba(245,158,11,.08)', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,.25)' }}>Powered by <a href="https://priceus.com.br" target="_blank" rel="noopener noreferrer" style={{ color: '#fbbf24', fontWeight: 700, textDecoration: 'none' }}>PriceUs</a></p>
        </footer>
      )}
    </div>
  );
}
