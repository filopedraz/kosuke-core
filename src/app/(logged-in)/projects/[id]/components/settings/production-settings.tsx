'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

export function ProductionSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-medium">Production</h3>
        <p className="text-muted-foreground mt-2">
          Production deployment guidelines and best practices
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Do not use review apps in production. See the production deployment guide at: {' '}
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <a
              href="https://github.com/Kosuke-Org/kosuke-template#-deployment--production"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
            https://github.com/Kosuke-Org/kosuke-template#-deployment--production
            </a>
          </span>
        </AlertDescription>
      </Alert>
    </div>
  );
}
