import { useState, useEffect } from 'react';
import { X, FileCheck, Plus, Copy, Check, ExternalLink, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DeliveryTermRow {
  id: string;
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
  created_at: string;
}

interface PhotoDeliveryTermsModalProps {
  userId: string;
  onClose: () => void;
}

const DEFAULT_DELIVERY_TEXT = `Declaro, para os devidos fins, que recebi integralmente os materiais fotográficos e/ou produtos contratados listados neste termo, em perfeitas condições de visualização, qualidade e acesso.

Estou ciente de que:
1. É recomendável realizar cópia de segurança (backup) dos arquivos digitais após o download;
2. A partir desta entrega e confirmação de recebimento, considera-se cumprida a obrigação de entrega dos materiais contratados.`;

export function PhotoDeliveryTermsModal({ userId, onClose }: PhotoDeliveryTermsModalProps) {
  const [terms, setTerms] = useState<DeliveryTermRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [deliveryItems, setDeliveryItems] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [observacoes, setObservacoes] = useState('');
  const [contentText, setContentText] = useState(DEFAULT_DELIVERY_TEXT);

  const loadTerms = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('photo_delivery_terms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTerms((data || []) as DeliveryTermRow[]);
    } catch (err) {
      console.error('Erro ao carregar termos de entrega:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, [userId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !deliveryItems.trim()) return;
    setCreating(true);
    try {
      const token = `${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      const { error } = await supabase.from('photo_delivery_terms').insert({
        user_id: userId,
        token,
        client_name: clientName.trim(),
        client_email: clientEmail.trim() || null,
        delivery_items: deliveryItems.trim(),
        delivery_date: deliveryDate,
        observacoes: observacoes.trim() || null,
        content_text: contentText.trim(),
        status: 'pending',
      });

      if (error) throw error;

      setClientName('');
      setClientEmail('');
      setDeliveryItems('');
      setObservacoes('');
      setShowNewForm(false);
      await loadTerms();
    } catch (err) {
      console.error('Erro ao criar termo de entrega:', err);
      alert('❌ Erro ao criar termo de entrega. Verifique se a migration foi aplicada no Supabase.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este termo de entrega?')) return;
    await supabase.from('photo_delivery_terms').delete().eq('id', id);
    setTerms((prev) => prev.filter((t) => t.id !== id));
  };

  const handleCopyLink = (term: DeliveryTermRow) => {
    const url = `${window.location.origin}/termo-entrega/${term.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(term.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0d1829] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Termos de Entrega de Fotos
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gere termos de recebimento com link para assinatura digital do cliente e comprovante em PDF.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewForm((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              {showNewForm ? 'Ver Lista' : 'Novo Termo'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {showNewForm ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome do Cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#091220] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data da Entrega *
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#091220] text-gray-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Itens / Materiais Entregues *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryItems}
                    onChange={(e) => setDeliveryItems(e.target.value)}
                    placeholder="Ex: Galeria online com 420 fotos em alta resolução + 1 Álbum Fine Art 30x30"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#091220] text-gray-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    E-mail do Cliente (opcional)
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#091220] text-gray-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Observações (opcional)
                  </label>
                  <input
                    type="text"
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Ex: Link válido por 12 meses para download"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#091220] text-gray-900 dark:text-white"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Texto do Termo
                  </label>
                  <textarea
                    rows={5}
                    value={contentText}
                    onChange={(e) => setContentText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#091220] text-gray-900 dark:text-white text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {creating ? 'Gerando...' : 'Gerar Termo e Link'}
                </button>
              </div>
            </form>
          ) : loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-7 h-7 animate-spin text-emerald-600" />
            </div>
          ) : terms.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <FileCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum termo de entrega criado ainda.</p>
              <p className="text-xs mt-1">Clique em "Novo Termo" acima para gerar o primeiro.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {terms.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.02] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {t.client_name}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          t.status === 'signed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                        }`}
                      >
                        {t.status === 'signed' ? 'Assinado' : 'Pendente'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {t.delivery_items}
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Entrega: {new Date(t.delivery_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      {t.signed_at ? ` • Assinado em ${new Date(t.signed_at).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyLink(t)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-medium"
                    >
                      {copiedId === t.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === t.id ? 'Copiado' : 'Copiar Link'}
                    </button>
                    <a
                      href={`/termo-entrega/${t.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-gray-300 text-xs font-medium"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir / PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

