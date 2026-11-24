import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Terminal, Shield, Copy, Check, Trash2, X, Info, AlertTriangle, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { platformAdapter, SystemLogEntry } from '../services/platformAdapter';
import { useAuth } from '../lib/auth';

interface DevSupportLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DevSupportLogDrawer({ isOpen, onClose }: DevSupportLogDrawerProps) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [copied, setCopied] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const isDevAuthorized = platformAdapter.isDevAuthorized(user?.email);

  useEffect(() => {
    const unsubscribe = platformAdapter.subscribeLogs((newLogs) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const filteredLogs = selectedCategory === 'ALL'
    ? logs
    : logs.filter((l) => l.category === selectedCategory);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => {
        const detailsStr = isDevAuthorized && l.details ? ` | Detail: ${JSON.stringify(l.details)}` : '';
        return `[${l.timestamp}] [${l.level.toUpperCase()}] [${l.category}] ${l.message}${detailsStr}`;
      })
      .join('\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLevelBadge = (level: SystemLogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
      case 'warn':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex justify-end bg-slate-950/80 backdrop-blur-sm transition-all duration-300 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-[100dvh] text-slate-100 animate-in slide-in-from-right duration-300">
        
        {/* Cabeçalho do Console */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">Console de Logs & Diagnóstico</h3>
                {isDevAuthorized ? (
                  <span className="px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Shield className="w-3 h-3 text-purple-400" /> DEV FULL ACCESS
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> MODO SUPORTE (DADOS PROTEGIDOS)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {isDevAuthorized
                  ? `Exibindo payloads avançados para ${user?.email}`
                  : 'Logs simplificados de suporte para rápido atendimento'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar relatório de suporte para envio"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado!' : 'Copiar Logs'}</span>
            </button>

            {isDevAuthorized && (
              <button
                onClick={() => platformAdapter.clearLogs()}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 border border-slate-700 transition cursor-pointer"
                title="Limpar buffer de logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filtro por Categorias */}
        <div className="px-4 py-2 bg-slate-950/40 border-b border-slate-800/60 flex items-center gap-1.5 text-xs overflow-x-auto">
          {['ALL', 'CULLING', 'SUPABASE', 'STORAGE', 'AI', 'SYSTEM'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'Todos' : cat}
            </button>
          ))}
        </div>

        {/* Lista de Logs em Tempo Real */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500 font-sans">
              <Terminal className="w-8 h-8 text-slate-600 mb-2 opacity-50" />
              <p className="text-xs">Nenhum evento registrado até o momento.</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    {getLevelBadge(log.level)}
                    <span className="font-extrabold text-slate-300">{log.category}</span>
                    <span className="text-slate-500">{log.timestamp}</span>
                  </div>
                </div>

                <p className="text-slate-200 text-[11.5px] leading-relaxed">{log.message}</p>

                {/* Exibição condicional de detalhes sensíveis / payloads para Devs Autorizados */}
                {log.details && (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/60">
                    {isDevAuthorized ? (
                      <pre className="text-[10px] text-purple-300/90 overflow-x-auto bg-slate-900/90 p-2 rounded-lg border border-purple-500/20 max-h-36">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details, null, 2)
                          : String(log.details)}
                      </pre>
                    ) : (
                      <span className="text-[10px] text-slate-500 italic flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Detalhes avançados protegidos (Requer e-mail de desenvolvedor)
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Rodapé Informativo */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-sans">
          <span>
            {platformAdapter.isNativeDesktop() ? '🖥️ Executando em App Nativo Desktop' : '🌐 Executando no Navegador Web'}
          </span>
          <span className="font-mono text-slate-500">{logs.length} eventos registrados</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
