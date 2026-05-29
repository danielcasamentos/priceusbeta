import { useState } from 'react';
import { DollarSign, Percent, Info, Trash2, Star } from 'lucide-react';
import { NumberInput } from './ui/NumberInput';

/**
 * Interface para Forma de Pagamento Aprimorada
 * Suporta entrada como percentual ou valor fixo
 */
interface PaymentMethod {
  id?: string;
  nome: string;
  entrada_tipo: 'percentual' | 'fixo'; // Novo campo
  entrada_valor: number;
  max_parcelas: number;
  acrescimo: number;
  is_default?: boolean;
}

interface PaymentMethodEditorProps {
  paymentMethod: PaymentMethod;
  onChange: (field: keyof PaymentMethod, value: any) => void;
  onRemove: () => void;
  onSetDefault: () => void;
  totalValue?: number; // Para calcular preview quando percentual
}

/**
 * Componente de edição de forma de pagamento com suporte a:
 * - Entrada como percentual (0% a 100%)
 * - Entrada como valor fixo
 * - Toggle para alternar entre os métodos
 * - Validações em tempo real
 * - Preview do valor calculado
 */
export function PaymentMethodEditor({
  paymentMethod,
  onChange,
  onRemove,
  onSetDefault,
  totalValue = 0,
}: PaymentMethodEditorProps) {
  const [showInfo, setShowInfo] = useState(false);

  // Calcula o valor real da entrada baseado no tipo
  const getEntradaReal = (): number => {
    if (paymentMethod.entrada_tipo === 'percentual') {
      return (totalValue * paymentMethod.entrada_valor) / 100;
    }
    return paymentMethod.entrada_valor;
  };

  // Valida o valor da entrada
  const validateEntrada = (): string | null => {
    if (paymentMethod.entrada_tipo === 'percentual') {
      if (paymentMethod.entrada_valor < 0) return 'Percentual mínimo: 0%';
      if (paymentMethod.entrada_valor > 100) return 'Percentual máximo: 100%';
    } else {
      if (paymentMethod.entrada_valor < 0) return 'Valor mínimo: R$ 0,00';
      if (totalValue > 0 && paymentMethod.entrada_valor > totalValue) {
        return 'Entrada não pode ser maior que o total';
      }
    }
    return null;
  };

  const validationError = validateEntrada();

  const isDefault = paymentMethod.is_default === true;

  return (
    <div className={`rounded-lg p-4 space-y-4 bg-white shadow-sm border-2 transition-colors ${
      isDefault ? 'border-green-500 ring-2 ring-green-100' : 'border-gray-200'
    }`}>
      {/* Banner padrão */}
      {isDefault && (
        <div className="flex items-center gap-2 px-3 py-1.5 -mx-4 -mt-4 mb-0 bg-green-500 rounded-t-lg text-xs text-white font-semibold">
          <Star className="w-3 h-3 fill-white" />
          Forma de Pagamento Padrão — Pré-selecionada para o cliente
        </div>
      )}

      {/* Cabeçalho: Nome + Botão Padrão */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Forma de Pagamento *
          </label>
          <input
            type="text"
            value={paymentMethod.nome}
            onChange={(e) => onChange('nome', e.target.value)}
            placeholder="Ex: PIX, Cartão de Crédito, Boleto"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={onSetDefault}
          title={isDefault ? 'Esta é a forma padrão' : 'Marcar como padrão (pré-selecionada ao abrir o orçamento)'}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 font-medium text-xs transition-all whitespace-nowrap ${
            isDefault
              ? 'bg-green-500 border-green-500 text-white shadow-md'
              : 'bg-white border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600'
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isDefault ? 'fill-white' : ''}`} />
          {isDefault ? 'Padrão ✓' : 'Definir padrão'}
        </button>
      </div>

      {/* Toggle: Percentual vs Valor Fixo */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Entrada
        </label>
        <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
          <button
            type="button"
            onClick={() => onChange('entrada_tipo', 'percentual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              paymentMethod.entrada_tipo === 'percentual'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            <Percent className="w-4 h-4" />
            Percentual
          </button>
          <button
            type="button"
            onClick={() => onChange('entrada_tipo', 'fixo')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              paymentMethod.entrada_tipo === 'fixo'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Valor Fixo
          </button>
        </div>
      </div>

      {/* Campo de Entrada - Dinâmico baseado no tipo */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700">
            Valor de Entrada {paymentMethod.entrada_tipo === 'percentual' ? '(%)' : '(R$)'}
          </label>
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {paymentMethod.entrada_tipo === 'percentual' ? (
          <div className="space-y-2">
            {/* Slider para percentual */}
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={paymentMethod.entrada_valor}
              onChange={(e) => onChange('entrada_valor', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>0%</span>
              <span className="font-bold text-lg text-blue-600">
                {paymentMethod.entrada_valor}%
              </span>
              <span>100%</span>
            </div>
            {/* Preview do valor calculado */}
            {totalValue > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                <span className="text-sm text-gray-600">Valor da entrada: </span>
                <span className="font-bold text-blue-600">
                  R$ {getEntradaReal().toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}
          </div>
        ) : (
          <NumberInput
            value={paymentMethod.entrada_valor}
            onChange={(value) => onChange('entrada_valor', value)}
            min={0}
            step={10}
            placeholder="0,00"
          />
        )}

        {/* Mensagem de erro de validação */}
        {validationError && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
            {validationError}
          </div>
        )}

        {/* Info box */}
        {showInfo && (
          <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-gray-700">
            {paymentMethod.entrada_tipo === 'percentual' ? (
              <>
                <strong>Modo Percentual:</strong> A entrada será calculada automaticamente como
                um percentual do valor total do orçamento. Ideal para quando você quer manter
                uma proporção fixa independente do valor.
              </>
            ) : (
              <>
                <strong>Modo Valor Fixo:</strong> A entrada terá sempre o mesmo valor,
                independente do total do orçamento. Ideal para taxas de reserva ou sinal padrão.
              </>
            )}
          </div>
        )}
      </div>

      {/* Máximo de Parcelas */}
      <NumberInput
        label="Máximo de Parcelas"
        value={paymentMethod.max_parcelas}
        onChange={(value) => onChange('max_parcelas', Math.round(value))}
        min={0}
        max={24}
        step={1}
      />

      {/* Desconto ou Acréscimo */}
      <div>
        <NumberInput
          label="Desconto (-) ou Acréscimo (+) em %"
          value={paymentMethod.acrescimo}
          onChange={(value) => onChange('acrescimo', value)}
          min={-100}
          max={100}
          step={1}
          suffix="%"
        />
        <p className="text-xs text-gray-500 mt-1">
          {paymentMethod.acrescimo < 0
            ? `Desconto de ${Math.abs(paymentMethod.acrescimo)}% será aplicado`
            : paymentMethod.acrescimo > 0
            ? `Acréscimo de ${paymentMethod.acrescimo}% será aplicado (ex: taxa de parcelamento)`
            : 'Use valores negativos para desconto (ex: -5) ou positivos para acréscimo (ex: 10)'}
        </p>
      </div>

      {/* Botão Remover */}
      <div className="flex justify-end pt-2 border-t">
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Remover Forma de Pagamento
        </button>
      </div>
    </div>
  );
}

/**
 * Utilitário: Formata valor monetário para exibição
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Utilitário: Calcula valor da entrada baseado no tipo
 */
export function calculateEntrada(
  paymentMethod: PaymentMethod,
  totalValue: number
): number {
  if (paymentMethod.entrada_tipo === 'percentual') {
    return (totalValue * paymentMethod.entrada_valor) / 100;
  }
  return paymentMethod.entrada_valor;
}
