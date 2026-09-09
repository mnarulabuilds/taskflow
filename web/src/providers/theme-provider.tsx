'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useUpdatePreferences, usePreferences } from '@/hooks/use-queries';
import { ThemePreference } from '@/types/user';

const STORAGE_KEY = 'taskflow-theme';

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function resolveTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

function readStoredTheme(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }
  const stored = localStorage.getItem(STORAGE_KEY) as ThemePreference | null;
  return stored ?? 'system';
}

function applyTheme(theme: ThemePreference) {
  document.documentElement.setAttribute('data-theme', resolveTheme(theme));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const preferencesQuery = usePreferences();
  const updatePreferences = useUpdatePreferences();
  const [localTheme, setLocalTheme] = useState<ThemePreference>(readStoredTheme);

  const theme =
    preferencesQuery.data?.theme && preferencesQuery.isSuccess
      ? preferencesQuery.data.theme
      : localTheme;

  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    function handleChange() {
      applyTheme('system');
    }

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = useCallback(
    (next: ThemePreference) => {
      setLocalTheme(next);
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      updatePreferences.mutate({ theme: next });
    },
    [updatePreferences],
  );

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }

  return context;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <select
      value={theme}
      onChange={(event) => setTheme(event.target.value as ThemePreference)}
      className={className}
      aria-label="Theme"
    >
      <option value="system">System</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  );
}
