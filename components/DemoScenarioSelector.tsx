/**
 * Demo Scenario Selector
 *
 * Elegant component for loading predefined demo scenarios.
 * Shows available scenarios with descriptions and allows one-click loading.
 *
 * Features:
 * - Grid layout with scenario cards
 * - Loading states
 * - Toast notifications
 * - Smooth animations
 * - Dark mode support
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Sparkles, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/infrastructure/logger';

interface Scenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  patientsCount: number;
}

interface ScenarioResponse {
  success: boolean;
  data: {
    scenarios: Scenario[];
  };
}

export function DemoScenarioSelector() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingScenario, setLoadingScenario] = useState<string | null>(null);
  const router = useRouter();

  // Fetch available scenarios
  useEffect(() => {
    async function fetchScenarios() {
      try {
        const response = await fetch('/api/examples/scenario');
        const data: ScenarioResponse = await response.json();

        if (data.success) {
          setScenarios(data.data.scenarios);
        }
      } catch (error) {
        toast.error('Failed to load demo scenarios');
        logger.error('Failed to fetch demo scenarios', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchScenarios();
  }, []);

  const handleLoadScenario = async (scenarioId: string, scenarioName: string) => {
    setLoadingScenario(scenarioId);
    const toastId = toast.loading(`Loading ${scenarioName}...`);

    try {
      const response = await fetch('/api/examples/scenario', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scenarioId }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to load scenario');
      }

      const { scenario, patientsCreated, prefillData } = data.data;

      if (scenario.mode === 'prefill' && prefillData) {
        // Clear any existing draft to prevent conflicts
        localStorage.removeItem('patient-form-draft');

        // Store prefill data in localStorage and navigate to form
        localStorage.setItem('demo-prefill-data', JSON.stringify(prefillData));

        // Dismiss loading toast - PatientForm will show success toast with details
        toast.dismiss(toastId);

        // Navigate to new patient form
        router.push('/patients/new');
      } else {
        // Database mode - just navigate to patients list
        // Clear draft when loading database-only scenarios too
        localStorage.removeItem('patient-form-draft');

        toast.success(`${patientsCreated} patient${patientsCreated === 1 ? '' : 's'} created`, {
          id: toastId,
          description: 'View the patients list to see the demo data',
        });

        // Navigate to patients list
        router.push('/patients');
        router.refresh();
      }
    } catch (error) {
      toast.error('Failed to load scenario', {
        id: toastId,
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setLoadingScenario(null);
    }
  };

  if (loading) {
    return (
      <Card className="p-12">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neutral-900 dark:border-white mx-auto"></div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading demo scenarios...</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-violet-50 dark:from-violet-950/50 dark:to-violet-900/30">
          <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Demo Scenarios</h2>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Load curated patient data to explore key features
          </p>
        </div>
      </div>

      {/* Scenarios Grid - Single row, smaller cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 max-w-7xl mx-auto">
        {scenarios.map((scenario, index) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="p-3 space-y-2 h-full flex flex-col hover:shadow-lg hover:border-violet-200 dark:hover:border-violet-800 transition-all group">
              {/* Icon and Title */}
              <div className="space-y-1.5">
                <div className="text-xl">{scenario.icon}</div>
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900 dark:text-white leading-tight">
                    {scenario.name}
                  </h3>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-500 mt-1 line-clamp-2 leading-snug">
                    {scenario.description}
                  </p>
                </div>
              </div>

              {/* Patient Count */}
              <div className="flex items-center gap-1 text-[10px] text-neutral-500 dark:text-neutral-500">
                <Users className="h-2.5 w-2.5" />
                <span>
                  {scenario.patientsCount} patient{scenario.patientsCount === 1 ? '' : 's'}
                </span>
              </div>

              {/* Load Button */}
              <div className="mt-auto pt-0.5">
                <Button
                  onClick={() => handleLoadScenario(scenario.id, scenario.name)}
                  disabled={loadingScenario !== null}
                  className="w-full text-[10px] h-7 group-hover:bg-violet-600 transition-colors"
                  variant={loadingScenario === scenario.id ? 'secondary' : 'default'}
                >
                  {loadingScenario === scenario.id ? (
                    <>
                      <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                      Loading...
                    </>
                  ) : (
                    'Load'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Info Note */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 p-3 max-w-4xl mx-auto">
        <p className="text-xs text-center text-amber-900 dark:text-amber-200">
          <span className="font-medium">Note:</span> Loading a scenario will clear existing demo
          data (patients with MRN starting with &quot;00&quot;). Your production data will not be affected.
        </p>
      </div>
    </div>
  );
}
