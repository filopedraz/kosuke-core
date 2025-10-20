'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Sparkles } from 'lucide-react';

interface PrivateAlphaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivateAlphaModal({ open, onOpenChange }: PrivateAlphaModalProps) {
  const handleSurveyClick = () => {
    window.open(
      'https://cooperative-somersault-9ef.notion.site/25aca60065ee80388e90dc22815b1713?pvs=105',
      '_blank'
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden border border-border bg-card shadow-lg rounded-md"
        style={{ maxWidth: '512px' }}
      >
        <DialogTitle className="sr-only">Get Early Access to Kosuke Private Alpha</DialogTitle>
        <DialogDescription className="sr-only">
          Complete the survey to get early access to Kosuke Private Alpha
        </DialogDescription>

        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Get Early Access</h3>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete the Survey and Get Early Access to Kosuke Private Alpha.
            </p>

            <div className="flex justify-end items-center gap-3 pt-3">
              <Button onClick={handleSurveyClick}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Survey
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
