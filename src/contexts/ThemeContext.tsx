import React, { createContext, useContext, useEffect, useState } from 'react';

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
    // Se há uma escolha salva (manual ou sistema), usa ela; caso contrário detecta o sistema
    return saved ?? getSystemTheme();
  });

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
  const toggleTheme = () => {
    setTheme(prev => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('priceus-theme-source', 'manual');
      return next;
    });
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
