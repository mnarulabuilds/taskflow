import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { KeyboardShortcuts } from '@/components/keyboard-shortcuts';
import { OnboardingTour } from '@/components/onboarding-tour';
import { ToastProvider } from '@/components/toast-provider';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TaskFlow',
  description: 'Manage tasks across workspaces and projects',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col font-sans">
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <ToastProvider>
                <KeyboardShortcuts>
                  {children}
                  <OnboardingTour />
                </KeyboardShortcuts>
              </ToastProvider>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
