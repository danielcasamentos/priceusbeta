import { useState, useEffect, useRef } from 'react';
import { X, FileText, User, Calendar, DollarSign, ExternalLink, Printer, Loader2, Fingerprint } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { QRCodeCanvas } from 'qrcode.react';
import { replaceContractVariables, type BusinessSettings, type ClientData, type LeadData } from '../lib/contractVariables';

interface Contract {
  id: string;
  status: 'pending' | 'signed' | 'expired';
  created_at: string;
  token: string;
  signed_at: string | null;
  user_id: string; // Adicionado para buscar dados do usuário
  lead_data_json: {
    nome_cliente: string;
    data_evento?: string;
    valor_total?: number;
  };
  client_data_json?: {
    cpf?: string;
    email?: string;
    [key: string]: any; // Permite outras propriedades
  };
  user_signature_base64: string; // Assinatura do profissional
  signature_base64?: string; // Assinatura do cliente
  user_data_json: any;
  contract_templates: {
    name: string;
    content_text?: string; // Opcional inicialmente
    template_id?: string; // Adicionado para consistência
  };
}

interface ContractTemplate {
  id: string;
  name: string;
  content_text: string;
}

interface ContractViewerModalProps {
  contract: Contract;
  onClose: () => void;
}

export function ContractViewerModal({ contract, onClose }: ContractViewerModalProps) {
  const getStatusInfo = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      signed: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Pendente',
      signed: 'Assinado',
      expired: 'Expirado',
    };
    return { style: styles[status] || 'bg-gray-100', label: labels[status] || status };
  };

  const statusInfo = getStatusInfo(contract.status);

  // Estados para a nova funcionalidade
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [processedContent, setProcessedContent] = useState('');
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({});
  const contractContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadFullContractData();
  }, [contract.id]);

  useEffect(() => {
    if (template && businessSettings) {
      const leadData: LeadData = contract.lead_data_json || {};
      const clientData: ClientData = contract.client_data_json || {};

      const finalContent = replaceContractVariables(
        template.content_text,
        businessSettings,
        clientData,
        leadData
      );
      setProcessedContent(finalContent);
    }
  }, [template, businessSettings, contract]);

  const loadFullContractData = async () => {
    setLoadingDetails(true);
    try {
      // 1. Buscar o conteúdo do template do contrato
      const { data: templateData, error: templateError } = await supabase
        .from('contract_templates')
        .select('id, name, content_text')
        .eq('id', contract.template_id)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // 2. Buscar as configurações da empresa (usuário)
      const { data: businessData, error: businessError } = await supabase
        .from('user_business_settings')
        .select('*')
        .eq('user_id', contract.user_id)
        .single();

      if (businessError) throw businessError;
      setBusinessSettings(businessData || {});

    } catch (error) {
      console.error("Erro ao carregar detalhes completos do contrato:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // 🔥 NOVA FUNÇÃO: Abre a página de preview em modo de impressão
  const handleViewAndPrint = () => {
    const url = `/contrato/${contract.token}/preview`;
    const state = {
      clientData: contract.client_data_json,
      clientSignature: contract.signature_base64,
      action: 'print', // Sinaliza para a página de preview acionar a impressão
    };

    // Abre em uma nova aba e passa o estado
    const newWindow = window.open(url, '_blank');
    if (newWindow) newWindow.history.replaceState(state, '');
  };

  // Componente para renderizar o conteúdo do contrato (usado para o PDF)
  const ContractRenderContent = () => (
    <div ref={contractContentRef} className="hidden">
      <div dangerouslySetInnerHTML={{ __html: processedContent }} />
      <div style={{ marginTop: '50pt', textAlign: 'center', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', paddingTop: '4rem' }}>
        <div>
          {contract.user_signature_base64 && <img src={contract.user_signature_base64} alt="Assinatura do Contratado" style={{ margin: '0 auto', height: '80px' }} />}
          <div style={{ borderBottom: '1px solid #000', width: '300px', margin: '0 auto 5pt auto' }}></div>
          <p style={{ fontSize: '10pt' }}>{contract.user_data_json?.business_name || 'Contratado'}</p>
        </div>
        <div>
          {contract.signature_base64 && <img src={contract.signature_base64} alt="Assinatura do Contratante" style={{ margin: '0 auto', height: '80px' }} />}
          <div style={{ borderBottom: '1px solid #000', width: '300px', margin: '0 auto 5pt auto' }}></div>
          <p style={{ fontSize: '10pt' }}>{contract.lead_data_json?.nome_cliente || 'Contratante'}</p>
        </div>
      </div>

      {/* 🔥 NOVO: Carimbo de Autenticação Digital */}
      {contract.status === 'signed' && (
        <div style={{ marginTop: '60pt', paddingTop: '20pt', borderTop: '1px dashed #ccc', fontSize: '9pt', color: '#555', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'center' }}>
          <div>
            <h4 style={{ fontWeight: 'bold', marginBottom: '15pt', fontSize: '11pt' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span>Carimbo de Autenticação Digital</span>
            </h4>
            <p><strong>ID do Contrato:</strong> <span style={{ fontFamily: 'monospace' }}>{contract.id}</span></p>
            <p><strong>Data e Hora da Assinatura:</strong> {contract.signed_at ? format(new Date(contract.signed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }) : 'N/A'}</p>
            <p><strong>Endereço IP do Assinante:</strong> {contract.client_ip || 'Não registrado'}</p>
            <p>
              <strong>Assinado por:</strong> {contract.client_data_json?.nome_completo || contract.lead_data_json.nome_cliente}
              {contract.client_data_json?.cpf && ` (CPF: ${contract.client_data_json.cpf})`}
            </p>
            <p style={{ marginTop: '10pt', fontStyle: 'italic' }}>Este documento foi assinado eletronicamente através da plataforma PriceUs.</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <QRCodeCanvas
              value={`${window.location.origin}/verificar/${contract.token}`}
              size={100}
              bgColor={"#ffffff"}
              fgColor={"#000000"}
              level={"L"}
              includeMargin={true}
            />
            <p style={{ marginTop: '5px', fontSize: '8pt' }}>Verifique a autenticidade</p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Detalhes do Contrato</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2"><User size={16} /> Cliente</h3>
              <p className="font-bold text-gray-900">{contract.lead_data_json.nome_cliente}</p>
              {contract.client_data_json?.cpf && <p className="text-sm text-gray-600">CPF: {contract.client_data_json.cpf}</p>}
              {contract.client_data_json?.email && <p className="text-sm text-gray-600">{contract.client_data_json.email}</p>}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2"><FileText size={16} /> Contrato</h3>
              <p className="font-bold text-gray-900">{contract.contract_templates.name}</p>
              <p className={`text-sm font-bold inline-block px-2 py-1 rounded-full mt-1 ${statusInfo.style}`}>{statusInfo.label}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2"><Calendar size={16} /> Data do Serviço</h3>
              <p className="font-bold text-gray-900">
                {contract.lead_data_json.data_evento ? format(new Date(contract.lead_data_json.data_evento + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2"><DollarSign size={16} /> Valor</h3>
              <p className="font-bold text-gray-900">{formatCurrency(contract.lead_data_json.valor_total || 0)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-500 mb-2">Assinado em</h3>
              <p className="font-bold text-gray-900">
                {contract.signed_at ? format(new Date(contract.signed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Aguardando'}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <a 
              href={`/contrato/${contract.token}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-between text-blue-700 hover:text-blue-900 font-semibold"
            >
              Ver página pública do contrato
              <ExternalLink size={16} />
            </a>
          </div>

          {/* 🔥 NOVO: Preview do Contrato */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Pré-visualização do Contrato</h3>
            {loadingDetails ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 mx-auto animate-spin text-blue-600" />
                <p className="text-sm text-gray-500 mt-2">Carregando conteúdo...</p>
              </div>
            ) : (
              <div
                className="prose prose-sm max-w-none border rounded-lg p-4 max-h-80 overflow-y-auto bg-gray-50"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            )}
          </div>
          {/* Conteúdo oculto para geração do PDF */}
          <ContractRenderContent />
        </div>

        <div className="p-4 bg-gray-50 border-t text-right">
          <div className="flex justify-end items-center gap-3">
            <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium">Fechar</button>
            {/* 🔥 BOTÃO ALTERADO */}
            <button
              onClick={handleViewAndPrint}
              disabled={loadingDetails}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
            >
              <Printer className="w-5 h-5" />
              Visualizar e Imprimir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}