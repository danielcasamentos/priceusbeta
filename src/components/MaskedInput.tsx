import { forwardRef, InputHTMLAttributes } from 'react';
// @ts-ignore - no type declarations for react-input-mask
import InputMask from 'react-input-mask';

interface MaskedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  maskChar?: string | null;
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ mask, value, onChange, className, placeholder, maskChar = '_', ...props }, ref) => {
    return (
      <InputMask
        mask={mask}
        value={value}
        onChange={onChange}
        maskChar={maskChar}
        className={className}
        placeholder={placeholder}
        {...props}
      >
        {(inputProps: any) => (
          <input
            ref={ref}
            {...inputProps}
            type="text"
          />
        )}
      </InputMask>
    );
  }
);

MaskedInput.displayName = 'MaskedInput';
