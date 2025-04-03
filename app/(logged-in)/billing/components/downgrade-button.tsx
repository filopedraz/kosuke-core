'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from './confirmation-dialog';

interface DowngradeButtonProps {
  className?: string;
}

export function DowngradeButton({ className }: DowngradeButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);

  return (
    <>
      <Button variant="outline" className={className} onClick={() => setShowConfirmation(true)}>
        Downgrade
      </Button>

      <ConfirmationDialog
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title="Downgrade to Free Plan"
        description="Are you sure you want to downgrade to the free plan? You will lose access to premium features immediately."
        actionLabel="Yes, Downgrade"
        actionUrl="/api/subscription/downgrade"
        variant="destructive"
      />
    </>
  );
}
