'use client';

import { ChevronDown, ChevronRight, File } from 'lucide-react';
import { useState } from 'react';

import { ScrollArea } from '@/components/ui/scroll-area';
import { CONTEXT } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

interface FileTreeProps {
  files: FileNode[];
  onSelectFile: (path: string) => void;
  selectedFile?: string;
  className?: string;
}

export default function FileTree({
  files,
  onSelectFile,
  selectedFile,
  className,
}: FileTreeProps) {
  // Filter files and directories that should be excluded based on CONTEXT.EXCLUDE_DIRS
  const filteredFiles = files.filter(file => {
    // Skip directories that are in the exclude list
    if (file.type === 'directory' && CONTEXT.EXCLUDE_DIRS.includes(file.name)) {
      return false;
    }
    return true;
  });

  return (
    <ScrollArea className={cn('h-full w-full', className)}>
      <div className="p-2">
        {filteredFiles.map((file) => (
          <FileTreeNode
            key={file.path}
            file={file}
            depth={0}
            onSelectFile={onSelectFile}
            selectedFile={selectedFile}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

interface FileTreeNodeProps {
  file: FileNode;
  depth: number;
  onSelectFile: (path: string) => void;
  selectedFile?: string;
}

function FileTreeNode({
  file,
  depth,
  onSelectFile,
  selectedFile,
}: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 1);
  const isSelected = selectedFile === file.path;
  const isDirectory = file.type === 'directory';
  
  const toggleExpand = () => {
    if (isDirectory) {
      setIsExpanded(!isExpanded);
    }
  };
  
  const handleClick = () => {
    if (isDirectory) {
      toggleExpand();
    } else {
      onSelectFile(file.path);
    }
  };

  // Filter out any children that should be excluded
  const filteredChildren = isDirectory && file.children 
    ? file.children.filter(child => {
        if (child.type === 'directory' && CONTEXT.EXCLUDE_DIRS.includes(child.name)) {
          return false;
        }
        return true;
      })
    : [];
  
  return (
    <div>
      <div
        className={cn(
          'flex items-center py-1 px-2 text-sm rounded-md cursor-pointer hover:bg-muted/50',
          isSelected && 'bg-muted text-primary',
          `pl-${depth * 4 + 2}`
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            className="mr-1 p-0.5"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span className="mr-1 w-5 flex justify-center">
            <File className="h-4 w-4 text-muted-foreground" />
          </span>
        )}
        
        <span className="truncate">{file.name}</span>
      </div>
      
      {isDirectory && isExpanded && filteredChildren.length > 0 && (
        <div>
          {filteredChildren.map((child) => (
            <FileTreeNode
              key={child.path}
              file={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  );
} 