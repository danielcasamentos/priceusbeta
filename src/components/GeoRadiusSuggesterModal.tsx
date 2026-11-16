import { useState } from 'react';
import { X, Navigation, Search, MapPin, Check, Loader2, AlertCircle } from 'lucide-react';
import {
  BaseLocationInfo,
  getBrowserCoordinates,
  reverseGeocodeNominatim,
  searchCityNominatim,
  fetchNearbyCitiesOverpass,
  suggestDisplacementFee,
} from '../services/geoRadiusService';

interface SuggestedCityRow {
  name: string;
  distanceKm: number;
  taxaDeslocamento: number;
  ajustePercentual: number;
  selected: boolean;
  alreadyExists: boolean;
}

interface GeoRadiusSuggesterModalProps {
  existingCityNames: string[];
  onClose: () => void;
  onConfirmSave: (params: {
    baseLocation: BaseLocationInfo;
    cities: Array<{
      nome: string;
      taxa_deslocamento: number;
      ajuste_percentual: number;
    }>;
  }) => Promise<void>;
}

export function GeoRadiusSuggesterModal({
  existingCityNames,
  onClose,
  onConfirmSave,
}: GeoRadiusSuggesterModalProps) {
  const [baseLocation, setBaseLocation] = useState<BaseLocationInfo | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BaseLocationInfo[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [searchingCity, setSearchingCity] = useState(false);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parâmetros de cálculo
  const [radiusKm, setRadiusKm] = useState<number>(60);
  const [freeRadiusKm, setFreeRadiusKm] = useState<number>(15);
  const [pricePerKm, setPricePerKm] = useState<number>(2);
  const [roundTrip, setRoundTrip] = useState<boolean>(true);
  const [extraPercentFar, setExtraPercentFar] = useState<number>(0);

  const [rows, setRows] = useState<SuggestedCityRow[]>([]);

  const existingSet = new Set(
    existingCityNames.map((n) => n.trim().toLowerCase()).filter(Boolean)
  );

  const loadCitiesForLocation = async (
    loc: BaseLocationInfo,
    rad = radiusKm,
    freeKm = freeRadiusKm,
    perKm = pricePerKm,
    isRoundTrip = roundTrip,
    pctFar = extraPercentFar
  ) => {
    setLoadingNearby(true);
    setError(null);
    try {
      const nearby = await fetchNearbyCitiesOverpass(loc.lat, loc.lon, rad, loc.city);
      const mapped: SuggestedCityRow[] = nearby.map((c) => {
        const exists = existingSet.has(c.name.trim().toLowerCase());
        const fee = suggestDisplacementFee(c.distanceKm, freeKm, perKm, isRoundTrip);
        const pct = c.distanceKm > freeKm ? pctFar : 0;
        return {
          name: c.name,
          distanceKm: c.distanceKm,
          taxaDeslocamento: fee,
          ajustePercentual: pct,
          selected: !exists,
          alreadyExists: exists,
        };
      });
      setRows(mapped);
    } catch (err: any) {
      setError(err?.message || 'Erro ao buscar cidades próximas.');
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleDetectLocation = async () => {
    setDetecting(true);
    setError(null);
    try {
      const coords = await getBrowserCoordinates();
      const info = await reverseGeocodeNominatim(coords.lat, coords.lon);
      setBaseLocation(info);
      setSearchResults([]);
      await loadCitiesForLocation(info);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível detectar sua localização.');
    } finally {
      setDetecting(false);
    }
  };

  const handleSearchManual = async () => {
    if (!manualQuery.trim()) return;
    setSearchingCity(true);
    setError(null);
    try {
      const results = await searchCityNominatim(manualQuery);
      if (results.length === 0) {
        setError('Nenhuma cidade encontrada para essa busca.');
        setSearchResults([]);
      } else if (results.length === 1) {
        setBaseLocation(results[0]);
        setSearchResults([]);
        await loadCitiesForLocation(results[0]);
      } else {
        setSearchResults(results);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao buscar cidade.');
    } finally {
      setSearchingCity(false);
    }
  };

  const handleRecalculateFees = () => {
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        taxaDeslocamento: suggestDisplacementFee(
          row.distanceKm,
          freeRadiusKm,
          pricePerKm,
          roundTrip
        ),
        ajustePercentual: row.distanceKm > freeRadiusKm ? extraPercentFar : 0,
      }))
    );
  };

  const selectedRows = rows.filter((r) => r.selected);

  const handleSave = async () => {
    if (!baseLocation || selectedRows.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirmSave({
        baseLocation,
        cities: selectedRows.map((r) => ({
          nome: r.name,
          taxa_deslocamento: r.taxaDeslocamento,
          ajuste_percentual: r.ajustePercentual,
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar cidades.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0d1829] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Sugerir Cidades Próximas por Raio
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Detecte sua localização (ou busque sua cidade base) para calcular taxas de deslocamento automáticas sem afetar suas regras manuais.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Passo 1: Localização Base */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220] space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={detecting || loadingNearby}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium text-sm disabled:opacity-60 transition-colors"
              >
                {detecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                {detecting ? 'Detectando...' : 'Usar Minha Localização Atual'}
              </button>

              <span className="text-xs text-gray-400 text-center">ou</span>

              <div className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchManual();
                      }
                    }}
                    placeholder="Digite sua cidade base (ex: Campinas, SP ou Lisboa)..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSearchManual}
                  disabled={searchingCity || !manualQuery.trim()}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-800 dark:bg-white/10 text-white hover:bg-gray-900 dark:hover:bg-white/20 disabled:opacity-50"
                >
                  {searchingCity ? 'Buscando...' : 'Buscar'}
                </button>
              </div>
            </div>

            {searchResults.length > 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {searchResults.map((res, idx) => (
                  <button
                    key={`${res.city}-${idx}`}
                    type="button"
                    onClick={() => {
                      setBaseLocation(res);
                      setSearchResults([]);
                      loadCitiesForLocation(res);
                    }}
                    className="text-xs px-3 py-1.5 rounded-full bg-white dark:bg-[#0d1829] border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 hover:bg-blue-50"
                  >
                    📍 {res.city} - {res.stateCode} ({res.countryCode})
                  </button>
                ))}
              </div>
            )}

            {baseLocation && (
              <div className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg px-3 py-2">
                <span>
                  📍 Base selecionada: <strong>{baseLocation.city}</strong> — {baseLocation.stateName} ({baseLocation.stateCode}) / {baseLocation.countryName}
                </span>
              </div>
            )}
          </div>

          {/* Passo 2: Parâmetros de Raio e Deslocamento */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                Raio (km)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value) || 50)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                Km isento
              </label>
              <input
                type="number"
                min={0}
                max={200}
                value={freeRadiusKm}
                onChange={(e) => setFreeRadiusKm(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                Valor por km (R$)
              </label>
              <input
                type="number"
                min={0}
                step={0.5}
                value={pricePerKm}
                onChange={(e) => setPricePerKm(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-1">
                Ajuste % fora isenção
              </label>
              <input
                type="number"
                step={1}
                value={extraPercentFar}
                onChange={(e) => setExtraPercentFar(Number(e.target.value) || 0)}
                className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex flex-col justify-between">
              <label className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={roundTrip}
                  onChange={(e) => setRoundTrip(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Ida e volta (2x)
              </label>
              <button
                type="button"
                disabled={!baseLocation || loadingNearby}
                onClick={() => {
                  if (baseLocation) {
                    loadCitiesForLocation(baseLocation);
                  }
                }}
                className="mt-2 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {loadingNearby ? 'Buscando...' : 'Atualizar Raio'}
              </button>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {rows.length} cidades encontradas num raio de {radiusKm} km. Valores editáveis abaixo:
              </span>
              <button
                type="button"
                onClick={handleRecalculateFees}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Recalcular sugestões com parâmetros acima
              </button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Lista de Cidades */}
          {loadingNearby ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600 mb-2" />
              <p className="text-sm">Consultando cidades reais no mapa...</p>
            </div>
          ) : rows.length > 0 ? (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {rows.map((row, idx) => (
                <div
                  key={`${row.name}-${idx}`}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-xl border transition-colors ${
                    row.selected
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-500/10'
                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.02]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setRows((prev) =>
                        prev.map((r, i) => (i === idx ? { ...r, selected: !r.selected } : r))
                      )
                    }
                    className={`w-5 h-5 rounded flex items-center justify-center border flex-shrink-0 ${
                      row.selected
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-300 dark:border-white/25'
                    }`}
                  >
                    {row.selected && <Check className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex-1 min-w-[150px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">
                        {row.name}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                        {row.distanceKm === 0 ? 'Cidade base' : `${row.distanceKm} km`}
                      </span>
                      {row.alreadyExists && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          Já cadastrada
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div>
                      <label className="block text-[10px] text-gray-500">Taxa (R$)</label>
                      <input
                        type="number"
                        step="1"
                        value={row.taxaDeslocamento}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, taxaDeslocamento: val } : r))
                          );
                        }}
                        className="w-24 px-2 py-1 text-xs rounded border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-500">Ajuste (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={row.ajustePercentual}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, ajustePercentual: val } : r))
                          );
                        }}
                        className="w-20 px-2 py-1 text-xs rounded border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0d1829] text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#091220]">
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {selectedRows.length} {selectedRows.length === 1 ? 'cidade selecionada' : 'cidades selecionadas'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || selectedRows.length === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Salvando...' : `Adicionar (${selectedRows.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

