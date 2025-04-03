'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from './confirmation-dialog';

export function CancelSubscriptionButton() {
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowConfirmation(true)}>
        Cancel Subscription
      </Button>

      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your subscription? You will lose access to premium features immediately."
        actionLabel="Yes, Cancel Subscription"
        actionUrl="/api/subscription/cancel"
        variant="destructive"
      />
    </>
  );
}
