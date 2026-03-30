import { useEffect, useRef, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const refreshingRef = useRef(false)

  useEffect(() => {
    // Carrega sessão inicial do localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Escuta mudanças de auth (login, logout, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        if (event === 'SIGNED_OUT') {
          // Garante que o estado local é limpo
          setUser(null)
        }
      }
    )

    // 📱 PWA iOS/Android fix: quando o app volta do background,
    // o auto-refresh pode ter falhado porque o JS estava congelado.
    // Forçamos uma renovação de sessão ao voltar ao foco.
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        if (refreshingRef.current) return
        refreshingRef.current = true
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error || !session) {
            // Sessão morreu — tenta refresh manual
            const { data: refreshData } = await supabase.auth.refreshSession()
            if (refreshData.session) {
              setUser(refreshData.session.user)
            } else {
              // Token de refresh também expirou — força logout
              setUser(null)
            }
          } else {
            // Sessão ainda viva — atualiza usuário silenciosamente
            setUser(session.user)
          }
        } catch (e) {
          console.warn('[useAuth] Erro ao verificar sessão no retorno do background:', e)
        } finally {
          refreshingRef.current = false
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return {
    user,
    loading,
    signOut
  }
}