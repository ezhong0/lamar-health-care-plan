'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { useOrders } from '@/lib/client/hooks';

export default function OrdersPage() {
  const { data, isLoading, error } = useOrders();
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // Client-side filtering (for demo purposes - in production, filter server-side)
  const filteredOrders = data?.orders.filter((order) => {
    const matchesStatus = !statusFilter || order.status === statusFilter;
    const matchesSearch =
      !searchTerm ||
      order.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient.mrn.includes(searchTerm);

    return matchesStatus && matchesSearch;
  }) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <p className="text-red-600">Error loading orders</p>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all medication orders
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search by medication, patient name, or MRN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={statusFilter === '' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('')}
            size="sm"
          >
            All
          </Button>
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
            size="sm"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('completed')}
            size="sm"
          >
            Completed
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 border rounded-lg">
          <p className="text-sm text-muted-foreground">Total Orders</p>
          <p className="text-3xl font-bold mt-1">{data?.total || 0}</p>
        </div>
        <div className="p-6 border rounded-lg">
          <p className="text-sm text-muted-foreground">Filtered</p>
          <p className="text-3xl font-bold mt-1">{filteredOrders.length}</p>
        </div>
        <div className="p-6 border rounded-lg">
          <p className="text-sm text-muted-foreground">Showing</p>
          <p className="text-3xl font-bold mt-1">
            {Math.min(filteredOrders.length, 100)}
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">
              {searchTerm || statusFilter
                ? 'No orders match your filters'
                : 'No orders yet'}
            </p>
          </div>
        ) : (
          filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-6 border rounded-lg hover:border-blue-500 transition-colors"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <Link
                    href={`/patients/${order.patient.id}`}
                    className="font-medium hover:text-blue-600 transition-colors"
                  >
                    {order.patient.firstName} {order.patient.lastName}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    MRN: {order.patient.mrn}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Medication</p>
                  <p className="font-medium">{order.medicationName}</p>
                  <p className="text-sm text-muted-foreground">
                    {order.primaryDiagnosis}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Provider</p>
                  <Link
                    href={`/providers/${order.provider.id}`}
                    className="font-medium hover:text-blue-600 transition-colors"
                  >
                    {order.provider.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    NPI: {order.provider.npi}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.status}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
