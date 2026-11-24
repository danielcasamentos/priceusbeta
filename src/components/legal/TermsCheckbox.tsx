
interface TermsCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  onTermsClick: () => void;
  error?: boolean;
}

export function TermsCheckbox({ checked, onChange, onTermsClick, error }: TermsCheckboxProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center h-5 mt-0.5">
        <input
          type="checkbox"
          id="terms-checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={`
            w-4 h-4 rounded border transition-colors cursor-pointer
            focus:ring-2 focus:ring-offset-2
            ${error
              ? 'border-red-500 text-red-600 focus:ring-red-500'
              : 'border-gray-300 text-blue-600 focus:ring-blue-500'
            }
          `}
        />
      </div>
      <label htmlFor="terms-checkbox" className="text-sm leading-relaxed cursor-pointer select-none">
        <span className="text-gray-700">
          Li e aceito os{' '}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onTermsClick();
          }}
          className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
        >
          Termos e Condições de Uso
        </button>
        <span className="text-gray-700">
          {' '}e a{' '}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onTermsClick();
          }}
          className="text-blue-600 hover:text-blue-700 underline font-medium transition-colors"
        >
          Política de Privacidade
        </button>
        <span className="text-red-500">*</span>
      </label>
    </div>
  );
}
