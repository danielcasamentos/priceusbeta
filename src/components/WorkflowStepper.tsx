import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
/** Gera UUID v4 usando a API nativa do browser — sem dependência externa */
const uuidv4 = () => crypto.randomUUID();

/** Converte string amigável (ex: "1:30" ou "90m" ou "1.5") em minutos */
export function parseDurationString(str: string): number | null {
  if (!str) return null;
  str = str.toLowerCase().trim();
  if (str.includes(':')) {
    const [h, m] = str.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) return h * 60 + m;
  }
  if (str.includes('h')) {
    const match = str.match(/(\d+(?:\.\d+)?)\s*h/);
    if (match) return Math.round(parseFloat(match[1]) * 60);
  }
  if (str.includes('m')) {
    const match = str.match(/(\d+)\s*m/);
    if (match) return parseInt(match[1], 10);
  }
  const val = parseFloat(str);
  if (!isNaN(val)) {
    if (val < 24) return Math.round(val * 60); // menos que 24: assume horas
    return Math.round(val); // >= 24: assume minutos
  }
  return null;
}

/** Formata minutos para string legível (ex: 90 -> "1h 30m") */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

import {
  Plus, Trash2, Save, ChevronDown, ChevronUp,
  Pause, Check, FolderOpen, X, Loader2, CalendarClock
} from 'lucide-react';
import { WorkflowStep, WorkflowTemplate, WorkflowTemplateStep, SlaResult } from '../types/workflow';
import { useWorkflowSla, calcularSlaEtapa } from '../hooks/useWorkflowSla';
import { supabase } from '../lib/supabase';
import { syncWorkflowToCalendar } from '../services/availabilityService';
import { suggestWorkflowTasksFromProducts } from '../lib/nicheParser';

// ==========================================================
// PriceUs — WorkflowStepper
// Stepper dinâmico com edição inline, SLA badges e templates
// ==========================================================

interface WorkflowStepperProps {
  leadId: string;
  leadName: string;
  userId: string;
  initialWorkflow: WorkflowStep[];
  onWorkflowChange: (workflow: WorkflowStep[]) => void;
  onAllCompleted: () => void; // Callback quando todas as etapas forem concluídas
  leadProdutos?: any[];
}

// ── Inline Editable Field ────────────────────────────────
interface InlineEditProps {
  value: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
  type?: 'text' | 'date';
}

function InlineEdit({ value, onSave, className = '', placeholder, type = 'text' }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onSave(draft);
  };

  if (!editing) {
    return (
      <span
        onClick={() => { setDraft(value); setEditing(true); }}
        className={`cursor-text hover:bg-black/5 dark:hover:bg-white/5 rounded px-1 -mx-1 transition-colors ${className} ${!value ? 'text-gray-400 dark:text-gray-500 italic' : ''}`}
      >
        {value || placeholder || '—'}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className={`bg-white dark:bg-[#0a1628] border border-blue-400 dark:border-blue-500 rounded px-2 py-0.5 outline-none focus:ring-2 focus:ring-blue-400/30 ${className}`}
    />
  );
}

