'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface ProductionSettingsProps {
  projectId: number;
}

export function ProductionSettings({ projectId }: ProductionSettingsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium">Production</h3>
        <p className="text-muted-foreground mt-2">
          Production deployment guidelines and best practices
        </p>
      </div>

      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Don't use review apps in production. Follow the instructions below in this documentation for a production deployment:{' '}
          <a 
            href="https://github.com/filopedraz/kosuke-template#-deployment--production"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:no-underline inline-flex items-center gap-1"
          >
            https://github.com/filopedraz/kosuke-template#-deployment--production
            <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
}