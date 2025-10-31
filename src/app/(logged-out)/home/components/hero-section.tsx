'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Code2, Paperclip, Sparkles, User } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HeroSectionProps {
  onApplyClick: () => void;
}

type AnimationStep =
  | 'idle'
  | 'userTyping'
  | 'userSending'
  | 'aiResponse'
  | 'userComplaintTyping'
  | 'userComplaintSending'
  | 'helpButtonActive'
  | 'cursorHover'
  | 'cursorClick'
  | 'humanHelp';

interface ChatMessage {
  id: string;
  role: 'user' | 'ai' | 'human';
  content: string;
  isTyping?: boolean;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export function HeroSection({ onApplyClick }: HeroSectionProps) {
  const [currentStep, setCurrentStep] = useState<AnimationStep>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textareaTypingText, setTextareaTypingText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const [animationCycle, setAnimationCycle] = useState(0);

  const userMessage = 'I need to add authentication to my app.';
  const aiMessage =
    'Perfect! Your authentication is now working correctly. Everything should be functioning as expected.';
  const userComplaintMessage = "Still getting errors. This isn't working for me.";

  // Type text character by character
  const typeText = async (text: string, speed: number, cancelCheck: () => boolean) => {
    for (let i = 0; i <= text.length; i++) {
      if (cancelCheck()) return false;
      setTextareaTypingText(text.slice(0, i));
      await new Promise(resolve => setTimeout(resolve, speed));
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

      // Step 1: User typing first message in textarea
      setCurrentStep('userTyping');
      await typeText(userMessage, 50, () => cancelled);
      if (cancelled) return;

      await wait(500);

      // Step 2: Send first user message
      setCurrentStep('userSending');
      setMessages([{ id: '1', role: 'user', content: userMessage }]);
      setTextareaTypingText('');
      await wait(500);

      if (cancelled) return;

      // Step 3: AI response
      setCurrentStep('aiResponse');
      setMessages(prev => [...prev, { id: '2', role: 'ai', content: aiMessage }]);
      await wait(1000);

      if (cancelled) return;

      // Step 4: User complaint typing in textarea
      setCurrentStep('userComplaintTyping');
      await typeText(userComplaintMessage, 80, () => cancelled);
      if (cancelled) return;

      await wait(500);

      // Step 5: Send the complaint message
      setCurrentStep('userComplaintSending');
      setMessages(prev => [...prev, { id: '3', role: 'user', content: userComplaintMessage }]);
      setTextareaTypingText('');
      await wait(1000);

      if (cancelled) return;

      // Step 6: Help button becomes active
      setCurrentStep('helpButtonActive');
      await wait(1000);

      // Step 7: Show cursor on Help Me button
      if (cancelled) return;

      setCurrentStep('cursorHover');
      setShowCursor(true);
      await wait(1000);

      if (cancelled) return;

      // Step 8: Cursor click animation
      setCurrentStep('cursorClick');
      await wait(500);

      // Step 9: Show human help and hide cursor
      if (cancelled) return;

      setCurrentStep('humanHelp');
      setShowCursor(false);
      setMessages(prev => [
        ...prev,
        {
          id: '4',
          role: 'human',
          content:
            "Hi! I'm Pietro, a senior engineer. I managed to identify the bug in your auth flow. Let me fix this for you right now.",
        },
      ]);

      await wait(6000);

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
    <section className="pt-12 sm:pt-14 md:pt-16 lg:pt-20 pb-12 sm:pb-14 md:pb-20 lg:pb-32">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <motion.div
              className="space-y-4 md:space-y-5 lg:space-y-6 md:pr-6 lg:pr-8"
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
                <a href="/solutions/startup-program" className="inline-block">
                  <Badge
                    variant="outline"
                    className="mb-0 sm:mb-0 px-2 sm:px-3 py-1 text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  >
                    {/* Shine effect */}
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
                    🚀 Startup Program: Ship Your MVP for Free
                  </Badge>
                </a>
              </motion.div>

              <h1 className="text-3xl sm:text-[2rem] md:text-4xl lg:text-6xl font-bold leading-tight sm:leading-tight tracking-tight">
                Start with AI. <br />
                Finish with{' '}
                <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>
                  Engineers
                </AuroraText>
                .
              </h1>

              <p className="text-base md:text-lg lg:text-xl text-muted-foreground font-sans leading-relaxed">
                Build your product by chatting with AI and connecting with a real engineer whenever
                you get stuck.
              </p>

              {/* CTA Button */}
              <motion.div
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-center md:items-start md:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3"
                  onClick={onApplyClick}
                >
                  <Code2 className="mr-2 h-4 w-4" />
                  Apply for Early Access
                </Button>
              </motion.div>
            </motion.div>

            {/* Right Column - Mock Chat Interface */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Background blur effect */}
              <div className="absolute inset-0 bg-linear-to-br from-emerald-500/5 via-transparent to-blue-500/5 rounded-2xl blur-3xl" />

              {/* Chat Interface Container */}
              <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-4 sm:p-6 shadow-2xl h-[480px] md:h-[550px] lg:h-[600px] flex flex-col">
                {/* Animated Cursor */}
                <AnimatePresence>
                  {showCursor && (
                    <motion.div
                      className="absolute w-6 h-6 pointer-events-none z-50"
                      initial={{ opacity: 0, right: '6rem', top: '6rem' }}
                      animate={{
                        opacity: 1,
                        right: '3rem', // right-12 position (48px = 3rem)
                        top: '2rem', // top-8 position (32px = 2rem)
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
                {/* Header with Help Me button */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className={`text-xs relative overflow-hidden transition-all duration-300 cursor-default ${
                      currentStep === 'humanHelp'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 shadow-sm shadow-emerald-500/5'
                        : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-500 shadow-lg shadow-emerald-500/25 animate-pulse'
                    }`}
                    disabled
                  >
                    {/* Shine effect for Help Me button */}
                    {currentStep !== 'humanHelp' && (
                      <motion.div
                        className="absolute inset-0 bg-linear-to-r from-transparent via-emerald-300/40 to-transparent"
                        initial={{ x: '-100%' }}
                        animate={{ x: '200%' }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          repeatDelay: 1,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                    <Sparkles className="w-3 h-3 mr-1 relative z-10" />
                    <span className="relative z-10">Help Me</span>
                  </Button>
                </div>

                {/* Animated Chat Messages */}
                <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6 flex-1 overflow-y-auto flex flex-col justify-start">
                  <div className="space-y-3 sm:space-y-4">
                    <AnimatePresence mode="popLayout">
                      {/* Render messages */}
                      {messages.map(message => (
                        <motion.div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div
                            className={`px-3 sm:px-4 py-2 rounded-2xl max-w-[85%] sm:max-w-md font-sans text-xs sm:text-sm ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : message.role === 'ai'
                                  ? 'bg-muted rounded-bl-md'
                                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-bl-md relative'
                            }`}
                          >
                            {message.role === 'human' && (
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-2 py-1 rounded-full text-xs font-medium">
                                  <User className="w-3 h-3" />
                                  Human Engineer
                                </div>
                              </div>
                            )}
                            {message.content}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Mock Chat Input */}
                <div className="relative mt-auto" aria-hidden="true">
                  <div
                    className={`relative flex flex-col rounded-lg border transition-all duration-300 shadow-lg bg-background/50 backdrop-blur-sm ${
                      currentStep === 'userTyping' || currentStep === 'userComplaintTyping'
                        ? 'border-primary/50 shadow-primary/20'
                        : 'border-border/50'
                    }`}
                  >
                    <Textarea
                      value={
                        currentStep === 'userTyping' || currentStep === 'userComplaintTyping'
                          ? textareaTypingText
                          : ''
                      }
                      placeholder={
                        currentStep === 'userTyping' || currentStep === 'userComplaintTyping'
                          ? ''
                          : 'Describe your project idea...'
                      }
                      disabled
                      tabIndex={-1}
                      className={`min-h-[100px] resize-none border-0 bg-transparent! px-3 py-3 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm cursor-not-allowed ${
                        currentStep === 'userTyping' || currentStep === 'userComplaintTyping'
                          ? 'opacity-100 text-foreground'
                          : 'opacity-75'
                      }`}
                      rows={5}
                    />

                    <div className="flex items-center gap-2 px-3 absolute bottom-3 right-0">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-50 cursor-not-allowed"
                          disabled
                          tabIndex={-1}
                        >
                          <Paperclip className="h-4 w-4" aria-hidden="true" />
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 opacity-50 cursor-not-allowed"
                          disabled
                          tabIndex={-1}
                        >
                          <ArrowUp className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
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
