'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DemoScenarioSelector } from '@/components/DemoScenarioSelector';

export default function Home() {
  return (
    <div className="py-12 px-4">
      {/* Hero Section */}
      <motion.div
        className="max-w-2xl mx-auto text-center space-y-6 mb-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
          AI-Powered Care Plan Generation
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Streamline your workflow with intelligent pharmacist care plans. Generate
          comprehensive, validated care plans in minutes, not hours.
        </p>
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Link href="/patients/new">
            <Button size="lg" className="w-full sm:w-auto">
              Create New Patient
            </Button>
          </Link>
          <Link href="/patients">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              View Patients
            </Button>
          </Link>
          <Link href="/orders">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              View Orders
            </Button>
          </Link>
          <Link href="/providers">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              View Providers
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Demo Scenarios Section */}
      <motion.div
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <DemoScenarioSelector />
      </motion.div>
    </div>
  );
}
