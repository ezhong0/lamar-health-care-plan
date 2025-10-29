'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useProviders } from '@/lib/client/hooks';
import { useQueryClient } from '@tanstack/react-query';

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cleaningUp, setCleaningUp] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Use React Query hook for data fetching
  const { data, isLoading, error } = useProviders(debouncedSearch);

  const providers = data?.providers || [];
  const total = data?.total || 0;

  const handleCleanup = async () => {
    if (!confirm('Delete all providers with no orders? This action cannot be undone.')) {
      return;
    }

    setCleaningUp(true);
    const toastId = toast.loading('Cleaning up orphaned providers...');

    try {
      const response = await fetch('/api/providers/cleanup', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to cleanup providers');
      }

      toast.success(data.data.message, { id: toastId });

      // Refresh providers list using React Query cache invalidation
      await queryClient.invalidateQueries({ queryKey: ['providers'] });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to cleanup providers',
        { id: toastId }
      );
    } finally {
      setCleaningUp(false);
    }
  };

  if (isLoading && providers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-4 border-neutral-900 dark:border-neutral-100 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading providers...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-200 font-medium mb-2">Error loading providers</p>
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error ? error.message : 'Failed to load providers'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              All Providers
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              Showing {providers.length} of {total} total providers
            </p>
          </div>
          <div>
            <Button
              onClick={handleCleanup}
              disabled={cleaningUp || isLoading}
              variant="outline"
              className="text-sm"
            >
              {cleaningUp ? 'Cleaning...' : 'Clear Orphaned Providers'}
            </Button>
          </div>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-4"
        >
          <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
            Search by name or NPI
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search providers..."
            className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
          />
        </motion.div>

        {/* Providers Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {providers.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <UserPlus className="h-12 w-12 text-neutral-300 dark:text-neutral-700 mb-3" />
              <p className="text-neutral-600 dark:text-neutral-400 font-medium mb-1">
                No providers found
              </p>
              <p className="text-sm text-neutral-500 dark:text-neutral-500">
                Providers will be created automatically when you add patients
              </p>
            </div>
          ) : (
            providers.map((provider) => (
              <Link
                key={provider.id}
                href={`/providers/${provider.id}`}
                className="group"
              >
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 hover:shadow-lg hover:border-neutral-300 dark:hover:border-neutral-700 transition-all duration-200">
                  <div className="space-y-4">
                    {/* Provider Name */}
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {provider.name}
                      </h3>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        NPI: {provider.npi}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Total Orders
                        </p>
                        <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                          {provider.orderCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                          Last Order
                        </p>
                        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mt-1">
                          {provider.lastOrderDate
                            ? formatDate(provider.lastOrderDate)
                            : 'Never'}
                        </p>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Added: {formatDate(provider.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
}
