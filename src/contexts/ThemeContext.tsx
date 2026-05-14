import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

/** Única conta autorizada a usar o modo escuro do dashboard */
const DARK_MODE_ALLOWED_EMAIL = 'odanielfotografo@icloud.com';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Busca o usuário logado — só carrega tema dark se for a conta autorizada
  useEffect(() => {
    let mounted = true;

    const applyThemeForUser = async (session: any) => {
      if (!session?.user) {
        // Sem sessão → sempre light
        if (mounted) {
          setUserEmail(null);
          setUserId(null);
          setTheme('light');
        }
        return;
      }

      const email = session.user.email ?? '';
      const uid = session.user.id;

      if (mounted) {
        setUserEmail(email);
        setUserId(uid);
      }

      // Apenas a conta autorizada pode ter dark mode
      if (email !== DARK_MODE_ALLOWED_EMAIL) {
        if (mounted) setTheme('light');
        return;
      }

      // Para a conta autorizada: carrega preferência salva no banco
      const { data } = await supabase
        .from('profiles')
        .select('tema_preferido')
        .eq('id', uid)
        .maybeSingle();

      if (mounted && data?.tema_preferido === 'dark') {
        setTheme('dark');
      } else if (mounted) {
        // Fallback: preferência do localStorage (só para conta autorizada)
        const saved = localStorage.getItem('priceus-theme') as Theme | null;
        if (saved === 'dark') setTheme('dark');
      }
    };

    // Sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      applyThemeForUser(session);
    });

    // Mudanças de sessão (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applyThemeForUser(session);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Aplica / remove a classe 'dark' no <html>
  useEffect(() => {
    const root = document.documentElement;
    // Garantia dupla: nunca aplicar dark para contas não autorizadas
    if (theme === 'dark' && userEmail === DARK_MODE_ALLOWED_EMAIL) {
      root.classList.add('dark');
      localStorage.setItem('priceus-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('priceus-theme', 'light');
    }
  }, [theme, userEmail]);

  /**
   * Toggle manual — visível e funcional apenas para a conta autorizada.
   * Para outras contas, o botão não aparece (controlado no Sidebar).
   */
  const toggleTheme = async () => {
    if (userEmail !== DARK_MODE_ALLOWED_EMAIL) return; // segurança extra

    let nextTheme: Theme = 'light';
    setTheme(prev => {
      nextTheme = prev === 'light' ? 'dark' : 'light';
      return nextTheme;
    });

    if (userId) {
      try {
        await supabase
          .from('profiles')
          .update({ tema_preferido: nextTheme })
          .eq('id', userId);
      } catch (err) {
        console.error('Failed to sync theme to DB', err);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
