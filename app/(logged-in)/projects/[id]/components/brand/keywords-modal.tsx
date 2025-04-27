'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';

interface KeywordsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (keywords: string) => void;
  isGenerating: boolean;
}

export default function KeywordsModal({
  isOpen,
  onOpenChange,
  onSubmit,
  isGenerating
}: KeywordsModalProps) {
  const [keywords, setKeywords] = useState('');

  const handleSubmit = () => {
    onSubmit(keywords);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Color Palette</DialogTitle>
          <DialogDescription>
            Enter keywords to influence the color palette generation. For example: &ldquo;modern&rdquo;, &ldquo;vibrant&rdquo;, &ldquo;corporate&rdquo;, &ldquo;earthy&rdquo;, &ldquo;pastel&rdquo;, etc.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <Label htmlFor="keywords">Keywords (optional)</Label>
          <Input
            id="keywords"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="e.g., modern, vibrant, professional"
            className="mt-2"
          />
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isGenerating}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 