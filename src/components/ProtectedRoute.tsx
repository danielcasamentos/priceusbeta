import React, { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTrialStatus } from '../hooks/useTrialStatus'
import { isPrivilegedUser } from '../config/privilegedUsers'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, signOut } = useAuth()
  const trialStatus = useTrialStatus(user?.id)
  const navigate = useNavigate()

  const isUserPrivileged = isPrivilegedUser(user?.email)

  useEffect(() => {
    // Usuários privilegiados não são redirecionados
    if (isUserPrivileged) return

    if (!trialStatus.loading && trialStatus.status === 'trial') {
      if (trialStatus.isGraceExpired) {
        // Se a carência expirou, força sign out imediato e joga para login com mensagem explicativa
        signOut().then(() => {
          navigate('/login', { 
            state: { 
              error: 'Seu período de teste de 30 dias e a carência de 15 dias expiraram. Sua conta foi desativada e agendada para exclusão permanente.' 
            } 
          })
        })
      } else if (trialStatus.isExpired) {
        navigate('/pricing')
      }
    }
  }, [trialStatus.isExpired, trialStatus.isGraceExpired, trialStatus.loading, trialStatus.status, navigate, isUserPrivileged, signOut])

  if (loading || trialStatus.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Usuários privilegiados não são redirecionados para pricing
  if (!isUserPrivileged && trialStatus.isExpired && trialStatus.status === 'trial') {
    if (trialStatus.isGraceExpired) {
      return <Navigate to="/login" replace />
    }
    return <Navigate to="/pricing" replace />
  }

  return <>{children}</>
}