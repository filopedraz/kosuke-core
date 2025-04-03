'use client';

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  variant?: 'default' | 'destructive';
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  actionLabel,
  actionUrl,
  variant = 'default',
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleAction = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(actionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // If response is a redirect, follow it
        const responseData = await response.json().catch(() => null);
        if (response.redirected) {
          router.push(response.url);
        } else if (responseData?.url) {
          window.location.href = responseData.url;
        } else {
          // Just refresh the page if no specific redirect
          router.refresh();
        }
      } else {
        console.error('Failed to complete action:', await response.text());
      }
    } catch (error) {
      console.error('Error during action:', error);
    } finally {
      setIsLoading(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle
              className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : 'text-warning'}`}
            />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={handleAction}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : actionLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
