import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/button'
import { Alert } from '../ui/Alert'
import { TermsCheckbox } from '../legal/TermsCheckbox'
import { TermsModal } from '../legal/TermsModal'
import { TERMS_VERSION } from '../../constants/terms'
import { Eye, EyeOff } from 'lucide-react'

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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined,
          data: {
            full_name: name,
          }
        }
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        const trialExpirationDate = new Date()
        trialExpirationDate.setDate(trialExpirationDate.getDate() + 30)
        const now = new Date().toISOString()

        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            nome_admin: name || email.split('@')[0],
            status_assinatura: 'trial',
            data_expiracao_trial: trialExpirationDate.toISOString(),
            terms_accepted_at: now,
            terms_version: TERMS_VERSION,
            privacy_policy_accepted_at: now,
            data_nascimento: birthDate,
            pais: pais === 'Outro' ? paisOutro : pais,
            estado: estado,
            cidade: cidade,
          })

        if (profileError) {
          console.error('Error creating profile:', profileError)
        }
      }

      onSuccess?.()
    } catch (err) {
      setError('Ocorreu um erro inesperado. Por favor, tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setTermsAccepted(true)}
        showAcceptButton
      />
    </form>
  )
}