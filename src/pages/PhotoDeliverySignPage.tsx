import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle2, FileCheck, Printer, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';

interface DeliveryTerm {
  id: string;
  user_id: string;
  token: string;
  client_name: string;
  client_cpf?: string | null;
  client_email?: string | null;
  delivery_items: string;
  delivery_date: string;
  content_text: string;
  observacoes?: string | null;
  signature_base64?: string | null;
  status: 'pending' | 'signed';
  signed_at?: string | null;
}

export function PhotoDeliverySignPage() {
  const { token } = useParams<{ token: string }>();
  const [term, setTerm] = useState<DeliveryTerm | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientCpf, setClientCpf] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const loadTerm = async () => {
      if (!token) {
        setError('Link inválido.');
        setLoading(false);
        return;
      }
      try {
        const { data, error: fetchErr } = await supabase
          .from('photo_delivery_terms')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (fetchErr || !data) {
          setError('Termo de entrega não encontrado.');
          return;
        }

        setTerm(data as DeliveryTerm);
        setClientName(data.client_name || '');
        setClientCpf(data.client_cpf || '');

        const { data: biz } = await supabase
          .from('user_business_settings')
          .select('business_name')
          .eq('user_id', data.user_id)
          .maybeSingle();

        if (biz?.business_name) setBusinessName(biz.business_name);
      } catch (err) {
        console.error('Erro ao carregar termo de entrega:', err);
        setError('Erro ao carregar o termo de entrega.');
      } finally {
        setLoading(false);
      }
    };

    loadTerm();
  }, [token]);

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    isDrawingRef.current = true;
    setHasDrawn(true);
  };

  const moveDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term || !canvasRef.current) return;
    if (!clientName.trim()) {
      alert('Informe seu nome completo.');
      return;
    }
    if (!hasDrawn) {
      alert('Por favor, desenhe sua assinatura no quadro abaixo.');
      return;
    }

    setSubmitting(true);
    try {
      const signatureBase64 = canvasRef.current.toDataURL('image/png');
      const signedAt = new Date().toISOString();

      const { error: updErr } = await supabase
        .from('photo_delivery_terms')
        .update({
          client_name: clientName.trim(),
          client_cpf: clientCpf.trim() || null,
          signature_base64: signatureBase64,
          status: 'signed',
          signed_at: signedAt,
        })
        .eq('id', term.id)
        .eq('status', 'pending');

      if (updErr) throw updErr;

      setTerm({
        ...term,
        client_name: clientName.trim(),
        client_cpf: clientCpf.trim() || null,
        signature_base64: signatureBase64,
        status: 'signed',
        signed_at: signedAt,
      });
    } catch (err) {
      console.error('Erro ao assinar termo:', err);
      alert('❌ Não foi possível registrar a assinatura. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !term) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-gray-900">Ops!</h2>
          <p className="text-sm text-gray-600 mt-1">{error || 'Termo não encontrado.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 print:bg-white print:py-0">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none">
        <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between print:bg-white print:text-black print:border-b">
          <div className="flex items-center gap-3">
            <FileCheck className="w-6 h-6 text-emerald-400 print:text-black" />
            <div>
              <h1 className="text-lg font-bold">Termo de Entrega e Recebimento de Fotos / Materiais</h1>
              {businessName && <p className="text-xs text-slate-300 print:text-gray-600">{businessName}</p>}
            </div>
          </div>
          {term.status === 'signed' && (
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold print:hidden"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border text-sm">
            <div>
              <span className="text-xs text-gray-500 block">Cliente</span>
              <strong className="text-gray-900">{term.client_name}</strong>
              {term.client_cpf && <span className="block text-xs text-gray-600">CPF: {term.client_cpf}</span>}
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Data da Entrega</span>
              <strong className="text-gray-900">
                {new Date(term.delivery_date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </strong>
            </div>
            <div className="sm:col-span-2">
              <span className="text-xs text-gray-500 block">Itens / Materiais Entregues</span>
              <p className="font-medium text-gray-900 whitespace-pre-line">{term.delivery_items}</p>
            </div>
            {term.observacoes && (
              <div className="sm:col-span-2">
                <span className="text-xs text-gray-500 block">Observações</span>
                <p className="text-gray-700 whitespace-pre-line">{term.observacoes}</p>
              </div>
            )}
          </div>

          <div className="border rounded-xl p-5 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed bg-white">
            {term.content_text}
          </div>

          {term.status === 'signed' ? (
            <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Termo assinado eletronicamente
                {term.signed_at && (
                  <span className="font-normal text-xs text-emerald-700">
                    em {new Date(term.signed_at).toLocaleString('pt-BR')}
                  </span>
                )}
              </div>
              {term.signature_base64 && (
                <div className="bg-white border rounded-lg p-3 inline-block">
                  <img
                    src={term.signature_base64}
                    alt="Assinatura do cliente"
                    className="h-24 object-contain"
                  />
                  <div className="border-t mt-2 pt-1 text-xs text-gray-600 text-center">
                    {term.client_name} {term.client_cpf ? `• CPF: ${term.client_cpf}` : ''}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSign} className="space-y-4 border-t pt-5 print:hidden">
              <h3 className="font-bold text-gray-900 text-base">Confirmação e Assinatura de Recebimento</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
                  <input
                    type="text"
                    value={clientCpf}
                    onChange={(e) => setClientCpf(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 text-sm border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-700">Assine no quadro abaixo *</label>
                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Limpar
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={160}
                  onMouseDown={startDraw}
                  onMouseMove={moveDraw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={moveDraw}
                  onTouchEnd={endDraw}
                  className="w-full h-40 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 touch-none cursor-crosshair"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition-colors disabled:opacity-60"
              >
                {submitting ? 'Registrando assinatura...' : 'Confirmar Recebimento e Assinar Termo'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

