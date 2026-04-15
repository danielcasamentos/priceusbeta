import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableProductItem } from './SortableProductItem';
import { Plus, Save, GripVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

interface ProductListProps {
  products: Product[];
  onUpdate: (index: number, field: keyof Product, value: any) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => void;
  onAdd: () => void;
  onSave: () => void;
  userId: string;
  templateId?: string;
  onReloadProducts?: () => void;
  onProductSaved?: (index: number, productId: string) => void;
}

export function ProductList({
  products,
  onUpdate,
  onRemove,
  onDuplicate,
  onAdd,
  onSave,
  userId,
  templateId,
  onReloadProducts,
  onProductSaved,
}: ProductListProps) {
  const [localProducts, setLocalProducts] = useState<Product[]>(products);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localProducts.findIndex(
      (p) => (p.id || `new-${localProducts.indexOf(p)}`) === active.id
    );
    const newIndex = localProducts.findIndex(
      (p) => (p.id || `new-${localProducts.indexOf(p)}`) === over.id
    );

    if (oldIndex !== -1 && newIndex !== -1) {
      const newProducts = arrayMove(localProducts, oldIndex, newIndex);

      const reorderedProducts = newProducts.map((product, index) => ({
        ...product,
        ordem: index,
      }));

      setLocalProducts(reorderedProducts);
      setHasUnsavedOrder(true);

      reorderedProducts.forEach((product, index) => {
        onUpdate(index, 'ordem', index);
      });

      await saveProductOrder(reorderedProducts);
    }
  };

  const saveProductOrder = async (reorderedProducts: Product[]) => {
    setIsSaving(true);
    try {
      const updates = reorderedProducts
        .filter((p) => p.id)
        .map((product) =>
          supabase
            .from('produtos')
            .update({ ordem: product.ordem })
            .eq('id', product.id!)
        );

      await Promise.all(updates);
      setHasUnsavedOrder(false);

      console.log('✅ Ordem dos produtos atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar ordem dos produtos:', error);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Atualizar produtos locais quando houver mudanças no array de produtos
    // Isso inclui: novos produtos, remoções, ou alterações (como upload de imagens)
    const productsChanged = products.length !== localProducts.length ||
      products.some((p, i) => {
        const local = localProducts[i];
        return !local || p.imagem_url !== local.imagem_url || p.id !== local.id;
      });

    if (productsChanged) {
      setLocalProducts(products);
    }
  }, [products]);

  const handleSaveAll = async () => {
    await onSave();
    if (hasUnsavedOrder) {
      await saveProductOrder(localProducts);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Produtos e Serviços
          </h3>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            Arraste para reorganizar os produtos
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          Salvar Todos os Produtos
        </button>
      </div>

      {isSaving && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className="text-sm text-blue-700">Salvando ordem dos produtos...</p>
        </div>
      )}

      {hasUnsavedOrder && !isSaving && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
          <p className="text-sm text-yellow-800">
            Ordem alterada! Clique em "Salvar Todos os Produtos" para confirmar.
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localProducts.map((p, i) => p.id || `new-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4 transition-opacity duration-300 ease-in-out">
            {localProducts.map((product, index) => (
              <SortableProductItem
                key={product.id || `new-${index}`}
                product={product}
                index={index}
                onChange={(field, value) => {
                  onUpdate(index, field, value);
                  const updated = [...localProducts];
                  updated[index] = { ...updated[index], [field]: value };
                  setLocalProducts(updated);
                }}
                onRemove={() => onRemove(index)}
                onDuplicate={() => onDuplicate(index)}
                userId={userId}
                templateId={templateId}
                onImageUploadSuccess={onReloadProducts}
                onProductSaved={(productId) => onProductSaved?.(index, productId)}
              />
            ))}

          </div>
        </SortableContext>
      </DndContext>

      {localProducts.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 mb-4">
            Nenhum produto cadastrado ainda
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Primeiro Produto
          </button>
        </div>
      )}

      {localProducts.length > 0 && (
        <button
          type="button"
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 font-medium transition-colors border-2 border-dashed border-blue-300"
        >
          <Plus className="w-5 h-5" />
          Adicionar Novo Produto
        </button>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2 text-sm">
          💡 Dicas para Produtos:
        </h4>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• Use nomes claros e descritivos</li>
          <li>• Arraste o ícone de grade para reordenar os produtos</li>
          <li>• Use o botão "Duplicar" para criar cópias de produtos similares</li>
          <li>• Preencha nome e valor antes de adicionar imagem</li>
          <li>• O produto será salvo automaticamente ao enviar uma imagem</li>
          <li>• Marque como "obrigatório" itens que sempre devem estar incluídos</li>
          <li>• A ordem dos produtos será mantida no orçamento público</li>
        </ul>
      </div>

      {localProducts.length > 0 && (
        <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 pt-4 pb-2 -mx-6 px-6 shadow-lg">
          <button
            type="button"
            onClick={handleSaveAll}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold text-lg transition-all hover:shadow-xl"
          >
            <Save className="w-5 h-5" />
            Publicar Produtos
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Clique para salvar todas as alterações e publicar no orçamento
          </p>
        </div>
      )}
    </div>
  );
}
