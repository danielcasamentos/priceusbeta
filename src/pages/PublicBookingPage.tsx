import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Camera, MapPin, Star } from 'lucide-react';

interface BookingConfig {
  modo: 'avulso' | 'dinamico';
  datas_sugeridas?: string[];
  mes_referencia?: string | null;
}

interface Lead {
  id: string;
  user_id: string;
  nome_cliente: string;
  tipo_evento?: string;
  agendamento_config?: BookingConfig;
}

interface Profile {
  nome_profissional?: string;
  profile_image_url?: string;
  tipo_fotografia?: string;
  slug_usuario?: string;
}

interface BusyDay {
  data_evento: string;
}

function formatDatePtBR(iso: string) {
  const [y, m, d] = iso.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function formatMonthLabel(ym: string) {
  const [y, m] = ym.split('-');
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getCalendarDays(ym: string): (string | null)[] {
  const [y, m] = ym.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1).getDay();
  const daysInMonth = new Date(y, m, 0).getDate();
  const cells: (string | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return cells;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function PublicBookingPage() {
  const { leadId } = useParams<{ leadId: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busyDays, setBusyDays] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<BookingConfig | null>(null);

  // Current display month for dynamic mode
  const [displayMonth, setDisplayMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tipoEvento, setTipoEvento] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  // Load lead + profile
  useEffect(() => {
    if (!leadId) { setError('Link inválido.'); setLoading(false); return; }

    (async () => {
      const { data: leadData, error: leadErr } = await supabase
        .from('leads')
        .select('id, user_id, nome_cliente, tipo_evento, agendamento_config')
        .eq('id', leadId)
        .single();

      if (leadErr || !leadData) {
        setError('Agendamento não encontrado ou link expirado.');
        setLoading(false);
        return;
      }

      setLead(leadData as Lead);
      const cfg = leadData.agendamento_config as BookingConfig | null;
      setConfig(cfg || { modo: 'avulso', datas_sugeridas: [] });
      setTipoEvento(leadData.tipo_evento || 'Ensaio');

      // Initial month for dynamic mode
      if (cfg?.modo === 'dinamico' && cfg.mes_referencia) {
        setDisplayMonth(cfg.mes_referencia);
      }

      // Load profile (table is 'profiles', not 'perfis')
      const { data: profileData } = await supabase
        .from('profiles')
        .select('nome_profissional, profile_image_url, tipo_fotografia, slug_usuario')
        .eq('id', leadData.user_id)
        .maybeSingle();
      if (profileData) setProfile(profileData as Profile);

      setLoading(false);
    })();
  }, [leadId]);

  // Load busy days for dynamic mode
  // Uses the restricted 'dias_ocupados_publicos' view that only exposes
  // user_id + data_evento — clients never see other clients' names or event details.
  const loadBusyDays = useCallback(async (userId: string, month: string) => {
    const [y, m] = month.split('-').map(Number);
    const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
    const endDate = new Date(y, m, 0);
    const endStr = `${y}-${String(m).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

    const { data } = await supabase
      .from('dias_ocupados_publicos')
      .select('data_evento')
      .eq('user_id', userId)
      .gte('data_evento', startDate)
      .lte('data_evento', endStr);

    const busy = new Set((data || []).map((e: BusyDay) => e.data_evento.split('T')[0]));
    setBusyDays(busy);
  }, []);

  useEffect(() => {
    if (lead && config?.modo === 'dinamico') {
      loadBusyDays(lead.user_id, displayMonth);
    }
  }, [lead, config, displayMonth, loadBusyDays]);

  const handleConfirm = async () => {
    if (!selectedDate || !lead) return;
    setSubmitting(true);
    try {
      // ── Verificar duplicata: checar se já existe evento confirmado nesta data ──
      const { data: existingEvents } = await supabase
        .from('eventos_agenda')
        .select('id')
        .eq('user_id', lead.user_id)
        .eq('data_evento', selectedDate)
        .not('status', 'eq', 'cancelado')
        .limit(1);

      if (existingEvents && existingEvents.length > 0) {
        setError('Esta data já está ocupada. Por favor, escolha outra data disponível.');
        setSelectedDate(null);
        setSubmitting(false);
        return;
      }

      // Insert into eventos_agenda
      const { error: agErr } = await supabase.from('eventos_agenda').insert({
        user_id: lead.user_id,
        lead_id: lead.id,
        data_evento: selectedDate,
        tipo_evento: tipoEvento || 'Ensaio',
        cliente_nome: lead.nome_cliente,
        status: 'confirmado',
        origem: 'agendamento_cliente',
        observacoes: `Agendado pelo próprio cliente via link público`,
      });
      if (agErr) throw agErr;

      // Update lead with chosen date
      await supabase.from('leads').update({
        data_evento: selectedDate,
      }).eq('id', lead.id);

      setSubmitted(true);
    } catch (e: any) {
      setError('Erro ao confirmar agendamento. Tente novamente.');
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const calendarDays = config?.modo === 'dinamico' ? getCalendarDays(displayMonth) : [];
  const today = todayStr();

  const changeMonth = (delta: number) => {
    const [y, m] = displayMonth.split('-').map(Number);
    const newDate = new Date(y, m - 1 + delta, 1);
    const newYm = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`;
    setDisplayMonth(newYm);
    setSelectedDate(null);
  };

  // ──────────────── RENDER ────────────────

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={40} style={{ color: '#a78bfa', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div>
        <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Ops! Link inválido</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>{error}</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pop-in { from { opacity:0; transform:scale(0.85) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-10px); } }
      `}</style>
      <div style={{ textAlign: 'center', animation: 'pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both', maxWidth: 420 }}>
        <div style={{ fontSize: 80, animation: 'float 3s ease-in-out infinite', display: 'block', marginBottom: 24 }}>🎉</div>
        <div style={{ background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: '36px 32px' }}>
          <CheckCircle2 size={48} style={{ color: '#10b981', marginBottom: 16 }} />
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 900, marginBottom: 8 }}>Data confirmada!</h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, lineHeight: 1.6, marginBottom: 20 }}>
            Sua data foi agendada com sucesso!
          </p>
          <div style={{ background: 'linear-gradient(135deg,rgba(167,139,250,0.2),rgba(59,130,246,0.2))', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 16, padding: '16px 20px' }}>
            <p style={{ color: '#a78bfa', fontWeight: 700, fontSize: 14, marginBottom: 4 }}>📅 Data selecionada</p>
            <p style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{selectedDate ? formatDatePtBR(selectedDate) : ''}</p>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 20 }}>
            {profile?.nome_profissional} receberá a confirmação e entrará em contato em breve.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)', fontFamily: "'Inter', sans-serif", paddingBottom: 60 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes slide-up { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .booking-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: 2px solid transparent;
        }
        .booking-day:hover:not(.busy):not(.past):not(.empty) {
          background: rgba(167,139,250,0.25);
          border-color: rgba(167,139,250,0.5);
          color: #fff;
        }
        .booking-day.selected {
          background: linear-gradient(135deg,#7c3aed,#4f46e5) !important;
          border-color: #a78bfa !important;
          color: #fff !important;
          box-shadow: 0 4px 16px rgba(124,58,237,0.4);
        }
        .booking-day.busy {
          background: rgba(239,68,68,0.1);
          color: rgba(255,255,255,0.2);
          cursor: not-allowed;
          text-decoration: line-through;
        }
        .booking-day.past {
          color: rgba(255,255,255,0.15);
          cursor: not-allowed;
        }
        .avulso-card {
          background: rgba(255,255,255,0.05);
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 16px 20px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .avulso-card:hover {
          background: rgba(167,139,250,0.1);
          border-color: rgba(167,139,250,0.4);
          transform: translateY(-2px);
        }
        .avulso-card.selected {
          background: linear-gradient(135deg,rgba(124,58,237,0.25),rgba(79,70,229,0.25));
          border-color: #a78bfa;
          box-shadow: 0 8px 24px rgba(124,58,237,0.2);
        }
      `}</style>

      {/* Header com glassmorphism */}
      <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          {profile?.profile_image_url && (
            <img
              src={profile.profile_image_url}
              alt={profile.nome_profissional}
              style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(167,139,250,0.5)' }}
            />
          )}
          <div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Agendamento com</p>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {profile?.nome_profissional || 'Fotógrafo'}
            </h1>
            {profile?.tipo_fotografia && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>
                <Camera size={10} /> {profile.tipo_fotografia}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '32px 24px', animation: 'slide-up 0.5s ease both' }}>

        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 999, padding: '4px 14px', fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 12 }}>
            <Calendar size={12} /> Escolha sua data
          </div>
          <h2 style={{ fontSize: 'clamp(22px,5vw,32px)', fontWeight: 900, color: '#fff', lineHeight: 1.2, marginBottom: 8 }}>
            Olá, {lead?.nome_cliente?.split(' ')[0]}! 👋
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.6 }}>
            {config?.modo === 'avulso'
              ? 'Selecione uma das datas disponíveis abaixo para o seu ensaio:'
              : 'Escolha uma data disponível no calendário:'}
          </p>
        </div>

        {/* Tipo de evento */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>
            Tipo de ensaio / evento
          </label>
          <input
            type="text"
            value={tipoEvento}
            onChange={e => setTipoEvento(e.target.value)}
            placeholder="Ex: Pré-Wedding, Ensaio de Gestante..."
            style={{
              width: '100%', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)',
              borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 15, fontFamily: "'Inter', sans-serif",
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* ── MODO AVULSO ── */}
        {config?.modo === 'avulso' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(!config.datas_sugeridas || config.datas_sugeridas.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15 }}>Nenhuma data disponível no momento. Aguarde o fotógrafo adicionar datas.</p>
              </div>
            ) : (
              config.datas_sugeridas.map(date => {
                const isPast = date < today;
                const isSelected = selectedDate === date;
                return (
                  <div
                    key={date}
                    className={`avulso-card${isSelected ? ' selected' : ''}${isPast ? ' past' : ''}`}
                    onClick={() => !isPast && setSelectedDate(date)}
                    style={isPast ? { opacity: 0.35, cursor: 'not-allowed' } : {}}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 48, height: 48, borderRadius: 12,
                        background: isSelected ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 20,
                      }}>
                        📅
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, textTransform: 'capitalize' }}>
                          {formatDatePtBR(date)}
                        </div>
                        {isPast && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Data já passou</div>}
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 size={22} style={{ color: '#a78bfa', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ── MODO DINÂMICO ── */}
        {config?.modo === 'dinamico' && (
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '20px', overflow: 'hidden' }}>
            {/* Navegação de mês */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <button
                onClick={() => changeMonth(-1)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', transition: 'background 0.15s' }}
              >
                <ChevronLeft size={18} />
              </button>
              <h3 style={{ color: '#fff', fontWeight: 800, fontSize: 16, textTransform: 'capitalize' }}>
                {formatMonthLabel(displayMonth)}
              </h3>
              <button
                onClick={() => changeMonth(1)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', transition: 'background 0.15s' }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Cabeçalhos dos dias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {WEEKDAYS_SHORT.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', padding: '4px 0' }}>{d}</div>
              ))}
            </div>

            {/* Células do calendário */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {calendarDays.map((date, i) => {
                if (!date) return <div key={`empty-${i}`} />;
                const isBusy = busyDays.has(date);
                const isPast = date < today;
                const isSelected = selectedDate === date;
                let cls = 'booking-day';
                if (isBusy) cls += ' busy';
                else if (isPast) cls += ' past';
                if (isSelected) cls += ' selected';

                return (
                  <div
                    key={date}
                    className={cls}
                    style={{
                      color: isBusy || isPast ? undefined : isSelected ? '#fff' : 'rgba(255,255,255,0.85)',
                      background: isBusy ? undefined : isSelected ? undefined : date === today ? 'rgba(167,139,250,0.1)' : undefined,
                      border: date === today && !isSelected ? '2px solid rgba(167,139,250,0.4)' : undefined,
                    }}
                    onClick={() => {
                      if (!isBusy && !isPast) setSelectedDate(date);
                    }}
                    title={isBusy ? 'Data ocupada' : isPast ? 'Data passada' : ''}
                  >
                    {date.split('-')[2].replace(/^0/, '')}
                  </div>
                );
              })}
            </div>

            {/* Legenda */}
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }} />
                Selecionado
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(239,68,68,0.3)', border: '1px solid rgba(239,68,68,0.3)' }} />
                Ocupado
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, border: '2px solid rgba(167,139,250,0.4)' }} />
                Hoje
              </div>
            </div>
          </div>
        )}

        {/* Seleção exibida + botão confirmar */}
        {selectedDate && (
          <div style={{ marginTop: 28, animation: 'slide-up 0.3s ease both' }}>
            <div style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.2))', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 16, padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={18} style={{ color: '#a78bfa' }} />
                <div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 2 }}>Data selecionada</p>
                  <p style={{ fontSize: 16, color: '#fff', fontWeight: 800, textTransform: 'capitalize' }}>
                    {formatDatePtBR(selectedDate)}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={submitting}
              style={{
                width: '100%', padding: '16px 24px',
                background: submitting ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                border: 'none', borderRadius: 14, color: '#fff',
                fontSize: 17, fontWeight: 800, cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 6px 24px rgba(124,58,237,0.4)',
                transition: 'opacity 0.2s, transform 0.1s',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {submitting ? (
                <><Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> Confirmando...</>
              ) : (
                <><CheckCircle2 size={20} /> Confirmar esta data</>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>
              Ao confirmar, o fotógrafo receberá a notificação automaticamente.
            </p>
          </div>
        )}

        {/* Rodapé */}
        <div style={{ marginTop: 48, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>
            <Star size={10} fill="currentColor" />
            Powered by PriceUs
          </div>
        </div>
      </div>
    </div>
  );
}
