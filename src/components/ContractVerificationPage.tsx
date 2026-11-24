import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertTriangle, Loader2, Fingerprint } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VerificationData {
  id: string;
  signed_at: string;
  client_ip: string;
  client_data_json: { nome_completo?: string; cpf?: string };
  user_data_json: { business_name?: string };
}

export function ContractVerificationPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<VerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVerificationData = async () => {
      if (!token) {
        setError('Token de verificação inválido.');
        setLoading(false);
        return;
      }

      try {
        const { data: contractData, error: contractError } = await supabase
          .from('contracts')
          .select('id, signed_at, client_ip, client_data_json, user_data_json')
          .eq('token', token)
          .eq('status', 'signed')
          .single();

        if (contractError || !contractData) {
          throw new Error('Contrato não encontrado ou ainda não foi assinado.');
        }

        setData(contractData);
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro ao verificar o contrato.');
      } finally {
        setLoading(false);
      }
    };

    fetchVerificationData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-2xl border-t-8 border-blue-600">
        <div className="p-8 text-center">
          {error ? (
            <>
              <AlertTriangle className="w-20 h-20 text-red-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Falha na Verificação</h1>
              <p className="text-gray-600 text-lg">{error}</p>
            </>
          ) : data ? (
            <>
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
              <h1 className="text-3xl font-bold text-gray-900 mb-3">Documento Autêntico</h1>
              <p className="text-gray-600 text-lg mb-8">
                Este documento foi assinado eletronicamente e seus dados de autenticação foram verificados com sucesso.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 border text-left space-y-4">
                <div className="flex items-center gap-3">
                  <Fingerprint className="w-6 h-6 text-blue-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Dados da Assinatura</h2>
                </div>
                <div className="border-t pt-4 space-y-3 text-gray-700">
                  <p><strong>ID do Documento:</strong> <span className="font-mono text-sm">{data.id}</span></p>
                  <p><strong>Contratante:</strong> {data.client_data_json?.nome_completo || 'Não informado'}</p>
                  <p><strong>CPF do Contratante:</strong> {data.client_data_json?.cpf || 'Não informado'}</p>
                  <p><strong>Contratado:</strong> {data.user_data_json?.business_name || 'Não informado'}</p>
                  <p><strong>Data e Hora da Assinatura:</strong> {format(new Date(data.signed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })} (Horário de Brasília)</p>
                  <p><strong>Endereço IP do Assinante:</strong> {data.client_ip}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
        <div className="bg-gray-100 p-4 text-center text-xs text-gray-500 rounded-b-2xl">
          Verificação realizada pela plataforma PriceUs.
        </div>
      </div>
    </div>
  );
}