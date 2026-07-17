import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Trash2, CheckCircle, AlertCircle, Loader2, Copy, Share2, Gift } from 'lucide-react';
import { ImageUploadService } from '../services/imageUploadService';
import { ImageWithFallback } from './ImageWithFallback';
import { NumberInput } from './ui/NumberInput';
import { FormattedDescription } from './ui/FormattedDescription';

interface Product {
  id?: string;
  nome: string;
  resumo: string;
  valor: number;
  unidade: string;
  obrigatorio: boolean;
  ordem: number;
  imagem_url?: string;
  mostrar_imagem: boolean;
  imagens?: string[];
  carrossel_automatico?: boolean;
  /** Quando false, exibe toggle (selecionar/não) em vez de +/- quantidade */
  permite_multiplas_unidades?: boolean;
  /** Desconto percentual (0–100). Zero = sem desconto */
  desconto_percentual?: number;
  /** Destacar este produto com um badge especial no orçamento */
  destacar_produto?: boolean;
  /** Texto exibido no badge de destaque (ex: Mais Vendido) */
  destaque_texto?: string;
  duracao_minutos?: number | null;
  keywords_upsell?: string | null;
  brindes_vinculados?: string[] | null;
  brindes_titulo_personalizado?: string;
  brindes_mostrar_valores?: boolean;
}

interface ProductEditorProps {
  product: Product;
  onChange: (field: keyof Product, value: any) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  userId: string;
  templateId?: string;
  onProductSaved?: (productId: string) => void;
  allProducts?: Product[];
  upsellProdutosIds?: string[];
  brindesProducts?: any[];
}

/**
 * 🎨 PRODUCT EDITOR COM UPLOAD AVANÇADO
 *
 * Funcionalidades:
 * - Upload otimizado com compressão automática
 * - Drag & drop intuitivo
 * - Preview em tempo real
 * - Retry automático em caso de falha
 * - Validação completa de arquivos
 * - Feedback visual detalhado
 * - Auto-save no banco de dados
 */
