import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, Image as ImageIcon, Trash2, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react';
import { ImageUploadService, UploadProgress, formatFileSize } from '../services/imageUploadService';
import { ImageWithFallback } from './ImageWithFallback';
import { NumberInput } from './ui/NumberInput';

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
}

interface ProductEditorProps {
  product: Product;
  onChange: (field: keyof Product, value: any) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  userId: string;
  templateId?: string;
  onImageUploadSuccess?: () => void;
  onProductSaved?: (productId: string) => void;
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
export function ProductEditor({ product, onChange, onRemove, onDuplicate, userId, templateId, onImageUploadSuccess, onProductSaved }: ProductEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(Date.now());

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
   * Processa upload de imagem com o novo serviço
   */
  const handleImageUpload = async (file: File) => {
    setError(null);
    setSuccess(null);

    try {
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
        setProgress({
          phase: 'validating',
          percent: 5,
          message: 'Salvando produto automaticamente...'
        });

        try {
          productId = await autoSaveProduct();

          if (!productId) {
            throw new Error('Falha ao obter ID do produto');
          }

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
          return;
        } finally {
          setSaving(false);
        }
      }

      // PASSO 3: Upload da imagem
      setUploading(true);

      const uploadService = new ImageUploadService((progressData) => {
        setProgress(progressData);
      });

      const result = await uploadService.uploadImage(file, userId, {
        maxSizeMB: 5,
        maxWidthPx: 1920,
        maxHeightPx: 1920,
        quality: 0.85,
        folder: 'produtos',
      });

      if (!result.success) {
        setError(result.error || 'Erro desconhecido');
        return;
      }

      // Adiciona na galeria ou como a principal se não existir principal
      const imagensAtualizadas = [...(product.imagens || [])];
      
      let finalImagemUrl = product.imagem_url;
      if (!finalImagemUrl) {
         finalImagemUrl = result.url;
         onChange('imagem_url', result.url);
      } else {
         if (imagensAtualizadas.length < 5) {
            imagensAtualizadas.push(result.url);
            onChange('imagens', imagensAtualizadas);
         }
      }
      
      // PASSO 4: Salvar URL da imagem no banco
      await saveImageToDatabase(finalImagemUrl, imagensAtualizadas, productId);

      // PASSO 5: Atualizar estado local
      onChange('mostrar_imagem', true);
      setImageKey(Date.now());

      // PASSO 6: Feedback de sucesso
      setSuccess('Produto salvo e imagem enviada com sucesso!');
      setTimeout(() => setSuccess(null), 4000);

      // PASSO 7: Aguardar processamento completo no Supabase Storage
      await new Promise(resolve => setTimeout(resolve, 800));

      // PASSO 8: Notificar componente pai para reload imperceptível
      if (onImageUploadSuccess) {
        console.log('🔄 Iniciando reload automático após upload de imagem...');
        onImageUploadSuccess();
      }

      // Log de sucesso
      if (result.metadata) {
        console.log('✅ Upload completo:', {
          productId,
          url: result.url,
          originalSize: formatFileSize(result.metadata.originalSize),
          compressedSize: formatFileSize(result.metadata.compressedSize),
          compression: `${result.metadata.compressionRatio.toFixed(1)}%`,
          dimensions: `${result.metadata.width}x${result.metadata.height}`,
        });
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setUploading(false);
      setSaving(false);
      setProgress(null);
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
          imagem_url: imageUrl,
          imagens: imagensArray,
          mostrar_imagem: true,
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
    const file = event.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
    // Limpar input para permitir re-upload do mesmo arquivo
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
    if (files && files[0]) {
      handleImageUpload(files[0]);
    }
  };

  /**
   * 🔥 Remove imagem do produto (CORRIGIDO)
   *
   * Fluxo completo:
   * 1. Deleta do Supabase Storage
   * 2. Atualiza no banco de dados
   * 3. Limpa estado local
   * 4. Atualiza imageKey para forçar re-render
   */
  const handleRemoveImage = async () => {
    if (!confirm('⚠️ Deseja remover a imagem deste produto?')) return;

    setError(null);

    try {
      // 1. Deletar do Storage (se existir)
      if (product.imagem_url) {
        console.log('🗑️ Removendo imagem do storage...');
        const uploadService = new ImageUploadService();
        const deleted = await uploadService.deleteImage(product.imagem_url);

        if (!deleted) {
          console.warn('⚠️ Não foi possível deletar do storage, mas continuando...');
        }
      }

      // 2. Atualizar no banco de dados (se produto já existe)
      if (product.id) {
        console.log('💾 Atualizando banco de dados...');
        const { error: updateError } = await supabase
          .from('produtos')
          .update({
            imagem_url: null,
            mostrar_imagem: false,
          })
          .eq('id', product.id);

        if (updateError) {
          throw updateError;
        }
      }

      // 3. Aguardar processamento completo no Supabase
      await new Promise(resolve => setTimeout(resolve, 500));

      // 4. Limpar estado local
      onChange('imagem_url', undefined);
      onChange('mostrar_imagem', false);

      // 5. Atualizar imageKey para forçar re-render
      setImageKey(Date.now());

      // 6. Mostrar mensagem de sucesso
      setSuccess('Imagem removida com sucesso!');
      setTimeout(() => setSuccess(null), 3000);

      // 7. Notificar componente pai para reload imperceptível
      if (onImageUploadSuccess) {
        console.log('🔄 Iniciando reload automático após exclusão de imagem...');
        onImageUploadSuccess();
      }

      console.log('✅ Imagem removida com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao remover imagem:', error);
      setError('Erro ao remover imagem. Tente novamente.');

      // Ainda assim, limpar do estado local para permitir novo upload
      onChange('imagem_url', undefined);
      onChange('mostrar_imagem', false);
      setImageKey(Date.now());
    }
  };

  /**
   * Remove uma imagem da galeria secundária
   */
  const handleRemoveSubImage = async (indexToRemove: number) => {
    if (!confirm('⚠️ Deseja remover esta imagem da galeria auxiliar?')) return;

    setError(null);
    try {
      setSaving(true);
      const targetUrl = product.imagens![indexToRemove];
      
      const uploadService = new ImageUploadService();
      await uploadService.deleteImage(targetUrl);

      const novasImagens = [...(product.imagens || [])];
      novasImagens.splice(indexToRemove, 1);
      
      onChange('imagens', novasImagens);
      if (product.id) {
         await saveImageToDatabase(product.imagem_url || '', novasImagens, product.id);
      }
      setImageKey(Date.now());
      setSuccess('Imagem da galeria removida.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Erro sub imagem', err);
      setError('Erro ao remover imagem da galeria.');
    } finally {
      setSaving(false);
    }
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
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Descrição
        </label>
        <textarea
          value={product.resumo}
          onChange={(e) => onChange('resumo', e.target.value)}
          placeholder="Breve descrição do produto/serviço"
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
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

      {/* Upload de Imagem */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Imagem do Produto
        </label>

        {product.imagem_url ? (
          // Preview da imagem com overlay e retry automático
          <div className="relative">
            <ImageWithFallback
              src={(() => {
                // 🔥 CORREÇÃO: Adicionar cache-busting sem duplicar query params
                const cacheSuffix = product.imagem_url?.includes('?') ? `&v=${imageKey}` : `?v=${imageKey}`;
                return `${product.imagem_url}${cacheSuffix}`;
              })()}
              alt={product.nome}
              className="w-full h-48 object-cover rounded-lg border border-gray-300"
              fallbackClassName="w-full h-48 rounded-lg border border-gray-300"
              retries={3}
              retryDelay={1500}
              onError={() => {
                console.error('❌ Erro ao carregar imagem após retries:', product.imagem_url);
              }}
            />

            {/* Botão de remover */}
            <button
              type="button"
              onClick={handleRemoveImage}
              className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transition-colors"
              title="Remover imagem"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Toggle mostrar/ocultar */}
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <label className="flex items-center gap-3 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  checked={product.mostrar_imagem}
                  onChange={(e) => onChange('mostrar_imagem', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Exibir imagem principal no orçamento
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
            
            {/* Galeria de Thumbnails Auxiliares */}
            {product.imagens && product.imagens.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Galeria do Produto</p>
                <div className="grid grid-cols-4 gap-2">
                  {product.imagens.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded overflow-hidden border border-gray-200">
                      <ImageWithFallback
                        src={`${img}?v=${imageKey}`}
                        alt={`Galeria ${idx}`}
                        className="w-full h-full object-cover"
                        fallbackClassName="w-full h-full bg-gray-100"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveSubImage(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded hover:bg-red-700 shadow-sm"
                        title="Remover"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>
        )}
        
        {(!product.imagem_url || (product.imagens && product.imagens.length < 5)) && (
          // Área de upload (drag & drop ou click)
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              disabled={uploading || saving}
            />

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !(uploading || saving) && fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-all duration-200
                ${dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }
                ${(uploading || saving) ? 'opacity-60 cursor-not-allowed' : ''}
              `}
            >
              {(uploading || saving) ? (
                <div className="space-y-3">
                  <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
                  {progress && (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        {progress.message}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {progress.percent}%
                      </p>
                    </>
                  )}
                  {saving && !progress && (
                    <p className="text-sm font-medium text-gray-700">
                      Preparando produto para receber imagem...
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Clique ou arraste uma imagem
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG, PNG, WEBP até 5MB
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      A imagem será otimizada automaticamente
                    </p>
                    {!product.id && (
                      <p className="text-xs text-blue-600 font-medium mt-2 bg-blue-50 rounded px-2 py-1 inline-block">
                        O produto será salvo automaticamente ao enviar a imagem
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">Erro no upload</p>
                  <p className="text-xs text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Mensagem de sucesso */}
            {success && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">{success}</p>
                </div>
              </div>
            )}

            {/* Indicador de salvamento */}
            {saving && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <p className="text-sm text-blue-700">Salvando no banco de dados...</p>
              </div>
            )}
          </div>
        )}
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

      {/* Botões de Ação */}
      <div className="flex gap-2">
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
