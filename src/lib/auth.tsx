import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Detectar se a requisição atual é um retorno de login OAuth (Google, etc.)
    const hasOAuthHash = typeof window !== 'undefined' && window.location.hash &&
      (window.location.hash.includes('access_token') || window.location.hash.includes('provider_token') || window.location.hash.includes('refresh_token'));
    const hasOAuthCode = typeof window !== 'undefined' && window.location.search && window.location.search.includes('code=');
    const isOAuthRedirect = !!(hasOAuthHash || hasOAuthCode);

    let safetyTimer: NodeJS.Timeout | null = null;
    if (isOAuthRedirect) {
      console.log('🔑 [Auth] Retorno de OAuth detectado! Aguardando validação de sessão pelo Supabase...');
      // Timer de segurança de 4s caso a validação do hash demore
      safetyTimer = setTimeout(() => {
        setLoading((prev) => {
          if (prev) console.warn('⚠️ [Auth] Safety timeout de OAuth atingido — finalizando loading');
          return false;
        });
      }, 4000);
    }

    // Buscar sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[Auth] getSession:', session?.user?.id ?? 'sem sessão', '| isOAuthRedirect:', isOAuthRedirect);
      if (session) {
        setUser(session.user);
        setLoading(false);
      } else if (!isOAuthRedirect) {
        // Se NÃO for retorno de OAuth, define a sessão como nula e remove o loading
        setUser(null);
        setLoading(false);
      }
    });

    // Escutar alterações de Auth (incluindo processamento do hash do Google OAuth)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] onAuthStateChange event:', event, '| user:', session?.user?.id ?? 'null');
      setUser(session?.user ?? null);
      setLoading(false);

      if (safetyTimer) clearTimeout(safetyTimer);

      // Salvar credenciais do Google OAuth no profile do usuário (sem bloquear a thread de Auth)
      if (session?.user && (session.provider_token || session.provider_refresh_token)) {
        console.log('🔑 [Auth] OAuth tokens detectados! event:', event);

        const userId = session.user.id;
        const providerToken = session.provider_token;
        const providerRefreshToken = session.provider_refresh_token;

        setTimeout(async () => {
          try {
            console.log('[Auth] Buscando profile para user:', userId);
            const { data: profileData, error: profileSelectError } = await supabase
              .from('profiles')
              .select('google_auth_data')
              .eq('id', userId)
              .maybeSingle();

            if (profileSelectError) {
              console.error('[Auth] Erro ao buscar profile:', profileSelectError.message, profileSelectError.code);
            }

            // Se profile não existe (novo usuário Google), criar agora via upsert
            if (!profileData) {
              console.warn('[Auth] Profile não encontrado — criando profile para Google user:', userId);
              const trialExp = new Date();
              trialExp.setDate(trialExp.getDate() + 30);
              const { error: insertErr } = await supabase
                .from('profiles')
                .upsert({
                  id: userId,
                  nome_admin: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuário',
                  status_assinatura: 'trial',
                  data_expiracao_trial: trialExp.toISOString(),
                }, { onConflict: 'id' });

              if (insertErr) {
                console.error('[Auth] Erro ao criar profile Google:', insertErr.message, 'code:', insertErr.code);
              } else {
                console.log('[Auth] ✅ Profile Google criado com sucesso!');
              }
            }

            const existingAuth = profileData?.google_auth_data || {};
            const updatedAuth = {
              ...existingAuth,
              access_token: providerToken || existingAuth.access_token,
              ...(providerRefreshToken ? { refresh_token: providerRefreshToken } : {}),
              updated_at: new Date().toISOString()
            };

            const { error: updateErr } = await supabase
              .from('profiles')
              .update({ google_auth_data: updatedAuth })
              .eq('id', userId);

            if (updateErr) {
              console.error('[Auth] Erro ao salvar google_auth_data:', updateErr.message);
            } else {
              console.log('✅ Google OAuth tokens saved. refresh_token atualizado:', !!providerRefreshToken);
            }
          } catch (err) {
            console.error('❌ Error saving Google OAuth tokens:', err);
          } finally {
            if (window.location.hash && (window.location.hash.includes('access_token') || window.location.hash.includes('provider_token'))) {
              const routeHash = window.location.hash.split('?')[0].split('&')[0];
              window.history.replaceState(null, '', window.location.pathname + window.location.search + (routeHash || ''));
            }
          }
        }, 0);
      }
    });

    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
      },
    });
    return { error };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard/meu-dia`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.file'
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}