'use client';

import { cn } from '@/lib/utils';
import { Check, EyeIcon, FileIcon, FolderIcon, FolderMinusIcon, FolderPlusIcon, Loader2, PencilIcon, Search } from 'lucide-react';
import { useEffect } from 'react';

// Import types
import type { Action, AssistantActionsCardProps } from '@/lib/types';

export default function AssistantActionsCard({
  operations = [],
  className
}: AssistantActionsCardProps) {
  // Filter out operations with empty paths - these are summary operations, not actual file operations
  const validOperations = operations.filter(op => op.path.trim() !== '');

  // Enhanced logging
  useEffect(() => {
    console.log('🎯 [AssistantActionsCard] Received operations prop:', operations);
    console.log('🎯 [AssistantActionsCard] Raw operations count:', operations.length);
    console.log('🎯 [AssistantActionsCard] Valid operations (after filtering):', validOperations);
    console.log('🎯 [AssistantActionsCard] Valid operations count:', validOperations.length);

    if (operations.length > 0) {
      operations.forEach((op, index) => {
        console.log(`🎯 [AssistantActionsCard] Raw operation ${index + 1}:`, {
          type: op.type,
          path: op.path,
          timestamp: op.timestamp,
          status: op.status,
          messageId: op.messageId,
          pathTrimmed: op.path.trim(),
          pathLength: op.path.length,
          pathEmpty: op.path.trim() === ''
        });
      });
    }

    if (validOperations.length > 0) {
      const types = validOperations.map(op => op.type);
      const typeCounts = {
        create: types.filter(t => t === 'create').length,
        edit: types.filter(t => t === 'edit').length,
        delete: types.filter(t => t === 'delete').length,
        read: types.filter(t => t === 'read').length,
        search: types.filter(t => t === 'search').length,
        createDir: types.filter(t => t === 'createDir').length,
        removeDir: types.filter(t => t === 'removeDir').length,
      };
      console.log('🎯 [AssistantActionsCard] Operation type counts:', typeCounts);

      if (operations.length !== validOperations.length) {
        console.log(`🎯 [AssistantActionsCard] Filtered out ${operations.length - validOperations.length} operations with empty paths`);
      }
    } else {
      console.log('🎯 [AssistantActionsCard] No valid operations to display');
    }
  }, [operations, validOperations]);

  // Group operations by file path to avoid duplicates
  const uniqueOperations = validOperations.reduce<Record<string, Action>>((acc, operation) => {
    try {
      // If we already have this file operation and it's more recent, replace it
      if (!acc[operation.path] ||
          new Date(operation.timestamp) > new Date(acc[operation.path].timestamp)) {
        acc[operation.path] = operation;
      }
      return acc;
    } catch (err) {
      console.error('[COMPONENT] Error processing operation:', operation, err);
      return acc;
    }
  }, {});

  // Convert back to array and sort by time (newest first)
  const sortedOperations = Object.values(uniqueOperations)
    .sort((a, b) => {
      try {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } catch (err) {
        console.error('[COMPONENT] Error sorting operations:', a, b, err);
        return 0;
      }
    });

  const totalCount = sortedOperations.length;
  console.log('[COMPONENT] Total deduplicated operations:', totalCount);

  if (totalCount === 0) {
    console.log('[COMPONENT] No operations to show, returning null');
    return null;
  }

  return (
    <div className={cn("w-full mt-3 space-y-1 rounded-md", className)}>
      <div className="max-h-[210px] overflow-y-auto space-y-1">
        {sortedOperations.map((op, index) => (
          <div
            key={`${op.path}-${index}`}
            className={cn(
              "bg-muted/30 border border-border/50 rounded-md p-2.5 transition-all duration-200",
              op.status === 'pending' && "bg-blue-50/50 border-blue-200/50 dark:bg-blue-950/20 dark:border-blue-800/30",
              op.status === 'completed' && "bg-green-50/50 border-green-200/50 dark:bg-green-950/20 dark:border-green-800/30",
              op.status === 'error' && "bg-red-50/50 border-red-200/50 dark:bg-red-950/20 dark:border-red-800/30"
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate max-w-[75%]">
                <div className="flex-shrink-0">
                  {op.status === 'pending' ? (
                    <div className="relative">
                      <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                    </div>
                  ) : op.status === 'error' ? (
                    <div className="h-3.5 w-3.5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">✗</span>
                    </div>
                  ) : op.status === 'completed' ? (
                    <div className="h-3.5 w-3.5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-2 w-2 text-white" />
                    </div>
                  ) : op.type === 'search' ? (
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : op.type === 'createDir' || op.type === 'operation_start' ? (
                    <FolderPlusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : op.type === 'removeDir' ? (
                    <FolderMinusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : op.type === 'create' && op.path.indexOf('.') === -1 ? (
                    <FolderIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : op.type === 'read' ? (
                    <EyeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : op.type === 'edit' || op.type === 'operation_complete' ? (
                    <PencilIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : (
                    <FileIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                <div className="truncate">
                  <div className="font-medium text-foreground truncate">
                    {op.path.split('/').pop() || op.path}
                  </div>
                  {op.path.includes('/') && (
                    <div className="text-[10px] text-muted-foreground/80 truncate">
                      {op.path.split('/').slice(0, -1).join('/')}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 ml-2 text-right">
                <div className={cn(
                  "text-[10px] font-medium",
                  op.status === 'pending' && "text-blue-600 dark:text-blue-400",
                  op.status === 'completed' && "text-green-600 dark:text-green-400",
                  op.status === 'error' && "text-red-600 dark:text-red-400",
                  !op.status && "text-muted-foreground"
                )}>
                  {op.status === 'pending' ? 'In Progress' :
                   op.status === 'completed' ? 'Completed' :
                   op.status === 'error' ? 'Failed' :
                   op.type === 'createDir' ? 'Created Dir' :
                   op.type === 'removeDir' ? 'Removed Dir' :
                   op.type === 'create' && op.path.indexOf('.') === -1 ? 'Created Dir' :
                   op.type === 'create' ? 'Generated' :
                   op.type === 'edit' ? 'Edited' :
                   op.type === 'delete' ? 'Deleted' :
                   op.type === 'read' ? 'Read' :
                   op.type === 'search' ? 'Searched' : 'Unknown'}
                </div>
              </div>
            </div>

            {/* Progress bar for pending operations */}
            {op.status === 'pending' && (
              <div className="mt-2 w-full bg-muted-foreground/20 rounded-full h-1">
                <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
