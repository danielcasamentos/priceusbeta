import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/button'
import { Alert } from '../ui/Alert'
import { Eye, EyeOff, Globe, Sparkles, KeyRound } from 'lucide-react'
import { useAuth } from '../../lib/auth'
import { platformAdapter } from '../../services/platformAdapter'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signInWithGoogle, signIn } = useAuth()
  const stateError = location.state?.error || ''
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [manualToken, setManualToken] = useState('')
  const [showManualToken, setShowManualToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ssoWaiting, setSsoWaiting] = useState(false)
  const [error, setError] = useState(stateError)
  const [showPassword, setShowPassword] = useState(false)

  const isDesktop = platformAdapter.isNativeDesktop()

  // Listener para retorno automático do Web SSO via Deep Link / Loopback
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).priceusNative?.onAuthCallback) {
      (window as any).priceusNative.onAuthCallback(async (sessionData: { access_token: string; refresh_token?: string }) => {
        if (sessionData?.access_token) {
          setLoading(true);
          setSsoWaiting(false);
          try {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: sessionData.access_token,
              refresh_token: sessionData.refresh_token || '',
            });
            if (sessionError) {
              setError(`Erro ao autenticar sessão: ${sessionError.message}`);
            } else {
              onSuccess?.();
              navigate('/dashboard/meu-dia');
            }
          } catch (e: any) {
            setError(e.message || 'Erro ao sincronizar sessão.');
          } finally {
            setLoading(false);
          }
        }
      });
    }
  }, [navigate, onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)

      if (error) {
        setError(error.message)
      } else {
        onSuccess?.()
        navigate('/dashboard/meu-dia')
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // 🌐 Dispara Login com 1 Clique pelo Navegador Padrão (Web SSO)
  const handleBrowserSsoLogin = async () => {
    setError('')
    setSsoWaiting(true)
    try {
      const authUrl = 'https://app.priceus.com.br/desktop-auth'
      await platformAdapter.openExternalUrl(authUrl)
    } catch (err) {
      setError('Erro ao abrir o navegador para login.')
      setSsoWaiting(false)
    }
  }

  // Validação manual de token
  const handleManualTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualToken.trim()) return
    setLoading(true)
    setError('')

    try {
      const { error: tokenErr } = await supabase.auth.setSession({
        access_token: manualToken.trim(),
        refresh_token: '',
      })
      if (tokenErr) {
        setError('Token inválido ou expirado. Tente o login pelo navegador novamente.')
      } else {
        onSuccess?.()
        navigate('/dashboard/meu-dia')
      }
    } catch (e: any) {
      setError(e.message || 'Erro ao validar token manual.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError('')
    try {
      const { error } = await signInWithGoogle()
      if (error) setError(error.message)
    } catch (err) {
      setError('Erro ao iniciar login com o Google.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert type="error">
          {error}
        </Alert>
      )}

      {/* 🚀 BOTÃO HERO DE LOGIN PELO NAVEGADOR (1-CLIQUE) NO APP DESKTOP */}
      {isDesktop && (
        <div className="bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/30 rounded-2xl p-4 text-center space-y-3 shadow-lg shadow-emerald-950/30">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Recomendado para o App Desktop</span>
          </div>

          <button
            type="button"
            onClick={handleBrowserSsoLogin}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>{ssoWaiting ? 'Aguardando confirmação no navegador...' : '🌐 Fazer Login pelo Navegador (1-Clique)'}</span>
          </button>

          <p className="text-[11px] text-slate-400 leading-tight">
            Abre o PriceU$ no seu Safari/Chrome e conecta sua conta instantaneamente sem você precisar digitar a senha.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowManualToken(!showManualToken)}
              className="text-[11px] text-slate-400 hover:text-emerald-400 transition inline-flex items-center gap-1 font-medium"
            >
              <KeyRound className="w-3 h-3" />
              <span>{showManualToken ? 'Ocultar token manual' : 'Inserir código de autorização manual'}</span>
            </button>

            {showManualToken && (
              <form onSubmit={handleManualTokenSubmit} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="Cole o token de autorização aqui..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={loading || !manualToken.trim()}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Validar
                </button>
              </form>
            )}
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-[10px]">
              <span className="px-2 bg-slate-900 text-slate-400">Ou use e-mail e senha</span>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="Digite seu e-mail"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Senha</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Digite sua senha"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 bg-white text-gray-900"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/forgot-password')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Esqueceu sua senha?
          </button>
        </div>

        <Button
          type="submit"
          loading={loading}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Entrar
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white text-gray-500">Ou continuar com</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-55"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.745 1.09 14.981 0 12 0 7.354 0 3.307 2.665 1.299 6.554l3.967 3.211z"
            />
            <path
              fill="#4285F4"
              d="M23.64 12.273c0-.818-.073-1.609-.208-2.373H12v4.582h6.536a5.58 5.58 0 0 1-2.427 3.663l3.8 2.945c2.227-2.054 3.731-5.072 3.731-8.817z"
            />
            <path
              fill="#FBBC05"
              d="M5.266 14.235A7.09 7.09 0 0 1 4.909 12c0-.79.136-1.545.357-2.235L1.3 6.554A11.96 11.96 0 0 0 0 12c0 1.92.455 3.736 1.258 5.355l4.008-3.12z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.97-1.073 7.96-2.918l-3.8-2.945c-1.055.709-2.409 1.136-4.16 1.136-3.21 0-5.928-2.164-6.897-5.091L1.135 17.3A11.967 11.967 0 0 0 12 24z"
            />
          </svg>
          Entrar com o Google
        </button>
      </form>
    </div>
  )
}