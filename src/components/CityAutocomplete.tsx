import { useState, useEffect, useRef } from 'react';
import { MapPin, X } from 'lucide-react';
import { filterByText, sortByRelevance } from '../lib/textUtils';

interface City {
  id: string;
  nome: string;
  ajuste_percentual: number;
  taxa_deslocamento: number;
}

interface CityAutocompleteProps {
  cities: City[];
  value: string;
  onChange: (value: string, city?: City) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

/**
 * Componente de Autocomplete para Cidades
 *
 * Características:
 * - Busca case-insensitive
 * - Normalização de texto (remove acentos)
 * - Ordenação por relevância
 * - Aplicação automática de ajustes da cidade selecionada
 * - Teclado navegável (setas, enter, escape)
 * - Click-away para fechar dropdown
 */
export function CityAutocomplete({
  cities,
  value,
  onChange,
  placeholder = 'Digite o nome da cidade...',
  className = '',
  required = false
}: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Atualizar input quando value externo mudar
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filtrar cidades quando input ou cidades mudarem
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredCities([]);
      setShowDropdown(false);
      return;
    }

    let filtered = filterByText(cities, inputValue, city => city.nome);
    filtered = sortByRelevance(filtered, inputValue, city => city.nome);

    setFilteredCities(filtered);
    setShowDropdown(filtered.length > 0);
    setSelectedIndex(0);
  }, [inputValue, cities]);

  // Click-away handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectCity = (city: City) => {
    setInputValue(city.nome);
    setShowDropdown(false);
    onChange(city.nome, city);
  };

  const handleClear = () => {
    setInputValue('');
    setShowDropdown(false);
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredCities.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredCities.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;

      case 'Enter':
        e.preventDefault();
        if (filteredCities[selectedIndex]) {
          handleSelectCity(filteredCities[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        break;
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <MapPin className="w-5 h-5" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim() && filteredCities.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Limpar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && filteredCities.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredCities.map((city, index) => (
            <button
              key={city.id}
              type="button"
              onClick={() => handleSelectCity(city)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    {city.nome}
                  </div>

                  {/* Mostrar ajustes disponíveis (opcional) */}
                  {(city.ajuste_percentual !== 0 || city.taxa_deslocamento !== 0) && (
                    <div className="text-xs text-gray-500 mt-1 ml-6">
                      {city.ajuste_percentual !== 0 && (
                        <span className="mr-2">
                          {city.ajuste_percentual > 0 ? '+' : ''}
                          {city.ajuste_percentual}%
                        </span>
                      )}
                      {city.taxa_deslocamento !== 0 && (
                        <span>R$ {city.taxa_deslocamento.toFixed(2)}</span>
                      )}
                    </div>
                  )}
                </div>

                {index === selectedIndex && (
                  <div className="text-xs text-blue-600 ml-2 mt-1">
                    Enter ↵
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {showDropdown && inputValue.trim() && filteredCities.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm"
        >
          Nenhuma cidade encontrada para "{inputValue}"
        </div>
      )}

      {/* Helper Text */}
      {inputValue.trim() && showDropdown && filteredCities.length > 0 && (
        <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
          <span>
            {filteredCities.length} {filteredCities.length === 1 ? 'cidade encontrada' : 'cidades encontradas'}
          </span>
          <span className="text-gray-400">
            Use ↑↓ para navegar, Enter para selecionar
          </span>
        </div>
      )}
    </div>
  );
}
