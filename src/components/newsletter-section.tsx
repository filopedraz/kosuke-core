'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { NewsletterSubscriptionResponse } from '@/lib/types/ghost';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data: NewsletterSubscriptionResponse = await response.json();

      if (data.success) {
        toast({
          title: data.alreadySubscribed ? 'Already Subscribed' : 'Success',
          description: data.message,
        });
        if (!data.alreadySubscribed) {
          setEmail(''); // Clear email only if newly subscribed
        }
      } else {
        toast({
          title: 'Error',
          description: data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full py-12 sm:py-16 flex flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl mx-auto"
      >
        <div className="text-center space-y-6">
          {/* Minimal Header */}
          <div className="space-y-2">
            <h2 className="text-xl sm:text-2xl font-bold">Stay in the Loop</h2>
            <p className="text-sm text-muted-foreground">
              Get updates on new features and product news
            </p>
          </div>

          {/* Compact Newsletter Form */}
          <form onSubmit={handleSubmit} className="max-w-md mx-auto">
            <div className="flex gap-2 p-1.5 rounded-full backdrop-blur-sm hover:border-border/50 transition-colors">
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 border-0 shadow-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-9 px-4 text-sm placeholder:text-muted-foreground/50"
                required
              />
              <Button
                type="submit"
                disabled={isSubmitting}
                size="sm"
                className="h-9 px-4 text-xs"
                variant="default"
              >
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    Subscribe
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Privacy Note */}
          <p className="text-xs text-muted-foreground/60">No spam. Unsubscribe anytime.</p>
        </div>
      </motion.div>
    </section>
  );
}
