import { useState } from 'react';
import { Upload, X, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface CalendarImportModalProps {
  onClose: () => void;
  onImport: (file: File, estrategia: 'substituir_tudo' | 'adicionar_novos' | 'mesclar_atualizar') => Promise<void>;
}

export function CalendarImportModal({ onClose, onImport }: CalendarImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [estrategia, setEstrategia] = useState<'substituir_tudo' | 'adicionar_novos' | 'mesclar_atualizar'>('adicionar_novos');
  const [showPreview, setShowPreview] = useState(false);
  const [previewLines, setPreviewLines] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim()).slice(0, 11);
    setPreviewLines(lines);
    setShowPreview(true);
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImporting(true);
    try {
      await onImport(selectedFile, estrategia);
      onClose();
    } catch (error) {
      console.error('Erro ao importar:', error);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Importar Calendário</h3>
              <p className="text-sm text-gray-600">Escolha como importar seus eventos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arquivo
            </label>
            <input
              type="file"
              accept=".csv,.ics,.ical"
              onChange={handleFileSelect}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos aceitos: CSV, ICS, iCalendar
            </p>
          </div>

          {showPreview && (
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-2">Preview do arquivo:</p>
              <div className="bg-white rounded border border-gray-200 p-2 max-h-40 overflow-y-auto">
                {previewLines.map((line, idx) => (
                  <p key={idx} className="text-xs font-mono text-gray-600 truncate">
                    {line}
                  </p>
                ))}
                {previewLines.length >= 11 && (
                  <p className="text-xs text-gray-500 mt-1">... e mais linhas</p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Estratégia de Importação
            </label>
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="estrategia"
                  value="adicionar_novos"
                  checked={estrategia === 'adicionar_novos'}
                  onChange={(e) => setEstrategia(e.target.value as 'adicionar_novos')}
                  className="mt-1 w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div className="font-medium text-gray-900">Adicionar Apenas Novos</div>
                    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                      Recomendado
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Adiciona somente eventos que não existem ainda. Eventos duplicados (mesma data e cliente) são ignorados.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-green-300 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="estrategia"
                  value="mesclar_atualizar"
                  checked={estrategia === 'mesclar_atualizar'}
                  onChange={(e) => setEstrategia(e.target.value as 'mesclar_atualizar')}
                  className="mt-1 w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Info className="w-4 h-4 text-blue-600" />
                    <div className="font-medium text-gray-900">Mesclar e Atualizar</div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Adiciona novos eventos e atualiza eventos existentes com as informações do arquivo.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-red-300 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="estrategia"
                  value="substituir_tudo"
                  checked={estrategia === 'substituir_tudo'}
                  onChange={(e) => setEstrategia(e.target.value as 'substituir_tudo')}
                  className="mt-1 w-4 h-4 text-green-600 focus:ring-2 focus:ring-green-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <div className="font-medium text-gray-900">Substituir Tudo</div>
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      Cuidado
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Remove todos os eventos importados anteriormente e adiciona os novos do arquivo. Eventos manuais são preservados.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {estrategia === 'substituir_tudo' && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">Atenção: Ação Irreversível</p>
                <p>
                  Esta opção removerá todos os eventos que foram importados anteriormente.
                  Eventos adicionados manualmente serão preservados.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Importar Eventos
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={importing}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
