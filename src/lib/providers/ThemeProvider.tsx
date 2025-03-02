'use client';

import { ReactNode } from 'react';
import { ThemeProvider as CustomThemeProvider } from '@/lib/contexts/ThemeContext';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return <CustomThemeProvider>{children}</CustomThemeProvider>;
} 