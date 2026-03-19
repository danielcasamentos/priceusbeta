import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { QRCodeCanvas } from 'qrcode.react';
import { replaceContractVariables, type BusinessSettings, type ClientData, type LeadData } from '../lib/contractVariables';
import { CheckCircle, Loader2, FileWarning, Eye } from 'lucide-react';

// Estilos para o container do contrato que será convertido para PDF
const contractPrintStyles = `
  .contract-preview-container {
    width: 210mm; /* Largura de uma folha A4 */
    min-height: 297mm; /* Altura de uma folha A4 */
    padding: 20mm;
    background-color: white;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 12pt;
    /* 🔥 CORREÇÃO: Garante que o texto quebre corretamente dentro do contêiner */
    word-wrap: break-word;
    line-height: 1.5;
    color: #000;
    box-sizing: border-box;
    text-align: justify;
  }
  @media print {
    body * { visibility: hidden; }
    .printable-area, .printable-area * { visibility: visible; }
    .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
  }
  .contract-preview-container h1, .contract-preview-container h2, .contract-preview-container h3 {
    text-align: center;
    margin-bottom: 24pt;
  }
  .contract-preview-container p {
    margin-bottom: 12pt;
  }
  .contract-preview-container table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 12pt;
  }
  .contract-preview-container td, .contract-preview-container th {
    border: 1px solid #ccc;
    padding: 8pt;
  }
  .contract-preview-container .signature-block {
    margin-top: 50pt;
    text-align: center;
  }
  .signature-line {
    border-bottom: 1px solid #000;
    width: 300px;
    max-width: 80%;
    margin: 0 auto 5pt auto;
  }
`;

interface Contract {
  id: string;
  template_id: string;
  lead_id: string;
  user_id: string;
  token: string;
  lead_data_json: any;
  payment_details_json?: any; // Adicionado para detalhes do pagamento
  client_data_json: any;
  user_data_json: any;
  user_signature_base64: string;
  signature_base64?: string; // Assinatura do cliente, agora vem da página anterior
  status: 'pending' | 'preview' | 'signed' | 'expired';
  pdf_url?: string;
  expires_at: string;
}

interface ContractTemplate {
  name: string;
  content_text: string;
}

const cleanDocument = (value: string) => value.replace(/\D/g, '');

