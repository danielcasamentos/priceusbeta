import React, { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus, Trash2, Save, ChevronDown, ChevronUp,
  Pause, Check, BookTemplate, FolderOpen, X, Loader2
} from 'lucide-react';
import { WorkflowStep, WorkflowTemplate, WorkflowTemplateStep, SlaResult } from '../types/workflow';
import { useWorkflowSla, calcularSlaEtapa } from '../hooks/useWorkflowSla';
import { supabase } from '../lib/supabase';

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

// ── WorkflowStepper (componente principal) ───────────────
export function WorkflowStepper({
  leadId,
  leadName,
  userId,
  initialWorkflow,
  onWorkflowChange,
  onAllCompleted,
}: WorkflowStepperProps) {
  const [workflow, setWorkflow] = useState<WorkflowStep[]>(initialWorkflow);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const templateMenuRef = useRef<HTMLDivElement>(null);

  const { slaMap, progress } = useWorkflowSla(workflow);

  // Fechar menu ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target as Node)) {
        setShowTemplateMenu(false);
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
    setTemplates((data as WorkflowTemplate[]) || []);
  };

  // Persistir workflow no Supabase
  const persistWorkflow = async (updated: WorkflowStep[]) => {
    setSaving(true);
    try {
      await supabase.from('leads').update({ workflow: updated }).eq('id', leadId);
      onWorkflowChange(updated);
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
    };
    updateWorkflow([...workflow, newStep]);
  };

  // Remover etapa
  const removeStep = (id: string) => {
    updateWorkflow(workflow.filter(s => s.id !== id));
  };

  // Atualizar campo de uma etapa
  const updateStep = (id: string, changes: Partial<WorkflowStep>) => {
    updateWorkflow(workflow.map(s => s.id === id ? { ...s, ...changes } : s));
  };

  // Toggle concluído
  const toggleConcluido = (id: string) => {
    const step = workflow.find(s => s.id === id);
    if (!step) return;
    const novoStatus = step.status === 'concluido' ? 'pendente' : 'concluido';
    updateStep(id, { status: novoStatus });
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
    }));
    updateWorkflow([...workflow, ...novasEtapas]);
    setShowTemplateMenu(false);
  };

  // Deletar template
  const deleteTemplate = async (id: string) => {
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
          <button
            onClick={() => { setExpanded(true); addStep(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Iniciar Workflow
          </button>
          <div ref={templateMenuRef} className="relative">
            <button
              onClick={() => { setShowTemplateMenu(!showTemplateMenu); loadTemplates(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" /> Usar Modelo
            </button>
            {showTemplateMenu && (
              <TemplateMenu templates={templates} onApply={applyTemplate} onDelete={deleteTemplate} onClose={() => setShowTemplateMenu(false)} />
            )}
          </div>
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
        {workflow.map((step, index) => {
          const sla = slaMap[step.id] || calcularSlaEtapa(step);
          const isConcluido = step.status === 'concluido';
          const isPausado = step.status === 'aguardando_cliente';

          return (
            <div
              key={step.id}
              className={`px-4 py-3 transition-colors ${isConcluido ? 'bg-green-50/50 dark:bg-green-900/10' : ''}`}
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

                  {/* Deadline */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-xs text-gray-400 dark:text-gray-500">📅</span>
                    <InlineEdit
                      value={step.deadline}
                      onSave={(val) => updateStep(step.id, { deadline: val })}
                      type="date"
                      className="text-xs text-gray-600 dark:text-gray-400"
                      placeholder="Definir prazo"
                    />
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
      </div>

      {/* Modal Salvar Template */}
      {showSaveTemplate && (
        <SaveTemplateModal
          userId={userId}
          workflow={workflow}
          onClose={() => setShowSaveTemplate(false)}
          onSaved={() => {}}
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
