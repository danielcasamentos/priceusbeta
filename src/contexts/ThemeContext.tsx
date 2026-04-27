import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Theme = 'light' | 'dark';
type ThemeSource = 'manual' | 'system';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  isDark: false,
});

/** Retorna a preferência do sistema operacional */
function getSystemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('priceus-theme') as Theme | null;
    return saved ?? getSystemTheme();
  });

  const [userId, setUserId] = useState<string | null>(null);

  // Busca o usuário logado e a preferência de tema dele no BD
  useEffect(() => {
    let mounted = true;
    const fetchUserAndTheme = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      
      const uid = session.user.id;
      if (mounted) setUserId(uid);

      const { data } = await supabase
        .from('profiles')
        .select('tema_preferido')
        .eq('id', uid)
        .maybeSingle();

      if (data?.tema_preferido && (data.tema_preferido === 'light' || data.tema_preferido === 'dark')) {
        if (mounted) {
          setTheme(data.tema_preferido as Theme);
          localStorage.setItem('priceus-theme-source', 'manual');
        }
      }
    };

    fetchUserAndTheme();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        if (mounted) setUserId(session.user.id);
        fetchUserAndTheme(); // refetch theme on login
      } else {
        if (mounted) setUserId(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Aplica a classe 'dark' no <html> e persiste a escolha
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('priceus-theme', theme);
  }, [theme]);

  // 🖥 Segue mudanças do sistema operacional APENAS se o usuário não escolheu manualmente
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemChange = (e: MediaQueryListEvent) => {
      const source = localStorage.getItem('priceus-theme-source') as ThemeSource | null;
      // Só atualiza se a origem for 'system' (ou sem origem — primeira visita / mobile)
      if (source !== 'manual') {
        const newTheme: Theme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('priceus-theme-source', 'system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  /**
   * Toggle manual — usado apenas no Desktop (Sidebar).
   * Marca a origem como 'manual' para que mudanças do sistema não sobrescrevam.
   */
  const toggleTheme = async () => {
    let nextTheme: Theme = 'light';
    setTheme(prev => {
      nextTheme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('priceus-theme-source', 'manual');
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
