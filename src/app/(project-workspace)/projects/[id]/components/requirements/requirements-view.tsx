'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { marked } from 'marked';
import { useRouter } from 'next/navigation';

interface RequirementsViewProps {
  projectId: string;
  projectName: string;
  projectStatus: 'requirements' | 'in_development';
}

export default function RequirementsView({
  projectId,
  projectName: _projectName,
  projectStatus,
}: RequirementsViewProps) {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [docsContent, setDocsContent] = useState('');
  const [conversationHistory, setConversationHistory] = useState<
    Array<{ role: 'user' | 'assistant'; content: string }>
  >([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Fetch initial docs content
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/requirements`);
        if (!response.ok) throw new Error('Failed to fetch requirements');

        const data = await response.json();
        setDocsContent(data.data.docs);
      } catch (error) {
        console.error('Error fetching docs:', error);
        toast({
          title: 'Error',
          description: 'Failed to load requirements document',
          variant: 'destructive',
        });
      }
    };

    fetchDocs();
  }, [projectId, toast]);

  const handleSendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);

    // Add user message to conversation
    setConversationHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await fetch(`/api/projects/${projectId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      // Add assistant response to conversation
      setConversationHistory(prev => [
        ...prev,
        { role: 'assistant', content: data.data.response },
      ]);

      // Update docs content
      if (data.data.docs) {
        setDocsContent(data.data.docs);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmRequirements = async () => {
    setIsConfirming(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/requirements`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });

      if (!response.ok) throw new Error('Failed to confirm requirements');

      const data = await response.json();

      toast({
        title: 'Requirements Confirmed!',
        description: data.data.message,
      });

      // Refresh the page to show the modal and new status
      router.refresh();
    } catch (error) {
      console.error('Error confirming requirements:', error);
      toast({
        title: 'Error',
        description: 'Failed to confirm requirements',
        variant: 'destructive',
      });
    } finally {
      setIsConfirming(false);
    }
  };

  const parseMarkdown = (content: string) => {
    return marked.parse(content, { async: false }) as string;
  };

  return (
    <>
      <div className="flex h-full">
        {/* Left side - Chat Interface */}
        <div className="flex-1 flex flex-col border-r">
          {/* Header */}
          <div className="border-b p-4">
            <h2 className="text-lg font-semibold">Requirements Gathering</h2>
            <p className="text-sm text-muted-foreground">
              Chat with AI to build your project requirements
            </p>
          </div>

          {/* Conversation Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversationHistory.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  Start by describing your project idea. I&apos;ll help you build comprehensive
                  requirements through conversation.
                </p>
              </Card>
            ) : (
              conversationHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <Card
                    className={`p-4 max-w-[80%] ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </Card>
                </div>
              ))
            )}
          </div>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Describe your project or answer questions..."
                className="flex-1 resize-none"
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading || projectStatus === 'in_development'}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || isLoading || projectStatus === 'in_development'}
                size="icon"
                className="h-auto"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Right side - Docs Preview */}
        <div className="flex-1 flex flex-col">
          {/* Header with Confirm Button */}
          <div className="border-b p-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Requirements Document</h2>
              <p className="text-sm text-muted-foreground">Live preview of docs.md</p>
            </div>
            {projectStatus === 'requirements' && (
              <Button onClick={() => setShowConfirmModal(true)} disabled={isConfirming}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Confirm Requirements
              </Button>
            )}
            {projectStatus === 'in_development' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                In Development
              </div>
            )}
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <Card className="p-6">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(docsContent) }}
              />
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Requirements?</DialogTitle>
            <DialogDescription>
              Once you confirm, your project will enter development. You&apos;ll receive an email
              notification when it&apos;s ready.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Nice, see you in a couple of days when completed. You will get notified by email
              when the project has been completed.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={isConfirming}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmRequirements} disabled={isConfirming}>
                {isConfirming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