export function ProductEditor({ 
  product, 
  onChange, 
  onRemove, 
  onDuplicate, 
  userId, 
  templateId, 
  onProductSaved,
  allProducts = [],
  upsellProdutosIds = [],
  brindesProducts = []
}: ProductEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(Date.now());
  const [unitType, setUnitType] = useState<'hours' | 'minutes'>(() => {
    if (!product.duracao_minutos) return 'hours';
    return product.duracao_minutos % 60 === 0 ? 'hours' : 'minutes';
  });
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

  const [uploadingSlots, setUploadingSlots] = useState<number[]>([]);
  const [slotProgress, setSlotProgress] = useState<Record<number, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Valida se o produto tem os campos obrigatórios preenchidos
   */
  const validateProductForAutoSave = (): { valid: boolean; message?: string } => {
    if (!product.nome || product.nome.trim() === '') {
      return { valid: false, message: 'Preencha o nome do produto antes de adicionar uma imagem' };
    }

    if (!product.valor || product.valor <= 0) {
      return { valid: false, message: 'Preencha um valor maior que zero antes de adicionar uma imagem' };
    }

    if (!templateId) {
      return { valid: false, message: 'Template ID não encontrado' };
    }

    return { valid: true };
  };

  /**
   * Auto-save do produto no banco e retorna o ID gerado
   */
  const autoSaveProduct = async (): Promise<string | null> => {
    setSaving(true);
    try {
      const produtoData = {
        template_id: templateId,
        nome: product.nome,
        resumo: product.resumo || '',
        valor: product.valor,
        unidade: product.unidade,
        obrigatorio: product.obrigatorio,
        ordem: product.ordem,
        mostrar_imagem: false,
        imagens: product.imagens || [],
        carrossel_automatico: product.carrossel_automatico || false,
        permite_multiplas_unidades: product.permite_multiplas_unidades ?? true,
        desconto_percentual: product.desconto_percentual ?? 0,
        destacar_produto: product.destacar_produto ?? false,
        destaque_texto: product.destaque_texto ?? null,
        duracao_minutos: product.duracao_minutos ?? null,
        keywords_upsell: product.keywords_upsell || null,
      };

      const { data, error: insertError } = await supabase
        .from('produtos')
        .insert(produtoData)
        .select('id')
        .single();

      if (insertError) {
        throw insertError;
      }

      if (!data?.id) {
        throw new Error('ID do produto não foi retornado');
      }

      console.log('✅ Produto salvo automaticamente com ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Erro ao salvar produto automaticamente:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  /**
   * Processa upload de multiplas imagens com o novo serviço
   */
  const handleMultipleImagesUpload = async (files: File[]) => {
    setError(null);
    setSuccess(null);

    // PASSO 1: Validar campos obrigatórios
    const validation = validateProductForAutoSave();
    if (!validation.valid) {
      setError(validation.message || 'Dados inválidos');
      return;
    }

    // PASSO 2: Auto-save do produto se não tiver ID
    let productId = product.id;

    if (!productId) {
      setSaving(true);
      setUploading(true);
      setUploadingSlots([0]);
      setSlotProgress({ 0: 5 });

      try {
        const savedId = await autoSaveProduct();
        if (!savedId) {
          throw new Error('Falha ao obter ID do produto');
        }
        productId = savedId;

        // Atualizar estado local com o novo ID
        onChange('id', productId);

        // Notificar componente pai sobre o novo ID
        if (onProductSaved) {
          onProductSaved(productId);
        }

        console.log('✅ Produto salvo, prosseguindo com upload de imagem');
      } catch (error) {
        setError('Erro ao salvar produto. Tente novamente.');
        console.error('Erro no auto-save:', error);
        setUploading(false);
        setSaving(false);
        setUploadingSlots([]);
        setSlotProgress({});
        return;
      } finally {
        setSaving(false);
        setUploadingSlots([]);
        setSlotProgress({});
      }
    }

    // PASSO 3: Upload das imagens progressivo, slot-by-slot
    setUploading(true);

    let successCount = 0;
    try {
      const currentUrls = [
        product.imagem_url || null,
        ...(product.imagens && Array.isArray(product.imagens)
          ? [
              product.imagens[0] || null,
              product.imagens[1] || null,
              product.imagens[2] || null,
              product.imagens[3] || null,
            ]
          : [null, null, null, null])
      ];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Encontra o primeiro slot livre
        const targetIndex = currentUrls.findIndex(url => !url);

        if (targetIndex === -1 || targetIndex >= 5) {
          setError('Limite máximo de 5 imagens atingido');
          break;
        }

        // Marcar o slot como em upload
        setUploadingSlots(prev => [...prev, targetIndex]);
        setSlotProgress(prev => ({ ...prev, [targetIndex]: 0 }));

        const uploadService = new ImageUploadService((progressData) => {
          setSlotProgress(prev => ({ ...prev, [targetIndex]: progressData.percent }));
        });

        const result = await uploadService.uploadImage(file, userId, {
          maxSizeMB: 5,
          maxWidthPx: 1280,
          maxHeightPx: 1280,
          quality: 0.80,
          allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
          folder: 'produtos',
        });

        // Limpar estado de progresso desse slot
        setUploadingSlots(prev => prev.filter(idx => idx !== targetIndex));
        setSlotProgress(prev => {
          const next = { ...prev };
          delete next[targetIndex];
          return next;
        });

        if (result.success && result.url) {
          currentUrls[targetIndex] = result.url;
          successCount++;

          const finalImagemUrl = currentUrls[0] || '';
          const finalImagensArray = [
            currentUrls[1] || '',
            currentUrls[2] || '',
            currentUrls[3] || '',
            currentUrls[4] || ''
          ];

          onChange('imagem_url', finalImagemUrl);
          onChange('imagens', finalImagensArray);
          onChange('mostrar_imagem', true);

          // Salvar URLs das imagens no banco
          await saveImageToDatabase(finalImagemUrl, finalImagensArray, productId);
        } else {
          console.warn(`Erro no upload de ${file.name}:`, result.error);
          setError(`Erro ao enviar "${file.name}": ${result.error || 'Erro desconhecido'}`);
        }
      }

      if (successCount > 0) {
        setImageKey(Date.now());
        setSuccess(`${successCount} imagem(ns) enviada(s) com sucesso!`);
        setTimeout(() => setSuccess(null), 4000);
      }
    } catch (error) {
      console.error('Erro no upload múltiplo:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setUploading(false);
      setSaving(false);
      setUploadingSlots([]);
      setSlotProgress({});
    }
  };

  /**
   * Salva URL da imagem no banco de dados
   */
  const saveImageToDatabase = async (imageUrl: string, imagensArray: string[], productId: string) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('produtos')
        .update({
          imagem_url: imageUrl || null,
          imagens: imagensArray,
          mostrar_imagem: imageUrl ? true : false,
        })
        .eq('id', productId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Erro ao salvar no banco:', error);
      throw new Error('Imagem enviada, mas não foi salva no banco');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handler para input file
   */
  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      handleMultipleImagesUpload(Array.from(files));
    }
    event.target.value = '';
  };

  /**
   * Handler para drag & drop
   */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleMultipleImagesUpload(Array.from(files));
    }
  };

  // ── Drag & Drop Swap para Slots de Fotos ──────────────────────────────────
  const [draggedSlotIndex, setDraggedSlotIndex] = useState<number | null>(null);

  const handleSlotDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSlotIndex(index);
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleSlotDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSlotDropSwap = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndexStr = e.dataTransfer.getData('text/plain');
    const sourceIndex = parseInt(sourceIndexStr, 10);
    
    if (isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    const currentUrls = [
      product.imagem_url || null,
      ...(product.imagens && Array.isArray(product.imagens)
        ? [
            product.imagens[0] || null,
            product.imagens[1] || null,
            product.imagens[2] || null,
            product.imagens[3] || null,
          ]
        : [null, null, null, null])
    ];

    const temp = currentUrls[sourceIndex];
    currentUrls[sourceIndex] = currentUrls[targetIndex];
    currentUrls[targetIndex] = temp;

    const finalImagemUrl = currentUrls[0] || '';
    const finalImagensArray = [
      currentUrls[1] || '',
      currentUrls[2] || '',
      currentUrls[3] || '',
      currentUrls[4] || ''
    ];

    onChange('imagem_url', finalImagemUrl);
    onChange('imagens', finalImagensArray);

    if (product.id) {
      await saveImageToDatabase(finalImagemUrl, finalImagensArray, product.id);
    }
    setImageKey(Date.now());
    setDraggedSlotIndex(null);
  };

  /**
   * Reorganizar/reordenar as imagens via swap
   */
  const handleMoveImage = async (index: number, direction: 'left' | 'right') => {
    const currentUrls = [
      product.imagem_url || null,
      ...(product.imagens && Array.isArray(product.imagens)
        ? [
            product.imagens[0] || null,
            product.imagens[1] || null,
            product.imagens[2] || null,
            product.imagens[3] || null,
          ]
        : [null, null, null, null])
    ];

    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= 5) return;

    // Swap
    const temp = currentUrls[index];
    currentUrls[index] = currentUrls[targetIndex];
    currentUrls[targetIndex] = temp;

    const finalImagemUrl = currentUrls[0] || '';
    const finalImagensArray = [
      currentUrls[1] || '',
      currentUrls[2] || '',
      currentUrls[3] || '',
      currentUrls[4] || ''
    ];

    onChange('imagem_url', finalImagemUrl);
    onChange('imagens', finalImagensArray);

    if (product.id) {
      await saveImageToDatabase(finalImagemUrl, finalImagensArray, product.id);
    }
    setImageKey(Date.now());
  };

  /**
   * Remove uma imagem por índice (sem deslocar as outras)
   */
  const handleRemoveImageAtIndex = async (index: number) => {
    if (!confirm('⚠️ Deseja remover esta imagem?')) return;

    setError(null);
    try {
      const currentUrls = [
        product.imagem_url || null,
        ...(product.imagens && Array.isArray(product.imagens)
          ? [
              product.imagens[0] || null,
              product.imagens[1] || null,
              product.imagens[2] || null,
              product.imagens[3] || null,
            ]
          : [null, null, null, null])
      ];

      const imageUrlToRemove = currentUrls[index];
      if (!imageUrlToRemove) return;

      // Deletar do Storage
      const uploadService = new ImageUploadService();
      await uploadService.deleteImage(imageUrlToRemove);

      // Limpar o slot apenas
      currentUrls[index] = null;

      const finalImagemUrl = currentUrls[0] || '';
      const finalImagensArray = [
        currentUrls[1] || '',
        currentUrls[2] || '',
        currentUrls[3] || '',
        currentUrls[4] || ''
      ];

      onChange('imagem_url', finalImagemUrl);
      onChange('imagens', finalImagensArray);

      // Ocultar se não sobrar nenhuma
      const hasAny = currentUrls.some(u => !!u);
      if (!hasAny) {
        onChange('mostrar_imagem', false);
      }

      if (product.id) {
        await saveImageToDatabase(finalImagemUrl, finalImagensArray, product.id);
      }

      setImageKey(Date.now());
      setSuccess('Imagem removida com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erro ao remover imagem:', err);
      setError('Erro ao remover imagem.');
    }
  };

  const insertFormatting = (before: string, after: string) => {
    const textarea = document.getElementById('product-resumo-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = product.resumo || '';
    const selected = text.substring(start, end);
    const replacement = before + selected + after;
    
    const newVal = text.substring(0, start) + replacement + text.substring(end);
    onChange('resumo', newVal);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-4 bg-white shadow-sm">
      {/* Nome do Produto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome do Produto/Serviço *
        </label>
        <input
          type="text"
          value={product.nome}
          onChange={(e) => onChange('nome', e.target.value)}
          placeholder="Ex: Ensaio Fotográfico, Álbum Premium"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Descrição */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'edit'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeTab === 'preview'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }`}
            >
              Visualizar
            </button>
          </div>
          <span className="text-[10px] text-gray-400">Suporta formatação estilo Markdown</span>
        </div>

        {activeTab === 'edit' ? (
          <div>
            {/* Barra de Formatação */}
            <div className="flex gap-1.5 p-1.5 bg-gray-50 border border-b-0 border-gray-300 rounded-t-lg">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**')}
                className="p-1 px-2.5 text-xs font-bold text-gray-650 hover:bg-gray-200 rounded border border-gray-200"
                title="Negrito"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('- ', '')}
                className="p-1 px-2 text-xs text-gray-650 hover:bg-gray-200 rounded border border-gray-200"
                title="Lista de Tópicos"
              >
                • Lista
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('# ', '')}
                className="p-1 px-2 text-xs font-semibold text-gray-650 hover:bg-gray-200 rounded border border-gray-200"
                title="Título"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n---\n', '')}
                className="p-1 px-2 text-xs text-gray-650 hover:bg-gray-200 rounded border border-gray-200"
                title="Linha Divisória"
              >
                Divisor
              </button>
            </div>

            <textarea
              id="product-resumo-textarea"
              value={product.resumo}
              onChange={(e) => onChange('resumo', e.target.value)}
              placeholder="Ex:&#10;# PRÉ-CASAMENTO&#10;- Ensaio de 2 horas&#10;---&#10;# O CASAMENTO&#10;- Cobertura completa"
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-b-lg rounded-t-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y min-h-[160px]"
            />
          </div>
        ) : (
          <div className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 min-h-[202px] overflow-y-auto max-h-[300px]">
            {product.resumo ? (
              <FormattedDescription text={product.resumo} className="text-sm text-gray-800" />
            ) : (
              <p className="text-xs text-gray-400 italic">Nada para visualizar. Escreva uma descrição primeiro.</p>
            )}
          </div>
        )}
      </div>

      {/* Valor e Unidade */}
      <div className="grid grid-cols-2 gap-4">
        <NumberInput
          label="Valor (R$) *"
          value={product.valor}
          onChange={(value) => onChange('valor', value)}
          min={0}
          step={10}
          placeholder="0.00"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Unidade
          </label>
          <select
            value={product.unidade}
            onChange={(e) => onChange('unidade', e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="unidade">Unidade</option>
            <option value="hora">Hora</option>
            <option value="dia">Dia</option>
            <option value="pacote">Pacote</option>
          </select>
        </div>
      </div>

      {/* Duração do Serviço */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Duração do Serviço / Evento
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            value={(() => {
              if (product.duracao_minutos === null || product.duracao_minutos === undefined) return '';
              return unitType === 'hours'
                ? Math.round((product.duracao_minutos / 60) * 100) / 100
                : product.duracao_minutos;
            })()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                onChange('duracao_minutos', null);
              } else {
                const parsedVal = parseFloat(val);
                if (!isNaN(parsedVal) && parsedVal >= 0) {
                  const minutes = unitType === 'hours'
                    ? Math.round(parsedVal * 60)
                    : Math.round(parsedVal);
                  onChange('duracao_minutos', minutes);
                }
              }
            }}
            placeholder={unitType === 'hours' ? 'Ex: 1.5' : 'Ex: 90'}
            min={0}
            step={unitType === 'hours' ? 0.25 : 5}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex rounded-lg border border-gray-300 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setUnitType('hours')}
              className={`px-3 py-2 text-sm font-semibold transition-colors ${
                unitType === 'hours'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Horas
            </button>
            <button
              type="button"
              onClick={() => setUnitType('minutes')}
              className={`px-3 py-2 text-sm font-semibold border-l border-gray-300 transition-colors ${
                unitType === 'minutes'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              Minutos
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Informe o tempo estimado para este serviço. Usado para calcular slots livres na agenda.
        </p>
      </div>

      {/* Upload de Imagem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Galeria de Fotos do Produto (Até 5 fotos)
        </label>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            className="hidden"
            disabled={uploading || saving}
          />

          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-4 transition-all ${
              dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 bg-gray-50/50'
            }`}
          >
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, idx) => {
                const currentImages = [
                  product.imagem_url || null,
                  ...(product.imagens && Array.isArray(product.imagens)
                    ? [
                        product.imagens[0] || null,
                        product.imagens[1] || null,
                        product.imagens[2] || null,
                        product.imagens[3] || null,
                      ]
                    : [null, null, null, null])
                ];
                const imgUrl = currentImages[idx];
                const isUploading = uploadingSlots.includes(idx);
                const progressPercent = slotProgress[idx] || 0;

                return (
                  <div 
                    key={idx} 
                    draggable={!!imgUrl && !uploading && !saving}
                    onDragStart={(e) => handleSlotDragStart(e, idx)}
                    onDragOver={handleSlotDragOver}
                    onDrop={(e) => handleSlotDropSwap(e, idx)}
                    className={`relative aspect-square rounded-xl bg-white dark:bg-slate-900 border overflow-hidden group shadow-sm flex flex-col items-center justify-center transition-all ${
                      draggedSlotIndex === idx
                        ? 'opacity-40 scale-95 border-blue-500 border-2 bg-blue-50/10'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${imgUrl && !(uploading || saving) ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  >
                    {imgUrl ? (
                      <>
                        <ImageWithFallback
                          src={imgUrl.includes('?') ? `${imgUrl}&v=${imageKey}` : `${imgUrl}?v=${imageKey}`}
                          alt={`${product.nome} - Foto ${idx + 1}`}
                          className="w-full h-full object-cover select-none"
                          fallbackClassName="w-full h-full"
                        />
                        
                        {/* Badge indicando imagem principal no primeiro slot */}
                        {idx === 0 && (
                          <span className="absolute top-1 left-1 bg-blue-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md shadow uppercase">
                            Principal
                          </span>
                        )}
                        
                        {/* Control bar overlay */}
                        <div className="absolute bottom-0 inset-x-0 bg-black/75 py-1 px-1.5 flex justify-around items-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, 'left'); }}
                            disabled={idx === 0}
                            className="p-1 text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 transition-colors"
                            title="Mover para esquerda"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleRemoveImageAtIndex(idx); }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Excluir imagem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleMoveImage(idx, 'right'); }}
                            disabled={idx === 4}
                            className="p-1 text-gray-300 hover:text-white disabled:opacity-30 disabled:hover:text-gray-300 transition-colors"
                            title="Mover para direita"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                          </button>
                        </div>
                      </>
                    ) : isUploading ? (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-blue-50/30 gap-2">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        <span className="text-[10px] font-semibold text-blue-700">{progressPercent}%</span>
                        <div className="w-3/4 bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-150"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !(uploading || saving) && fileInputRef.current?.click()}
                        disabled={uploading || saving}
                        className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50/10 transition-colors"
                      >
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Slot {idx + 1}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toggle buttons and settings */}
          {(product.imagem_url || (product.imagens && product.imagens.length > 0)) && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={product.mostrar_imagem}
                  onChange={(e) => onChange('mostrar_imagem', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Exibir imagens no orçamento
                </span>
              </label>
              
              {product.imagens && product.imagens.length > 0 && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={product.carrossel_automatico || false}
                    onChange={(e) => onChange('carrossel_automatico', e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Ativar transição automática (Carrossel a cada 4s)
                  </span>
                </label>
              )}
            </div>
          )}

          {/* Mensagens de feedback */}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Erro no upload</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checkbox Obrigatório */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`obrigatorio-${product.ordem}`}
          checked={product.obrigatorio}
          onChange={(e) => onChange('obrigatorio', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor={`obrigatorio-${product.ordem}`}
          className="text-sm text-gray-700"
        >
          Produto obrigatório (sempre será incluído no orçamento)
        </label>
      </div>

      {/* Modo de seleção */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={`multi-${product.ordem}`}
          checked={product.permite_multiplas_unidades ?? true}
          onChange={(e) => onChange('permite_multiplas_unidades', e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label
          htmlFor={`multi-${product.ordem}`}
          className="text-sm text-gray-700"
        >
          Permite selecionar múltiplas unidades (ex: 2 álbuns)
          <span className="text-xs text-gray-400 block">
            Desmarcado = botão simples de selecionar/desselecionar (ideal para serviços)
          </span>
        </label>
      </div>

      {/* Desconto por produto */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Desconto neste produto (%)
          <span className="text-xs text-gray-400 ml-2">0 = sem desconto</span>
        </label>
        <div className="flex items-center gap-2">
          <NumberInput
            label=""
            value={product.desconto_percentual ?? 0}
            onChange={(value) => onChange('desconto_percentual', Math.min(100, Math.max(0, value)))}
            min={0}
            max={100}
            step={5}
            placeholder="0"
          />
          {(product.desconto_percentual ?? 0) > 0 && (
            <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
              🏷️ {product.desconto_percentual}% OFF
              {product.valor > 0 && (
                <span className="text-gray-500 font-normal ml-1">
                  → R$ {(product.valor * (1 - (product.desconto_percentual ?? 0) / 100)).toFixed(2).replace('.', ',')}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Destaque do Produto */}
      <div className="border border-amber-200 rounded-xl p-4 bg-amber-50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">⭐</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">Destaque este produto</p>
              <p className="text-xs text-gray-500">Exibe um badge especial neste pacote no orçamento</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id={`highlight-${product.ordem}`}
              checked={product.destacar_produto ?? false}
              onChange={(e) => onChange('destacar_produto', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {product.destacar_produto && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Texto do badge:</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {['Mais Vendido', 'Mais Popular', 'Melhor Opção', 'Recomendado', 'Exclusivo', 'Super Oferta'].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange('destaque_texto', label)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                    product.destaque_texto === label
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={product.destaque_texto ?? ''}
              onChange={(e) => onChange('destaque_texto', e.target.value)}
              placeholder="Ou escreva um texto personalizado..."
              maxLength={30}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-transparent text-sm"
            />
            {product.destaque_texto && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">Preview:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow">
                  ⭐ {product.destaque_texto}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Vincular Brindes (somente para pacotes normais, não para upsells) */}
      {!upsellProdutosIds?.includes(product.id || '') && (
        <div className="border border-emerald-250 dark:border-emerald-800/30 rounded-xl p-4 bg-emerald-50/20 dark:bg-emerald-950/5 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-400 flex items-center gap-1.5">
              🎁 Vincular Brindes Gratuitos
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Selecione quais brindes cadastrados na aba &ldquo;Brindes&rdquo; serão oferecidos de graça neste pacote.
            </p>
          </div>
          {(() => {
            if (brindesProducts.length === 0) {
              return (
                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                  Nenhum brinde configurado neste template para vincular. (Vá na aba "Brindes" para configurar).
                </p>
              );
            }
            return (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {brindesProducts.map(u => {
                    const brindesArray = Array.isArray(product.brindes_vinculados) ? product.brindes_vinculados : [];
                    const isChecked = brindesArray.includes(u.id || '');
                    return (
                      <label
                        key={u.id}
                        className={`flex items-center gap-2 p-2.5 border rounded-lg cursor-pointer text-xs transition-all hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 ${
                          isChecked 
                            ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10 font-semibold text-emerald-900 dark:text-emerald-300' 
                            : 'border-gray-250 dark:border-white/5 bg-white dark:bg-white/3'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let nextBrindes = [...brindesArray];
                            if (isChecked) {
                              nextBrindes = nextBrindes.filter(id => id !== u.id);
                            } else {
                              nextBrindes.push(u.id || '');
                            }
                            onChange('brindes_vinculados', nextBrindes);
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <span className="truncate">{u.nome}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Opções extras quando há brindes selecionados */}
                {Array.isArray(product.brindes_vinculados) && product.brindes_vinculados.length > 0 && (
                  <div className="border-t border-emerald-200/50 dark:border-emerald-800/30 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-400 mb-1">
                        Título Personalizado da Seção
                      </label>
                      <input
                        type="text"
                        value={product.brindes_titulo_personalizado || 'Brindes Gratuitos'}
                        onChange={(e) => onChange('brindes_titulo_personalizado', e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-300 dark:border-[rgba(255,255,255,.08)] bg-white dark:bg-[#0a1628] text-gray-900 dark:text-white rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ex: Mimos Inclusos, Bônus..."
                      />
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer mt-4">
                        <input
                          type="checkbox"
                          checked={product.brindes_mostrar_valores ?? true}
                          onChange={(e) => onChange('brindes_mostrar_valores', e.target.checked)}
                          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          Exibir valor original riscado (~~R$ 150~~ Grátis)
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}



      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row gap-2">
        {product.id && (
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(product.id!);
                alert('📋 Código de colaboração do produto copiado com sucesso! Envie este código para seu parceiro de Collab para que ele possa importar este produto no orçamento dele.');
              } catch (err) {
                console.error('Erro ao copiar código:', err);
                alert(`Código do produto: ${product.id}`);
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-medium transition-colors border border-purple-200"
            title="Copiar código de colaboração deste produto"
          >
            <Share2 className="w-4 h-4" />
            Exportar Collab
          </button>
        )}
        {onDuplicate && (
          <button
            type="button"
            onClick={onDuplicate}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors border border-blue-200"
            title="Duplicar este produto"
          >
            <Copy className="w-4 h-4" />
            Duplicar
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 font-medium transition-colors border border-red-200"
        >
          <Trash2 className="w-4 h-4" />
          Remover
        </button>
      </div>
    </div>
  );
}
