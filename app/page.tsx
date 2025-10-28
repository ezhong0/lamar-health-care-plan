'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { DemoScenarioSelector } from '@/components/DemoScenarioSelector';

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-14rem)]">
      {/* Hero Section with gradient background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-blue-50 dark:from-violet-950/20 dark:via-neutral-950 dark:to-blue-950/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.1),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.05),transparent_50%)]" />

        <motion.div
          className="relative max-w-4xl mx-auto text-center space-y-8 py-20 px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-violet-900 to-neutral-900 dark:from-white dark:via-violet-200 dark:to-white">
              AI-Powered Care Plan Generation
            </h1>
            <p className="text-xl text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto leading-relaxed">
              Streamline your workflow with intelligent pharmacist care plans. Generate
              comprehensive, validated care plans in minutes, not hours.
            </p>
          </div>

          <motion.div
            className="flex flex-wrap gap-3 justify-center items-center pt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Link href="/patients/new">
              <Button size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                Create New Patient
              </Button>
            </Link>
            <Link href="/patients">
              <Button size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                View Patients
              </Button>
            </Link>
            <Link href="/orders">
              <Button size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                View Orders
              </Button>
            </Link>
            <Link href="/providers">
              <Button size="lg" variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
                View Providers
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Demo Scenarios Section */}
      <motion.div
        className="max-w-7xl mx-auto px-4 py-16"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <DemoScenarioSelector />
      </motion.div>
    </div>
  );
}
