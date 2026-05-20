import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import type { CompanyCategory } from '../../hooks/useCompanyTransactions';

interface CategoryManagerModalProps {
  userId: string;
  categories: CompanyCategory[];
  onClose: () => void;
  onCategoriesChange: () => void;
}

export function CategoryManagerModal({ userId, categories, onClose, onCategoriesChange }: CategoryManagerModalProps) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'receita' | 'despesa'>('receita');
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('company_categories').insert({
        user_id: userId,
        nome: newCategoryName,
        tipo: newCategoryType,
        cor: newCategoryType === 'receita' ? '#22c55e' : '#ef4444'
      });

      if (error) throw error;
      setNewCategoryName('');
      onCategoriesChange();
    } catch (err) {
      console.error('Erro ao adicionar categoria:', err);
      alert('Erro ao adicionar categoria.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria? As transações vinculadas a ela perderão a categoria.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('company_categories').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      onCategoriesChange();
    } catch (err) {
      console.error('Erro ao excluir categoria:', err);
      alert('Erro ao excluir categoria.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0a1628] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] border dark:border-[rgba(255,255,255,0.06)]">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gerenciar Categorias</h2>
            <p className="text-xs text-gray-500 mt-1">Crie e edite as categorias de receitas e despesas</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleAdd} className="flex gap-2 mb-8 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)] p-4 rounded-xl border border-gray-200 dark:border-[rgba(255,255,255,0.05)]">
            <input 
              type="text" 
              value={newCategoryName} 
              onChange={e => setNewCategoryName(e.target.value)} 
              placeholder="Nome da categoria..." 
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-[#07101f] dark:text-white"
            />
            <select 
              value={newCategoryType} 
              onChange={e => setNewCategoryType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-[rgba(255,255,255,0.1)] rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:bg-[#07101f] dark:text-white"
            >
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
            <button disabled={loading} type="submit" className="bg-blue-600 text-white p-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
            </button>
          </form>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Receitas</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.filter(c => c.tipo === 'receita').map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-white dark:bg-[#07101f] border border-gray-200 dark:border-[rgba(255,255,255,0.05)] rounded-lg hover:border-gray-300 dark:hover:border-[rgba(255,255,255,0.1)] transition-colors">
                    <span className="text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] truncate pr-2">{c.nome}</span>
                    <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-wider">Despesas</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categories.filter(c => c.tipo === 'despesa').map(c => (
                  <div key={c.id} className="flex justify-between items-center p-3 bg-white dark:bg-[#07101f] border border-gray-200 dark:border-[rgba(255,255,255,0.05)] rounded-lg hover:border-gray-300 dark:hover:border-[rgba(255,255,255,0.1)] transition-colors">
                    <span className="text-sm font-medium text-gray-700 dark:text-[rgba(255,255,255,0.8)] truncate pr-2">{c.nome}</span>
                    <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
