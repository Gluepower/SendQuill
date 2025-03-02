import './globals.css'
import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/providers/AuthProvider'
import { ThemeProvider } from '@/lib/providers/ThemeProvider'
import { NotificationProvider } from '@/lib/contexts/NotificationContext'

export const metadata: Metadata = {
  title: 'SendQuill - Email Mail Merge',
  description: 'A modern mail merge application for personalized email campaigns',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Script to prevent flash of incorrect theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  // Immediately remove dark mode class to start from a clean state
                  document.documentElement.classList.remove('dark');
                  
                  // Get theme setting from localStorage
                  let savedTheme = localStorage.getItem('theme');
                  console.log("Initial theme from localStorage:", savedTheme);
                  
                  // Check if system prefers dark mode
                  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  console.log("System prefers dark:", systemPrefersDark);
                  
                  // Validate saved theme
                  if (savedTheme && !['light', 'dark', 'system'].includes(savedTheme)) {
                    console.log("Invalid theme value, resetting to system");
                    savedTheme = 'system';
                    localStorage.setItem('theme', 'system');
                  }
                  
                  // Apply dark mode if:
                  // 1. User explicitly set to dark mode, OR
                  // 2. Theme is set to system and system prefers dark, OR
                  // 3. No saved preference but system prefers dark (default behavior)
                  if (
                    savedTheme === 'dark' || 
                    (savedTheme === 'system' && systemPrefersDark) ||
                    (!savedTheme && systemPrefersDark)
                  ) {
                    console.log("Adding dark class to HTML");
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  // If there's an error (e.g. localStorage not available), do nothing
                  console.error("Theme initialization error:", e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
        <AuthProvider>
          <ThemeProvider>
            <NotificationProvider>
              {children}
            </NotificationProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
