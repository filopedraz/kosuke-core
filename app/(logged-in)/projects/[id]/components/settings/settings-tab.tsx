'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Key, GitBranch } from 'lucide-react';
import { EnvironmentVariables } from './environment-variables';
import DefaultBranchSettings from './default-branch-settings';

interface SettingsTabProps {
  projectId: number;
}

export function SettingsTab({ projectId }: SettingsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Project Settings
          </CardTitle>
          <CardDescription>
            Configure environment variables, default branch, and other project settings
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="environment" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="environment" className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Environment Variables
          </TabsTrigger>
          <TabsTrigger value="branch" className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Default Branch
          </TabsTrigger>
        </TabsList>

        <TabsContent value="environment" className="mt-6">
          <EnvironmentVariables projectId={projectId} />
        </TabsContent>

        <TabsContent value="branch" className="mt-6">
          <DefaultBranchSettings projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}