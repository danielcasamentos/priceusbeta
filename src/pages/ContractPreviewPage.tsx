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
    word-wrap: break-word;
    line-height: 1.5;
    color: #000;
    box-sizing: border-box;
    text-align: justify;
  }
  @media print {
    body * { visibility: hidden; }
    .printable-area, .printable-area * { visibility: visible; }
    .printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white !important; }
    .no-print, .no-print * { display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; }
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
  payment_details_json?: any;
  client_data_json: any;
  user_data_json: any;
  user_signature_base64: string;
  signature_base64?: string;
  status: 'pending' | 'preview' | 'signed' | 'expired';
  pdf_url?: string;
  expires_at: string;
  content_override?: string;
}

interface ContractTemplate {
  name: string;
  content_text: string;
}

const cleanDocument = (value: string) => value.replace(/\D/g, '');

export function ContractPreviewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [contract, setContract] = useState<Contract | null>(null);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({});
  const [processedContent, setProcessedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const contractPreviewRef = useRef<HTMLDivElement>(null);
  const autoPrintedRef = useRef(false);

  // Estados reativos para dados do cliente e assinatura
  const [clientData, setClientData] = useState<ClientData | null>(location.state?.clientData || null);
  const [clientSignature, setClientSignature] = useState<string | null>(location.state?.clientSignature || null);
  const [clientIp, setClientIp] = useState<string | null>(location.state?.clientIp || null);

  // Verifica intenção de impressão via state ou query param (?print=true)
  const shouldPrint = location.state?.action === 'print' || new URLSearchParams(location.search).get('print') === 'true';

  useEffect(() => {
    loadContractForPreview();
  }, [token]);

  // Aciona impressão automática após conteúdo renderizado
  useEffect(() => {
    if (!loading && processedContent && shouldPrint && !autoPrintedRef.current) {
      autoPrintedRef.current = true;
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, processedContent, shouldPrint]);

  useEffect(() => {
    if (template && contract && businessSettings && clientData) {
      const leadData: LeadData = contract.lead_data_json || {};

      const processed = replaceContractVariables(
        contract.content_override || template.content_text,
        businessSettings,
        clientData,
        leadData
      );
      setProcessedContent(processed);
    }
  }, [template, contract, businessSettings, clientData]);

  const loadContractForPreview = async () => {
    if (!token) {
      setError('Token inválido.');
      setLoading(false);
      return;
    }

    try {
      const { data: contractBundle, error: rpcError } = await supabase
        .rpc('get_public_contract_data', { p_token: token })
        .single() as any;

      if (rpcError) throw rpcError;

      if (!contractBundle || !contractBundle.contract) {
        setError('Contrato não encontrado ou inválido.');
        return;
      }

      const { contract: contractData, template: templateData, business_settings: businessData } = contractBundle;

      // Se os dados do cliente não vieram do state (ex: acesso direto ou pós-assinatura), busca do contrato no banco
      if (!clientData && contractData.client_data_json) {
        setClientData(contractData.client_data_json);
        setClientSignature(contractData.signature_base64 || null);
        setClientIp(contractData.client_ip || null);
      } else if (!clientData && contractData.status !== 'signed') {
        setError('Este contrato ainda não foi preenchido. Por favor, acesse o link de assinatura.');
      }

      setContract(contractData);
      setTemplate(templateData);
      setBusinessSettings(businessData || {});
    } catch (err) {
      console.error('Erro ao carregar dados para preview:', err);
      setError('Ocorreu um erro ao carregar os dados do contrato.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cria as transações financeiras (entrada e parcelas) após a assinatura.
   * Respeita integralmente a configuração da forma de pagamento escolhida.
   */
  const createFinancialTransactions = async (signedContract: Contract) => {
    console.log('🏦 Iniciando criação de transações financeiras...');
    const paymentDetails = signedContract.payment_details_json;
    const totalValue = signedContract.lead_data_json?.valor_total || 0;
    const clientName = signedContract.lead_data_json?.nome_cliente || 'Cliente';
    const docFiscal = signedContract.client_data_json?.cpf || signedContract.client_data_json?.documento || '';

    if (totalValue <= 0) {
      console.log('⚠️ Valor total zero. Nenhuma transação será criada.');
      return;
    }

    // Fallback: sem detalhes de pagamento → receita única à vista
    if (!paymentDetails) {
      console.warn('⚠️ payment_details_json ausente. Criando receita única à vista como fallback.');
      const { error } = await supabase.rpc('insert_public_transactions', {
        p_token: token,
        p_transactions: [{
          user_id: signedContract.user_id,
          tipo: 'receita',
          origem: 'contrato',
          descricao: `Contrato - ${clientName}`,
          valor: totalValue,
          data: new Date().toISOString().split('T')[0],
          status: 'pendente',
          forma_pagamento: 'Não especificado',
          contract_id: signedContract.id,
          is_installment: false,
          installment_number: null,
          total_installments: null,
          documento_fiscal: docFiscal,
        }],
      });
      if (error) console.error('❌ Erro ao criar transação fallback:', error);
      else console.log('✅ Transação fallback criada com sucesso.');
      return;
    }

    const transactionsToInsert: any[] = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const nomePagamento = paymentDetails.nome || 'Não informado';
    const maxParcelas = paymentDetails.max_parcelas || 0;

    // ─────────────────────────────────────────────────────
    // CENÁRIO 1: À vista (sem parcelamento)
    // max_parcelas = 0 ou 1, e entrada_valor = 0 ou = total
    // ─────────────────────────────────────────────────────
    if (maxParcelas <= 1) {
      // Calcular o valor da entrada
      let entradaValor = 0;
      if (paymentDetails.entrada_tipo === 'percentual') {
        const pct = paymentDetails.entrada_percentual ?? paymentDetails.entrada_valor ?? 0;
        entradaValor = (totalValue * pct) / 100;
      } else {
        entradaValor = paymentDetails.entrada_valor || 0;
      }

      // Se não há entrada configurada ou a entrada cobre o total → pagamento único
      const valorUnico = entradaValor > 0 ? entradaValor : totalValue;
      const valorRestante = totalValue - valorUnico;
      const hasTwoInstallments = maxParcelas === 1 && valorRestante > 0.01;

      transactionsToInsert.push({
        user_id: signedContract.user_id,
        tipo: 'receita',
        origem: 'contrato',
        descricao: !hasTwoInstallments
          ? `Pagamento à vista - Contrato ${clientName}`
          : `Entrada - Contrato ${clientName}`,
        valor: valorUnico,
        data: todayStr,
        status: 'pendente',
        forma_pagamento: nomePagamento,
        contract_id: signedContract.id,
        is_installment: hasTwoInstallments,
        installment_number: hasTwoInstallments ? 1 : null,
        total_installments: hasTwoInstallments ? 2 : null,
        documento_fiscal: docFiscal,
      });

      // Se havia entrada menor que o total e max_parcelas = 1, adicionar o restante
      if (hasTwoInstallments) {
        const dataRestante = new Date(today);
        dataRestante.setMonth(dataRestante.getMonth() + 1);
        transactionsToInsert.push({
          user_id: signedContract.user_id,
          tipo: 'receita',
          origem: 'contrato',
          descricao: `Parcela 1/1 - Contrato ${clientName}`,
          valor: valorRestante,
          data: dataRestante.toISOString().split('T')[0],
          status: 'pendente',
          forma_pagamento: nomePagamento,
          contract_id: signedContract.id,
          is_installment: true,
          installment_number: 2,
          total_installments: 2,
          documento_fiscal: docFiscal,
        });
      }
    }

    // ─────────────────────────────────────────────────────
    // CENÁRIO 2: Parcelado (max_parcelas >= 2)
    // ─────────────────────────────────────────────────────
    else {
      // 2a. Calcular entrada
      let downPaymentValue = 0;
      if (paymentDetails.entrada_tipo === 'percentual') {
        const pct = paymentDetails.entrada_percentual ?? paymentDetails.entrada_valor ?? 0;
        downPaymentValue = (totalValue * pct) / 100;
      } else {
        downPaymentValue = paymentDetails.entrada_valor || 0;
      }

      const totalInstallments = maxParcelas + (downPaymentValue > 0 ? 1 : 0);

      // Entrada (se houver)
      if (downPaymentValue > 0) {
        transactionsToInsert.push({
          user_id: signedContract.user_id,
          tipo: 'receita',
          origem: 'contrato',
          descricao: `Entrada - Contrato ${clientName}`,
          valor: parseFloat(downPaymentValue.toFixed(2)),
          data: todayStr,
          status: 'pendente',
          forma_pagamento: nomePagamento,
          contract_id: signedContract.id,
          is_installment: true,
          installment_number: 1,
          total_installments: totalInstallments,
          documento_fiscal: docFiscal,
        });
      }

      const remainingValue = totalValue - downPaymentValue;

      // 2b. Usar parcelas_detalhadas se configuradas
      const parcelasDetalhadas: any[] = paymentDetails.parcelas_detalhadas || [];

      if (parcelasDetalhadas.length > 0) {
        // Fotógrafo configurou datas e valores específicos por parcela
        parcelasDetalhadas.forEach((parcela: any, idx: number) => {
          transactionsToInsert.push({
            user_id: signedContract.user_id,
            tipo: 'receita',
            origem: 'contrato',
            descricao: `Parcela ${idx + 1}/${parcelasDetalhadas.length} - Contrato ${clientName}`,
            valor: parseFloat((parcela.valor || (remainingValue / parcelasDetalhadas.length)).toFixed(2)),
            data: parcela.data || (() => {
              const d = new Date(today);
              d.setMonth(d.getMonth() + idx + 1);
              return d.toISOString().split('T')[0];
            })(),
            status: 'pendente',
            forma_pagamento: nomePagamento,
            contract_id: signedContract.id,
            is_installment: true,
            installment_number: (downPaymentValue > 0 ? 2 : 1) + idx,
            total_installments: totalInstallments,
            documento_fiscal: docFiscal,
          });
        });
      } else {
        // 2c. Parcelas iguais com datas mensais sequenciais
        if (maxParcelas > 0 && remainingValue > 0.01) {
          const installmentValue = parseFloat((remainingValue / maxParcelas).toFixed(2));

          for (let i = 1; i <= maxParcelas; i++) {
            const installmentDate = new Date(today);
            installmentDate.setMonth(installmentDate.getMonth() + i);
            transactionsToInsert.push({
              user_id: signedContract.user_id,
              tipo: 'receita',
              origem: 'contrato',
              descricao: `Parcela ${i}/${maxParcelas} - Contrato ${clientName}`,
              valor: installmentValue,
              data: installmentDate.toISOString().split('T')[0],
              status: 'pendente',
              forma_pagamento: nomePagamento,
              contract_id: signedContract.id,
              is_installment: true,
              installment_number: (downPaymentValue > 0 ? 2 : 1) + (i - 1),
              total_installments: totalInstallments,
              documento_fiscal: docFiscal,
            });
          }
        }
      }
    }

    // Inserir todas as transações via RPC (contorna RLS em página pública)
    if (transactionsToInsert.length > 0) {
      console.log(`🏦 Inserindo ${transactionsToInsert.length} transação(ões):`, transactionsToInsert);
      const { error } = await supabase.rpc('insert_public_transactions', {
        p_token: token,
        p_transactions: transactionsToInsert,
      });
      if (error) console.error('❌ Erro ao criar transações financeiras:', error);
      else console.log(`✅ ${transactionsToInsert.length} transação(ões) criada(s) com sucesso.`);
    } else {
      console.warn('⚠️ Nenhuma transação gerada. Verifique a configuração da forma de pagamento.');
    }
  };

  const handleApproveAndFinalize = async () => {
    if (!contract || !clientData || !clientSignature) {
      setError('Faltam dados essenciais para finalizar o contrato.');
      return;
    }

    setGenerating(true);
    try {
      // 1. Atualiza o status do contrato no banco
      const { data: updatedContract, error: updateError } = await supabase.from('contracts').update({
        client_data_json: clientData,
        signature_base64: clientSignature,
        client_ip: clientIp,
        pdf_url: null,
        status: 'signed',
        signed_at: new Date().toISOString(),
      }).eq('id', contract.id).select().single();

      if (updateError) throw updateError;

      const targetContract = updatedContract || {
        ...contract,
        client_data_json: clientData,
        signature_base64: clientSignature,
        client_ip: clientIp,
        status: 'signed',
        signed_at: new Date().toISOString(),
      };

      // 2. Cria as transações financeiras em background
      createFinancialTransactions(targetContract).catch((err) => {
        console.warn('⚠️ Erro ao criar transações financeiras:', err);
      });

      // 3. Dispara notificações para o profissional
      const clientName = clientData.nome_completo || 'Cliente';
      
      // Tentativa 1: RPC segura (Security Definer)
      supabase.rpc('notify_public_contract_signed', {
        p_token: token,
        p_client_name: clientName,
      }).catch(() => null);

      // Tentativa 2: NotificationService padrão
      NotificationService.sendNotification({
        userId: targetContract.user_id,
        title: '📝 Contrato Assinado!',
        message: `O contrato do evento de ${clientName} foi assinado digitalmente com sucesso.`,
        type: 'payment',
        link: '/dashboard/contracts',
        relatedId: targetContract.id,
      }).catch(() => null);

      console.log('✅ [DB] Contrato finalizado no banco de dados com sucesso.');
      navigate(`/contrato/${token}/completo`);

    } catch (err: any) {
      console.error('❌ [Finalize] Erro fatal durante o processo de finalização:', err);
      setError(`Ocorreu um erro ao finalizar o contrato: ${err.message}. Por favor, tente novamente.`);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"> <Loader2 className="animate-spin h-10 w-10 text-blue-600" /> </div>;
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-red-50 text-red-800 p-4">
        <FileWarning className="h-16 w-16 mb-4 text-red-600" />
        <h2 className="text-2xl font-bold mb-2">Atenção</h2>
        <p className="text-center max-w-md">{error}</p>
      </div>
    );
  }

  const isAlreadySigned = contract?.status === 'signed';

  return (
    <div className={`bg-gray-100 py-10 printable-area ${shouldPrint ? 'bg-white' : ''}`}>
      <style>{contractPrintStyles}</style>

      {/* Painel de Controle Superior (Ocultado durante impressão via classe no-print) */}
      <div className="max-w-5xl mx-auto no-print">
        <div className="bg-white shadow-lg p-6 sm:p-8 rounded-lg mb-8 border border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              {isAlreadySigned ? (
                <div className="p-2 bg-green-100 rounded-full text-green-600">
                  <CheckCircle className="w-7 h-7" />
                </div>
              ) : (
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <Eye className="w-7 h-7" />
                </div>
              )}
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {isAlreadySigned ? 'Contrato Assinado Digitalmente' : 'Revise e Aprove seu Contrato'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isAlreadySigned
                    ? 'Este documento possui validade jurídica e registro digital de assinatura.'
                    : 'Confira todos os dados abaixo antes de confirmar sua assinatura definitiva.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isAlreadySigned ? (
                <button
                  onClick={() => window.print()}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold text-base hover:bg-green-700 transition-colors flex items-center gap-2 shadow-md cursor-pointer"
                >
                  <Eye className="w-5 h-5" />
                  Imprimir / Salvar em PDF
                </button>
              ) : (
                <button
                  onClick={handleApproveAndFinalize}
                  disabled={generating}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  {generating ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                  {generating ? 'Finalizando...' : 'Aprovar e Finalizar'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Container que será impresso ou salvo em PDF */}
      <div className="max-w-5xl mx-auto">
        <div ref={contractPreviewRef} className="contract-preview-container mx-auto">
          <div dangerouslySetInnerHTML={{ __html: processedContent }} />

          {/* Bloco de Assinaturas */}
          <div className="signature-block grid grid-cols-2 gap-8 pt-16">
            <div>
              {contract?.user_signature_base64 && (
                <img src={contract.user_signature_base64} alt="Assinatura do Contratado" className="mx-auto h-20"/>
              )}
              <div className="signature-line"></div>
              <p className="text-sm font-semibold">{contract?.user_data_json?.business_name || 'Contratado'}</p>
              <p className="text-sm text-gray-600">
                {contract?.user_data_json?.person_type === 'fisica' ? `CPF: ${contract?.user_data_json?.cpf}` : `CNPJ: ${contract?.user_data_json?.cnpj}`}
              </p>
            </div>
            <div>
              {clientSignature && (
                <img src={clientSignature} alt="Assinatura do Contratante" className="mx-auto h-20"/>
              )}
              <div className="signature-line"></div>
              <p className="text-sm font-semibold">{clientData?.nome_completo || 'Contratante'}</p>
              <p className="text-sm text-gray-600">
                {(clientData?.cpf || clientData?.documento) ? (
                  cleanDocument((clientData?.cpf || clientData?.documento) as string).length === 11 
                    ? `CPF: ${clientData?.cpf || clientData?.documento}` 
                    : `CNPJ: ${clientData?.cpf || clientData?.documento}`
                ) : 'Documento'}
              </p>
            </div>
          </div>

          {/* Carimbo de Autenticação Digital */}
          {contract && (
            <div style={{ marginTop: '50pt', paddingTop: '20pt', borderTop: '1px dashed #ccc', fontSize: '9pt', color: '#555', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'center' }}>
              <div>
                <h4 style={{ fontWeight: 'bold', marginBottom: '12pt', fontSize: '11pt', color: '#222' }}>
                  <span>🛡️ Carimbo de Autenticação Digital</span>
                </h4>
                <p><strong>ID do Contrato:</strong> <span style={{ fontFamily: 'monospace' }}>{contract.id}</span></p>
                <p><strong>Data e Hora da Assinatura:</strong> {format(new Date(), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}</p>
                <p><strong>Endereço IP do Assinante:</strong> {clientIp || 'Registrado eletronicamente'}</p>
                <p>
                  <strong>Assinado por:</strong> {clientData?.nome_completo || 'Contratante'}
                  {(clientData?.cpf || clientData?.documento) && ` (${
                    cleanDocument((clientData?.cpf || clientData?.documento) as string).length === 11 ? 'CPF' : 'CNPJ'
                  }: ${clientData?.cpf || clientData?.documento})`}
                </p>
                <p style={{ marginTop: '8pt', fontStyle: 'italic', fontSize: '8pt' }}>
                  Este documento foi assinado eletronicamente através da plataforma PriceUs com validade legal nos termos da MP 2.200-2/2001.
                </p>
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
                <p style={{ marginTop: '5px', fontSize: '8pt', color: '#666' }}>Verifique a autenticidade</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
