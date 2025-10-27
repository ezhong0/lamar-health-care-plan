import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { ThemeProvider } from '@/components/theme-provider';
import { ThemeToggle } from '@/components/theme-toggle';
import { Footer } from '@/components/Footer';
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
                  </div>
                  <ThemeToggle />
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
        </ThemeProvider>
      </body>
    </html>
  );
}