export function ContractPreviewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation(); // 🔥 NOVO: Para receber dados da página anterior
  const [contract, setContract] = useState<Contract | null>(null);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({});
  const [processedContent, setProcessedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const contractPreviewRef = useRef<HTMLDivElement>(null);

  // 🔥 NOVO: Pega os dados do cliente do estado da navegação
  const clientDataFromState = location.state?.clientData as ClientData | undefined;
  const clientSignatureFromState = location.state?.clientSignature as string | undefined;
  const clientIpFromState = location.state?.clientIp as string | undefined;

  // 🔥 NOVO: Verifica se a página foi aberta com a intenção de imprimir
  const shouldPrint = location.state?.action === 'print';

  useEffect(() => {
    // 🔥 LÓGICA ALTERADA: Agora a página é mais inteligente.
    // Se os dados do cliente vierem do estado da navegação (fluxo do cliente), usa eles.
    // Se não, busca os dados do contrato assinado no banco (fluxo do profissional).
    if (clientDataFromState && clientSignatureFromState) {
      console.log('✅ [Preview] Dados do cliente encontrados no estado da navegação. Usando-os.');
      if (shouldPrint) {
        setTimeout(() => window.print(), 500);
      }
    } else {
      // Se não há dados no estado, significa que o profissional está visualizando.
      // A função `loadContractForPreview` agora também buscará os dados do cliente.
      console.log('⚠️ [Preview] Dados do cliente não encontrados no estado. Tentando carregar do banco de dados...');
      // A impressão será acionada dentro de `loadContractForPreview` após os dados serem carregados.
    }

    // A validação de erro foi movida para dentro de `loadContractForPreview`
    // para lidar com ambos os cenários.
    loadContractForPreview();
  }, [token]);

  useEffect(() => {
    if (template && contract && businessSettings && clientDataFromState) {
      const leadData: LeadData = contract.lead_data_json || {};

      console.log('🔄 [Preview Page] Gerando conteúdo do contrato com dados em memória:');
      console.log('Lead Data:', leadData);
      console.log('Client Data:', clientDataFromState);
      console.log('Business Settings:', businessSettings);

      const processed = replaceContractVariables(
        template.content_text,
        businessSettings,
        clientDataFromState,
        leadData
      );
      setProcessedContent(processed);
    }
  }, [template, contract, businessSettings, clientDataFromState]);

  const loadContractForPreview = async () => {
    if (!token) {
      setError('Token inválido.');
      setLoading(false);
      return;
    }

    try {
      const { data: contractBundle, error: rpcError } = await supabase
        .rpc('get_public_contract_data', { p_token: token })
        .single();

      if (rpcError) throw rpcError;

      if (!contractBundle || !contractBundle.contract) {
        setError('Contrato não encontrado ou inválido.');
        return;
      }

      const { contract: contractData, template: templateData, business_settings: businessData } = contractBundle;

      // 🔥 NOVA LÓGICA: Se os dados do cliente não vieram do estado,
      // preenchemos com os dados do contrato assinado que veio do banco.
      if (!clientDataFromState && contractData.status === 'signed') {
        console.log('✅ [Preview] Carregando dados do cliente a partir do contrato assinado no banco.');
        // Simula o `location.state` com os dados do banco para o resto da página funcionar.
        location.state = {
          ...location.state,
          clientData: contractData.client_data_json,
          clientSignature: contractData.signature_base64,
          clientIp: contractData.client_ip,
        };
        if (shouldPrint) {
          setTimeout(() => window.print(), 500);
        }
      } else if (!clientDataFromState && contractData.status !== 'signed') {
        setError('Este contrato ainda não foi assinado, portanto não há dados de cliente para exibir.');
      }

      setContract(contractData);
      setTemplate(templateData);
      setBusinessSettings(businessData || {});
    } catch (err) {
      console.error('Erro ao carregar dados para preview:', err);
      setError('Ocorreu um erro ao carregar os dados do contrato.');
    } finally {
      // A validação final de erro acontece aqui, após todas as tentativas de carregamento.
      if (!location.state?.clientData) setError('Dados do cliente não encontrados. Por favor, volte e preencha o formulário novamente.');
      setLoading(false);
    }
  };

  /**
   * 🔥 NOVO: Cria as transações financeiras (entrada e parcelas) após a assinatura.
   */
  const createFinancialTransactions = async (signedContract: Contract) => {
    console.log('🏦 Iniciando criação de transações financeiras...');
    const paymentDetails = signedContract.payment_details_json;
    const totalValue = signedContract.lead_data_json?.valor_total || 0;

    if (!paymentDetails || totalValue <= 0) {
      console.log('⚠️ Detalhes de pagamento ou valor total ausentes. Nenhuma transação será criada.');
      return;
    }

    const transactionsToInsert = [];
    const signedDate = new Date();

    // 1. Calcular e preparar a transação de ENTRADA
    let downPaymentValue = 0;
    if (paymentDetails.entrada_tipo === 'percentual') {
      downPaymentValue = (totalValue * paymentDetails.entrada_valor) / 100;
    } else {
      downPaymentValue = paymentDetails.entrada_valor;
    }

    if (downPaymentValue > 0) {
      transactionsToInsert.push({
        user_id: signedContract.user_id,
        tipo: 'receita' as const,
        origem: 'contrato',
        descricao: `Entrada - Contrato ${signedContract.lead_data_json?.nome_cliente}`,
        valor: downPaymentValue,
        data: signedDate.toISOString().split('T')[0],
        status: 'pendente' as const,
        forma_pagamento: paymentDetails.nome,
        contract_id: signedContract.id,
        is_installment: true,
        installment_number: 1,
        total_installments: 1 + (paymentDetails.max_parcelas || 0),
      });
    }

    // 2. Calcular e preparar as transações de PARCELAS
    const remainingValue = totalValue - downPaymentValue;
    const numInstallments = paymentDetails.max_parcelas || 0;

    if (numInstallments > 0 && remainingValue > 0.01) {
      const installmentValue = remainingValue / numInstallments;
      for (let i = 1; i <= numInstallments; i++) {
        const installmentDate = new Date(signedDate);
        installmentDate.setMonth(installmentDate.getMonth() + i);

        transactionsToInsert.push({
          user_id: signedContract.user_id,
          tipo: 'receita' as const,
          origem: 'contrato',
          descricao: `Parcela ${i}/${numInstallments} - Contrato ${signedContract.lead_data_json?.nome_cliente}`,
          valor: installmentValue,
          data: installmentDate.toISOString().split('T')[0],
          status: 'pendente' as const,
          forma_pagamento: paymentDetails.nome,
          contract_id: signedContract.id,
          is_installment: true,
          installment_number: i + 1, // +1 porque a entrada é a 1
          total_installments: 1 + numInstallments,
        });
      }
    }

    // 3. Inserir todas as transações no banco de dados
    if (transactionsToInsert.length > 0) {
      console.log(`🏦 Inserindo ${transactionsToInsert.length} transações...`, transactionsToInsert);
      const { error } = await supabase.from('company_transactions').insert(transactionsToInsert);
      if (error) {
        console.error('❌ Erro ao criar transações financeiras:', error);
        // Não bloqueia o fluxo do usuário, apenas loga o erro.
      } else {
        console.log('✅ Transações criadas com sucesso!');
      }
    }
  };

  const handleApproveAndFinalize = async () => {
    if (!contract || !clientDataFromState || !clientSignatureFromState) {
      setError('Faltam dados essenciais para finalizar o contrato.');
      return;
    }

    setGenerating(true);
    try {
      // 🔥 NOVA LÓGICA SIMPLIFICADA
      // 1. Apenas atualiza o banco de dados. A geração do PDF agora é responsabilidade do cliente.
      const { data: updatedContract, error: updateError } = await supabase.from('contracts').update({
        client_data_json: clientDataFromState,
        signature_base64: clientSignatureFromState,
        client_ip: clientIpFromState,
        pdf_url: null, // Não salvamos mais a URL do PDF aqui
        status: 'signed',
        signed_at: new Date().toISOString(),
      }).eq('id', contract.id).select().single();

      if (updateError) throw updateError;

      // 2. 🔥 CHAMA A FUNÇÃO PARA CRIAR TRANSAÇÕES FINANCEIRAS
      // Faz isso em segundo plano para não atrasar o usuário.
      if (updatedContract) {
        createFinancialTransactions(updatedContract);
      }

      console.log('✅ [DB] Contrato finalizado no banco de dados.');
      navigate(`/contrato/${token}/completo`);
      // A página /completo agora instruirá o usuário a imprimir/salvar.

    } catch (err: any) {
      console.error('❌ [Finalize] Erro fatal durante o processo de finalização:', err);
      setError(`Ocorreu um erro ao finalizar o contrato: ${err.message}. Por favor, tente novamente.`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"> <Loader2 className="animate-spin h-10 w-10" /> </div>;
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 text-red-800 p-4">
        <FileWarning className="h-16 w-16 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Erro no Contrato</h2>
        <p className="text-center max-w-md">{error}</p>
      </div>
    );
  }

  return (
    // 🔥 NOVO: Adiciona uma classe 'printable-area' para controlar a impressão
    <div className={`bg-gray-100 py-10 printable-area ${shouldPrint ? 'bg-white' : ''}`}>
      <style>{contractPrintStyles}</style>

      {/* 🔥 NOVO: Oculta os botões se a intenção for apenas imprimir */}
      <div className="max-w-5xl mx-auto">
        <div className="bg-white shadow-lg p-8 rounded-lg mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-center">Revise e Aprove seu Contrato</h1>
          </div>
          <p className="text-center text-gray-600 mb-6">
            Confira todos os dados e a formatação do contrato abaixo. Este é o documento final. Se tudo estiver correto, aprove para gerar o PDF oficial e concluir a assinatura.
          </p>
          {!shouldPrint && (
            <div className="flex justify-center">
              <button
                onClick={handleApproveAndFinalize} // A função agora faz tudo
                disabled={generating}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generating ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                {generating ? 'Finalizando...' : 'Aprovar e Finalizar'}
              </button>
            </div>
          )}
        </div>

        {/* O container que será impresso em PDF (movido para dentro do div principal) */}
        <div ref={contractPreviewRef} className="contract-preview-container mx-auto">
          <div dangerouslySetInnerHTML={{ __html: processedContent }} />

          {/* Bloco de Assinaturas */}
          <div className="signature-block grid grid-cols-2 gap-8 pt-16">
            <div>
              {contract?.user_signature_base64 && (
                <img src={contract.user_signature_base64} alt="Assinatura do Contratado" className="mx-auto h-20"/>
              )}
              <div className="signature-line"></div>
              <p className="text-sm">{contract?.user_data_json?.business_name || 'Contratado'}</p>
              <p className="text-sm">
                {contract?.user_data_json?.person_type === 'fisica' ? `CPF: ${contract?.user_data_json?.cpf}` : `CNPJ: ${contract?.user_data_json?.cnpj}`}
              </p>
            </div>
            <div>
              {clientSignatureFromState && (
                <img src={clientSignatureFromState} alt="Assinatura do Contratante" className="mx-auto h-20"/>
              )}
              <div className="signature-line"></div>
              <p className="text-sm">{clientDataFromState?.nome_completo || 'Contratante'}</p>
              <p className="text-sm">{(clientDataFromState?.cpf || clientDataFromState?.documento) ? (cleanDocument(clientDataFromState?.cpf || clientDataFromState?.documento as string).length === 11 ? `CPF: ${clientDataFromState?.cpf || clientDataFromState?.documento}` : `CNPJ: ${clientDataFromState?.cpf || clientDataFromState?.documento}`) : 'Documento'}</p>
            </div>
          </div>

          {/* 🔥 NOVO: Carimbo de Autenticação Digital (idêntico ao do ContractViewerModal) */}
          {contract && (
            <div style={{ marginTop: '60pt', paddingTop: '20pt', borderTop: '1px dashed #ccc', fontSize: '9pt', color: '#555', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontWeight: 'bold', marginBottom: '15pt', fontSize: '11pt' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '8px' }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  <span>Carimbo de Autenticação Digital</span>
                </h4>
                <p><strong>ID do Contrato:</strong> <span style={{ fontFamily: 'monospace' }}>{contract.id}</span></p>
                <p><strong>Data e Hora da Assinatura:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                <p><strong>Endereço IP do Assinante:</strong> {clientIpFromState || 'Não registrado'}</p>
                <p>
                  <strong>Assinado por:</strong> {clientDataFromState?.nome_completo || 'Contratante'}
{(clientDataFromState?.cpf || clientDataFromState?.documento) && ` (${
  cleanDocument(clientDataFromState?.cpf || clientDataFromState?.documento as string).length === 11 ? 'CPF' : 'CNPJ'
}: ${clientDataFromState?.cpf || clientDataFromState?.documento})`}
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
      </div>
    </div>
  );
}
