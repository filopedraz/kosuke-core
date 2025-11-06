'use client';

import { Github, Globe, Lock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProjectGitHubSettings } from '@/lib/types/github';

interface RepositoryPreviewProps {
  settings: ProjectGitHubSettings;
  mode: 'create' | 'import';
  repositoryUrl?: string;
}

export function RepositoryPreview({ settings, mode, repositoryUrl }: RepositoryPreviewProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Github className="h-4 w-4" />
          {mode === 'create' ? 'New Repository' : 'Import Repository'}
        </CardTitle>
        <CardDescription>
          {mode === 'create'
            ? 'A new GitHub repository will be created with these settings'
            : 'This repository will be imported to your project'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{settings.repositoryName}</span>
              {mode === 'create' && (
                <span className="text-xs text-muted-foreground">(auto-generated)</span>
              )}
              {mode === 'create' ? (
                <Badge variant="secondary" className="text-xs">
                  <Lock className="h-3 w-3 mr-1" />
                  Private
                </Badge>
              ) : (
                <Badge variant={settings.isPrivate ? 'secondary' : 'outline'} className="text-xs">
                  {settings.isPrivate ? (
                    <>
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </>
                  ) : (
                    <>
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </>
                  )}
                </Badge>
              )}
            </div>
            {settings.description && (
              <p className="text-sm text-muted-foreground">{settings.description}</p>
            )}
          </div>
        </div>

        {mode === 'import' && repositoryUrl && (
          <div className="pt-2 border-t">
            <a
              href={repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline hover:text-primary/80"
            >
              View on GitHub →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


