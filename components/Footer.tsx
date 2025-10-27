/**
 * Footer Component
 *
 * Beautiful footer with GitHub repository link
 */

'use client';

import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Project Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Lamar Health Care Plan Generator</span>
            <span className="hidden sm:inline">·</span>
            <span className="text-xs">Built with Next.js, Prisma & Claude AI</span>
          </div>

          {/* GitHub Link */}
          <a
            href="https://github.com/ezhong0/lamar-health-care-plan"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <Github className="w-4 h-4" />
            <span>View on GitHub</span>
          </a>
        </div>

        {/* Optional: Tech Stack */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-900">
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-500">
            <span className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-900">TypeScript</span>
            <span className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-900">React</span>
            <span className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-900">Next.js 16</span>
            <span className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-900">Prisma</span>
            <span className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-900">PostgreSQL</span>
            <span className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-900">Claude 3.5</span>
            <span className="px-2 py-1 rounded bg-gray-50 dark:bg-gray-900">Tailwind CSS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
