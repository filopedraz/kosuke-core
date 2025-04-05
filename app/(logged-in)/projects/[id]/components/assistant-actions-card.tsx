'use client';

import { useEffect } from 'react';
import { Loader2, FileIcon, Check, Search, FolderIcon, FolderPlusIcon, FolderMinusIcon, EyeIcon, PencilIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface Action {
  path: string;
  type: 'create' | 'update' | 'delete' | 'edit' | 'read' | 'search' | 'createDir' | 'removeDir';
  timestamp: Date;
  status: 'pending' | 'completed' | 'error';
  messageId?: number;
  language?: string;
  content?: string;
}

interface AssistantActionsCardProps {
  operations: Action[];
  className?: string;
}

export default function AssistantActionsCard({ 
  operations = [],
  className 
}: AssistantActionsCardProps) {
  // Filter out operations with empty paths - these are summary operations, not actual file operations
  const validOperations = operations.filter(op => op.path.trim() !== '');
  
  // Enhanced logging
  useEffect(() => {
    console.log('[COMPONENT] AssistantActionsCard rendered with operations:', validOperations);
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
      console.log('[COMPONENT] Operation type counts:', typeCounts);
      
      if (operations.length !== validOperations.length) {
        console.log(`[COMPONENT] Filtered out ${operations.length - validOperations.length} operations with empty paths`);
      }
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
      <div className="max-h-[210px] overflow-y-auto">
        {sortedOperations.map((op, index) => (
          <Card 
            key={`${op.path}-${index}`} 
            className="bg-muted/50 border-muted-foreground/50 mb-1"
          >
            <CardContent className="p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 truncate max-w-[70%]">
                {op.status === 'pending' ? (
                  <Loader2 className="h-3.5 w-3.5 text-foreground animate-spin flex-shrink-0" />
                ) : op.status === 'error' ? (
                  <FileIcon className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                ) : op.type === 'search' ? (
                  <Search className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                ) : op.type === 'createDir' ? (
                  <FolderPlusIcon className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                ) : op.type === 'removeDir' ? (
                  <FolderMinusIcon className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                ) : op.type === 'create' && op.path.indexOf('.') === -1 ? (
                  <FolderIcon className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                ) : op.type === 'read' ? (
                  <EyeIcon className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                ) : op.type === 'edit' ? (
                  <PencilIcon className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                ) : (
                  <Check className="h-3.5 w-3.5 text-foreground flex-shrink-0" />
                )}
                <span className="truncate text-foreground">{op.path}</span>
              </div>
              <div className="text-muted-foreground text-xs flex-shrink-0">
                {op.type === 'createDir' ? 'Created Directory' :
                  op.type === 'removeDir' ? 'Removed Directory' :
                  op.type === 'create' && op.path.indexOf('.') === -1 ? 'Created Directory' : 
                  op.type === 'create' ? 'Generated' : 
                  op.type === 'edit' ? 'Edited' : 
                  op.type === 'delete' ? 'Deleted' :
                  op.type === 'read' ? 'Read' :
                  op.type === 'search' ? 'Searched' : 'Unknown Action'}
                {op.status === 'pending' && <span className="ml-1 opacity-70">(in progress)</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
} 