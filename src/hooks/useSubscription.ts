import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getProductByPriceId } from '../stripe-config'
import { isPrivilegedUser } from '../config/privilegedUsers'
import { supabase } from '../lib/supabase'

interface Subscription {
  subscription_status: string
  price_id: string | null
  current_period_end: number | null
  cancel_at_period_end: boolean
  payment_method_brand: string | null
  payment_method_last4: string | null
}

export function useSubscription() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    if (!user) {
      setSubscription(null)
      setLoading(false)
      return
    }

    const fetchSubscription = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('stripe_user_subscriptions')
          .select(
            'subscription_status, price_id, current_period_end, cancel_at_period_end, payment_method_brand, payment_method_last4'
          )
          .maybeSingle()

        if (!active) return

        if (error) {
          console.error('Erro ao buscar assinatura:', error)
          setSubscription(null)
        } else {
          setSubscription((data as Subscription | null) ?? null)
        }
      } catch (err) {
        if (active) {
          console.error('Erro ao buscar assinatura:', err)
          setSubscription(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchSubscription()

    return () => {
      active = false
    }
  }, [user])

  const getSubscriptionPlan = () => {
    if (!subscription?.price_id) return null
    return getProductByPriceId(subscription.price_id)
  }

  const isPrivileged = isPrivilegedUser(user?.email)
  const isActive = isPrivileged || subscription?.subscription_status === 'active'
  const isTrialing = subscription?.subscription_status === 'trialing'
  const isPastDue = subscription?.subscription_status === 'past_due'
  const isCanceled = subscription?.subscription_status === 'canceled'

  const manageSubscription = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('Sessão expirada. Faça login novamente.')
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        }
      )

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(responseData.error || 'Falha ao acessar o portal da Stripe.')
      }

      if (responseData.url) {
        window.location.href = responseData.url
      } else {
        throw new Error('URL do portal não encontrada.')
      }
    } catch (error: any) {
      console.error('Erro ao gerenciar assinatura:', error)
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return {
    subscription,
    loading,
    isActive,
    isTrialing,
    isPastDue,
    isCanceled,
    plan: getSubscriptionPlan(),
    manageSubscription
  }
}