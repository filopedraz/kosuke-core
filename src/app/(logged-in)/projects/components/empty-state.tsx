'use client';

import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateClick: () => void;
}

export default function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl tracking-tight">No projects yet</h2>
          <p className="text-muted-foreground">
            You haven&apos;t created any projects yet. Start by creating your first project.
          </p>
        </div>

        <Button 
          onClick={onCreateClick}
          size="lg"
          className="font-medium"
        >
          Create Your First Project
        </Button>
      </div>
    </div>
  );
}
