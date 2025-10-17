'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChatSession } from '@/lib/types';

interface RenameSessionDialogProps {
  session: ChatSession | null;
  onOpenChange: (open: boolean) => void;
  onRename: (session: ChatSession, title: string) => void | Promise<void>;
}

export function RenameSessionDialog({ session, onOpenChange, onRename }: RenameSessionDialogProps) {
  return (
    <Dialog open={!!session} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Chat Session</DialogTitle>
        </DialogHeader>
        {session && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                defaultValue={session.title}
                onBlur={(e) => {
                  if (e.target.value !== session.title) {
                    onRename(session, e.target.value);
                  }
                }}
                placeholder="Enter chat session title"
                maxLength={100}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