// ── SLA Badge ────────────────────────────────────────────
function SlaBadge({ sla }: { sla: SlaResult }) {
  const icons: Record<string, string> = {
    concluido: '✅',
    pausado: '⏸️',
    em_dia: '🟢',
    atencao: '🟠',
    atrasado: '🔴',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sla.bgColor} ${sla.color} whitespace-nowrap`}>
      {icons[sla.status]} {sla.label}
    </span>
  );
}

// ── Barra de Progresso ───────────────────────────────────
function ProgressBar({ percentual, concluidas, total }: { percentual: number; concluidas: number; total: number }) {
  const color = percentual === 100 ? 'bg-green-500' : percentual >= 50 ? 'bg-blue-500' : 'bg-orange-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {concluidas}/{total}
      </span>
    </div>
  );
}

// ── Modal Salvar Template ─────────────────────────────────
function SaveTemplateModal({
  userId,
  workflow,
  onClose,
  onSaved,
}: {
  userId: string;
  workflow: WorkflowStep[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      const etapas: WorkflowTemplateStep[] = workflow.map(s => ({
        label: s.label,
        description: s.description,
        duracao_minutos: s.duracao_minutos || null,
        horario_inicio: s.horario_inicio || null,
        ambiente: s.ambiente || null,
      }));
      await supabase.from('workflow_templates').insert({ user_id: userId, nome: nome.trim(), etapas });
      onSaved();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar template:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0a1628] border dark:border-white/10 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Salvar como Modelo</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Este workflow será salvo como um modelo reutilizável para futuros clientes.
        </p>
        <input
          autoFocus
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="Ex: Workflow Casamento Completo"
          className="w-full border border-gray-300 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!nome.trim() || saving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Gerenciar Templates ─────────────────────────────
interface ManageTemplatesModalProps {
  userId: string;
  onClose: () => void;
  onTemplatesChanged?: () => void;
}

function ManageTemplatesModal({
  userId,
  onClose,
  onTemplatesChanged,
}: ManageTemplatesModalProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  
  // Editor state
  const [editNome, setEditNome] = useState('');
  const [editEtapas, setEditEtapas] = useState<WorkflowTemplateStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTemplates((data as WorkflowTemplate[]) || []);
    } catch (err) {
      console.error('Erro ao carregar modelos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (t: WorkflowTemplate) => {
    setSelectedTemplate(t);
    setEditNome(t.nome);
    setEditEtapas(JSON.parse(JSON.stringify(t.etapas))); // Deep clone stages
    setSaveSuccess(false);
  };

  const handleAddStep = () => {
    setEditEtapas([...editEtapas, { label: 'Nova etapa', description: '', duracao_minutos: null, horario_inicio: null, ambiente: 'externo' }]);
  };

  const handleRemoveStep = (index: number) => {
    setEditEtapas(editEtapas.filter((_, i) => i !== index));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newEtapas = [...editEtapas];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newEtapas.length) return;
    
    // Swap
    const temp = newEtapas[index];
    newEtapas[index] = newEtapas[targetIndex];
    newEtapas[targetIndex] = temp;
    setEditEtapas(newEtapas);
  };

  const handleStepChange = (index: number, field: keyof WorkflowTemplateStep, val: any) => {
    const newEtapas = [...editEtapas];
    newEtapas[index] = {
      ...newEtapas[index],
      [field]: val,
    };
    setEditEtapas(newEtapas);
  };

  const handleSave = async () => {
    if (!selectedTemplate || !editNome.trim()) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({
          nome: editNome.trim(),
          etapas: editEtapas,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedTemplate.id);

      if (error) throw error;
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      
      await loadTemplates();
      
      // Update selected template local representation
      const updated = {
        ...selectedTemplate,
        nome: editNome.trim(),
        etapas: editEtapas,
      };
      setSelectedTemplate(updated);
      
      if (onTemplatesChanged) {
        onTemplatesChanged();
      }
    } catch (err) {
      console.error('Erro ao salvar alterações do modelo:', err);
      alert('Erro ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este modelo?')) return;
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
        setEditNome('');
        setEditEtapas([]);
      }

      await loadTemplates();
      
      if (onTemplatesChanged) {
        onTemplatesChanged();
      }
    } catch (err) {
      console.error('Erro ao excluir modelo:', err);
      alert('Erro ao excluir modelo.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0a1628] border dark:border-white/10 rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50/50 dark:bg-white/[0.02]">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gerenciar Modelos de Workflows</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Renomeie, edite etapas ou remova modelos personalizados.</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          
          {/* Left Column: Templates List */}
          <div className="w-full md:w-80 border-r border-gray-200 dark:border-white/10 flex flex-col min-h-0 bg-gray-50/20 dark:bg-black/10">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.01]">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Modelos Disponíveis ({templates.length})
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 dark:text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  <span className="text-xs">Carregando modelos...</span>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500">
                  Nenhum modelo personalizado salvo ainda.
                </div>
              ) : (
                templates.map((t) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <div 
                      key={t.id}
                      onClick={() => handleSelectTemplate(t)}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium border border-blue-200/50 dark:border-blue-500/20' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="text-sm truncate font-medium">{t.nome}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">
                          {t.etapas.length} {t.etapas.length === 1 ? 'etapa' : 'etapas'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-all flex-shrink-0"
                        title="Excluir Modelo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Editor Space */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-50/50 dark:bg-[#07101f]/10">
            {!selectedTemplate ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500 mb-4 shadow-inner">
                  <FolderOpen className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">Selecione um Modelo</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                  Escolha um modelo de workflow na lista lateral para editar suas etapas, renomeá-lo ou excluí-lo.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                {/* Form Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Name Input */}
                  <div className="bg-white dark:bg-[#091424] border dark:border-white/5 p-4 rounded-xl shadow-sm space-y-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Nome do Modelo
                    </label>
                    <input
                      type="text"
                      value={editNome}
                      onChange={(e) => setEditNome(e.target.value)}
                      placeholder="Ex: Workflow de Gestão Completo"
                      className="w-full border border-gray-300 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    />
                  </div>

                  {/* Steps List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Etapas do Fluxo ({editEtapas.length})
                      </span>
                    </div>

                    {editEtapas.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-400 dark:text-gray-500 bg-white dark:bg-[#091424]">
                        Nenhuma etapa neste modelo. Adicione pelo menos uma.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editEtapas.map((step, idx) => (
                          <div 
                            key={idx}
                            className="bg-white dark:bg-[#091424] border border-gray-200 dark:border-white/5 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative flex gap-3"
                          >
                            {/* Drag Indicator & Order */}
                            <div className="flex flex-col items-center justify-start gap-1 pt-1.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                              <span className="text-xs font-bold w-6 h-6 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300">
                                {idx + 1}
                              </span>
                              <div className="flex flex-col gap-0.5 mt-2">
                                <button
                                  type="button"
                                  onClick={() => handleMoveStep(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Mover para Cima"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveStep(idx, 'down')}
                                  disabled={idx === editEtapas.length - 1}
                                  className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:hover:bg-transparent"
                                  title="Mover para Baixo"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Inputs */}
                            <div className="flex-1 flex flex-col gap-3 min-w-0">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Nome da Etapa
                                  </span>
                                  <input
                                    type="text"
                                    value={step.label}
                                    onChange={(e) => handleStepChange(idx, 'label', e.target.value)}
                                    placeholder="Ex: Reunião de Alinhamento"
                                    className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Descrição
                                  </span>
                                  <input
                                    type="text"
                                    value={step.description}
                                    onChange={(e) => handleStepChange(idx, 'description', e.target.value)}
                                    placeholder="Ex: Explicar prazos e entregar briefing"
                                    className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Horário de Início
                                  </span>
                                  <input
                                    type="time"
                                    value={step.horario_inicio || ''}
                                    onChange={(e) => handleStepChange(idx, 'horario_inicio', e.target.value || null)}
                                    className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Duração
                                  </span>
                                  <input
                                    type="text"
                                    value={step.duracao_minutos ? formatDuration(step.duracao_minutos) : ''}
                                    onChange={(e) => handleStepChange(idx, 'duracao_minutos', parseDurationString(e.target.value))}
                                    placeholder="Ex: 1:30 ou 90m"
                                    className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                    Ambiente
                                  </span>
                                  <select
                                    value={step.ambiente || 'externo'}
                                    onChange={(e) => handleStepChange(idx, 'ambiente', e.target.value)}
                                    className="w-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#07101f] text-gray-900 dark:text-white rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                                  >
                                    <option value="externo">🎥 Externo (Agenda)</option>
                                    <option value="interno">🏢 Interno (Estúdio)</option>
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Action: Delete Step */}
                            <button
                              type="button"
                              onClick={() => handleRemoveStep(idx)}
                              className="self-center p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors flex-shrink-0"
                              title="Remover Etapa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Step Button */}
                    <button
                      type="button"
                      onClick={handleAddStep}
                      className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Etapa ao Modelo
                    </button>
                  </div>

                </div>

                {/* Form Footer */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#081220] flex items-center justify-between flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedTemplate.id)}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Modelo
                  </button>

                  <div className="flex items-center gap-2">
                    {saveSuccess && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-semibold">
                        ✓ Salvo com sucesso!
                      </span>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(selectedTemplate)}
                      className="px-4 py-2 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors"
                    >
                      Descartar
                    </button>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!editNome.trim() || editEtapas.length === 0 || saving}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2 shadow"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Salvar Alterações
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

const SYSTEM_DEFAULT_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'sys-wedding',
    user_id: 'system',
    nome: '🎥 [Padrão] Casamento Completo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    etapas: [
      { label: 'Reunião de Alinhamento', description: 'Briefing final, alinhamento de horários e entrega do roteiro.', duracao_minutos: 60, ambiente: 'interno' },
      { label: 'Ensaio Pré-Casamento', description: 'Sessão de fotos pré-wedding em local externo acordado.', duracao_minutos: 120, ambiente: 'externo' },
      { label: 'Fotografar Casamento', description: 'Cobertura completa do making of, cerimônia e recepção.', duracao_minutos: 480, ambiente: 'externo' },
      { label: 'Tratamento & Seleção', description: 'Fazer o backup, curadoria e tratamento de cor das fotos.', duracao_minutos: 240, ambiente: 'interno' },
      { label: 'Entrega da Galeria Online', description: 'Envio do link da galeria digital finalizada para o casal.', duracao_minutos: 60, ambiente: 'interno' },
      { label: 'Diagramação & Envio do Álbum', description: 'Montagem do layout do álbum e envio para a encadernadora.', duracao_minutos: 180, ambiente: 'interno' },
    ],
  },
  {
    id: 'sys-session',
    user_id: 'system',
    nome: '📸 [Padrão] Ensaio Fotográfico',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    etapas: [
      { label: 'Planejamento do Ensaio', description: 'Definir locação, roupas e referências visuais com o cliente.', duracao_minutos: 30, ambiente: 'interno' },
      { label: 'Sessão de Fotos', description: 'Execução do ensaio fotográfico (estúdio ou externa).', duracao_minutos: 120, ambiente: 'externo' },
      { label: 'Curadoria & Edição', description: 'Criação do backup, seleção e pós-processamento das imagens.', duracao_minutos: 120, ambiente: 'interno' },
      { label: 'Entrega Final', description: 'Envio dos arquivos tratados em alta resolução para download.', duracao_minutos: 30, ambiente: 'interno' },
    ],
  },
  {
    id: 'sys-event',
    user_id: 'system',
    nome: '🎉 [Padrão] Evento / Aniversário',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    etapas: [
      { label: 'Ajuste de Cronograma', description: 'Verificar com a assessoria os horários e momentos chave.', duracao_minutos: 30, ambiente: 'interno' },
      { label: 'Cobertura do Evento', description: 'Fotografia de protocolo, decoração e momentos dinâmicos da festa.', duracao_minutos: 240, ambiente: 'externo' },
      { label: 'Edição das Imagens', description: 'Tratamento básico e organização em galeria digital.', duracao_minutos: 120, ambiente: 'interno' },
      { label: 'Envio ao Cliente', description: 'Link para download e compartilhamento dos arquivos.', duracao_minutos: 30, ambiente: 'interno' },
    ],
  },
];

// ── WorkflowStepper (componente principal) ───────────────
export function WorkflowStepper({
  leadId,
  leadName,
  userId,
  initialWorkflow,
  onWorkflowChange,
  onAllCompleted,
  leadProdutos = [],
}: WorkflowStepperProps) {
  const [workflow, setWorkflow] = useState<WorkflowStep[]>(initialWorkflow);
  const [diasAdiar, setDiasAdiar] = useState<number>(7);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('dias_adiar_tarefas')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.dias_adiar_tarefas !== undefined && data.dias_adiar_tarefas !== null) {
          setDiasAdiar(data.dias_adiar_tarefas);
        }
      });
  }, [userId]);

  const handleAdiarEtapa = (stepId: string) => {
    const step = workflow.find(s => s.id === stepId);
    if (!step) return;

    // Se a etapa não tiver prazo definido, começamos a partir de hoje
    const baseDate = step.deadline ? new Date(step.deadline + 'T12:00:00') : new Date();
    baseDate.setDate(baseDate.getDate() + diasAdiar);

    const newDeadline = baseDate.toISOString().split('T')[0];
    updateStep(stepId, { deadline: newDeadline });
  };

  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [showStartChoice, setShowStartChoice] = useState(false);
  const [highlightedStepId, setHighlightedStepId] = useState<string | null>(null);
  const templateMenuRef = useRef<HTMLDivElement>(null);
  const startMenuRef = useRef<HTMLDivElement>(null);
  const stepRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [searchParams] = useSearchParams();

  const { slaMap, progress } = useWorkflowSla(workflow);

  // Scroll automático até a etapa indicada pelo parâmetro stepId na URL
  useEffect(() => {
    const targetStepId = searchParams.get('stepId');
    if (!targetStepId) return;
    // Verificar se esse step pertence a este lead
    const belongs = workflow.some(s => s.id === targetStepId);
    if (!belongs) return;
    // Expandir painel se estiver colapsado
    setExpanded(true);
    // Aguardar render e fazer scroll
    const timer = setTimeout(() => {
      const el = stepRefs.current[targetStepId];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightedStepId(targetStepId);
        // Remover destaque após 3 segundos
        setTimeout(() => setHighlightedStepId(null), 3000);
      }
    }, 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setShowTemplateMenu(false);
      }
      if (startMenuRef.current && !startMenuRef.current.contains(e.target as Node)) {
        setShowStartChoice(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Carregar templates ao abrir menu
  const loadTemplates = async () => {
    const { data } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    const userTemplates = (data as WorkflowTemplate[]) || [];
    setTemplates([...SYSTEM_DEFAULT_TEMPLATES, ...userTemplates]);
  };

  // Persistir workflow no Supabase
  const persistWorkflow = async (updated: WorkflowStep[]) => {
    setSaving(true);
    try {
      await supabase.from('leads').update({ workflow: updated }).eq('id', leadId);
      onWorkflowChange(updated);
      await syncWorkflowToCalendar(userId, leadId, leadName, updated);
    } catch (err) {
      console.error('Erro ao salvar workflow:', err);
    } finally {
      setSaving(false);
    }
  };

  // Atualizar workflow e salvar
  const updateWorkflow = async (updated: WorkflowStep[]) => {
    setWorkflow(updated);
    await persistWorkflow(updated);

    // Verificar se todas foram concluídas
    if (updated.length > 0 && updated.every(s => s.status === 'concluido')) {
      onAllCompleted();
    }
  };

  // Adicionar nova etapa
  const addStep = () => {
    const newStep: WorkflowStep = {
      id: uuidv4(),
      label: 'Nova etapa',
      description: '',
      deadline: '',
      status: 'pendente',
      duracao_minutos: null,
      horario_inicio: null,
      ambiente: 'externo',
    };
    updateWorkflow([...workflow, newStep]);
  };

  // Iniciar workflow sugerido a partir dos produtos
  const handleIniciarWorkflow = async () => {
    setExpanded(true);
    let defaultSteps: WorkflowStep[] = [];
    if (leadProdutos && leadProdutos.length > 0) {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('nicho')
          .eq('id', userId)
          .maybeSingle();
        const niche = data?.nicho || 'fotografia';
        defaultSteps = suggestWorkflowTasksFromProducts(leadProdutos, niche);
      } catch (e) {
        console.warn('Erro ao obter nicho, usando padrão fotografia:', e);
        defaultSteps = suggestWorkflowTasksFromProducts(leadProdutos, 'fotografia');
      }
    }

    if (defaultSteps.length === 0) {
      defaultSteps = [{
        id: uuidv4(),
        label: 'Nova etapa',
        description: '',
        deadline: '',
        status: 'pendente',
        duracao_minutos: null,
        horario_inicio: null,
        ambiente: 'externo',
      }];
    }

    updateWorkflow(defaultSteps);
  };

  // Remover etapa
  const removeStep = (id: string) => {
    updateWorkflow(workflow.filter(s => s.id !== id));
  };

  // Atualizar campo de uma etapa
  const updateStep = (id: string, changes: Partial<WorkflowStep>) => {
    updateWorkflow(workflow.map(s => s.id === id ? { ...s, ...changes } : s));
  };

  // Toggle concluído — salva completedAt ao concluir, remove ao reverter
  const toggleConcluido = (id: string) => {
    const step = workflow.find(s => s.id === id);
    if (!step) return;
    const novoStatus = step.status === 'concluido' ? 'pendente' : 'concluido';
    const completedAt = novoStatus === 'concluido' ? new Date().toISOString() : undefined;
    updateStep(id, { status: novoStatus, completedAt });
  };

  // Toggle aguardando_cliente
  const togglePausar = (id: string) => {
    const step = workflow.find(s => s.id === id);
    if (!step) return;
    const novoStatus = step.status === 'aguardando_cliente' ? 'pendente' : 'aguardando_cliente';
    updateStep(id, { status: novoStatus });
  };

  // Aplicar template
  const applyTemplate = (tmpl: WorkflowTemplate) => {
    const novasEtapas: WorkflowStep[] = tmpl.etapas.map(e => ({
      id: uuidv4(),
      label: e.label,
      description: e.description,
      deadline: '',
      status: 'pendente',
      duracao_minutos: e.duracao_minutos || null,
      horario_inicio: e.horario_inicio || null,
      ambiente: e.ambiente || 'externo',
    }));

    if (workflow.length > 0) {
      const confirmReplace = window.confirm(
        `Deseja SUBSTITUIR todo o workflow atual deste cliente pelo modelo "${tmpl.nome}"?\n\n` +
        `• Clique em [OK] para SUBSTITUIR (o progresso e prazos atuais desse cliente serão reiniciados).\n` +
        `• Clique em [Cancelar] para apenas ADICIONAR as novas etapas no final.`
      );
      if (confirmReplace) {
        updateWorkflow(novasEtapas);
      } else {
        updateWorkflow([...workflow, ...novasEtapas]);
      }
    } else {
      updateWorkflow(novasEtapas);
    }
    setShowTemplateMenu(false);
  };

  // Deletar template
  const deleteTemplate = async (id: string) => {
    if (id.startsWith('sys-')) {
      alert('Modelos padrão do sistema não podem ser excluídos.');
      return;
    }
    await supabase.from('workflow_templates').delete().eq('id', id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  // ── Workflow vazio ─────────────────────────────────────
  if (workflow.length === 0 && !expanded) {
    return (
      <div className="mt-3 p-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-between gap-3">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Nenhum workflow iniciado
        </div>
        <div className="flex items-center gap-2">
          <div ref={startMenuRef} className="relative">
            <button
              onClick={() => setShowStartChoice(!showStartChoice)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Iniciar Workflow
            </button>
            
            {showStartChoice && (
              <div className="absolute bottom-full right-0 mb-1 w-64 bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden py-1 text-left">
                <button
                  type="button"
                  onClick={async () => {
                    setShowStartChoice(false);
                    await handleIniciarWorkflow();
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-200 text-xs font-semibold flex items-start gap-2.5 transition-colors border-b border-gray-100 dark:border-white/5"
                >
                  <span className="text-sm mt-0.5">🪄</span>
                  <div>
                    <div className="font-bold text-blue-600 dark:text-blue-400">Sugerir Inteligente</div>
                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">Analisa os produtos e gera etapas inteligentes automaticamente.</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowStartChoice(false);
                    setExpanded(true);
                    updateWorkflow([{
                      id: uuidv4(),
                      label: 'Nova etapa',
                      description: 'Descreva a tarefa...',
                      deadline: '',
                      status: 'pendente',
                      duracao_minutos: null,
                      horario_inicio: null,
                      ambiente: 'externo',
                    }]);
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200 text-xs font-semibold flex items-start gap-2.5 transition-colors"
                >
                  <span className="text-sm mt-0.5">📝</span>
                  <div>
                    <div className="font-bold">Começar Vazio / Personalizado</div>
                    <div className="text-[10px] text-gray-400 font-normal mt-0.5">Inicie do zero com uma única etapa personalizada.</div>
                  </div>
                </button>
              </div>
            )}
          </div>
          <div ref={templateMenuRef} className="relative">
            <button
              onClick={() => { setShowTemplateMenu(!showTemplateMenu); loadTemplates(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Usar Modelo
            </button>
            {showTemplateMenu && (
              <TemplateMenu 
                templates={templates} 
                onApply={applyTemplate} 
                onDelete={deleteTemplate} 
                onClose={() => setShowTemplateMenu(false)} 
              />
            )}
          </div>
          <button
            onClick={() => { setShowManageTemplates(true); loadTemplates(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors"
            title="Gerenciar Modelos de Workflow"
          >
            ⚙️ Gerenciar Modelos
          </button>
        </div>
      </div>
    );
  }

  // ── Card Compacto (colapsado) ──────────────────────────
  if (!expanded) {
    return (
      <div className="mt-3 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
        <div
          className="px-4 py-3 bg-gray-50 dark:bg-white/[0.03] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
          onClick={() => setExpanded(true)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Workflow de Produção
            </span>
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          <ProgressBar percentual={progress.percentual} concluidas={progress.concluidas} total={progress.total} />
          {progress.proxEtapaCritica && progress.proxSla && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Próxima:</span>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                {progress.proxEtapaCritica.label}
              </span>
              <SlaBadge sla={progress.proxSla} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Card Expandido (checklist completo) ────────────────
  return (
    <div className="mt-3 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 bg-gray-50 dark:bg-white/[0.03] cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors border-b border-gray-200 dark:border-white/10"
        onClick={() => setExpanded(false)}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Workflow — {leadName}
          </span>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-3 h-3 animate-spin text-blue-500" />}
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </div>
        </div>
        <ProgressBar percentual={progress.percentual} concluidas={progress.concluidas} total={progress.total} />
      </div>

      {/* Lista de etapas */}
      <div className="divide-y divide-gray-100 dark:divide-white/[0.05]">
        {workflow.map((step, _index) => {
          const sla = slaMap[step.id] || calcularSlaEtapa(step);
          const isConcluido = step.status === 'concluido';
          const isPausado = step.status === 'aguardando_cliente';

          return (
            <div
              key={step.id}
              ref={(el) => { stepRefs.current[step.id] = el; }}
              className={`px-4 py-3 transition-all duration-500 ${
                highlightedStepId === step.id
                  ? 'ring-2 ring-amber-400 dark:ring-amber-500 bg-amber-50/70 dark:bg-amber-900/20 rounded-lg shadow-md shadow-amber-200/50 dark:shadow-amber-900/30'
                  : isConcluido ? 'bg-green-50/50 dark:bg-green-900/10' : ''
              }`}
            >
              {/* Linha principal: checkbox + label + sla + ações */}
              <div className="flex items-start gap-3">
                {/* Número + Checkbox */}
                <button
                  onClick={() => toggleConcluido(step.id)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-0.5 ${
                    isConcluido
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 dark:border-white/20 hover:border-green-400 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-2">
                    <InlineEdit
                      value={step.label}
                      onSave={(val) => updateStep(step.id, { label: val })}
                      className={`font-medium text-sm ${isConcluido ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}
                      placeholder="Nome da etapa"
                    />
                    <SlaBadge sla={sla} />
                  </div>

                  {/* Descrição */}
                  <div className="mt-1">
                    <InlineEdit
                      value={step.description}
                      onSave={(val) => updateStep(step.id, { description: val })}
                      className="text-xs text-gray-500 dark:text-gray-400"
                      placeholder="Adicionar descrição..."
                    />
                  </div>

                  {/* Informações de Agendamento/Prazo */}
                  <div className="flex items-center gap-x-4 gap-y-1.5 mt-1.5 flex-wrap text-xs">
                    {/* Deadline */}
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 dark:text-gray-500">📅</span>
                      <InlineEdit
                        value={step.deadline}
                        onSave={(val) => updateStep(step.id, { deadline: val })}
                        type="date"
                        className="text-gray-600 dark:text-gray-400"
                        placeholder="Prazo"
                      />
                    </div>

                    {/* Horário de Início */}
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 dark:text-gray-500">🕒</span>
                      <input
                        type="time"
                        value={step.horario_inicio || ''}
                        onChange={(e) => updateStep(step.id, { horario_inicio: e.target.value || null })}
                        className="bg-transparent border-none p-0 text-gray-600 dark:text-gray-400 outline-none focus:ring-1 focus:ring-blue-500/20 rounded max-w-[70px]"
                      />
                    </div>

                    {/* Duração */}
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 dark:text-gray-500">⏱️</span>
                      <input
                        type="text"
                        value={step.duracao_minutos ? formatDuration(step.duracao_minutos) : ''}
                        onChange={(e) => updateStep(step.id, { duracao_minutos: parseDurationString(e.target.value) })}
                        placeholder="Duração (ex: 2h)"
                        className="bg-transparent border-none p-0 text-gray-600 dark:text-gray-400 outline-none focus:ring-1 focus:ring-blue-500/20 rounded max-w-[85px] placeholder-gray-400 dark:placeholder-gray-600"
                      />
                    </div>

                    {/* Ambiente */}
                    <div className="flex items-center gap-1">
                      <select
                        value={step.ambiente || 'externo'}
                        onChange={(e) => updateStep(step.id, { ambiente: e.target.value as 'interno' | 'externo' })}
                        className="bg-transparent border-none p-0 text-gray-600 dark:text-gray-400 outline-none focus:ring-1 focus:ring-blue-500/20 rounded cursor-pointer font-medium"
                      >
                        <option value="externo">🎥 Externo</option>
                        <option value="interno">🏢 Interno</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ações por etapa */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => togglePausar(step.id)}
                    title={isPausado ? 'Retomar' : 'Pausar / Aguardando cliente'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isPausado
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    }`}
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleAdiarEtapa(step.id)}
                    title={`Adiar etapa em ${diasAdiar} dias`}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeStep(step.id)}
                    title="Remover etapa"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer: ações */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/[0.05] flex flex-wrap items-center gap-2">
        <button
          onClick={addStep}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar Etapa
        </button>

        <button
          onClick={() => setShowSaveTemplate(true)}
          disabled={workflow.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-40"
        >
          <Save className="w-3.5 h-3.5" /> Salvar como Modelo
        </button>

        <div ref={templateMenuRef} className="relative">
          <button
            onClick={() => { setShowTemplateMenu(!showTemplateMenu); loadTemplates(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" /> Aplicar Modelo
          </button>
          {showTemplateMenu && (
            <TemplateMenu
              templates={templates}
              onApply={applyTemplate}
              onDelete={deleteTemplate}
              onClose={() => setShowTemplateMenu(false)}
            />
          )}
        </div>

        <button
          onClick={() => { setShowManageTemplates(true); loadTemplates(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          title="Gerenciar Modelos de Workflow"
        >
          ⚙️ Gerenciar Modelos
        </button>
      </div>

      {/* Modal Salvar Template */}
      {showSaveTemplate && (
        <SaveTemplateModal
          userId={userId}
          workflow={workflow}
          onClose={() => setShowSaveTemplate(false)}
          onSaved={loadTemplates}
        />
      )}

      {/* Modal Gerenciar Templates */}
      {showManageTemplates && (
        <ManageTemplatesModal
          userId={userId}
          onClose={() => setShowManageTemplates(false)}
          onTemplatesChanged={loadTemplates}
        />
      )}
    </div>
  );
}

// ── Template Dropdown Menu ───────────────────────────────
function TemplateMenu({
  templates,
  onApply,
  onDelete,
  onClose,
}: {
  templates: WorkflowTemplate[];
  onApply: (t: WorkflowTemplate) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-full left-0 mb-1 w-64 bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="px-3 py-2 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Seus Modelos</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {templates.length === 0 ? (
        <div className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
          Nenhum modelo salvo ainda.
        </div>
      ) : (
        <ul className="max-h-52 overflow-y-auto">
          {templates.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 group transition-colors">
              <button
                onClick={() => onApply(t)}
                className="flex-1 text-left text-sm text-gray-800 dark:text-gray-200 truncate"
              >
                {t.nome}
                <span className="ml-1 text-xs text-gray-400 dark:text-gray-500">
                  ({t.etapas.length} etapas)
                </span>
              </button>
              <button
                onClick={() => onDelete(t.id)}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                title="Excluir modelo"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
