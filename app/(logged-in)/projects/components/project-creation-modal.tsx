'use client';

import { useUser } from '@clerk/nextjs';
import { ArrowRight, FolderPlus, Github, Loader2, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

import { RepositoryPreview } from '@/components/github/repository-preview';
import { RepositorySelector } from '@/components/github/repository-selector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useProjectCreation } from '@/hooks/use-project-creation';
import type { GitHubRepository, ProjectGitHubSettings } from '@/lib/types/github';
import type { CreateProjectData } from '@/lib/types/project';
import { isValidRepoName, toDashCase } from '@/lib/utils/string-helpers';

interface ProjectCreationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProjectName?: string;
  prompt?: string;
}

export default function ProjectCreationModal({
  open,
  onOpenChange,
  initialProjectName = '',
  prompt = '',
}: ProjectCreationModalProps) {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'create' | 'import'>('create');
  const [projectName, setProjectName] = useState(initialProjectName);
  const [projectPrompt, setProjectPrompt] = useState(prompt);

  // Create mode state
  const [githubSettings, setGithubSettings] = useState<ProjectGitHubSettings>({
    repositoryName: '',
    description: '',
    isPrivate: false,
    autoInit: true,
  });

  // Import mode state
  const [selectedRepository, setSelectedRepository] = useState<GitHubRepository>();

  const { currentStep, createProject, isCreating, resetCreation } = useProjectCreation();

  // Auto-generate repository name from project name (create mode)
  useEffect(() => {
    if (activeTab === 'create' && projectName) {
      const repoName = toDashCase(projectName);
      setGithubSettings(prev => ({ ...prev, repositoryName: repoName }));
    }
  }, [projectName, activeTab]);

  // Auto-set project name from repository name (import mode)
  useEffect(() => {
    if (activeTab === 'import' && selectedRepository) {
      setProjectName(selectedRepository.name);
    }
  }, [selectedRepository, activeTab]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      resetCreation();
      setProjectName(initialProjectName);
      setProjectPrompt(prompt);
      setSelectedRepository(undefined);
      setActiveTab('create');
    }
  }, [open, initialProjectName, prompt, resetCreation]);

  // Close modal on successful creation
  useEffect(() => {
    if (currentStep.step === 'complete') {
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    }
  }, [currentStep.step, onOpenChange]);

  const handleCreateProject = () => {
    if (!projectName.trim()) return;

    const createData: CreateProjectData = {
      name: projectName.trim(),
      prompt: projectPrompt || projectName.trim(),
      github: {
        type: activeTab,
        ...(activeTab === 'create'
          ? {
              repositoryName: githubSettings.repositoryName,
              description: githubSettings.description,
              isPrivate: githubSettings.isPrivate,
            }
          : {
              repositoryUrl: selectedRepository?.html_url,
            }),
      },
    };

    createProject(createData);
  };

  const canSubmit = () => {
    if (!projectName.trim()) return false;

    if (activeTab === 'create') {
      return isValidRepoName(githubSettings.repositoryName);
    } else {
      return !!selectedRepository;
    }
  };

  const getSubmitText = () => {
    if (isCreating) {
      if (currentStep.step === 'creating') {
        return activeTab === 'create' ? 'Creating Project...' : 'Importing Project...';
      }
    }
    return activeTab === 'create' ? 'Create Project' : 'Import Project';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden border border-border bg-card shadow-lg rounded-md"
        style={{ maxWidth: '512px' }}
      >
        <DialogTitle className="sr-only">
          {activeTab === 'create' ? 'Create New Project' : 'Import from GitHub'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {activeTab === 'create'
            ? 'Create a new project with a GitHub repository'
            : 'Import an existing GitHub repository as a project'}
        </DialogDescription>

        <div className="p-4">
          <div className="flex items-center space-x-3 mb-4">
            <FolderPlus className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">New Project</h3>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={value => setActiveTab(value as 'create' | 'import')}
            className="w-full"
          >
            <TabsList className="w-full mb-4">
              <TabsTrigger value="create" className="flex items-center gap-2 flex-1">
                <FolderPlus className="h-4 w-4" />
                <span>Create New</span>
              </TabsTrigger>
              <TabsTrigger value="import" className="flex items-center gap-2 flex-1">
                <Github className="h-4 w-4" />
                <span>Import from GitHub</span>
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {/* Project Name - Only for create tab */}
              {activeTab === 'create' && (
                <div className="space-y-2">
                  <Label htmlFor="projectName" className="text-sm font-medium">
                    Project Name
                  </Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={e => setProjectName(e.target.value)}
                    className="h-11"
                    placeholder="My awesome project"
                    disabled={isCreating}
                  />
                </div>
              )}

              <TabsContent value="create" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Settings className="h-4 w-4" />
                      GitHub Repository Settings
                    </CardTitle>
                    <CardDescription>
                      Configure the GitHub repository that will be created for your project.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="repoName" className="text-sm font-medium">
                        Repository Name
                      </Label>
                      <Input
                        id="repoName"
                        value={githubSettings.repositoryName}
                        onChange={e =>
                          setGithubSettings(prev => ({
                            ...prev,
                            repositoryName: e.target.value,
                          }))
                        }
                        className="h-10 font-mono text-sm"
                        placeholder="my-awesome-project"
                        disabled={isCreating}
                      />
                      <p className="text-xs text-muted-foreground">
                        Repository name will be used in the GitHub URL
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="repoDescription" className="text-sm font-medium">
                        Description (Optional)
                      </Label>
                      <Textarea
                        id="repoDescription"
                        value={githubSettings.description}
                        onChange={e =>
                          setGithubSettings(prev => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        className="min-h-[80px] resize-none"
                        placeholder="A brief description of your project..."
                        disabled={isCreating}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="private-repo"
                        checked={githubSettings.isPrivate}
                        onCheckedChange={checked =>
                          setGithubSettings(prev => ({
                            ...prev,
                            isPrivate: !!checked,
                          }))
                        }
                        disabled={isCreating}
                      />
                      <Label htmlFor="private-repo" className="text-sm">
                        Make repository private
                      </Label>
                    </div>
                  </CardContent>
                </Card>

                {projectName && githubSettings.repositoryName && (
                  <RepositoryPreview settings={githubSettings} mode="create" />
                )}
              </TabsContent>

              <TabsContent value="import" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Github className="h-4 w-4" />
                      Select Repository
                    </CardTitle>
                    <CardDescription>
                      Choose an existing GitHub repository to import into your project.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">GitHub Repository</Label>
                      <RepositorySelector
                        userId={user?.id || ''}
                        selectedRepository={selectedRepository}
                        onRepositorySelect={setSelectedRepository}
                        placeholder="Search and select a repository..."
                      />
                    </div>
                  </CardContent>
                </Card>

                {selectedRepository && (
                  <RepositoryPreview
                    settings={{
                      repositoryName: selectedRepository.name,
                      description: selectedRepository.description || '',
                      isPrivate: selectedRepository.private,
                      autoInit: false,
                    }}
                    mode="import"
                    repositoryUrl={selectedRepository.html_url}
                  />
                )}
              </TabsContent>

              {/* Actions */}
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
                  onClick={handleCreateProject}
                  disabled={!canSubmit() || isCreating}
                  className="h-10 space-x-2 min-w-[140px]"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{getSubmitText()}</span>
                    </>
                  ) : (
                    <>
                      <span>{getSubmitText()}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
