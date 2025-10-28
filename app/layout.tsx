import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/Footer';
import { Toaster } from '@/components/Toaster';
import Link from 'next/link';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Lamar Health - Care Plan Generator',
  description: 'AI-powered pharmacist care plan generation',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider defaultTheme="dark">
          <Providers>
            {/* Navigation */}
            <nav className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-14 items-center">
                  <div className="flex items-center space-x-8">
                    <Link
                      href="/"
                      className="text-lg font-semibold text-neutral-900 dark:text-white"
                    >
                      Lamar Health
                    </Link>
                    <Link
                      href="/patients/new"
                      className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                    >
                      New Patient
                    </Link>
                    <Link
                      href="/patients"
                      className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors"
                    >
                      All Patients
                    </Link>
                  </div>
                  <div className="flex items-center gap-4">
                    <a
                      href="https://github.com/ezhong0/lamar-health-care-plan"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      GitHub
                    </a>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </nav>

            {/* Main Content */}
            <main className="min-h-[calc(100vh-3.5rem)] bg-neutral-50 dark:bg-neutral-950">
              {children}
            </main>

            {/* Footer */}
            <Footer />
          </Providers>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
