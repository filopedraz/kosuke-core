'use client';

import { motion } from 'framer-motion';
import { Loader2, ArrowUp, Paperclip, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import ProjectCreationModal from '@/app/(logged-in)/projects/components/ProjectCreationModal';

// Example prompt suggestions
const PROMPT_SUGGESTIONS = [
  'A personal blog with dark mode and newsletter signup',
  'An e-commerce site for handmade jewelry',
  'A portfolio website for a photographer',
  'A recipe sharing platform with user ratings',
];

interface ChatInputProps {
  onSendMessage?: (
    content: string,
    options?: { includeContext?: boolean; contextFiles?: string[]; imageFile?: File }
  ) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export default function ChatInput({
  onSendMessage,
  isLoading: externalIsLoading,
  placeholder = 'Describe what you want to build...',
  className,
}: ChatInputProps) {
  const [prompt, setPrompt] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showImageTooltip, setShowImageTooltip] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  // Toggle image tooltip on hover
  const handlePaperclipHover = () => {
    setShowImageTooltip(true);
  };

  const handlePaperclipLeave = () => {
    setShowImageTooltip(false);
  };

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Set a much higher minimum height
    const minHeight = 160;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(Math.max(textarea.scrollHeight, minHeight), 300)}px`;
  }, [prompt]);

  // Check if user is authenticated
  useEffect(() => {
    // Only check auth if we don't have an external send handler
    if (onSendMessage) return;

    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        console.error('Error checking authentication:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [onSendMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!prompt.trim()) return;

    // If we have an external send handler, use that
    if (onSendMessage) {
      await onSendMessage(prompt);
      setPrompt('');
      return;
    }

    // Default project creation flow
    if (!isAuthenticated) {
      // Redirect to sign-in page instead of showing modal
      router.push('/sign-in');
    } else {
      setShowProjectModal(true);
      // Default project name from prompt
      setProjectName(prompt.split(' ').slice(0, 3).join(' '));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  // Determine if loading based on either external or internal state
  const isLoadingState = externalIsLoading !== undefined ? externalIsLoading : false;

  return (
    <>
      <form onSubmit={handleSubmit} className={cn('w-full', className)}>
        <motion.div
          className="flex flex-col space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <motion.div
            className="relative rounded-lg border border-border bg-background"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Textarea
              ref={textareaRef}
              className="min-h-[160px] w-full resize-none rounded-lg border-0 bg-transparent px-4 py-4 text-md focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
              placeholder={placeholder}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoadingState}
              rows={6}
              data-gramm="false"
              data-gramm_editor="false"
              data-enable-grammarly="false"
            />
            <motion.div
              className="absolute bottom-4 right-4 flex space-x-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <div className="relative">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-10 w-10 rounded-md"
                  disabled={isLoadingState}
                  onMouseEnter={handlePaperclipHover}
                  onMouseLeave={handlePaperclipLeave}
                >
                  <Paperclip className="h-5 w-5" />
                  <span className="sr-only">Attach file</span>
                </Button>

                {showImageTooltip && (
                  <div className="absolute bottom-full mb-2 right-0 p-2 bg-popover text-popover-foreground rounded-md shadow-md text-xs w-48 border border-border">
                    <div className="flex items-start gap-1.5">
                      <Info className="h-3 w-3 mt-0.5 text-muted-foreground" />
                      <span>
                        Image uploads are only available within projects. Create a project first.
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Button
                  type="submit"
                  size="icon"
                  variant={!prompt.trim() ? 'outline' : 'default'}
                  className="h-10 w-10 rounded-md"
                  disabled={isLoadingState || !prompt.trim()}
                >
                  {isLoadingState ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowUp className="h-5 w-5" />
                  )}
                  <span className="sr-only">Create project</span>
                </Button>
              </div>
            </motion.div>
          </motion.div>

          {/* Prompt suggestions - Only show for home page usage */}
          {!onSendMessage && (
            <motion.div
              className="flex flex-wrap gap-2 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              {PROMPT_SUGGESTIONS.map((suggestion, _index) => (
                <motion.div
                  key={_index}
                  className="cursor-pointer px-3 py-1.5 rounded-md text-sm border border-border bg-background"
                  onClick={() => handleSuggestionClick(suggestion)}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.7 + _index * 0.1 }}
                >
                  {suggestion}
                </motion.div>
              ))}
            </motion.div>
          )}
        </motion.div>
      </form>

      {/* Project Creation Modal */}
      <ProjectCreationModal
        open={showProjectModal}
        onOpenChange={setShowProjectModal}
        initialProjectName={projectName}
        prompt={prompt}
      />
    </>
  );
}
