export interface FinancialRecord {
  id: string;
  date: string; // ISO date string
  type: 'receita' | 'despesa' | 'imposto' | 'outro';
  amount: number;
  description?: string;
  category?: string;
  clientName?: string;
}
