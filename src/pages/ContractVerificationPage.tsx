import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, ShieldCheck, ShieldX, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContractDetails {
  id: string;
  status: string;
  signed_at: string;
  lead_data_json: {
    nome_cliente: string;
  };
  client_data_json?: {
    nome_completo?: string;
    cpf?: string;
  };
  user_data_json: {
    business_name: string;
  };
}

export function ContractVerificationPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<ContractDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContract = async () => {
      if (!token) {
        setError('Token de verificação inválido.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('contracts')
          .select('id, status, signed_at, lead_data_json, client_data_json, user_data_json')
          .eq('token', token)
          .single();

        if (fetchError || !data) {
          throw new Error('Contrato não encontrado ou token inválido.');
        }

        if (data.status !== 'signed') {
          throw new Error('Este contrato não está assinado ou foi invalidado.');
        }

        setContract(data);
      } catch (err: any) {
        setError(err.message || 'Ocorreu um erro ao buscar o contrato.');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        <p className="mt-4 text-lg text-gray-600">Verificando autenticidade do contrato...</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-center">
        <ShieldX className="w-16 h-16 text-red-500" />
        <h1 className="mt-4 text-2xl font-bold text-gray-800">Falha na Verificação</h1>
        <p className="mt-2 text-gray-600">{error || 'Não foi possível verificar a autenticidade deste documento.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-2xl w-full bg-white shadow-lg rounded-lg p-8 border-t-8 border-green-500">
        <div className="flex flex-col items-center text-center">
          <ShieldCheck className="w-20 h-20 text-green-500" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Documento Autêntico</h1>
          <p className="mt-2 text-gray-600">Este documento foi assinado eletronicamente e sua autenticidade foi confirmada.</p>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200 space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2"><FileText size={20} /> Detalhes do Contrato</h2>
            <p><strong>Contratante:</strong> {contract.client_data_json?.nome_completo || contract.lead_data_json.nome_cliente}</p>
            {contract.client_data_json?.cpf && <p><strong>CPF do Contratante:</strong> {contract.client_data_json.cpf}</p>}
            <p><strong>Contratado:</strong> {contract.user_data_json.business_name}</p>
            <p><strong>Data da Assinatura:</strong> {format(new Date(contract.signed_at), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm:ss", { locale: ptBR })}</p>
            <p className="font-mono text-sm text-gray-500 pt-2"><strong>ID do Documento:</strong> {contract.id}</p>
        </div>
      </div>
    </div>
  );
}