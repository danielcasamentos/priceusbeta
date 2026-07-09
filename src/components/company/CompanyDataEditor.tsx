import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Building2, Save, AlertCircle, CheckCircle, PenTool, CreditCard } from 'lucide-react';
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

  useEffect(() => {
    loadSettings();
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