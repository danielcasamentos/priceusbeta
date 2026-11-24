import { Minus, Plus } from 'lucide-react';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  label,
  min = 0,
  max,
  step = 1,
  prefix,
  suffix,
  placeholder,
  disabled = false,
  className = '',
}: NumberInputProps) {
  const handleIncrement = () => {
    const newValue = value + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  };

  const handleDecrement = () => {
    const newValue = value - step;
    if (newValue >= min) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    if (newValue >= min && (max === undefined || newValue <= max)) {
      onChange(newValue);
    }
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {/* Botão de Decremento */}
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="absolute left-0 z-10 h-full px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-l-lg transition-colors active:bg-gray-200 touch-manipulation"
          aria-label="Diminuir"
        >
          <Minus size={18} strokeWidth={2.5} />
        </button>

        {/* Input */}
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          step={step}
          min={min}
          max={max}
          className="w-full px-12 py-3 text-center text-base font-medium border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          style={{
            WebkitAppearance: 'none',
            MozAppearance: 'textfield',
          }}
        />

        {/* Botão de Incremento */}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="absolute right-0 z-10 h-full px-3 text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-r-lg transition-colors active:bg-gray-200 touch-manipulation"
          aria-label="Aumentar"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>

        {/* Prefix/Suffix */}
        {(prefix || suffix) && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <span className="text-gray-500 text-sm font-medium">
              {prefix}
              <span className="invisible">{value.toString().padStart(3, '0')}</span>
              {suffix}
            </span>
          </div>
        )}
      </div>

      {/* Dica visual para mobile */}
      <p className="mt-1 text-xs text-gray-500">
        Use os botões − e + ou digite diretamente
      </p>
    </div>
  );
}

export default NumberInput;
