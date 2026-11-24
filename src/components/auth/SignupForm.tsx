import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/button'
import { Alert } from '../ui/Alert'
import { TermsCheckbox } from '../legal/TermsCheckbox'
import { TermsModal } from '../legal/TermsModal'
import { TERMS_VERSION } from '../../constants/terms'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../lib/auth'

interface SignupFormProps {
  onSuccess?: () => void
}

const PAISES = [
  'Brasil',
  'Portugal',
  'Angola',
  'Moçambique',
  'Cabo Verde',
  'Guiné-Bissau',
  'Timor-Leste',
  'Guiné Equatorial',
  'São Tomé e Príncipe',
  'Outro'
];

const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

export function SignupForm({ onSuccess }: SignupFormProps) {
  const { signInWithGoogle } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [pais, setPais] = useState('Brasil')
  const [paisOutro, setPaisOutro] = useState('')
  const [estado, setEstado] = useState('')
  const [cidade, setCidade] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleGoogleSignUp = async () => {
    setLoading(true)
    setError('')
    setInfoMessage('')
    try {
      const { error } = await signInWithGoogle()
      if (error) setError(error.message)
    } catch (err) {
      setError('Erro ao iniciar cadastro com o Google.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setInfoMessage('')
    setTermsError(false)

    if (password !== confirmPassword) {
      setError('As senhas não correspondem')
      setLoading(false)
      return
    }

    if (!birthDate) {
      setError('A data de nascimento é obrigatória')
      setLoading(false)
      return
    }

    // Validação de maioridade (18 anos)
    const dtNascimento = new Date(birthDate)
    const hoje = new Date()
    let idade = hoje.getFullYear() - dtNascimento.getFullYear()
    const m = hoje.getMonth() - dtNascimento.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < dtNascimento.getDate())) {
      idade--
    }

    if (idade < 18) {
      setError('Você deve ter pelo menos 18 anos para criar uma conta.')
      setLoading(false)
      return
    }

    if (!termsAccepted) {
      setError('Você precisa aceitar os Termos e Condições para criar uma conta')
      setTermsError(true)
      setLoading(false)
      return
    }

    try {
      // Garante que qualquer sessão anterior seja totalmente encerrada antes de criar um novo usuário
      await supabase.auth.signOut()

      console.log('[Signup] Iniciando signUp para:', email)

      const trialExpirationDate = new Date()
      trialExpirationDate.setDate(trialExpirationDate.getDate() + 30)
      const now = new Date().toISOString()

      // Passar dados extras no user_metadata para que o trigger handle_new_user
      // possa usar como fallback se o upsert client-side falhar
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: name,
            nome_admin: name || email.split('@')[0],
            data_nascimento: birthDate,
            pais: pais === 'Outro' ? paisOutro : pais,
            estado,
            cidade,
            terms_accepted_at: now,
            terms_version: TERMS_VERSION,
            trial_expiration: trialExpirationDate.toISOString(),
          }
        }
      })

      console.log('[Signup] Resultado signUp:', { userId: data?.user?.id, hasSession: !!data?.session, error: error?.message })

      if (error) {
        let msg = error.message
        if (msg.toLowerCase().includes('rate limit')) {
          msg = 'Limite de envios de e-mail do servidor excedido. Por favor, aguarde alguns minutos antes de tentar novamente ou entre em contato com o suporte.'
        } else if (msg.toLowerCase().includes('already registered')) {
          msg = 'Este e-mail já está cadastrado em nossa plataforma.'
        } else if (msg.toLowerCase().includes('password should be')) {
          msg = 'A senha deve conter no mínimo 6 caracteres.'
        }
        setError(msg)
        return
      }

      if (!data.user) {
        setError('Ocorreu um erro ao criar o usuário. Por favor, tente novamente.')
        return
      }

      let activeSession = data.session

      // Se a sessão não veio no signUp, tenta auto-login imediato com senha
      if (!activeSession) {
        console.log('[Signup] Sem session no signUp — tentando auto-login com signInWithPassword...')
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInData?.session) {
          console.log('[Signup] Auto-login com sucesso!')
          activeSession = signInData.session
        } else {
          console.warn('[Signup] Auto-login não retornou sessão:', signInErr?.message)
          // Se o auto-login falhar por confirmação de e-mail ser exigida
          setInfoMessage('Conta criada com sucesso! Enviamos um e-mail de confirmação. Por favor, verifique sua caixa de entrada para ativar sua conta antes de fazer o login.')
          return
        }
      }

      // Setar sessão explicitamente para evitar erro de RLS (42501)
      if (activeSession) {
        console.log('[Signup] Sessão disponível — setando via setSession()')
        await supabase.auth.setSession({
          access_token: activeSession.access_token,
          refresh_token: activeSession.refresh_token,
        })
      }

      console.log('[Signup] Fazendo upsert do profile para user:', data.user.id)

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          nome_admin: name || email.split('@')[0],
          status_assinatura: 'trial',
          data_expiracao_trial: trialExpirationDate.toISOString(),
          terms_accepted_at: now,
          terms_version: TERMS_VERSION,
          privacy_policy_accepted_at: now,
          data_nascimento: birthDate,
          pais: pais === 'Outro' ? paisOutro : pais,
          estado,
          cidade,
        }, { onConflict: 'id' })

      console.log('[Signup] Resultado upsert profile:', { code: profileError?.code, message: profileError?.message })

      if (profileError) {
        console.error('[Signup] profileError code:', profileError.code, '| message:', profileError.message)
      } else {
        console.log('[Signup] ✅ Profile salvo com sucesso!')
      }

      onSuccess?.()

    } catch (err: any) {
      console.error('[Signup] Erro inesperado catch:', err)
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.')

    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {infoMessage && (
        <Alert type="success">
          {infoMessage}
        </Alert>
      )}

      {error && (
        <Alert type="error">
          {error}
        </Alert>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Nome</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Seu nome completo"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">E-mail</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="Digite seu e-mail"
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">País</label>
          <select
            value={pais}
            onChange={(e) => {
              const val = e.target.value;
              setPais(val);
              if (val !== 'Brasil') {
                setEstado('');
              }
            }}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          >
            {PAISES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {pais === 'Outro' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome do País</label>
            <input
              type="text"
              value={paisOutro}
              onChange={(e) => setPaisOutro(e.target.value)}
              required
              placeholder="Digite o país"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Estado / UF</label>
          {pais === 'Brasil' ? (
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Selecione...</option>
              {ESTADOS_BR.map(uf => (
                <option key={uf.sigla} value={uf.sigla}>{uf.nome} ({uf.sigla})</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              required
              placeholder="Estado/Região"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Cidade</label>
          <input
            type="text"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            required
            placeholder="Digite a cidade"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Senha</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Digite sua senha (mínimo 6 caracteres)"
            minLength={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Confirmar Senha</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Digite a senha novamente"
            minLength={6}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
          />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </div>

      <div className="pt-2">
        <TermsCheckbox
          checked={termsAccepted}
          onChange={setTermsAccepted}
          onTermsClick={() => setShowTermsModal(true)}
          error={termsError}
        />
        {termsError && !termsAccepted && (
          <p className="text-sm text-red-600 mt-2">
            É obrigatório aceitar os Termos e Condições
          </p>
        )}
      </div>

      <Button
        type="submit"
        loading={loading}
        className="w-full bg-green-600 hover:bg-green-700"
        disabled={!termsAccepted}
      >
        Criar Conta
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
        onClick={handleGoogleSignUp}
        disabled={loading || !termsAccepted}
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
        Cadastrar com o Google
      </button>

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setTermsAccepted(true)}
        showAcceptButton
      />
    </form>
  )
}