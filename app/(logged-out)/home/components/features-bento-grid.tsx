'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Database, Lock, Rocket } from 'lucide-react';

export function FeaturesBentoGrid() {
  return (
    <section className="py-12 sm:py-20 bg-muted/10">
      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-12 sm:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
            # Bottom-Up Approach
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto font-sans px-2">
            We are not going to throw out software development best practices and lifecycle because
            of AI. We won’t skip pull requests or commit straight to main. Keep a developer-first
            experience while empowering non-developers to contribute as product builders.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Large principle card */}
            <motion.div
              className="lg:col-span-2 lg:row-span-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Card className="h-full p-6 sm:p-8 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300">
                <CardContent className="p-0 h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4 sm:mb-6">
                      <div className="p-2 rounded-lg bg-emerald-500/20">
                        <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold font-mono">
                        Bottom-Up Approach
                      </h3>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground font-sans mb-4 sm:mb-6 leading-relaxed">
                      Code remains the source of truth. Keep PRs, reviews, and a proper SDLC. The
                      goal is to increase contributions across the same repository without
                      sacrificing rigor.
                    </p>
                  </div>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between text-emerald-500">
                      <span>SDLC</span>
                      <span>Preserved</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                      <span>PRs</span>
                      <span>Required</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                      <span>Contributors</span>
                      <span>Developers + Builders</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Keep best practices */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card className="h-full p-4 sm:p-6 bg-card/50 border-border/50 hover:bg-card/80 transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                    <h3 className="text-base sm:text-lg font-semibold font-mono">
                      Keep Best Practices
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans">
                    Don’t bypass reviews or quality gates. Maintain tests, CI, and a healthy
                    branching strategy.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Developer-first */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="h-full p-4 sm:p-6 bg-card/50 border-border/50 hover:bg-card/80 transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <Database className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                    <h3 className="text-base sm:text-lg font-semibold font-mono">
                      Developer-First
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans">
                    Code is the single source of truth. AI augments workflows without replacing
                    engineering ownership.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Empower contributors */}
            <motion.div
              className="md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card className="h-full p-4 sm:p-6 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20 hover:border-yellow-500/30 transition-all duration-300">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <div className="flex items-center gap-2">
                      <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />
                      <h3 className="text-base sm:text-lg font-semibold font-mono">
                        Empower Contributors
                      </h3>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      Git-native
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans">
                    Enable non-developers to contribute safely to the same repository, evolving into
                    product builders with workflows that respect the repo.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
