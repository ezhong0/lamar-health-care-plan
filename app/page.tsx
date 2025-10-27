import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-3.5rem)] px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white sm:text-5xl">
          AI-Powered Care Plan Generation
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Streamline your workflow with intelligent pharmacist care plans. Generate
          comprehensive, validated care plans in minutes, not hours.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link href="/patients/new">
            <Button size="lg" className="w-full sm:w-auto">
              Create New Patient
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
