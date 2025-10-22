'use client';

import { ArrowUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function ChatPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to sign-up when user tries to send a message
    router.push('/sign-up');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4 py-12">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 to-muted/20" />

      {/* Content container */}
      <div className="w-full max-w-3xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            What do you want to create?
          </h1>
          <p className="text-lg text-muted-foreground">
            Start building with a single prompt. No coding needed.
          </p>
        </div>

        {/* Chat input */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="relative group">
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Kosuke to build..."
              className="min-h-[120px] w-full resize-none rounded-2xl border border-input bg-background px-6 py-4 pr-16 text-base shadow-sm transition-all placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-transparent sm:min-h-[140px] sm:text-lg"
              rows={1}
            />

            {/* Send button */}
            <Button
              type="submit"
              size="icon"
              className="absolute bottom-3 right-3 h-10 w-10 rounded-xl transition-all hover:scale-105"
              disabled={!message.trim()}
            >
              <ArrowUp className="h-5 w-5" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>

          {/* Hint text */}
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Press{' '}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Enter
            </kbd>{' '}
            to send or{' '}
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              Shift + Enter
            </kbd>{' '}
            for a new line
          </p>
        </form>
      </div>
    </div>
  );
}
