import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { ProductEditor } from './ProductEditor';

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

interface SortableProductItemProps {
  product: Product;
  index: number;
  onChange: (field: keyof Product, value: any) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  userId: string;
  templateId?: string;
  onImageUploadSuccess?: () => void;
  onProductSaved?: (productId: string) => void;
}

export function SortableProductItem({
  product,
  index,
  onChange,
  onRemove,
  onDuplicate,
  userId,
  templateId,
  onImageUploadSuccess,
  onProductSaved,
}: SortableProductItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id || `new-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        className={`
          rounded-lg border-2 transition-all
          ${isDragging ? 'border-blue-500 shadow-2xl scale-105' : 'border-transparent'}
        `}
      >
        <div className="flex gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex items-start pt-6 cursor-grab active:cursor-grabbing hover:bg-gray-50 rounded-l-lg px-2 transition-colors"
            title="Arraste para reordenar"
          >
            <GripVertical className="w-6 h-6 text-gray-400 hover:text-blue-600 transition-colors" />
          </div>

          <div className="flex-1">
            <ProductEditor
              product={product}
              onChange={onChange}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              userId={userId}
              templateId={templateId}
              onImageUploadSuccess={onImageUploadSuccess}
              onProductSaved={onProductSaved}
            />
          </div>
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-0 bg-blue-100 border-2 border-blue-500 rounded-lg opacity-20 pointer-events-none" />
      )}
    </div>
  );
}
