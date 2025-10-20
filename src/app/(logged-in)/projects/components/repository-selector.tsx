'use client';

import { Check, ChevronDown, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { useGitHubRepositories } from '@/hooks/use-github-repositories';
import type { GitHubRepository } from '@/lib/types/github';
import { cn } from '@/lib/utils';

interface RepositorySelectorProps {
  userId: string;
  selectedRepository?: GitHubRepository;
  onRepositorySelect: (repository: GitHubRepository) => void;
  placeholder?: string;
}

export function RepositorySelector({
  userId,
  selectedRepository,
  onRepositorySelect,
  placeholder = 'Select a repository...',
}: RepositorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { data: repositories, isLoading } = useGitHubRepositories(userId);

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  if (isLoading) {
    return <RepositorySelectorSkeleton />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-11"
        >
          {selectedRepository ? (
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{selectedRepository.name}</span>
              {selectedRepository.private && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-0 p-0" style={{ width: triggerWidth }}>
        <Command>
          <CommandInput placeholder="Search repositories..." />
          <CommandList>
            <CommandEmpty>No repositories found.</CommandEmpty>
            <CommandGroup>
              {repositories?.map(repo => (
                <CommandItem
                  key={repo.id}
                  value={repo.name}
                  onSelect={() => {
                    onRepositorySelect(repo);
                    setOpen(false);
                  }}
                  className="p-2"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-medium truncate">{repo.name}</span>
                      {repo.private && <Lock className="h-3 w-3 text-muted-foreground ml-1" />}
                    </div>
                    <Check
                      className={cn(
                        'ml-2 h-4 w-4 shrink-0',
                        selectedRepository?.id === repo.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function RepositorySelectorSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-11 w-full" />
      <div className="text-xs text-muted-foreground">Loading your repositories...</div>
    </div>
  );
}


