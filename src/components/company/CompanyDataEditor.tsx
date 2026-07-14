import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Save, AlertCircle, CheckCircle, PenTool, CreditCard, Tag, Plus, Edit2, Trash2, Loader2, Check, X } from 'lucide-react';
import { MaskedInput } from '../MaskedInput';
import { ContractCanvas } from '../ContractCanvas';

interface BusinessSettings {
  person_type: 'fisica' | 'juridica';
  business_name: string;
  cpf: string;
  cnpj: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  signature_base64: string | null;
  signature_created_at: string | null;
  pix_key?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: string;
  additional_info?: {
    pix_type?: string;
    pix_holder?: string;
    fine_rate?: number;
    interest_rate?: number;
    grace_period_days?: number;
  } | null;
}

interface CompanyDataEditorProps {
  userId: string;
}

export function CompanyDataEditor({ userId }: CompanyDataEditorProps) {
  const [settings, setSettings] = useState<BusinessSettings>({
    person_type: 'juridica',
    business_name: '',
    cpf: '',
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    phone: '',
    email: '',
    signature_base64: null,
    signature_created_at: null,
    pix_key: '',
    bank_name: '',
    bank_agency: '',
    bank_account: '',
    bank_account_type: '',
    additional_info: {
      pix_type: 'CPF',
      pix_holder: '',
      fine_rate: 0,
      interest_rate: 0,
      grace_period_days: 0,
    },
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [userCategories, setUserCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'receita' | 'despesa'>('receita');
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('company_categories')
        .select('*')
        .eq('user_id', userId)
        .order('nome');
      if (error) throw error;
      setUserCategories(data || []);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCategoryLoading(true);
    try {
      const { error } = await supabase.from('company_categories').insert({
        user_id: userId,
        nome: newCategoryName.trim(),
        tipo: newCategoryType,
        cor: newCategoryType === 'receita' ? '#22c55e' : '#ef4444'
      });
      if (error) throw error;
      setNewCategoryName('');
      await loadCategories();
    } catch (err) {
      console.error(err);
      alert('Erro ao adicionar categoria.');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Deseja excluir esta categoria? Transações associadas perderão a categoria.')) return;
    setCategoryLoading(true);
    try {
      const { error } = await supabase
        .from('company_categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      await loadCategories();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir categoria.');
    } finally {
      setCategoryLoading(false);
    }
  };

  const startEditCategory = (id: string, currentNome: string) => {
    setEditingCategoryId(id);
    setEditingCategoryName(currentNome);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditingCategoryName('');
  };

  const handleSaveEditCategory = async (id: string) => {
    if (!editingCategoryName.trim()) return;
    setCategoryLoading(true);
    try {
      const { error } = await supabase
        .from('company_categories')
        .update({ nome: editingCategoryName.trim() })
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
      setEditingCategoryId(null);
      setEditingCategoryName('');
      await loadCategories();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar edição.');
    } finally {
      setCategoryLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
    loadCategories();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('user_business_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          person_type: data.person_type || 'juridica',
          business_name: data.business_name || '',
          cpf: data.cpf || '',
          cnpj: data.cnpj || '',
          address: data.address || '',
          city: data.city || '',
          state: data.state || '',
          zip_code: data.zip_code || '',
          phone: data.phone || '',
          email: data.email || '',
          signature_base64: data.signature_base64 || null,
          signature_created_at: data.signature_created_at || null,
          pix_key: data.pix_key || '',
          bank_name: data.bank_name || '',
          bank_agency: data.bank_agency || '',
          bank_account: data.bank_account || '',
          bank_account_type: data.bank_account_type || '',
          additional_info: data.additional_info || { pix_type: 'CPF', pix_holder: '', fine_rate: 0, interest_rate: 0, grace_period_days: 0 },
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignatureChange = (signatureData: string | null) => {
    setSettings({
      ...settings,
      signature_base64: signatureData,
      signature_created_at: signatureData ? new Date().toISOString() : null,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { data: existing } = await supabase
        .from('user_business_settings')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from('user_business_settings').update(settings).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('user_business_settings').insert({ user_id: userId, ...settings });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6 text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dados Empresariais</h2>
          <p className="text-sm text-gray-600">Estas informações serão usadas automaticamente nos seus contratos</p>
        </div>
      </div>

      {message && (
        <div className={`rounded-lg p-4 flex items-start gap-3 ${message.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
          <p className={`text-sm ${message.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Pessoa</label>
          <div className="flex gap-4">
            <label className="flex items-center cursor-pointer">
              <input type="radio" value="fisica" checked={settings.person_type === 'fisica'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, person_type: e.target.value as 'fisica' | 'juridica' })} className="mr-2" />
              <span>Pessoa Física (CPF)</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input type="radio" value="juridica" checked={settings.person_type === 'juridica'} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, person_type: e.target.value as 'fisica' | 'juridica' })} className="mr-2" />
              <span>Pessoa Jurídica (CNPJ)</span>
            </label>
          </div>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">{settings.person_type === 'fisica' ? 'Nome Completo' : 'Nome da Empresa / Razão Social'}</label>
          <input type="text" value={settings.business_name} onChange={(e) => setSettings({ ...settings, business_name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        {settings.person_type === 'fisica' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CPF</label>
            <MaskedInput mask="999.999.999-99" value={settings.cpf} onChange={(e) => setSettings({ ...settings, cpf: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ</label>
            <MaskedInput mask="99.999.999/9999-99" value={settings.cnpj} onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Telefone</label>
          <MaskedInput mask="(99) 9 9999-9999" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Endereço Completo</label>
          <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Cidade</label>
          <input type="text" value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
          <input type="text" value={settings.state} onChange={(e) => setSettings({ ...settings, state: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" maxLength={2} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
          <MaskedInput mask="99999-999" value={settings.zip_code} onChange={(e) => setSettings({ ...settings, zip_code: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
        </div>
      </div>

      <div className="border-t pt-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Dados para Recebimento (PIX e Banco)</h3>
            <p className="text-sm text-gray-600">Essas informações serão incluídas nos seus lembretes de cobrança via WhatsApp</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Chave PIX</label>
            <select
              value={settings.additional_info?.pix_type || 'CPF'}
              onChange={(e) => setSettings({
                ...settings,
                additional_info: {
                  ...(settings.additional_info || {}),
                  pix_type: e.target.value
                }
              })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
              <option value="Celular">Celular</option>
              <option value="E-mail">E-mail</option>
              <option value="Chave Aleatória">Chave Aleatória</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chave PIX</label>
            <input
              type="text"
              value={settings.pix_key || ''}
              onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })}
              placeholder="Sua chave PIX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Titular da Conta / PIX (para conferência)</label>
            <input
              type="text"
              value={settings.additional_info?.pix_holder || ''}
              onChange={(e) => setSettings({
                ...settings,
                additional_info: {
                  ...(settings.additional_info || {}),
                  pix_holder: e.target.value
                }
              })}
              placeholder="Nome do titular do PIX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Banco</label>
            <input
              type="text"
              value={settings.bank_name || ''}
              onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              placeholder="Ex: Banco do Brasil, Nubank..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Agência</label>
            <input
              type="text"
              value={settings.bank_agency || ''}
              onChange={(e) => setSettings({ ...settings, bank_agency: e.target.value })}
              placeholder="Ex: 0001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Conta</label>
            <input
              type="text"
              value={settings.bank_account || ''}
              onChange={(e) => setSettings({ ...settings, bank_account: e.target.value })}
              placeholder="Ex: 12345-6"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Conta</label>
            <select
              value={settings.bank_account_type || 'Corrente'}
              onChange={(e) => setSettings({ ...settings, bank_account_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="Corrente">Corrente</option>
              <option value="Poupança">Poupança</option>
              <option value="Pagamento">Conta de Pagamento</option>
            </select>
          </div>
        </div>

        {/* Multa e Juros por Atraso */}
        <div className="border-t border-gray-100 mt-6 pt-6 animate-in fade-in duration-200">
          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-3">Multas e Juros por Atraso (Opcional)</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Multa por Atraso (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={settings.additional_info?.fine_rate ?? ''}
                onChange={(e) => setSettings({
                  ...settings,
                  additional_info: {
                    ...(settings.additional_info || {}),
                    fine_rate: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="Ex: 2.0"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Percentual único aplicado logo após o vencimento</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Juros Diário (%)</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={settings.additional_info?.interest_rate ?? ''}
                onChange={(e) => setSettings({
                  ...settings,
                  additional_info: {
                    ...(settings.additional_info || {}),
                    interest_rate: parseFloat(e.target.value) || 0
                  }
                })}
                placeholder="Ex: 0.033"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Percentual de juros por cada dia corrido de atraso</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Carência de Cobrança (Dias)</label>
              <input
                type="number"
                min="0"
                value={settings.additional_info?.grace_period_days ?? ''}
                onChange={(e) => setSettings({
                  ...settings,
                  additional_info: {
                    ...(settings.additional_info || {}),
                    grace_period_days: parseInt(e.target.value, 10) || 0
                  }
                })}
                placeholder="Ex: 5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500 mt-1">Dias de tolerância antes de calcular multa e juros</p>
            </div>
          </div>
        </div>
      </div>

       {/* Card de Categorias Financeiras */}
        <div className="border-t pt-6">
          <div className="flex items-center gap-3 mb-2">
            <Tag className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-gray-900">Categorias de Trabalhos e Despesas</h3>
              <p className="text-sm text-gray-600">Personalize as categorias que utiliza para classificar seus trabalhos (receitas) e gastos (despesas) no sistema financeiro.</p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-[rgba(255,255,255,0.01)] rounded-xl border dark:border-[rgba(255,255,255,0.05)] p-5 space-y-6 mt-4">
            {/* Formulário de Adicionar Categoria */}
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Ensaios, Casamentos, Equipamentos..."
                className="flex-1 px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none"
              />
              <select
                value={newCategoryType}
                onChange={(e) => setNewCategoryType(e.target.value as any)}
                className="px-4 py-2 bg-white dark:bg-[#07101f] border border-gray-300 dark:border-[rgba(255,255,255,.08)] text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 text-sm outline-none"
              >
                <option value="receita">Trabalhos (Receita)</option>
                <option value="despesa">Despesas (Saída)</option>
              </select>
              <button
                type="button"
                onClick={handleAddCategory}
                disabled={categoryLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors flex items-center justify-center gap-1 shrink-0"
              >
                {categoryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </button>
            </div>

            {/* Listagem split de Receitas e Despesas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Receitas */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-300 text-xs uppercase tracking-wider">Trabalhos / Receitas</h4>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {userCategories.filter(c => c.tipo === 'receita').map(c => (
                    <div key={c.id} className="flex justify-between items-center p-2.5 bg-white dark:bg-[#07101f] border dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm hover:border-gray-300 dark:hover:border-[rgba(255,255,255,0.1)] transition-colors">
                      {editingCategoryId === c.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-1 px-2 py-0.5 border dark:border-[rgba(255,255,255,0.1)] rounded text-xs dark:bg-[#0a1628] dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button type="button" onClick={() => handleSaveEditCategory(c.id)} className="text-green-500 hover:text-green-600 transition-colors p-0.5"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={cancelEditCategory} className="text-gray-400 hover:text-gray-500 transition-colors p-0.5"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-700 dark:text-gray-300 truncate pr-2">{c.nome}</span>
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => startEditCategory(c.id, c.nome)} className="text-gray-400 hover:text-blue-500 transition-colors p-0.5"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleDeleteCategory(c.id)} className="text-gray-400 hover:text-red-500 transition-colors p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {userCategories.filter(c => c.tipo === 'receita').length === 0 && (
                    <p className="text-xs text-gray-400 italic">Nenhuma categoria de trabalho.</p>
                  )}
                </div>
              </div>

              {/* Despesas */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                  <h4 className="font-bold text-gray-800 dark:text-gray-300 text-xs uppercase tracking-wider">Despesas / Gastos</h4>
                </div>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {userCategories.filter(c => c.tipo === 'despesa').map(c => (
                    <div key={c.id} className="flex justify-between items-center p-2.5 bg-white dark:bg-[#07101f] border dark:border-[rgba(255,255,255,0.05)] rounded-lg text-sm hover:border-gray-300 dark:hover:border-[rgba(255,255,255,0.1)] transition-colors">
                      {editingCategoryId === c.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            className="flex-1 px-2 py-0.5 border dark:border-[rgba(255,255,255,0.1)] rounded text-xs dark:bg-[#0a1628] dark:text-white outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                          />
                          <button type="button" onClick={() => handleSaveEditCategory(c.id)} className="text-green-500 hover:text-green-600 transition-colors p-0.5"><Check className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={cancelEditCategory} className="text-gray-400 hover:text-gray-500 transition-colors p-0.5"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : (
                        <>
                          <span className="text-gray-700 dark:text-gray-300 truncate pr-2">{c.nome}</span>
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => startEditCategory(c.id, c.nome)} className="text-gray-400 hover:text-blue-500 transition-colors p-0.5"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button type="button" onClick={() => handleDeleteCategory(c.id)} className="text-gray-400 hover:text-red-500 transition-colors p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {userCategories.filter(c => c.tipo === 'despesa').length === 0 && (
                    <p className="text-xs text-gray-400 italic">Nenhuma categoria de despesa.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
        <div className="flex items-center gap-3 mb-4">
          <PenTool className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Assinatura Digital</h3>
            <p className="text-sm text-gray-600">Sua assinatura será incluída automaticamente em todos os contratos</p>
          </div>
        </div>
        {settings.signature_base64 ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Assinatura Atual:</p>
              <img src={settings.signature_base64} alt="Assinatura" className="border-2 border-gray-300 rounded bg-white p-4 max-w-md" />
              {settings.signature_created_at && <p className="text-xs text-gray-500 mt-2">Criada em: {new Date(settings.signature_created_at).toLocaleDateString('pt-BR')}</p>}
            </div>
            <button type="button" onClick={() => handleSignatureChange(null)} className="px-4 py-2 text-sm text-red-600 hover:text-red-800">Criar Nova Assinatura</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">Assine no campo abaixo usando o mouse ou toque na tela.</p>
            </div>
            <ContractCanvas onSignatureChange={handleSignatureChange} />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-6 border-t">
        <button onClick={handleSave} disabled={saving} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
          {saving ? 'Salvando...' : <><Save className="w-5 h-5 inline mr-2" />Salvar Configurações</>}
        </button>
      </div>
    </div>
  );
}