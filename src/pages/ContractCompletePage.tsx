import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, FileText, Loader2, AlertTriangle } from 'lucide-react';

/*
interface Contract {
  id: string;
  template_id: string;
  user_id: string;
  lead_data_json: any;
  client_data_json: any;
  user_data_json: any;
  user_signature_base64: string;
  signature_base64?: string;
  pdf_url?: string; // Adicionado para armazenar a URL do PDF gerado
  signed_at: string;
  client_ip: string;
}

interface ContractTemplate {
  name: string;
  content_text: string;
}
*/

export function ContractCompletePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [contractData, setContractData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0); // Mantido para robustez

  useEffect(() => {
    if (token) {
      loadContractUrl();
    }
  }, [token, retryCount]);

  // 🔥 LÓGICA: Carrega os dados do contrato assinado usando a RPC pública segura
  const loadContractUrl = async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Tenta buscar via RPC segura (Security Definer)
      const { data: bundle, error: rpcError } = await supabase
        .rpc('get_public_contract_data', { p_token: token })
        .single() as any;

      let contract = bundle?.contract;

      // Fallback para select direto caso necessário
      if (!contract || rpcError) {
        const { data: directData, error: directError } = await supabase
          .from('contracts')
          .select('id, status, client_data_json, signature_base64, client_ip')
          .eq('token', token)
          .single();
        if (directError && !contract) throw directError || rpcError;
        contract = directData;
      }

      if (contract?.status !== 'signed') {
        if (retryCount < 5) {
          console.warn(`[CompletePage] Contrato não está pronto. Tentativa ${retryCount + 1}/5...`);
          setTimeout(() => setRetryCount(prev => prev + 1), 1500);
          return;
        } else {
          throw new Error('O contrato ainda não foi finalizado. Tente novamente em alguns instantes.');
        }
      }

      setContractData(contract);

    } catch (err) {
      console.error('Erro ao carregar contrato completo:', err);
      setError('Não foi possível encontrar os dados do contrato finalizado.');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Navega para a página de visualização/impressão com os dados
  const handlePrint = () => {
    navigate(`/contrato/${token}/preview?print=true`, {
      state: {
        clientData: contractData?.client_data_json,
        clientSignature: contractData?.signature_base64,
        clientIp: contractData?.client_ip,
        action: 'print',
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {loading ? (
          <>
            <Loader2 className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Finalizando...</h2>
            <p className="text-gray-600">Aguarde enquanto preparamos seu documento final.</p>
          </>
        ) : error ? (
          <>
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro ao Finalizar</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => setRetryCount(0)}
              className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700"
            >
              Tentar Novamente
            </button>
          </>
        ) : (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Contrato Assinado com Sucesso!</h2>
            <p className="text-gray-600 mb-6">
              Seu contrato foi finalizado. Clique no botão abaixo para baixar sua cópia em PDF.
            </p>
            <button
              onClick={handlePrint}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              <FileText className="w-6 h-6" />
              Baixar / Imprimir Contrato
            </button>
          </>
        )}
      </div>
    </div>
  );
}