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
        console.error('Error fetching scenarios:', error);
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
        // Store prefill data in localStorage and navigate to form
        localStorage.setItem('demo-prefill-data', JSON.stringify(prefillData));

        toast.success('Demo scenario ready!', {
          id: toastId,
          description: patientsCreated > 0
            ? `${patientsCreated} patient${patientsCreated === 1 ? '' : 's'} loaded. Form pre-filled - ready to submit!`
            : 'Form pre-filled with demo data - ready to submit!',
        });

        // Navigate to new patient form
        router.push('/patients/new');
      } else {
        // Database mode - just navigate to patients list
        toast.success('Demo scenario loaded!', {
          id: toastId,
          description: `${patientsCreated} patient${patientsCreated === 1 ? '' : 's'} created successfully.`,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/50">
          <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Demo Scenarios</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Load curated patient data to explore key features
          </p>
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenarios.map((scenario, index) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="p-6 space-y-4 h-full flex flex-col hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors">
              {/* Icon and Title */}
              <div className="space-y-3">
                <div className="text-3xl">{scenario.icon}</div>
                <div>
                  <h3 className="font-semibold text-neutral-900 dark:text-white">
                    {scenario.name}
                  </h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                    {scenario.description}
                  </p>
                </div>
              </div>

              {/* Patient Count */}
              <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-500">
                <Users className="h-4 w-4" />
                <span>
                  {scenario.patientsCount} patient{scenario.patientsCount === 1 ? '' : 's'}
                </span>
              </div>

              {/* Load Button */}
              <div className="mt-auto pt-2">
                <Button
                  onClick={() => handleLoadScenario(scenario.id, scenario.name)}
                  disabled={loadingScenario !== null}
                  className="w-full"
                  variant={loadingScenario === scenario.id ? 'secondary' : 'default'}
                >
                  {loadingScenario === scenario.id ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Loading...
                    </>
                  ) : (
                    'Load Scenario'
                  )}
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Info Note */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-4">
        <p className="text-sm text-amber-900 dark:text-amber-200">
          <span className="font-medium">Note:</span> Loading a scenario will clear existing demo
          data (patients with MRN starting with &quot;00&quot;). Your production data will not be affected.
        </p>
      </div>
    </div>
  );
}
