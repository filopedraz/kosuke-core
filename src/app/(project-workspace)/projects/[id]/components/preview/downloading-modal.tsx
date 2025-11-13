'use client';

import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DownloadingModalProps {
  open: boolean;
}

export default function DownloadingModal({ open }: DownloadingModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Preparing Download</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-6 gap-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            We&apos;re zipping your project files. This may take a moment...
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
} 