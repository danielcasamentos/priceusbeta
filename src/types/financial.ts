export interface FinancialRecord {
  id: string;
  date: string;                                          // ISO date string
  type: 'receita' | 'despesa' | 'imposto' | 'outro';
  amount: number;
  status?: string;
  description?: string;
  category?: string;
  clientName?: string;
  formaPagamento?: string;
  origem?: string;
  parcelas?: string;
  observacoes?: string;
}
