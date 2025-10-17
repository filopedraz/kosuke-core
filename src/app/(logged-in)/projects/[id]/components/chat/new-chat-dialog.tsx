'use client';

import { MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  setTitle: (value: string) => void;
  isCreating: boolean;
  onCreate: () => void | Promise<void>;
}

export function NewChatDialog({
  open,
  onOpenChange,
  title,
  setTitle,
  isCreating,
  onCreate,
}: NewChatDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden border border-border bg-card shadow-lg rounded-md"
        style={{ maxWidth: '512px' }}
      >
        <DialogTitle className="sr-only">Create New Chat Session</DialogTitle>
        <DialogDescription className="sr-only">
          Create a new chat session for this project
        </DialogDescription>

        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <MessageCircle className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">New Chat Session</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && title.trim() && !isCreating) {
                    onCreate();
                  }
                }}
                className="h-11"
                placeholder="Enter chat session title"
                maxLength={100}
                disabled={isCreating}
              />
            </div>

            <div className="flex justify-end items-center gap-3 pt-3">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isCreating}
                className="h-10"
              >
                Cancel
              </Button>
              <Button
                onClick={onCreate}
                disabled={!title.trim() || isCreating}
                className="h-10 min-w-[120px]"
              >
                {isCreating ? 'Creating...' : 'Create Chat'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


