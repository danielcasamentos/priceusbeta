import { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { detectBrowser } from '../lib/browserDetection';
import type { getTema } from '../lib/themes';

interface MobileDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  label?: string;
  description?: string;
  tema?: ReturnType<typeof getTema>;
  disabledDate?: (date: Date) => boolean; // Adicionando a nova propriedade
}

/**
 * Componente adaptativo de seleção de data que funciona perfeitamente em:
 * - Chrome Mobile
 * - Safari iOS
 * - Navegadores in-app (Instagram, WhatsApp, Facebook)
 * - Desktop
 *
 * Detecta automaticamente o tipo de navegador e usa a melhor estratégia.
 */
export function MobileDatePicker({
  value,
  onChange,
  min,
  required = false,
  className = '',
  disabled = false,
  label,
  description,
  tema,
  disabledDate,
}: MobileDatePickerProps) {
  const [useFallback, setUseFallback] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? new Date(value + 'T00:00:00') : null
  );
  const [currentMonth, setCurrentMonth] = useState(
    selectedDate || new Date()
  );
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const browserInfo = detectBrowser() as any;
    console.log('[MobileDatePicker] Browser detectado:', browserInfo);

    // Usar fallback para navegadores in-app problemáticos
    const needsFallback =
      browserInfo.isInAppBrowser ||
      (browserInfo.isMobile && browserInfo.browser === 'unknown') ||
      (browserInfo.isMobile && browserInfo.os === 'Android' && browserInfo.browser === 'Instagram');

    setUseFallback(needsFallback);

    if (needsFallback) {
      console.log('[MobileDatePicker] Usando fallback de calendário customizado');
    }
  }, []);

  // Atualizar data interna quando value externo mudar
  useEffect(() => {
    if (value) {
      setSelectedDate(new Date(value + 'T00:00:00'));
      setCurrentMonth(new Date(value + 'T00:00:00'));
    }
  }, [value]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('[MobileDatePicker] Data nativa selecionada:', newValue);
    onChange(newValue);
  };

  const handleCustomDateSelect = (date: Date) => {
    const formatted = formatDate(date);
    console.log('[MobileDatePicker] Data customizada selecionada:', formatted);
    setSelectedDate(date);
    onChange(formatted);
    setShowCalendar(false);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Preencher dias vazios do início
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Preencher dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const isDateDisabled = (date: Date): boolean => {
    if (!min) return false;
    const minDate = new Date(min + 'T00:00:00');
    return date < minDate;
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  if (useFallback) {
    // Calendário customizado para navegadores problemáticos
    return (
      <div className="relative">
        {label && (
          <label className={`block text-sm font-medium ${tema ? tema.cores.textoSecundario : 'text-gray-700'} mb-2`}>
            {label} {required && '*'}
          </label>
        )}

        <button
          type="button"
          onClick={() => !disabled && setShowCalendar(!showCalendar)}
          disabled={disabled}
          className={`w-full flex items-center gap-3 px-4 py-3 text-base border ${tema ? tema.cores.borda : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation ${tema ? tema.cores.bgCard : 'bg-white'} ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'
          } ${className}`}
        >
          <Calendar className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <span className={`flex-1 text-left ${selectedDate ? 'text-gray-900' : 'text-gray-500'}`}>
            {selectedDate ? formatDisplayDate(selectedDate) : 'Selecione uma data'}
          </span>
        </button>

        {description && (
          <p className="text-xs text-gray-500 mt-2">{description}</p>
        )}

        {showCalendar && !disabled && (
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowCalendar(false)}
            />

            {/* Calendário Modal */}
            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 p-4 max-w-md mx-auto max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                    )
                  }
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>

                <h3 className="text-lg font-bold text-gray-900">
                  {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                </h3>

                <button
                  type="button"
                  onClick={() =>
                    setCurrentMonth(
                      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                    )
                  }
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekDays.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-gray-600 py-2"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth(currentMonth).map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const disabled = isDateDisabled(date) || (disabledDate && disabledDate(date));
                  const selected = isSelected(date);
                  const today = isToday(date);

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => !disabled && handleCustomDateSelect(date)}
                      disabled={disabled}
                      className={`aspect-square rounded-lg text-sm font-medium transition-all touch-manipulation ${
                        disabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : selected
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : today
                          ? 'bg-blue-50 text-blue-600 border-2 border-blue-600'
                          : 'bg-white text-gray-900 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCalendar(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Fechar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Input nativo padrão para navegadores compatíveis
  return (
    <div>
      {label && (
        <label htmlFor="date-picker" className={`block text-sm font-medium ${tema ? tema.cores.textoSecundario : 'text-gray-700'} mb-2`}>
          {label} {required && '*'}
        </label>
      )}

      <input
        ref={inputRef}
        type="date"
        id="date-picker"
        value={value}
        onChange={handleNativeDateChange}
        min={min}
        required={required}
        onFocus={(e) => useFallback && e.target.blur()} // Evita teclado em fallback
        disabled={disabled}
        className={`w-full px-4 py-3 text-base border ${tema ? tema.cores.borda : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-opacity-50 touch-manipulation ${
          disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : tema ? tema.cores.bgCard : 'bg-white'
        } ${className}`}
        style={{
          WebkitAppearance: 'none',
          MozAppearance: 'textfield',
        }}
      />

      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
}
