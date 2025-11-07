'use client';

import { Check, ChevronDown, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useGitHubRepositories } from '@/hooks/use-github-repositories';
import type { GitHubRepository } from '@/lib/types/github';

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
  placeholder = 'Search and select a repository...',
}: RepositorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [triggerWidth, setTriggerWidth] = useState<number | undefined>(undefined);
  const triggerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { repositories, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useGitHubRepositories(userId, open, search);

  useEffect(() => {
    if (triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  // Auto-load more on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollBottom = target.scrollHeight - target.scrollTop;
    const isNearBottom = scrollBottom <= target.clientHeight + 100;

    if (isNearBottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div
          ref={triggerRef}
          className="relative w-full h-11 border border-input rounded-md bg-background hover:bg-accent hover:text-accent-foreground"
          tabIndex={-1}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder={selectedRepository ? selectedRepository.full_name : placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(true);
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
            }}
            className="w-full h-full px-3 pr-10 bg-transparent outline-none text-sm cursor-text relative z-10"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            {selectedRepository?.private && !search && (
              <Lock className="h-3 w-3 text-muted-foreground" />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 overflow-hidden"
        style={{ width: triggerWidth || '100%', maxHeight: 'none', pointerEvents: 'auto' }}
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={false}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
        onPointerDownOutside={(e) => {
          // Allow interaction with the popover content
          if (scrollRef.current?.contains(e.target as Node)) {
            e.preventDefault();
          }
        }}
      >
        {/* Repository List with Auto-load */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onWheel={(e) => e.stopPropagation()}
          className="overflow-y-scroll overflow-x-hidden"
          style={{ maxHeight: '280px', minHeight: '100px', pointerEvents: 'auto', touchAction: 'auto' }}
        >
            {isLoading && (
              <div className="p-6 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
              </div>
            )}

            {!isLoading && repositories.length === 0 && (
              <div className="p-4 text-sm text-center text-muted-foreground">
                {search ? `No repositories found matching "${search}"` : 'No repositories found.'}
              </div>
            )}

            {!isLoading && repositories.map(repo => (
              <button
                key={repo.id}
                onClick={() => {
                  onRepositorySelect(repo);
                  setSearch('');
                  setOpen(false);
                }}
                className="w-full p-3 text-left hover:bg-accent transition-colors flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium truncate text-sm">{repo.full_name}</span>
                  {repo.private && <Lock className="h-3 w-3 text-muted-foreground" />}
                </div>
                {selectedRepository?.id === repo.id && (
                  <Check className="h-4 w-4 shrink-0 text-primary" />
                )}
              </button>
            ))}

            {/* Loading indicator */}
            {!isLoading && isFetchingNextPage && (
              <div className="p-3 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              </div>
            )}

            {/* End of list indicator */}
            {!isLoading && !hasNextPage && repositories.length > 0 && (
              <div className="p-2 text-center text-xs text-muted-foreground border-t">
                All {repositories.length} repositories loaded
              </div>
            )}
          </div>
      </PopoverContent>
    </Popover>
  );
}



