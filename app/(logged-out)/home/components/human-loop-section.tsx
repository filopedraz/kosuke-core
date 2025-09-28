'use client';

import { AuroraText } from '@/components/ui/aurora-text';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import { ArrowUp, Paperclip, Sparkles } from 'lucide-react';

export function HumanLoopSection() {
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
              <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-2xl">
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
                    className="font-mono text-xs bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default"
                    disabled
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Help Me
                  </Button>
                </div>

                {/* Mock Chat Messages */}
                <div className="space-y-4 mb-6 max-h-48 overflow-hidden">
                  {/* User Message */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-md max-w-xs font-sans text-sm">
                      I need help building a task management app with React and Node.js
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-2 rounded-2xl rounded-bl-md max-w-xs font-sans text-sm">
                      Perfect! I&rsquo;ll help you build that. Let me start with the React frontend
                      and then connect you with one of our engineers for the backend integration.
                    </div>
                  </div>

                  {/* Typing indicator */}
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                          style={{ animationDelay: '0.1s' }}
                        />
                        <div
                          className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce"
                          style={{ animationDelay: '0.2s' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mock Chat Input */}
                <div className="relative">
                  <div className="relative flex flex-col rounded-lg border border-border/50 transition-colors shadow-lg bg-background/50 backdrop-blur-sm">
                    <Textarea
                      value=""
                      placeholder="Describe your project idea..."
                      disabled
                      className="min-h-[100px] resize-none border-0 !bg-transparent px-3 py-3 shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm cursor-not-allowed opacity-75"
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
