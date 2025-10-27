'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Calendar, Check, GitPullRequest, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

type AnimationStep =
  | 'idle'
  | 'userTyping'
  | 'userSent'
  | 'aiResponding'
  | 'featureComplete'
  | 'showCreatePR'
  | 'cursorHover'
  | 'cursorClick'
  | 'prCreated';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function HeroSection() {
  const handleScheduleCall = () => {
    window.open('https://form.typeform.com/to/A6zJtlUM', '_blank');
  };

  const [currentStep, setCurrentStep] = useState<AnimationStep>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textareaTypingText, setTextareaTypingText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const [animationCycle, setAnimationCycle] = useState(0);

  const userMessage = 'I need to add a user dashboard with profile settings and activity feed.';
  const aiMessage =
    "Perfect! I've created the dashboard component with profile settings and activity feed. The feature is ready to review.";

  // Type text character by character
  const typeText = async (text: string, speed: number, cancelCheck: () => boolean) => {
    for (let i = 0; i <= text.length; i++) {
      if (cancelCheck()) return false;
      setTextareaTypingText(text.slice(0, i));
      await wait(speed);
    }
    return true;
  };

  // Animation sequence
  useEffect(() => {
    let cancelled = false;

    const sequence = async () => {
      // Reset
      setMessages([]);
      setTextareaTypingText('');
      setCurrentStep('idle');
      await wait(1000);

      if (cancelled) return;

      // Step 1: User typing
      setCurrentStep('userTyping');
      await typeText(userMessage, 40, () => cancelled);
      if (cancelled) return;

      await wait(500);

      // Step 2: User sends message
      setCurrentStep('userSent');
      setMessages([{ id: '1', role: 'user', content: userMessage }]);
      setTextareaTypingText('');
      await wait(800);

      if (cancelled) return;

      // Step 3: AI responding
      setCurrentStep('aiResponding');
      setMessages(prev => [...prev, { id: '2', role: 'ai', content: aiMessage }]);
      await wait(2000);

      if (cancelled) return;

      // Step 4: Feature complete
      setCurrentStep('featureComplete');
      await wait(1500);

      if (cancelled) return;

      // Step 5: Show Create PR button
      setCurrentStep('showCreatePR');
      await wait(1500);

      if (cancelled) return;

      // Step 6: Show cursor hovering
      setCurrentStep('cursorHover');
      setShowCursor(true);
      await wait(1200);

      if (cancelled) return;

      // Step 7: Cursor click
      setCurrentStep('cursorClick');
      await wait(500);

      if (cancelled) return;

      // Step 8: PR Created
      setCurrentStep('prCreated');
      setShowCursor(false);
      await wait(3000);

      if (cancelled) return;

      // Loop back
      setAnimationCycle(prev => prev + 1);
    };

    sequence();

    return () => {
      cancelled = true;
    };
  }, [animationCycle]);

  return (
    <section className="pt-12 sm:pt-20 pb-16 sm:pb-32">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <motion.div
              className="space-y-6 lg:pr-8"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Badge
                  variant="outline"
                  className="mb-0 sm:mb-0 px-2 sm:px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
                >
                  <motion.div
                    className="absolute inset-0 -top-1 -bottom-1 bg-linear-to-r from-transparent via-white/20 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      repeatDelay: 3,
                      ease: 'easeInOut',
                    }}
                  />
                  <Sparkles className="w-3 h-3 mr-1" />
                  Democratize Development
                </Badge>
              </motion.div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
                Enabling{' '}
                <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>REAL</AuroraText>{' '}
                Collaboration
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground font-sans leading-relaxed">
                Empower your entire team to ship features—no coding skills required. Non-technical
                team members can build, iterate, and deploy while engineers maintain control and
                quality.
              </p>

              {/* CTA */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Button
                  size="lg"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono bg-primary hover:bg-primary/90"
                  onClick={handleScheduleCall}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule a Call
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Column - Vibe Coding Chat Animation */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Background blur effect */}
              <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-blue-500/5 rounded-2xl blur-3xl" />

              {/* Chat Interface Container */}
              <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-6 shadow-2xl h-[500px] sm:h-[550px] flex flex-col">
                {/* Animated Cursor */}
                <AnimatePresence>
                  {showCursor && (
                    <motion.div
                      className="absolute w-6 h-6 pointer-events-none z-50"
                      initial={{ opacity: 0, left: '10rem', bottom: '8rem' }}
                      animate={{
                        opacity: 1,
                        left: '3rem',
                        bottom: '2rem',
                        scale: currentStep === 'cursorClick' ? 0.8 : 1,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{
                        duration: currentStep === 'cursorHover' ? 1.2 : 0.3,
                        ease: 'easeInOut',
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-6 h-6 text-foreground drop-shadow-lg"
                      >
                        <path d="M3 3L10.07 19.97L12.58 12.58L19.97 10.07L3 3Z" />
                      </svg>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="space-y-3 sm:space-y-4 mb-4 flex-1 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {messages.map(message => (
                      <motion.div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div
                          className={`px-3 sm:px-4 py-2 rounded-2xl max-w-xs font-sans text-xs sm:text-sm ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          }`}
                        >
                          {message.content}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Success Badge */}
                <AnimatePresence>
                  {currentStep === 'featureComplete' ||
                  currentStep === 'showCreatePR' ||
                  currentStep === 'cursorHover' ||
                  currentStep === 'cursorClick' ? (
                    <motion.div
                      className="flex justify-center mb-4"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <Badge
                        variant="outline"
                        className="px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Feature Ready
                      </Badge>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* PR Created Success */}
                <AnimatePresence>
                  {currentStep === 'prCreated' && (
                    <motion.div
                      className="flex-1 flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="text-center space-y-4">
                        <motion.div
                          className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                        >
                          <GitPullRequest className="w-8 h-8 text-emerald-600" />
                        </motion.div>
                        <div>
                          <h3 className="font-semibold text-base mb-1 font-mono">
                            Pull Request Created!
                          </h3>
                          <p className="text-xs text-muted-foreground">Ready for engineer review</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Chat Input */}
                {currentStep !== 'prCreated' && (
                  <div className="relative mt-auto">
                    <div
                      className={`relative flex flex-col rounded-lg border transition-all duration-300 shadow-lg bg-background/50 backdrop-blur-sm ${
                        currentStep === 'userTyping'
                          ? 'border-primary/50 shadow-primary/20'
                          : 'border-border/50'
                      }`}
                    >
                      <Textarea
                        value={currentStep === 'userTyping' ? textareaTypingText : ''}
                        placeholder={currentStep === 'userTyping' ? '' : 'Describe your feature...'}
                        disabled
                        className={`min-h-[80px] resize-none border-0 bg-transparent! px-3 py-3 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-xs sm:text-sm cursor-not-allowed ${
                          currentStep === 'userTyping'
                            ? 'opacity-100 text-foreground'
                            : 'opacity-75'
                        }`}
                        rows={3}
                      />

                      <div className="flex items-center justify-between gap-2 px-3 pb-3">
                        <AnimatePresence>
                          {(currentStep === 'showCreatePR' ||
                            currentStep === 'cursorHover' ||
                            currentStep === 'cursorClick') && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0 }}
                              className="flex-1"
                            >
                              <Button
                                size="sm"
                                className={`font-mono text-xs transition-all duration-300 ${
                                  currentStep === 'cursorClick'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 scale-95'
                                    : currentStep === 'cursorHover'
                                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25'
                                      : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                                disabled
                              >
                                <GitPullRequest className="w-3 h-3 mr-1.5" />
                                Create PR
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <div className="flex gap-1 ml-auto">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 opacity-50 cursor-not-allowed"
                            disabled
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-emerald-500/20 rounded-full blur-sm" />
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-blue-500/20 rounded-full blur-sm" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
