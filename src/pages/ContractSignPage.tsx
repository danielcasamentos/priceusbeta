import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ContractCanvas } from '../components/ContractCanvas';
import { FileSignature, AlertTriangle, CheckCircle, Clock, ExternalLink, Smartphone } from 'lucide-react';
import { replaceContractVariables, type BusinessSettings, type ClientData, type LeadData } from '../lib/contractVariables';
import { isInAppBrowser } from '../lib/browserDetection';

interface Contract {
  id: string;
  template_id: string;
  lead_id: string;
  user_id: string;
  token: string;
  lead_data_json: any;
  client_data_json: any;
  user_data_json: any;
  user_signature_base64: string;
  signature_base64?: string;
  status: 'pending' | 'preview' | 'signed' | 'expired';
  pdf_url?: string;
  expires_at: string;
  created_at: string;
  signed_at?: string;
  client_ip?: string;
}

interface ContractTemplate {
  id: string;
  name: string;
  content_text: string;
}

// Funções de validação CPF/CNPJ
const cleanDocument = (value: string) => value.replace(/\D/g, '');

const formatDocument = (value: string) => {
  const cleaned = cleanDocument(value);
  if (cleaned.length <= 11) {
    // CPF: 000.000.000-00
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else {
    // CNPJ: 00.000.000/0000-00
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
};

const isValidCpf = (str: string) => {
  const cpf = cleanDocument(str);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0, remainder;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf.charAt(i)) * (10 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf.charAt(i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(cpf.charAt(10));
};

const isValidCnpj = (str: string) => {
  const cnpj = cleanDocument(str);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const weights1 = [6,5,4,3,2,9,8,7,6,5,4,3,2];
  const weights2 = [5,4,3,2,9,8,7,6,5,4,3,2,1];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(cnpj.charAt(i)) * weights1[i];
  let remainder = sum % 11;
  let digit1 = remainder < 2 ? 0 : 11 - remainder;
  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(cnpj.charAt(i)) * weights2[i];
  remainder = sum % 11;
  let digit2 = remainder < 2 ? 0 : 11 - remainder;
  return parseInt(cnpj.charAt(12)) === digit1 && parseInt(cnpj.charAt(13)) === digit2;
};

const isValidDocument = (value: string) => {
  const cleaned = cleanDocument(value);
  return cleaned.length === 11 ? isValidCpf(value) : cleaned.length === 14 ? isValidCnpj(value) : false;
};

const isCpf = (value: string) => cleanDocument(value).length === 11;

export function ContractSignPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({});
  const [processedContent, setProcessedContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signing, setSigning] = useState(false);
  const [isInApp, setIsInApp] = useState(false);

  const [clientData, setClientData] = useState({
    nome_completo: '',
    documento: '',
    rg: '',
    endereco_completo: '',
    cep: '',
    data_evento: '',
    cidade_evento: '',
    local_evento: '',
    endereco_evento: '',
    horario_inicio: '',
    observacoes: '',
  });
  const [showRg, setShowRg] = useState(false);

  const [signature, setSignature] = useState<string | null>(null);
  const [userSignature, setUserSignature] = useState<string | null>(null);

  useEffect(() => {
    loadContract();
    setIsInApp(isInAppBrowser());
  }, [token]);

  useEffect(() => {
    if (template && contract) {
      const leadData: LeadData = contract.lead_data_json || {};
      const currentClientData: ClientData = clientData;

      console.log('=== DEBUG CONTRACT SIGN PAGE ===');
      console.log('Lead Data:', leadData);
      console.log('Client Data:', currentClientData);
      console.log('Business Settings:', businessSettings);
      console.log('Template Content:', template.content_text.substring(0, 200));

      const processed = replaceContractVariables(
        template.content_text,
        businessSettings,
        currentClientData,
        leadData
      );

      console.log('Processed Content:', processed.substring(0, 500));
      setProcessedContent(processed);
    }
  }, [template, contract, businessSettings, clientData]);

  // Detecta tipo documento para mostrar/esconder RG
  useEffect(() => {
    const cleaned = cleanDocument(clientData.documento);
    setShowRg(cleaned.length === 11);
  }, [clientData.documento]);

  const loadContract = async () => {
    if (!token) {
      setError('Token inválido');
      setLoading(false);
      return;
    }

    try {
      // 🔥 CORREÇÃO: Usar uma função RPC para buscar todos os dados de uma vez.
      // Isso é mais performático e contorna problemas de RLS para usuários não autenticados.
      const { data: contractBundle, error: rpcError } = await supabase
        .rpc('get_public_contract_data', { p_token: token })
        .single();

      if (rpcError) throw rpcError;

      if (!contractBundle || !contractBundle.contract) {
        setError('Contrato não encontrado ou inválido. Verifique o link ou peça para o profissional gerar um novo.');
        setLoading(false);
        return;
      }

      const { contract: contractData, template: templateData, business_settings: businessData } = contractBundle;

      const expiresAt = new Date(contractData.expires_at);
      if (expiresAt < new Date()) {
        setError(`Este link de contrato expirou em ${expiresAt.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}. Por favor, solicite um novo link.`);
        setLoading(false);
        return;
      }

      if (contractData.status !== 'pending') {
        setError('Este contrato já foi assinado ou não está mais disponível para assinatura.');
        setLoading(false);
        return;
      }

      setContract(contractData);
      setTemplate(templateData);
      setBusinessSettings(businessData || {});

      if (contractData.user_signature_base64) {
        setUserSignature(contractData.user_signature_base64);
      }

    if (contractData.lead_data_json) {
      const leadJson = contractData.lead_data_json;
      setClientData((prev) => ({
        ...prev,
        nome_completo: leadJson.nome_cliente || prev.nome_completo,
        data_evento: leadJson.data_evento || prev.data_evento,
        cidade_evento: leadJson.cidade_evento || leadJson.cidade || prev.cidade_evento,
      }));
    }
    } catch (err) {
      console.error('Erro ao carregar contrato:', err);
      setError('Erro ao carregar contrato. Verifique o link ou tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Carregando contrato...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ops!</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // 🔥 handleSign atualizado
  const handleSign = async () => {
    if (!signature) {
      alert('Por favor, assine o contrato');
      return;
    }

    if (!clientData.nome_completo || !clientData.documento || !isValidDocument(clientData.documento)) {
      alert('Preencha nome, documento válido (CPF/CNPJ)');
      return;
    }

    setSigning(true);

    try {
      const clientIp = await fetch('https://api.ipify.org?format=json')
        .then((r) => r.json())
        .then((d) => d.ip)
        .catch(() => 'unknown');

      // Navega para a página de preview, passando os dados preenchidos no estado da rota
      navigate(`/contrato/${token}/preview`, {
        state: {
          clientData,
          clientSignature: signature,
          clientIp,
        },
      });

    } catch (err) {
      console.error('Erro ao obter IP ou navegar:', err);
      alert('Ocorreu um erro ao prosseguir. Verifique sua conexão.');
      setSigning(false);
    }
    // O signing será resetado na próxima página
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      {isInApp && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-4 mx-4 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center">
            <Smartphone className="w-5 h-5 text-yellow-700 mb-2 sm:mb-0 sm:mr-2 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Você está usando um navegador integrado (Instagram/Facebook)
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Para uma melhor experiência, abra este link em um navegador externo como Chrome ou Safari.
              </p>
            </div>
            <button
              onClick={() => window.open(window.location.href, '_blank')}
              className="mt-3 sm:mt-0 sm:ml-3 bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm flex items-center justify-center gap-1 touch-manipulation min-h-[44px]"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir
            </button>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          <div className="bg-blue-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <FileSignature className="w-8 h-8" />
              <h1 className="text-2xl font-bold">{template?.name}</h1>
            </div>
            <p className="text-blue-100">Leia atentamente e assine digitalmente</p>
          </div>

          <div className="p-6 space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-1">Validade do Contrato</p>
                <p>Este contrato expira em: {new Date(contract!.expires_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-gray-50 max-h-96 overflow-y-auto">
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{
                  __html: processedContent || template?.content_text || '',
                }}
              >
              </div>
            </div>

            {userSignature && (
              <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
                <h3 className="text-sm font-bold text-blue-900 mb-3">Assinatura do Contratado</h3>
                <div className="bg-white rounded p-4 inline-block">
                  <img
                    src={userSignature}
                    alt="Assinatura do Fornecedor"
                    className="max-w-xs h-auto"
                  />
                </div>
                {contract?.user_data_json?.business_name && (
                  <p className="text-sm text-blue-800 mt-2">
                    {contract.user_data_json.business_name}
                    {contract.user_data_json.person_type === 'fisica' && contract.user_data_json.cpf && (
                      <> - CPF: {contract.user_data_json.cpf}</>
                    )}
                    {contract.user_data_json.person_type === 'juridica' && contract.user_data_json.cnpj && (
                      <> - CNPJ: {contract.user_data_json.cnpj}</>
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Dados do Contratante</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={clientData.nome_completo}
                    onChange={(e) => setClientData({ ...clientData, nome_completo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CPF ou CNPJ *</label>
                  <input
                    type="tel"
                    value={formatDocument(clientData.documento)}
                    onChange={(e) => setClientData({ ...clientData, documento: e.target.value })}
                    className={`w-full px-4 py-3 border rounded-lg text-base focus:ring-2 focus:ring-blue-500 transition-all ${
                      clientData.documento && !isValidDocument(clientData.documento)
                        ? 'border-red-300 focus:ring-red-500 bg-red-50'
                        : 'border-gray-300 focus:ring-blue-500 hover:border-gray-400'
                    }`}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  />
                </div>

                {showRg && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">RG</label>
                    <input
                      type="text"
                      value={clientData.rg}
                      onChange={(e) => setClientData({ ...clientData, rg: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data do Evento</label>
                  <input
                    type="date"
                    value={clientData.data_evento}
                    onChange={(e) => setClientData({ ...clientData, data_evento: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cidade do Evento</label>
                  <input
                    type="text"
                    value={clientData.cidade_evento}
                    onChange={(e) => setClientData({ ...clientData, cidade_evento: e.target.value })}
                    placeholder="Ex: São Paulo"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Endereço Completo</label>
                  <input
                    type="text"
                    value={clientData.endereco_completo}
                    onChange={(e) => setClientData({ ...clientData, endereco_completo: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CEP</label>
                  <input
                    type="tel"
                    value={clientData.cep}
                    onChange={(e) => setClientData({ ...clientData, cep: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                    placeholder="00000-000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Local do Evento</label>
                  <input
                    type="text"
                    value={clientData.local_evento}
                    onChange={(e) => setClientData({ ...clientData, local_evento: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Endereço do Evento</label>
                  <input
                    type="text"
                    value={clientData.endereco_evento}
                    onChange={(e) => setClientData({ ...clientData, endereco_evento: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Horário de Início</label>
                  <input
                    type="time"
                    value={clientData.horario_inicio}
                    onChange={(e) => setClientData({ ...clientData, horario_inicio: e.target.value })}
                    placeholder="HH:MM"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Observações</label>
                  <textarea
                    value={clientData.observacoes}
                    onChange={(e) => setClientData({ ...clientData, observacoes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-base"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Assinatura Digital *</h3>
              <p className="text-sm text-gray-600 mb-4">
                Assine no campo abaixo usando o mouse ou touch
              </p>
              <div className="w-full max-w-md mx-auto">
                <ContractCanvas onSignatureChange={setSignature} />
              </div>
            </div>

            <button
              onClick={handleSign}
              disabled={signing || !signature || !clientData.nome_completo || !clientData.documento || !isValidDocument(clientData.documento)}
              className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-blue-600 hover:bg-blue-700 active:opacity-90 text-white px-6 py-4 sm:py-5 rounded-lg font-semibold text-base sm:text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl min-h-[56px] touch-manipulation"
            >
              {signing ? 'Processando...' : 'Revisar e Assinar Contrato'}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Ao assinar, você concorda com os termos e condições descritos neste contrato
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
