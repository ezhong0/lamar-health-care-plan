'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Provider {
  id: string;
  name: string;
  npi: string;
  createdAt: string;
  updatedAt: string;
  orderCount: number;
  lastOrderDate: string | null;
}

interface ProvidersResponse {
  providers: Provider[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export default function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchProviders();
  }, [debouncedSearch]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: '100',
        offset: '0',
      });

      if (debouncedSearch) {
        params.append('search', debouncedSearch);
      }

      const response = await fetch(`/api/providers?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch providers');
      }

      const data: ProvidersResponse = await response.json();
      setProviders(data.providers);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch providers'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading && providers.length === 0) {
    return (
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-neutral-600 dark:text-neutral-400">
              Loading providers...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
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
            <div className="col-span-full text-center py-12 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
              <p className="text-neutral-500 dark:text-neutral-400">
                No providers found
              </p>
            </div>
          ) : (
            providers.map((provider) => (
              <Link
                key={provider.id}
                href={`/providers/${provider.id}`}
                className="group"
              >
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all">
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
