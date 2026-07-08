import { QuoteClassico, QuoteMinimalista, QuoteModerno, QuoteMagazine, type QuoteTheme } from './quote-themes';

interface QuotePageRendererProps {
  theme: QuoteTheme | string;
  template: any;
  profile: any;
  produtos: any[];
  formasPagamento: any[];
  camposExtras: any[];
  selectedProdutos: Record<string, number>;
  formData: any;
  camposExtrasData: Record<string, string>;
  selectedFormaPagamento: string;
  dataEvento: string;
  cidadeSelecionada: string;
  cupomAtivo: boolean;
  cupomDesconto: number;
  cupomCodigo: string;
  cupomMensagem: string;
  disponibilidade: any;
  checkingAvailability: boolean;
  fieldsValidation: any;
  breakdown: any;
  calculateTotal: () => number;
  handleProdutoQuantityChange: (id: string, qty: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  setFormData: (data: any) => void;
  setCamposExtrasData: (data: any) => void;
  setSelectedFormaPagamento: (id: string) => void;
  setDataEvento: (date: string) => void;
  setCidadeSelecionada: (id: string) => void;
  setCupomCodigo: (code: string) => void;
  handleValidarCupom: () => void;
  setCupomAtivo: (active: boolean) => void;
  setCupomDesconto: (discount: number) => void;
  setCupomMensagem: (msg: string) => void;
  renderLocationDateFields?: () => React.ReactNode;
  upsellSection?: React.ReactNode;
}

export function QuotePageRenderer(props: QuotePageRendererProps) {
  const { theme } = props;

  switch (theme) {
    case 'original':
      return <QuoteClassico {...props} />;
    case 'minimalist':
      return <QuoteMinimalista {...props} />;
    case 'modern':
      return <QuoteModerno {...props} />;
    case 'magazine':
      return <QuoteMagazine {...props} />;
    default:
      return <QuoteClassico {...props} />;
  }
}
