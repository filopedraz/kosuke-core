'use client';

import { Button } from '@/components/ui/button';

export default function TestSentryPage() {
  const handleTestSentry = () => {
    throw new Error('🧪 Test Sentry error from UI - check Slack notification');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 border rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Test Sentry</h1>
        <Button onClick={handleTestSentry} className="w-full">
          Trigger Test Error
        </Button>
        <p className="text-xs text-gray-600 mt-4">
          This will throw an error and Sentry should catch it. Check Sentry dashboard and Slack for
          the event.
        </p>
      </div>
    </div>
  );
}
