import React, { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTrialStatus } from '../hooks/useTrialStatus'
import { useSubscription } from '../hooks/useSubscription'
import { isPrivilegedUser } from '../config/privilegedUsers'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const trialStatus = useTrialStatus(user)
  const { isActive } = useSubscription()
  const navigate = useNavigate()

  const isUserPrivileged = isPrivilegedUser(user?.email)

  // Acesso total: Usuários VIP, assinantes pagantes (isActive), ou usuários nos 30 dias de teste grátis
  const hasFullAccess =
    isUserPrivileged ||
    isActive ||
    (trialStatus.status === 'trial' && !trialStatus.isExpired) ||
    trialStatus.status === 'active' ||
    trialStatus.status === null ||
    trialStatus.loading

  useEffect(() => {
    // Se o trial de 30 dias expirou e o usuário não é VIP nem pagante: Paywall (/pricing)
    if (!loading && !trialStatus.loading && user && !hasFullAccess) {
      navigate('/pricing')
    }
  }, [hasFullAccess, loading, trialStatus.loading, user, navigate])

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

  if (!hasFullAccess) {
    return <Navigate to="/pricing" replace />
  }

  return <>{children}</>
}