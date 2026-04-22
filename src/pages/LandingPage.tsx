import { useState, useEffect, useRef } from 'react';
import { Check, ArrowRight, Menu, X, Sparkles, Shield, Globe, Smartphone, Play, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AppInstallBanner } from '../components/AppInstallBanner';

/* ─── tiny hook: count up number ─── */
function useCountUp(target: number, duration = 2000, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start = 0;
    const step = target / (duration / 16);
    const t = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(Math.floor(start));
      if (start >= target) clearInterval(t);
    }, 16);
    return () => clearInterval(t);
  }, [active, target, duration]);
  return val;
}

/* ─── intersection observer hook ─── */
function useInView(ref: React.RefObject<Element>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Demo 1 — Mobile Dashboard screens
  const [dashScreen, setDashScreen] = useState(0);
  const [dashPlaying, setDashPlaying] = useState(true);
  const dashRef = useRef<HTMLDivElement>(null!);
  const dashInView = useInView(dashRef);
  useEffect(() => {
    if (!dashInView || !dashPlaying) return;
    const t = setInterval(() => setDashScreen(s => (s + 1) % 4), 5000);
    return () => clearInterval(t);
  }, [dashInView, dashPlaying]);

  // Demo 3 — Journey steps
  const journeyRef = useRef<HTMLDivElement>(null!);
  const journeyInView = useInView(journeyRef);
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  useEffect(() => {
    if (!journeyInView) return;
    [0,1,2,3,4].forEach(i => setTimeout(() => setVisibleSteps(p => [...p, i]), 300 + i * 550));
  }, [journeyInView]);

  // Demo 4 — ROI counters
  const roiRef = useRef<HTMLDivElement>(null!);
  const roiInView = useInView(roiRef);
  const receita = useCountUp(89400, 2200, roiInView);
  const leads   = useCountUp(47, 1800, roiInView);
  const conv    = useCountUp(89, 1800, roiInView);
  const horas   = useCountUp(15, 1600, roiInView);

  const dashScreens = [
    { label: 'Dashboard', title: 'Visão geral do negócio', desc: 'Receita, leads, templates e contratos — tudo na tela inicial.' },
    { label: 'Gestão de Leads', title: 'Qualifique seus leads', desc: 'Filtre, veja valores e envie follow-up pro WhatsApp com 1 clique.' },
    { label: 'Analytics', title: 'Saiba o que funciona', desc: 'Visualizações, conversão e evolução mês a mês.' },
    { label: 'Notificações', title: 'Sempre informado', desc: 'Pagamentos, novos leads e contratos em tempo real.' },
  ];

  const journeySteps = [
    { emoji: '📲', color: '#818cf8', bg: 'rgba(99,102,241,.12)', border: 'rgba(99,102,241,.3)', title: 'Cliente encontra você no Instagram', desc: 'Ela viu seus fotos, clicou no link da bio e chegou ao seu perfil profissional no PriceUs.' },
    { emoji: '🛒', color: '#fbbf24', bg: 'rgba(251,191,36,.1)', border: 'rgba(251,191,36,.3)', title: 'Monta o próprio orçamento', desc: 'Escolhe os serviços, vê o total calculado automaticamente. Sem precisar de você.' },
    { emoji: '🎯', color: '#22c55e', bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.3)', title: 'Lead chega via WhatsApp', desc: 'Você recebe nome, serviço, valor e data do evento — tudo organizado no painel de leads.' },
    { emoji: '✍️', color: '#60a5fa', bg: 'rgba(96,165,250,.1)', border: 'rgba(96,165,250,.3)', title: 'Contrato digital gerado', desc: 'Com 1 clique o contrato sai do lead. Cliente assina no celular. Seguro juridicamente.' },
    { emoji: '💰', color: '#22c55e', bg: 'rgba(34,197,94,.15)', border: 'rgba(34,197,94,.4)', title: 'Dinheiro na conta! 🎉', desc: 'Entrada recebida. Evento confirmado. Financeiro atualizado automaticamente.' },
  ];

  const planFeatures = [
    'Orçamentos ilimitados',
    'Contratos digitais com assinatura eletrônica',
    'Agenda sincronizada + Google Calendar',
    'Sistema de avaliações e reviews públicos',
    'Templates WhatsApp personalizáveis',
    'Preços sazonais e geográficos',
    'Upload de imagens e portfólio',
    'Gestão completa de leads',
    'Dashboard financeiro completo',
    'Analytics e relatórios avançados',
    'Exportação fiscal CSV/PDF',
    'Cupons de desconto',
    'Suporte prioritário em português',
    'Atualizações gratuitas',
    'Cancele quando quiser',
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#07101f', color: '#fff', minHeight: '100vh' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --g: #16a34a; --gl: #22c55e; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(24px); } to { opacity:1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { transform:scale(1); } 50% { transform:scale(1.04); } }
        @keyframes barGrow { from { transform:scaleY(0); } to { transform:scaleY(1); } }
        @keyframes notifIn { from { opacity:0; transform:translateX(60px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes glow { 0%,100% { box-shadow:0 0 20px rgba(34,197,94,.3); } 50% { box-shadow:0 0 40px rgba(34,197,94,.55); } }
        @keyframes moneyBounce { 0%,100% { transform:rotate(-5deg) scale(1); } 50% { transform:rotate(5deg) scale(1.1); } }
        @keyframes shine { 0% { left:-100%; } 100% { left:200%; } }
        .hero-btn { animation: pulse 2.5s ease infinite; }
        .glow-green { animation: glow 3s ease infinite; }
        .a1 { animation: fadeUp .6s ease .1s both; }
        .a2 { animation: fadeUp .6s ease .25s both; }
        .a3 { animation: fadeUp .6s ease .4s both; }
        .a4 { animation: fadeUp .6s ease .55s both; }
        .phone-screen { transition: opacity .5s ease, transform .5s ease; }
        .step-card { transition: opacity .5s ease, transform .5s ease; }
        .bar { transform-origin: bottom; }
      `}</style>

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, width:'100%', zIndex:100, background:'rgba(7,16,31,.95)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
        <AppInstallBanner variant="topbar" />
        <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', display:'flex', justifyContent:'space-between', alignItems:'center', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src="/Logo Price Us.png" alt="PriceUs" style={{ height:34, width:'auto' }} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:32 }} className="hidden-mobile">
            {['#sistema','#jornada','#roi','#planos'].map((href, i) => (
              <a key={i} href={href} style={{ color:'rgba(255,255,255,.7)', fontSize:14, fontWeight:500, textDecoration:'none', transition:'color .2s' }}
                onMouseEnter={e => (e.currentTarget.style.color='#22c55e')}
                onMouseLeave={e => (e.currentTarget.style.color='rgba(255,255,255,.7)')}>
                {['Sistema','Jornada','ROI','Planos'][i]}
              </a>
            ))}
            <button onClick={() => navigate('/login')} style={{ background:'transparent', border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'8px 20px', borderRadius:8, fontSize:14, fontWeight:600, cursor:'pointer' }}>
              Login
            </button>
            <button onClick={() => navigate('/login')} className="hero-btn" style={{ background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'none', color:'#fff', padding:'10px 22px', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 20px rgba(22,163,74,.4)' }}>
              Começar Grátis
            </button>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ display:'none', background:'transparent', border:'none', color:'#fff', cursor:'pointer' }} className="show-mobile">
            {mobileMenuOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
        </div>
        {mobileMenuOpen && (
          <div style={{ background:'rgba(7,16,31,.98)', padding:'16px 24px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
            {['Sistema','Jornada','ROI','Planos'].map((label, i) => (
              <a key={i} href={['#sistema','#jornada','#roi','#planos'][i]} onClick={() => setMobileMenuOpen(false)}
                style={{ display:'block', padding:'10px 0', color:'rgba(255,255,255,.8)', fontSize:15, textDecoration:'none', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                {label}
              </a>
            ))}
            <button onClick={() => navigate('/login')} style={{ width:'100%', marginTop:16, background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'none', color:'#fff', padding:'12px', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' }}>
              Começar Grátis — 7 dias
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'120px 24px 80px', position:'relative', overflow:'hidden', background:'radial-gradient(ellipse 80% 60% at 50% 0%,rgba(22,163,74,.15),transparent 60%),radial-gradient(ellipse 60% 40% at 90% 80%,rgba(99,102,241,.08),transparent 55%),#07101f', textAlign:'center' }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)', backgroundSize:'64px 64px', zIndex:0 }} />
        <div style={{ position:'relative', zIndex:1, maxWidth:860 }}>
          <div className="a1" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(34,197,94,.12)', border:'1px solid rgba(34,197,94,.3)', borderRadius:999, padding:'6px 18px', marginBottom:24, fontSize:12, fontWeight:700, color:'#22c55e', letterSpacing:'1px', textTransform:'uppercase' }}>
            <Sparkles size={14}/> Plataforma All-in-One para Fotógrafos
          </div>
          <h1 className="a2" style={{ fontSize:'clamp(36px,6vw,72px)', fontWeight:900, lineHeight:1.08, letterSpacing:'-2px', marginBottom:20 }}>
            Do orçamento ao contrato.<br/>
            <span style={{ color:'#22c55e' }}>Tudo automatizado.</span>
          </h1>
          <p className="a3" style={{ fontSize:'clamp(16px,2vw,22px)', color:'rgba(255,255,255,.6)', maxWidth:600, margin:'0 auto 40px', lineHeight:1.6 }}>
            Orçamentos interativos que substituem o PDF, leads capturados, contratos digitais, agenda inteligente e financeiro completo — em um só lugar.
          </p>
          <div className="a4" style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button onClick={() => navigate('/login')} className="hero-btn glow-green" style={{ background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'none', color:'#fff', padding:'16px 40px', borderRadius:14, fontSize:16, fontWeight:800, cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              Começar Grátis — 7 dias <ArrowRight size={18}/>
            </button>
            <a href="#sistema" style={{ border:'1px solid rgba(255,255,255,.2)', color:'#fff', padding:'16px 32px', borderRadius:14, fontSize:15, fontWeight:600, textDecoration:'none', background:'rgba(255,255,255,.04)', display:'flex', alignItems:'center', gap:8 }}>
              Ver o sistema ↓
            </a>
          </div>
          <p className="a4" style={{ marginTop:20, fontSize:13, color:'rgba(255,255,255,.4)' }}>
            ✓ Sem cartão de crédito &nbsp;·&nbsp; ✓ 7 dias grátis &nbsp;·&nbsp; ✓ Cancele quando quiser
          </p>
        </div>

        {/* Stats bar */}
        <div style={{ position:'relative', zIndex:1, marginTop:60, display:'flex', gap:0, flexWrap:'wrap', justifyContent:'center', maxWidth:700, width:'100%' }}>
          {[['📸','Fotógrafos ativos','+500'],['💰','Receita gerada','R$2M+'],['📋','Contratos assinados','8.400+'],['⭐','Avaliação média','4.9/5']].map(([ic,lb,vl],i)=>(
            <div key={i} style={{ flex:'1 1 150px', textAlign:'center', padding:'20px 16px', borderRight: i<3 ? '1px solid rgba(255,255,255,.08)' : 'none' }}>
              <div style={{ fontSize:22, marginBottom:4 }}>{ic}</div>
              <div style={{ fontSize:'clamp(22px,3vw,32px)', fontWeight:900, color:'#22c55e', letterSpacing:'-1px' }}>{vl}</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginTop:2 }}>{lb}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ DEMO 1: MOBILE DASHBOARD ═══ */}
      <section id="sistema" style={{ padding:'100px 24px', background:'#07101f', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 50% at 20% 50%,rgba(22,163,74,.1),transparent 60%)' }} />
        <div style={{ maxWidth:1100, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'3px', color:'#22c55e', textTransform:'uppercase', marginBottom:12 }}>🔥 Visão do Fotógrafo</div>
            <h2 style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:900, letterSpacing:'-1.5px', marginBottom:12, lineHeight:1.1 }}>
              Seu negócio no bolso.<br/><span style={{ color:'#22c55e' }}>Controlado de qualquer lugar.</span>
            </h2>
            <p style={{ fontSize:'clamp(14px,1.8vw,18px)', color:'rgba(255,255,255,.5)', maxWidth:500, margin:'0 auto' }}>
              Dashboard, leads, analytics e notificações em tempo real — tudo no celular.
            </p>
          </div>

          <div ref={dashRef} style={{ display:'flex', gap:48, alignItems:'center', flexWrap:'wrap', justifyContent:'center' }}>
            {/* Phone mockup */}
            <div style={{ width:280, flexShrink:0 }}>
              <div style={{ background:'#0d1520', borderRadius:44, border:'3px solid #1e2d42', overflow:'hidden', boxShadow:'0 40px 100px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.05)', position:'relative' }}>
                <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:110, height:28, background:'#0d1520', borderRadius:'0 0 18px 18px', zIndex:10 }} />
                <div style={{ height:480, overflow:'hidden', position:'relative' }}>
                  {/* SCREEN 0: Dashboard */}
                  <div style={{ position:'absolute', inset:0, transition:'opacity .5s,transform .5s', opacity: dashScreen===0?1:0, transform: dashScreen===0?'translateX(0)':'translateX(-100%)' }}>
                    <div style={{ padding:'36px 0 0', display:'flex', flexDirection:'column', height:'100%' }}>
                      <div style={{ background:'#0f1f35', padding:'14px 18px 10px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700 }}>Seja bem-vindo, Daniel 👋</div>
                            <div style={{ fontSize:9, color:'#6b8aaa', marginTop:2 }}>22 de Abril de 2025</div>
                          </div>
                          <div style={{ width:22, height:22, background:'#16a34a', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>3</div>
                        </div>
                      </div>
                      <div style={{ flex:1, padding:'14px 16px', background:'#0a1828', overflow:'hidden' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                          {[['R$89k','Receita 2025','#22c55e'],['47','Leads totais','#fbbf24'],['12','Templates','#ffffff'],['8','Contratos','#60a5fa']].map(([v,l,c],i)=>(
                            <div key={i} style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, padding:'10px 9px' }}>
                              <div style={{ fontSize:18, fontWeight:800, color:c }}>{v}</div>
                              <div style={{ fontSize:9, color:'#6b8aaa', marginTop:1 }}>{l}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize:9, fontWeight:700, letterSpacing:'2px', color:'#6b8aaa', textTransform:'uppercase', marginBottom:8 }}>Leads recentes</div>
                        {[['JM','Joyce Melo','📸 Casamento','R$7.500','rgba(34,197,94,.2)','#22c55e'],['CS','Camila Santos','📸+🎬','R$12.400','rgba(251,191,36,.2)','#fbbf24'],['FL','Fernanda Lima','📅 15 Anos','R$4.200','rgba(167,139,250,.2)','#a78bfa']].map(([av,nm,sv,vl,bg,cl],i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.06)', borderRadius:9, padding:'9px', marginBottom:6 }}>
                            <div style={{ width:30, height:30, borderRadius:'50%', background:bg, color:cl, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, flexShrink:0 }}>{av}</div>
                            <div style={{ flex:1 }}><div style={{ fontSize:10, fontWeight:600 }}>{nm}</div><div style={{ fontSize:8, color:'#6b8aaa' }}>{sv}</div></div>
                            <div style={{ fontSize:11, fontWeight:800, color:'#22c55e' }}>{vl}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* SCREEN 1: Leads */}
                  <div style={{ position:'absolute', inset:0, transition:'opacity .5s,transform .5s', opacity: dashScreen===1?1:0, transform: dashScreen===1?'translateX(0)':dashScreen>1?'translateX(-100%)':'translateX(100%)' }}>
                    <div style={{ padding:'36px 0 0', display:'flex', flexDirection:'column', height:'100%' }}>
                      <div style={{ background:'#0f1f35', padding:'14px 18px 10px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                        <div style={{ fontSize:12, fontWeight:700 }}>Gestão de Leads</div>
                      </div>
                      <div style={{ display:'flex', background:'#0f1f35', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                        {['Todos (47)','Casamento','Ensaio'].map((t,i)=>(
                          <div key={i} style={{ flex:1, padding:'9px 0', textAlign:'center', fontSize:9, fontWeight:700, color: i===0?'#22c55e':'#6b8aaa', borderBottom: i===0?'2px solid #22c55e':'none' }}>{t}</div>
                        ))}
                      </div>
                      <div style={{ flex:1, padding:'12px 14px', background:'#0a1828', overflow:'hidden' }}>
                        {[['JM','Joyce Melo','Casamento · R$7.500','rgba(34,197,94,.2)','#22c55e'],['CS','Camila Santos','Casamento+Video · R$12.400','rgba(251,191,36,.2)','#fbbf24'],['AR','Arthur Rocha','Ensaio · R$2.800','rgba(96,165,250,.2)','#60a5fa']].map(([av,nm,sv,bg,cl],i)=>(
                          <div key={i} style={{ display:'flex', alignItems:'center', gap:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:11, padding:'11px', marginBottom:8, animation:`notifIn .4s ease ${i*.2+.3}s both` }}>
                            <div style={{ width:34, height:34, borderRadius:'50%', background:bg, color:cl, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>{av}</div>
                            <div style={{ flex:1 }}><div style={{ fontSize:11, fontWeight:600 }}>{nm}</div><div style={{ fontSize:9, color:'#6b8aaa', marginTop:1 }}>{sv}</div></div>
                            {i<2&&<div style={{ fontSize:8, fontWeight:700, padding:'2px 7px', borderRadius:8, background:'#16a34a', color:'#fff' }}>NOVO</div>}
                          </div>
                        ))}
                        <div style={{ background:'#25d366', borderRadius:10, padding:'9px', textAlign:'center', fontSize:10, fontWeight:700, color:'#fff', marginTop:6 }}>💬 Enviar Follow-up WhatsApp</div>
                      </div>
                    </div>
                  </div>

                  {/* SCREEN 2: Analytics */}
                  <div style={{ position:'absolute', inset:0, transition:'opacity .5s,transform .5s', opacity: dashScreen===2?1:0, transform: dashScreen===2?'translateX(0)':dashScreen>2?'translateX(-100%)':'translateX(100%)' }}>
                    <div style={{ padding:'36px 0 0', display:'flex', flexDirection:'column', height:'100%' }}>
                      <div style={{ background:'#0f1f35', padding:'14px 18px 10px', borderBottom:'1px solid rgba(255,255,255,.06)', fontSize:12, fontWeight:700 }}>Analytics do Perfil 📊</div>
                      <div style={{ flex:1, padding:'12px 14px', background:'#0a1828', overflow:'hidden' }}>
                        <div style={{ fontSize:9, color:'#6b8aaa', marginBottom:6 }}>Visualizações — últimos 7 meses</div>
                        <div style={{ display:'flex', alignItems:'flex-end', gap:5, height:72, marginBottom:14 }}>
                          {[35,52,44,68,58,82,100].map((h,i)=>(
                            <div key={i} style={{ flex:1, borderRadius:'3px 3px 0 0', height:`${h}%`, background: i>=5?'linear-gradient(to top,#16a34a,#22c55e)':'rgba(34,197,94,.35)', boxShadow: i>=5?'0 0 10px rgba(34,197,94,.4)':'none', animation:`barGrow .7s ease ${i*.1+.4}s both`, transformOrigin:'bottom' }} />
                          ))}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                          {[['2.847','Visualizações','#22c55e'],['18%','Conversão','#fbbf24'],['237','WhatsApp Cliques','#a78bfa'],['+48%','Crescimento','#60a5fa']].map(([v,l,c],i)=>(
                            <div key={i} style={{ background:'rgba(255,255,255,.05)', borderRadius:10, padding:'10px', textAlign:'center' }}>
                              <div style={{ fontSize:16, fontWeight:800, color:c }}>{v}</div>
                              <div style={{ fontSize:8, color:'#6b8aaa', marginTop:2 }}>{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SCREEN 3: Notifications */}
                  <div style={{ position:'absolute', inset:0, transition:'opacity .5s,transform .5s', opacity: dashScreen===3?1:0, transform: dashScreen===3?'translateX(0)':'translateX(100%)' }}>
                    <div style={{ padding:'36px 0 0', display:'flex', flexDirection:'column', height:'100%' }}>
                      <div style={{ background:'#0f1f35', padding:'14px 18px 10px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <div style={{ fontSize:12, fontWeight:700 }}>Notificações</div>
                        <div style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>4 novas</div>
                      </div>
                      <div style={{ flex:1, padding:'12px 14px', background:'#0a1828', display:'flex', flexDirection:'column', gap:8 }}>
                        {[['💰','rgba(34,197,94,.2)','Pagamento recebido!','Joyce Melo · R$3.750 entrada'],['🆕','rgba(251,191,36,.15)','Novo lead chegou','Camila Santos · R$12.400'],['✅','rgba(96,165,250,.15)','Contrato assinado','Fernanda Lima · confirmado'],['📅','rgba(167,139,250,.15)','Evento amanhã','Arthur Rocha · 14h00']].map(([ic,bg,tt,dd],i)=>(
                          <div key={i} style={{ display:'flex', gap:9, background:'rgba(255,255,255,.04)', borderRadius:10, padding:'10px', animation:`notifIn .4s ease ${i*.25+.2}s both` }}>
                            <div style={{ width:28, height:28, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>{ic}</div>
                            <div><div style={{ fontSize:11, fontWeight:700 }}>{tt}</div><div style={{ fontSize:9, color:'#6b8aaa', marginTop:1 }}>{dd}</div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Side info */}
            <div style={{ flex:1, minWidth:260, maxWidth:400 }}>
              <div style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, fontWeight:700, letterSpacing:'2px', color:'#22c55e', textTransform:'uppercase', marginBottom:8 }}>{dashScreens[dashScreen].label}</div>
                <div style={{ fontSize:28, fontWeight:900, letterSpacing:'-1px', marginBottom:8, lineHeight:1.2 }}>{dashScreens[dashScreen].title}</div>
                <p style={{ fontSize:15, color:'rgba(255,255,255,.55)', lineHeight:1.6 }}>{dashScreens[dashScreen].desc}</p>
              </div>
              {/* Screen indicators */}
              <div style={{ display:'flex', gap:8, marginBottom:24 }}>
                {[0,1,2,3].map(i => (
                  <button key={i} onClick={() => { setDashScreen(i); setDashPlaying(false); }} style={{ width:36, height:4, borderRadius:2, border:'none', background: dashScreen===i?'#22c55e':'rgba(255,255,255,.15)', cursor:'pointer', transition:'all .3s', boxShadow: dashScreen===i?'0 0 8px rgba(34,197,94,.5)':'none' }} />
                ))}
              </div>
              <button onClick={() => setDashPlaying(p => !p)} style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.12)', color:'#fff', padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer' }}>
                {dashPlaying ? <><Pause size={15}/> Pausar</> : <><Play size={15}/> Reproduzir</>}
              </button>
              <div style={{ marginTop:28, display:'flex', flexDirection:'column', gap:10 }}>
                {['Dashboard com receita e métricas do mês','Gestão de leads por template','Analytics de perfil público','Notificações em tempo real'].map((f,i)=>(
                  <div key={i} style={{ display:'flex', gap:10, alignItems:'center', fontSize:14, color: i===dashScreen?'#fff':'rgba(255,255,255,.45)', fontWeight: i===dashScreen?600:400, transition:'all .3s' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background: i===dashScreen?'#22c55e':'rgba(255,255,255,.2)', flexShrink:0, transition:'all .3s' }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DEMO 3: JOURNEY ═══ */}
      <section id="jornada" style={{ padding:'100px 24px', background:'linear-gradient(180deg,#07101f 0%,#0a1628 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 60% 50% at 80% 50%,rgba(99,102,241,.07),transparent 55%)' }} />
        <div style={{ maxWidth:960, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'3px', color:'#22c55e', textTransform:'uppercase', marginBottom:12 }}>🗺️ Jornada Completa</div>
            <h2 style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:900, letterSpacing:'-1.5px', marginBottom:12, lineHeight:1.1 }}>
              De <span style={{ color:'#f87171' }}>visitante anônima</span><br/>a <span style={{ color:'#22c55e' }}>contrato assinado</span>
            </h2>
            <p style={{ fontSize:'clamp(14px,1.8vw,18px)', color:'rgba(255,255,255,.5)', maxWidth:500, margin:'0 auto' }}>
              Veja como o PriceUs transforma cada curiosidade em dinheiro na conta, sem esforço manual.
            </p>
          </div>

          <div ref={journeyRef} style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {journeySteps.map((step, i) => (
              <div key={i} style={{ display:'flex', gap:20, alignItems:'flex-start', opacity: visibleSteps.includes(i)?1:0, transform: visibleSteps.includes(i)?'translateX(0)':'translateX(-30px)', transition:'opacity .5s ease, transform .5s ease' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flexShrink:0, width:56 }}>
                  <div style={{ width:52, height:52, borderRadius:'50%', background:step.bg, border:`2px solid ${step.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0, ...(i===4?{animation:'glow 2s ease infinite'}:{}) }}>
                    {step.emoji}
                  </div>
                  {i<4 && <div style={{ width:2, height:28, background:'linear-gradient(to bottom,rgba(34,197,94,.3),transparent)', marginTop:2 }} />}
                </div>
                <div style={{ flex:1, paddingBottom:32 }}>
                  <div style={{ borderRadius:16, padding:'18px 22px', background:step.bg, border:`1px solid ${step.border}` }}>
                    <div style={{ fontSize:16, fontWeight:800, marginBottom:4, color: i===4?'#22c55e':'#fff' }}>{step.title}</div>
                    <p style={{ fontSize:13, color:'rgba(255,255,255,.55)', lineHeight:1.5 }}>{step.desc}</p>
                    {i===1 && (
                      <div style={{ background:'rgba(0,0,0,.3)', borderRadius:10, padding:'12px', marginTop:12, fontSize:11 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,.07)' }}><span style={{ color:'rgba(255,255,255,.5)' }}>📷 Cobertura Completa</span><span style={{ color:'#22c55e', fontWeight:700 }}>R$4.800</span></div>
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,.07)' }}><span style={{ color:'rgba(255,255,255,.5)' }}>🎬 Vídeo Highlights</span><span style={{ color:'#22c55e', fontWeight:700 }}>R$1.500</span></div>
                        <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0 2px', fontWeight:800 }}><span>TOTAL</span><span style={{ color:'#22c55e' }}>R$7.500</span></div>
                      </div>
                    )}
                    {i===4 && (
                      <div style={{ display:'flex', gap:12, marginTop:14, flexWrap:'wrap' }}>
                        {[['💰','R$3.750','50% Entrada'],['📅','14/06/2025','Evento'],['⏳','R$3.750','Saldo']].map(([ic,vl,lb],j)=>(
                          <div key={j} style={{ flex:'1 1 100px', background:'rgba(0,0,0,.25)', borderRadius:10, padding:'10px', textAlign:'center' }}>
                            <div style={{ fontSize:16 }}>{ic}</div>
                            <div style={{ fontSize:14, fontWeight:800, color:'#22c55e', marginTop:2 }}>{vl}</div>
                            <div style={{ fontSize:9, color:'rgba(255,255,255,.4)' }}>{lb}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginTop:20, flexWrap:'wrap' }}>
            {[['R$7.500','Receita gerada'],['0h','Trabalho manual'],['5 min','Do lead ao contrato'],['100%','Automatizado']].map(([v,l],i)=>(
              <div key={i} style={{ background:'rgba(34,197,94,.08)', border:'1px solid rgba(34,197,94,.25)', borderRadius:16, padding:'20px 16px', textAlign:'center' }}>
                <div style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:900, color:'#22c55e', letterSpacing:'-1px' }}>{v}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginTop:4 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ DEMO 4: ROI ═══ */}
      <section id="roi" style={{ padding:'100px 24px', background:'#07101f', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 50% at 50% 50%,rgba(239,68,68,.06),transparent 55%)' }} />
        <div style={{ maxWidth:1000, margin:'0 auto', position:'relative', zIndex:1 }}>
          <div style={{ textAlign:'center', marginBottom:60 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'3px', color:'#f87171', textTransform:'uppercase', marginBottom:12 }}>💸 Impacto Financeiro Real</div>
            <h2 style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:900, letterSpacing:'-1.5px', marginBottom:12, lineHeight:1.1 }}>
              Você está <span style={{ color:'#f87171' }}>perdendo dinheiro</span><br/>todo mês sem o PriceUs
            </h2>
            <p style={{ fontSize:'clamp(14px,1.8vw,18px)', color:'rgba(255,255,255,.5)', maxWidth:500, margin:'0 auto' }}>
              Fotógrafos sem sistema perdem em média 35% dos leads por falta de acompanhamento.
            </p>
          </div>

          {/* Before vs After */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:20, marginBottom:48, alignItems:'start' }}>
            <div style={{ background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', borderRadius:20, padding:'24px 20px' }}>
              <div style={{ fontSize:15, fontWeight:800, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>😩 Sem o PriceUs</div>
              {[['Leads respondidos','3 de 10'],['Orçamento enviado','Manual'],['Follow-up WhatsApp','Esquecido'],['Controle financeiro','Planilha'],['Leads perdidos/mês','~7'],].map(([l,v],i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)', fontSize:13 }}>
                  <span style={{ color:'rgba(255,255,255,.5)' }}>{l}</span><span style={{ color:'#f87171', fontWeight:700 }}>{v}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 0 4px', fontWeight:900, fontSize:17 }}>
                <span>💸 Deixou de ganhar</span><span style={{ color:'#f87171' }}>-R$28.000</span>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'0 8px' }}>
              <div style={{ width:40, height:40, borderRadius:'50%', border:'2px solid rgba(255,255,255,.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, color:'rgba(255,255,255,.4)' }}>VS</div>
            </div>
            <div style={{ background:'rgba(22,163,74,.08)', border:'1px solid rgba(22,163,74,.25)', borderRadius:20, padding:'24px 20px', animation:'glow 3s ease infinite' }}>
              <div style={{ fontSize:15, fontWeight:800, marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>🚀 Com o PriceUs</div>
              {[['Leads respondidos','9 de 10'],['Orçamento enviado','Automático'],['Follow-up WhatsApp','1 clique'],['Controle financeiro','Dashboard'],['Leads convertidos/mês','+6'],].map(([l,v],i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.05)', fontSize:13 }}>
                  <span style={{ color:'rgba(255,255,255,.5)' }}>{l}</span><span style={{ color:'#22c55e', fontWeight:700 }}>{v}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 0 4px', fontWeight:900, fontSize:17 }}>
                <span>💰 Receita recuperada</span><span style={{ color:'#22c55e' }}>+R$24.000</span>
              </div>
            </div>
          </div>

          {/* Counters */}
          <div ref={roiRef} style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:40 }}>
            {[[`R$${receita.toLocaleString('pt-BR')}`, 'Receita média anual', '#22c55e','↑ 127% com PriceUs'],[`${leads}`, 'Leads em 30 dias', '#fbbf24','↑ 3x mais que antes'],[`${conv}%`, 'Taxa de conversão', '#a78bfa','Média fotografia: 30%'],[`-${horas}h`, 'Economizado por mês', '#60a5fa','Sem PDF, planilha ou ctrl+c']].map(([v,l,c,t],i)=>(
              <div key={i} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)', borderRadius:18, padding:'22px 18px', textAlign:'center', ...(i===0?{background:'rgba(22,163,74,.1)',border:'1px solid rgba(22,163,74,.3)', animation:'glow 2.5s ease infinite'}:{}) }}>
                <div style={{ fontSize:'clamp(24px,3vw,36px)', fontWeight:900, color:c, letterSpacing:'-1px' }}>{v}</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginTop:4 }}>{l}</div>
                <div style={{ fontSize:10, color:c, marginTop:6, fontWeight:600 }}>{t}</div>
              </div>
            ))}
          </div>

          {/* ROI callout */}
          <div style={{ background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.2)', borderRadius:20, padding:'24px 28px', display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', marginBottom:16 }}>
            <div style={{ fontSize:48, animation:'moneyBounce 2s ease infinite' }}>😱</div>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#f87171', marginBottom:4 }}>Sem PriceUs, você perde em média:</div>
              <div style={{ fontSize:14, color:'rgba(255,255,255,.5)' }}>35% dos leads não respondem sem follow-up. Cada lead perdido ≈ R$4.000.</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:2 }}>Por mês:</div>
              <div style={{ fontSize:48, fontWeight:900, color:'#f87171', letterSpacing:'-2px', lineHeight:1 }}>R$14.000</div>
              <div style={{ fontSize:12, color:'#f87171', marginTop:2, fontWeight:600 }}>R$168.000 por ano 😱</div>
            </div>
          </div>
          <div style={{ background:'rgba(22,163,74,.08)', border:'1px solid rgba(22,163,74,.3)', borderRadius:20, padding:'24px 28px', display:'flex', alignItems:'center', gap:24, flexWrap:'wrap', animation:'glow 3s ease infinite' }}>
            <div style={{ fontSize:48 }}>🚀</div>
            <div style={{ flex:1, minWidth:200 }}>
              <div style={{ fontSize:18, fontWeight:900, color:'#22c55e', marginBottom:4 }}>PriceUs recupera cada centavo:</div>
              <div style={{ fontSize:14, color:'rgba(255,255,255,.5)' }}>Follow-up automático, orçamentos prontos e painel de leads — você fecha muito mais.</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', marginBottom:2 }}>Custo do PriceUs:</div>
              <div style={{ fontSize:44, fontWeight:900, color:'#22c55e', letterSpacing:'-2px', lineHeight:1 }}>R$97/mês</div>
              <div style={{ fontSize:12, color:'#22c55e', marginTop:2, fontWeight:700 }}>🔁 ROI: +2.380% ao mês</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" style={{ padding:'100px 24px', background:'linear-gradient(180deg,#0a1628 0%,#07101f 100%)' }}>
        <div style={{ maxWidth:680, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'3px', color:'#22c55e', textTransform:'uppercase', marginBottom:12 }}>💎 Plano</div>
            <h2 style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:900, letterSpacing:'-1.5px', marginBottom:12 }}>Um plano. Tudo incluído.</h2>
            <p style={{ fontSize:18, color:'rgba(255,255,255,.5)' }}>7 dias grátis, depois R$97/mês com acesso completo.</p>
          </div>

          <div style={{ background:'rgba(255,255,255,.04)', border:'2px solid rgba(34,197,94,.4)', borderRadius:24, padding:'40px 36px', position:'relative', boxShadow:'0 0 60px rgba(22,163,74,.15)' }}>
            <div style={{ position:'absolute', top:-14, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#16a34a,#22c55e)', color:'#fff', fontSize:12, fontWeight:700, padding:'6px 20px', borderRadius:999, whiteSpace:'nowrap', boxShadow:'0 4px 16px rgba(22,163,74,.4)' }}>
              ✨ Plataforma Completa All-in-One
            </div>
            <div style={{ textAlign:'center', marginBottom:32, marginTop:10 }}>
              <div style={{ fontSize:16, color:'rgba(255,255,255,.5)', marginBottom:4 }}>Professional</div>
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'center', gap:4 }}>
                <span style={{ fontSize:64, fontWeight:900, color:'#22c55e', letterSpacing:'-3px' }}>R$97</span>
                <span style={{ fontSize:22, color:'rgba(255,255,255,.4)', marginBottom:12 }}>/mês</span>
              </div>
              <div style={{ fontSize:14, color:'#22c55e', fontWeight:600 }}>7 dias grátis para testar tudo</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 16px', marginBottom:32 }}>
              {planFeatures.map((f, i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:13 }}>
                  <Check size={15} color="#22c55e" style={{ flexShrink:0, marginTop:1 }} />
                  <span style={{ color:'rgba(255,255,255,.75)' }}>{f}</span>
                </div>
              ))}
            </div>

            <button onClick={() => navigate('/login')} className="hero-btn glow-green" style={{ width:'100%', padding:'18px', borderRadius:14, background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'none', color:'#fff', fontSize:17, fontWeight:800, cursor:'pointer', position:'relative', overflow:'hidden' }}>
              Começar Teste Grátis de 7 Dias
              <span style={{ position:'absolute', top:0, left:'-100%', width:'50%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent)', animation:'shine 2.5s ease infinite' }} />
            </button>
            <p style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,.35)', marginTop:14 }}>
              Sem cartão de crédito necessário · Cancele quando quiser · Suporte em português
            </p>
          </div>

          <div style={{ display:'flex', gap:20, justifyContent:'center', marginTop:32, flexWrap:'wrap' }}>
            {[[Shield,'Pagamento seguro'],[Check,'Sem taxas ocultas'],[Globe,'Suporte em português'],[Smartphone,'Todos os dispositivos']].map(([Icon,label],i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(255,255,255,.4)' }}>
                <Icon size={14} color="#22c55e"/>{label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding:'80px 24px', background:'linear-gradient(135deg,#0f2818,#0a1f14)', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse 70% 60% at 50% 50%,rgba(22,163,74,.2),transparent 65%)' }} />
        <div style={{ position:'relative', zIndex:1, maxWidth:680, margin:'0 auto' }}>
          <h2 style={{ fontSize:'clamp(30px,5vw,58px)', fontWeight:900, letterSpacing:'-1.5px', marginBottom:16, lineHeight:1.1 }}>
            Pronto para transformar<br/><span style={{ color:'#22c55e' }}>seu negócio?</span>
          </h2>
          <p style={{ fontSize:18, color:'rgba(255,255,255,.55)', marginBottom:36 }}>
            Junte-se a centenas de fotógrafos que já automatizaram seus processos e aumentaram suas vendas.
          </p>
          <button onClick={() => navigate('/login')} className="hero-btn glow-green" style={{ background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'none', color:'#fff', padding:'18px 52px', borderRadius:14, fontSize:17, fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:10 }}>
            Começar Agora — 7 Dias Grátis <ArrowRight size={20}/>
          </button>
          <p style={{ marginTop:16, fontSize:14, color:'rgba(255,255,255,.35)' }}>
            ✓ Sem cartão · ✓ Acesso completo · ✓ Suporte incluído
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background:'#04090f', padding:'48px 24px 24px', borderTop:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:40, marginBottom:40, flexWrap:'wrap' }}>
            <div>
              <img src="/Logo Price Us.png" alt="PriceUs" style={{ height:36, width:'auto', marginBottom:14, filter:'brightness(1)' }}/>
              <p style={{ fontSize:13, color:'rgba(255,255,255,.35)', lineHeight:1.6, maxWidth:280 }}>
                Plataforma all-in-one para fotógrafos profissionais. Orçamentos interativos, contratos digitais e gestão financeira completa.
              </p>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:16 }}>Produto</div>
              {['Funcionalidades','Planos','Como Funciona','Analytics'].map(l=>(
                <a key={l} href="#" style={{ display:'block', fontSize:13, color:'rgba(255,255,255,.4)', textDecoration:'none', marginBottom:8 }}>{l}</a>
              ))}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:16 }}>Recursos</div>
              {['Contratos Digitais','Agenda Inteligente','Avaliações','Exportação Fiscal'].map(l=>(
                <a key={l} href="#" style={{ display:'block', fontSize:13, color:'rgba(255,255,255,.4)', textDecoration:'none', marginBottom:8 }}>{l}</a>
              ))}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#fff', marginBottom:16 }}>Suporte</div>
              {['Central de Ajuda','Chat ao Vivo','Contato','Status'].map(l=>(
                <a key={l} href="#" style={{ display:'block', fontSize:13, color:'rgba(255,255,255,.4)', textDecoration:'none', marginBottom:8 }}>{l}</a>
              ))}
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,.06)', paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.25)' }}>© 2025 PriceUs. Todos os direitos reservados.</p>
            <div style={{ display:'flex', gap:20 }}>
              {['Privacidade','Termos','Cookies','LGPD'].map(l=>(
                <a key={l} href="#" style={{ fontSize:12, color:'rgba(255,255,255,.25)', textDecoration:'none' }}>{l}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
