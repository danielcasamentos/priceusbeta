import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Ticket, Plus, Trash2, Calendar, Percent, DollarSign, Edit2 } from 'lucide-react';
import { NumberInput } from './ui/NumberInput';

interface Coupon {
  id: string;
  template_id: string;
  codigo: string;
  tipo_desconto: 'percentual' | 'valor_fixo';
  porcentagem: number | null;
  valor_fixo: number | null;
  validade: string | null;
  limite_uso: number | null;
  uso_atual: number;
  descricao: string;
  ativo: boolean;
  created_at: string;
}

interface CouponsManagerProps {
  templateId: string;
}

interface AddCouponModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (couponData: Partial<Coupon>) => void;
  editingCoupon: Coupon | null;
}

export function AddCouponModal({ isOpen, onClose, onSave, editingCoupon }: AddCouponModalProps) {
  const [codigo, setCodigo] = useState('');
  const [tipoDesconto, setTipoDesconto] = useState<'percentual' | 'valor_fixo'>('percentual');
  const [porcentagem, setPorcentagem] = useState(10);
  const [valorFixo, setValorFixo] = useState(0);
  const [validade, setValidade] = useState('');
  const [limiteUso, setLimiteUso] = useState<number | null>(null);
  const [descricao, setDescricao] = useState('');

  useEffect(() => {
    if (editingCoupon) {
      setCodigo(editingCoupon.codigo || '');
      setTipoDesconto(editingCoupon.tipo_desconto || 'percentual');
      setPorcentagem(editingCoupon.porcentagem || 0);
      setValorFixo(editingCoupon.valor_fixo || 0);
      setValidade(editingCoupon.validade ? editingCoupon.validade.split('T')[0] : '');
      setLimiteUso(editingCoupon.limite_uso);
      setDescricao(editingCoupon.descricao || '');
    } else {
      setCodigo('');
      setTipoDesconto('percentual');
      setPorcentagem(10);
      setValorFixo(0);
      setValidade('');
      setLimiteUso(null);
      setDescricao('');
    }
  }, [editingCoupon, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!codigo.trim()) {
      alert('Código é obrigatório');
      return;
    }

    if (tipoDesconto === 'percentual' && (porcentagem <= 0 || porcentagem > 100)) {
      alert('Percentual deve estar entre 1 e 100');
      return;
    }

    if (tipoDesconto === 'valor_fixo' && valorFixo <= 0) {
      alert('Valor fixo deve ser maior que 0');
      return;
    }

    onSave({
      id: editingCoupon?.id || undefined,
      codigo: codigo.trim().toUpperCase(),
      tipo_desconto: tipoDesconto,
      porcentagem: tipoDesconto === 'percentual' ? porcentagem : null,
      valor_fixo: tipoDesconto === 'valor_fixo' ? valorFixo : null,
      validade: validade || null,
      limite_uso: limiteUso,
      descricao: descricao.trim(),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Ticket className="w-6 h-6 text-blue-600" />
          {editingCoupon ? 'Editar Cupom' : 'Criar Novo Cupom'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Código do Cupom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código do Cupom *
            </label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="Ex: DESCONTO10, PROMO2024"
              required
              autoFocus
              maxLength={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase font-mono font-semibold"
            />
            <p className="text-xs text-gray-500 mt-1">
              Será convertido automaticamente para maiúsculas
            </p>
          </div>

          {/* Tipo de Desconto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Desconto *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoDesconto('percentual')}
                className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  tipoDesconto === 'percentual'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Percent className="w-6 h-6" />
                <span className="text-sm font-medium">Percentual</span>
              </button>
              <button
                type="button"
                onClick={() => setTipoDesconto('valor_fixo')}
                className={`p-3 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                  tipoDesconto === 'valor_fixo'
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-6 h-6" />
                <span className="text-sm font-medium">Valor Fixo</span>
              </button>
            </div>
          </div>

          {/* Valor do Desconto */}
          {tipoDesconto === 'percentual' ? (
            <div>
              <NumberInput
                label="Percentual de Desconto (%) *"
                value={porcentagem}
                onChange={setPorcentagem}
                min={1}
                max={100}
                step={1}
                suffix="%"
              />
              <p className="text-xs text-gray-500 mt-1">
                Entre 1% e 100%
              </p>
            </div>
          ) : (
            <div>
              <NumberInput
                label="Valor do Desconto (R$) *"
                value={valorFixo}
                onChange={setValorFixo}
                min={0}
                step={10}
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor fixo de desconto em reais
              </p>
            </div>
          )}

          {/* Data de Validade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              Data de Validade (Opcional)
            </label>
            <input
              type="date"
              value={validade}
              onChange={(e) => setValidade(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Deixe vazio para cupom sem data de expiração
            </p>
          </div>

          {/* Limite de Uso */}
          <div>
            <NumberInput
              label="Limite de Uso (Opcional)"
              value={limiteUso ?? 0}
              onChange={(value) => setLimiteUso(value > 0 ? value : null)}
              min={0}
              step={1}
              placeholder="Ilimitado"
            />
            <p className="text-xs text-gray-500 mt-1">
              Deixe em 0 para uso ilimitado
            </p>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição (Opcional)
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Promoção de Black Friday"
              rows={2}
              maxLength={200}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Máximo 200 caracteres
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {editingCoupon ? 'Atualizar Cupom' : 'Criar Cupom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CouponsManager({ templateId }: CouponsManagerProps) {
  const [cupons, setCupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Auto-hide notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    loadCupons();
  }, [templateId]);

  const loadCupons = async () => {
    try {
      const { data, error } = await supabase
        .from('cupons')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCupons(data || []);
    } catch (error) {
      console.error('Erro ao carregar cupons:', error);
      setNotification({
        message: 'Erro ao carregar cupons',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCoupon = async (couponData: Partial<Coupon>) => {
    try {
      if (couponData.id) {
        // Verificar se outro cupom já tem esse código
        const { data: existing } = await supabase
          .from('cupons')
          .select('id')
          .eq('template_id', templateId)
          .eq('codigo', couponData.codigo)
          .neq('id', couponData.id)
          .maybeSingle();

        if (existing) {
          setNotification({
            message: 'Código de cupom já existe',
            type: 'error'
          });
          return;
        }

        const { error } = await supabase
          .from('cupons')
          .update({
            codigo: couponData.codigo,
            tipo_desconto: couponData.tipo_desconto,
            porcentagem: couponData.porcentagem,
            valor_fixo: couponData.valor_fixo,
            validade: couponData.validade,
            limite_uso: couponData.limite_uso,
            descricao: couponData.descricao
          })
          .eq('id', couponData.id);

        if (error) throw error;

        setNotification({
          message: 'Cupom atualizado com sucesso',
          type: 'success'
        });
      } else {
        // Criar cupom
        const { data: existing } = await supabase
          .from('cupons')
          .select('codigo')
          .eq('template_id', templateId)
          .eq('codigo', couponData.codigo)
          .maybeSingle();

        if (existing) {
          setNotification({
            message: 'Código de cupom já existe',
            type: 'error'
          });
          return;
        }

        const { error } = await supabase
          .from('cupons')
          .insert({
            template_id: templateId,
            codigo: couponData.codigo,
            tipo_desconto: couponData.tipo_desconto,
            porcentagem: couponData.porcentagem,
            valor_fixo: couponData.valor_fixo,
            validade: couponData.validade,
            limite_uso: couponData.limite_uso,
            uso_atual: 0,
            descricao: couponData.descricao,
            ativo: true
          });

        if (error) throw error;

        setNotification({
          message: 'Cupom criado com sucesso',
          type: 'success'
        });
      }

      setShowAddModal(false);
      setEditingCoupon(null);
      loadCupons();
    } catch (error) {
      console.error('Erro ao salvar cupom:', error);
      setNotification({
        message: 'Erro ao salvar cupom',
        type: 'error'
      });
    }
  };

  const handleToggleActive = async (couponId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('cupons')
        .update({ ativo: !currentState })
        .eq('id', couponId);

      if (error) throw error;

      setNotification({
        message: !currentState ? 'Cupom ativado' : 'Cupom desativado',
        type: 'success'
      });

      loadCupons();
    } catch (error) {
      console.error('Erro ao atualizar cupom:', error);
      setNotification({
        message: 'Erro ao atualizar cupom',
        type: 'error'
      });
    }
  };

  const handleDelete = async (couponId: string) => {
    if (!confirm('Deseja realmente excluir este cupom?')) return;

    try {
      const { error } = await supabase
        .from('cupons')
        .delete()
        .eq('id', couponId);

      if (error) throw error;

      setNotification({
        message: 'Cupom excluído com sucesso',
        type: 'success'
      });

      loadCupons();
    } catch (error) {
      console.error('Erro ao excluir cupom:', error);
      setNotification({
        message: 'Erro ao excluir cupom',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${
            notification.type === 'success'
              ? 'bg-green-600 text-white'
              : notification.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 text-white'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-5 h-5 text-blue-600" />
            Cupons de Desconto
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Crie e gerencie cupons para seus clientes
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCoupon(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Cupom
        </button>
      </div>

      {/* Lista de Cupons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cupons.map((cupom) => {
          const isExpired = cupom.validade && new Date(cupom.validade) < new Date();
          const isLimitReached = cupom.limite_uso && cupom.uso_atual >= cupom.limite_uso;

          return (
            <div
              key={cupom.id}
              className={`border rounded-lg p-4 transition-all ${
                !cupom.ativo || isExpired || isLimitReached
                  ? 'bg-gray-50 dark:bg-slate-900/10 border-gray-200 dark:border-slate-800'
                  : 'bg-white dark:bg-[#0a1628] border-blue-200 dark:border-blue-900'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-lg text-gray-900 dark:text-white font-mono uppercase tracking-wide truncate">
                    {cupom.codigo}
                  </div>
                  {cupom.descricao && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {cupom.descricao}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      setEditingCoupon(cupom);
                      setShowAddModal(true);
                    }}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
                    title="Editar cupom"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cupom.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-gray-100 dark:hover:bg-slate-800"
                    title="Excluir cupom"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Desconto */}
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 mb-3">
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2">
                  {cupom.tipo_desconto === 'percentual' ? (
                    <>
                      <Percent className="w-5 h-5 shrink-0" />
                      {cupom.porcentagem}% OFF
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5 shrink-0" />
                      R$ {cupom.valor_fixo?.toFixed(2)} OFF
                    </>
                  )}
                </div>
              </div>

              {/* Detalhes */}
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-450">
                {/* Validade */}
                {cupom.validade && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>
                      Válido até {new Date(cupom.validade).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}

                {/* Uso */}
                {cupom.limite_uso && (
                  <div>
                    Uso: {cupom.uso_atual} / {cupom.limite_uso}
                    {isLimitReached && (
                      <span className="ml-2 text-red-600 dark:text-red-450 font-medium">(Esgotado)</span>
                    )}
                  </div>
                )}

                {!cupom.limite_uso && cupom.uso_atual > 0 && (
                  <div>
                    Usado {cupom.uso_atual} {cupom.uso_atual === 1 ? 'vez' : 'vezes'}
                  </div>
                )}

                {/* Status */}
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                  {isExpired ? (
                    <span className="text-red-600 font-medium">Expirado</span>
                  ) : isLimitReached ? (
                    <span className="text-orange-600 font-medium">Limite Atingido</span>
                  ) : (
                    <button
                      onClick={() => handleToggleActive(cupom.id, cupom.ativo)}
                      className={`text-sm font-medium transition-colors ${
                        cupom.ativo
                          ? 'text-green-600 hover:text-green-700 dark:text-green-450 dark:hover:text-green-400'
                          : 'text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                      }`}
                    >
                      {cupom.ativo ? '✓ Ativo' : '○ Inativo'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {cupons.length === 0 && (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-900/10 border-2 border-dashed border-gray-300 dark:border-slate-800 rounded-lg">
          <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhum cupom cadastrado
          </h4>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Crie seu primeiro cupom de desconto para oferecer aos seus clientes
          </p>
          <button
            onClick={() => {
              setEditingCoupon(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            <Plus className="w-5 h-5" />
            Criar Primeiro Cupom
          </button>
        </div>
      )}

      {/* Modal */}
      <AddCouponModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingCoupon(null);
        }}
        onSave={handleSaveCoupon}
        editingCoupon={editingCoupon}
      />
    </div>
  );
}
