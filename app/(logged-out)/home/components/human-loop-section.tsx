'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp, Paperclip, Sparkles, User } from 'lucide-react';
import { useEffect, useState } from 'react';

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

export function HumanLoopSection() {
  const [currentStep, setCurrentStep] = useState<AnimationStep>('idle');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [textareaTypingText, setTextareaTypingText] = useState('');
  const [isHelpButtonPulsing, setIsHelpButtonPulsing] = useState(false);
  const [showCursor, setShowCursor] = useState(false);

  const userMessage = 'I need to add authentication to my app.';
  const aiMessage =
    'Perfect! Your authentication is now working correctly. Everything should be functioning as expected.';
  const userComplaintMessage = "No bro, doesn't fucking work!";

  // Animation sequence
  useEffect(() => {
    const sequence = async () => {
      // Reset
      setMessages([]);
      setTextareaTypingText('');
      setCurrentStep('idle');
      setIsHelpButtonPulsing(false);

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 1: User typing first message in textarea
      setCurrentStep('userTyping');
      for (let i = 0; i <= userMessage.length; i++) {
        setTextareaTypingText(userMessage.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Send first user message
      setCurrentStep('userSending');
      setMessages([{ id: '1', role: 'user', content: userMessage }]);
      setTextareaTypingText('');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 3: AI response
      setCurrentStep('aiResponse');
      setMessages(prev => [...prev, { id: '2', role: 'ai', content: aiMessage }]);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 4: User complaint typing in textarea
      setCurrentStep('userComplaintTyping');
      for (let i = 0; i <= userComplaintMessage.length; i++) {
        setTextareaTypingText(userComplaintMessage.slice(0, i));
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 5: Send the complaint message
      setCurrentStep('userComplaintSending');
      setMessages(prev => [...prev, { id: '3', role: 'user', content: userComplaintMessage }]);
      setTextareaTypingText('');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 6: Help button becomes active
      setCurrentStep('helpButtonActive');
      setIsHelpButtonPulsing(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 7: Show cursor on Help Me button
      setCurrentStep('cursorHover');
      setShowCursor(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 8: Cursor click animation
      setCurrentStep('cursorClick');
      setIsHelpButtonPulsing(false);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 9: Show human help and hide cursor
      setCurrentStep('humanHelp');
      setShowCursor(false);
      setMessages(prev => [
        ...prev,
        {
          id: '4',
          role: 'human',
          content:
            "Hi! I'm Pietro, a senior engineer. I can see the issue in your auth flow. Let me fix this for you right now.",
        },
      ]);

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Loop back
      sequence();
    };

    sequence();
  }, []);

  return (
    <section className="py-16 sm:py-24 lg:py-32 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            className="text-center mb-12 sm:mb-16 lg:mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
              A <AuroraText colors={['#10B981', '#22c55e', '#34D399', '#059669']}>Human</AuroraText>{' '}
              in your Loop
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-sans">
              The perfect blend of AI speed and human expertise to bring your vision to life
            </p>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Column - Content */}
            <motion.div
              className="space-y-6 lg:pr-8"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="space-y-6">
                <h3 className="text-2xl sm:text-3xl font-bold font-mono">
                  We&rsquo;re here to help you finish your dream project
                </h3>

                <p className="text-lg text-muted-foreground font-sans leading-relaxed">
                  Get a dedicated software engineer with just one click. No more abandoned projects
                  or unfinished apps.
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    <p className="text-muted-foreground font-sans">
                      <span className="font-semibold text-foreground">AI builds fast</span>, humans
                      perfect it
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                    <p className="text-muted-foreground font-sans">
                      <span className="font-semibold text-foreground">Production-ready</span> code
                      that actually works
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Mock Chat Interface */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Background blur effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-blue-500/5 rounded-2xl blur-3xl" />

              {/* Chat Interface Container */}
              <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl h-[550px] flex flex-col">
                {/* Animated Cursor */}
                <AnimatePresence>
                  {showCursor && (
                    <motion.div
                      className="absolute w-6 h-6 pointer-events-none z-50 top-8 right-12"
                      initial={{ opacity: 0 }}
                      animate={{
                        opacity: 1,
                        scale: currentStep === 'cursorClick' ? 0.8 : 1,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
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
                    className={`font-mono text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default ${
                      isHelpButtonPulsing ? 'animate-pulse ring-2 ring-emerald-500/50' : ''
                    }`}
                    disabled
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Help Me
                  </Button>
                </div>

                {/* Animated Chat Messages */}
                <div className="space-y-4 mb-6 flex-1 overflow-hidden flex flex-col justify-start">
                  <div className="space-y-4">
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
                            className={`px-4 py-2 rounded-2xl max-w-xs font-sans text-sm ${
                              message.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : message.role === 'ai'
                                  ? 'bg-muted rounded-bl-md'
                                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-bl-md relative'
                            }`}
                          >
                            {message.role === 'human' && message.id === '4' && (
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
                <div className="relative mt-auto">
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
                      className={`min-h-[100px] resize-none border-0 !bg-transparent px-3 py-3 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm cursor-not-allowed ${
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
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>

                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <ArrowUp className="h-4 w-4" />
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
