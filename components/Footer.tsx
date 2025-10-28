/**
 * Footer Component
 *
 * Beautiful footer with tech stack information
 */

'use client';

export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">Care Plan Generator</span>
          <span className="mx-2">·</span>
          <span className="text-xs">Built with Next.js, Prisma & Claude AI</span>
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
