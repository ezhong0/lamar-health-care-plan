/**
 * React Query Hooks
 *
 * Type-safe hooks for API calls with automatic loading, error states, and caching.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { CreatePatientRequest, GenerateCarePlanRequest } from '@/lib/api/contracts';

/**
 * Hook to create a new patient
 *
 * Includes automatic error handling and success callbacks
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientRequest) => api.createPatient(data),
    onSuccess: () => {
      // Invalidate patient list queries if they exist
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
  });
}

/**
 * Hook to generate a care plan for a patient
 *
 * Automatically updates the patient query cache on success
 */
export function useGenerateCarePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: GenerateCarePlanRequest) => api.generateCarePlan(data),
    onSuccess: (_, variables) => {
      // Invalidate the patient query to refresh care plans
      queryClient.invalidateQueries({ queryKey: ['patient', variables.patientId] });
    },
  });
}

/**
 * Hook to fetch patient details
 *
 * Automatically caches and handles loading/error states
 */
export function usePatient(id: string) {
  // Only run query on client-side to avoid SSR issues
  const isClient = typeof window !== 'undefined';

  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => api.getPatient(id),
    enabled: !!id && isClient,
  });
}

/**
 * Hook to fetch all patients
 *
 * Automatically caches and handles loading/error states
 */
export function usePatients() {
  // Only run query on client-side to avoid SSR issues
  const isClient = typeof window !== 'undefined';

  return useQuery({
    queryKey: ['patients'],
    queryFn: () => api.listPatients(),
    enabled: isClient,
  });
}

/**
 * Hook to fetch all orders
 *
 * Automatically caches and handles loading/error states
 */
export function useOrders() {
  // Only run query on client-side to avoid SSR issues
  const isClient = typeof window !== 'undefined';

  return useQuery({
    queryKey: ['orders'],
    queryFn: () => api.listOrders(),
    enabled: isClient,
  });
}

/**
 * Hook to fetch all providers
 *
 * Supports optional search parameter for filtering
 */
export function useProviders(search?: string) {
  // Only run query on client-side to avoid SSR issues
  const isClient = typeof window !== 'undefined';

  return useQuery({
    queryKey: ['providers', search],
    queryFn: () => api.listProviders(search),
    enabled: isClient,
  });
}
