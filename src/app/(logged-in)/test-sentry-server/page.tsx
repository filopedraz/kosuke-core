import { Button } from '@/components/ui/button';
import * as Sentry from '@sentry/nextjs';

async function triggerServerError() {
  'use server';
  try {
    throw new Error('🧪 Test Sentry error from server action - check Slack notification');
  } catch (error) {
    // Manually capture for server actions
    Sentry.captureException(error);
    await Sentry.flush(2000);
    throw error;
  }
}

export default function TestServerSentryPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 border rounded-lg">
        <h1 className="text-2xl font-bold mb-4">Test Server Sentry</h1>
        <form action={triggerServerError}>
          <Button type="submit" className="w-full">
            Trigger Server Error
          </Button>
        </form>
        <p className="text-xs text-gray-600 mt-4">
          This will throw an error on the server. Check Sentry dashboard and Slack for the event.
        </p>
      </div>
    </div>
  );
}
