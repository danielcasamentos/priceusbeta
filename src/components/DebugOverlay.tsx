/**
 * DebugOverlay — Painel de debug visível em tela
 * Ativa-se automaticamente ao abrir a URL com ?debug=1
 * Intercepta console.error, console.warn e erros globais.
 * REMOVER após diagnóstico completado.
 */
import { useEffect, useRef, useState } from 'react'

interface LogEntry {
  id: number
  type: 'error' | 'warn' | 'info'
  msg: string
  time: string
}

let _logId = 0
const _listeners: ((entry: LogEntry) => void)[] = []

// Interceptar console globalmente (fora do componente para pegar tudo)
const _origError = console.error.bind(console)
const _origWarn = console.warn.bind(console)
const _origLog = console.log.bind(console)

function emit(type: LogEntry['type'], args: any[]) {
  const msg = args
    .map(a => {
      if (typeof a === 'string') return a
      try { return JSON.stringify(a, null, 0) } catch { return String(a) }
    })
    .join(' ')
  const entry: LogEntry = { id: ++_logId, type, msg, time: new Date().toLocaleTimeString('pt-BR') }
  _listeners.forEach(fn => fn(entry))
}

console.error = (...args: any[]) => { emit('error', args); _origError(...args) }
console.warn  = (...args: any[]) => { emit('warn',  args); _origWarn(...args) }
// Habilitar info também para capturar fluxo de auth
console.log   = (...args: any[]) => {
  const first = String(args[0] || '')
  // Capturar apenas logs de auth/supabase para não poluir
  if (first.includes('[Auth]') || first.includes('🔑') || first.includes('✅') || first.includes('❌') || first.includes('[Signup]') || first.includes('Error') || first.includes('Supabase')) {
    emit('info', args)
  }
  _origLog(...args)
}

// Capturar erros globais não tratados
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    emit('error', [`[GlobalError] ${e.message} @ ${e.filename}:${e.lineno}`])
  })
  window.addEventListener('unhandledrejection', (e) => {
    emit('error', [`[UnhandledPromise] ${e.reason}`])
  })
}

export function DebugOverlay() {
  const isActive = typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('debug') === '1' ||
     sessionStorage.getItem('priceus_debug') === '1')

  const [logs, setLogs] = useState<LogEntry[]>([])
  const [minimized, setMinimized] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive) return
    const handler = (entry: LogEntry) => {
      setLogs(prev => [...prev.slice(-199), entry]) // manter últimos 200
    }
    _listeners.push(handler)

    // Log inicial para confirmar que está ativo
    emit('info', ['🐛 [DebugOverlay] Ativo — capturando logs...'])
    emit('info', [`📍 URL: ${window.location.href}`])

    return () => {
      const idx = _listeners.indexOf(handler)
      if (idx > -1) _listeners.splice(idx, 1)
    }
  }, [isActive])

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, minimized])

  if (!isActive) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        fontFamily: 'monospace',
        fontSize: '11px',
        background: 'rgba(0,0,0,0.92)',
        color: '#e2e8f0',
        maxHeight: minimized ? '36px' : '40vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'max-height 0.2s ease',
        borderTop: '2px solid #ff6b35',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 10px',
        background: '#1a1a2e',
        borderBottom: minimized ? 'none' : '1px solid #333',
        flexShrink: 0,
      }}>
        <span style={{ color: '#ff6b35', fontWeight: 'bold' }}>🐛 DEBUG</span>
        <span style={{ color: '#64748b', fontSize: '10px' }}>
          {logs.length} logs — ?debug=1 ativo
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setLogs([])}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px' }}
          >
            limpar
          </button>
          <button
            onClick={() => setMinimized(m => !m)}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
          >
            {minimized ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Log list */}
      {!minimized && (
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {logs.length === 0 && (
            <div style={{ padding: '8px 10px', color: '#64748b' }}>
              Aguardando eventos...
            </div>
          )}
          {logs.map(entry => (
            <div
              key={entry.id}
              style={{
                padding: '3px 10px',
                borderBottom: '1px solid #1e293b',
                color: entry.type === 'error' ? '#f87171'
                     : entry.type === 'warn'  ? '#fbbf24'
                     : '#86efac',
                wordBreak: 'break-all',
                lineHeight: '1.4',
              }}
            >
              <span style={{ color: '#475569', marginRight: '6px' }}>{entry.time}</span>
              <span style={{ marginRight: '6px' }}>
                {entry.type === 'error' ? '❌' : entry.type === 'warn' ? '⚠️' : 'ℹ️'}
              </span>
              {entry.msg}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
