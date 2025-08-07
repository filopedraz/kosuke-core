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
            # Why developers choose this
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
            Every component designed for speed, security, and scale
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Large feature card */}
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
                        Ship in Minutes
                      </h3>
                    </div>
                    <p className="text-sm sm:text-base text-muted-foreground font-sans mb-4 sm:mb-6 leading-relaxed">
                      Complete full-stack application with authentication, database, billing, and
                      deployment. Everything integrated and configured - just clone and ship.
                    </p>
                  </div>
                  <div className="space-y-2 text-sm font-mono">
                    <div className="flex justify-between text-emerald-500">
                      <span>Clone to Deploy</span>
                      <span>&lt; 5 min</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                      <span>Auth + DB + Billing</span>
                      <span>✓ Included</span>
                    </div>
                    <div className="flex justify-between text-emerald-500">
                      <span>Production Ready</span>
                      <span>Day 1</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Auth card */}
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
                    <h3 className="text-base sm:text-lg font-semibold font-mono">Secure Auth</h3>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans">
                    Clerk integration with social logins, MFA, and enterprise SSO ready.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Database card */}
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
                    <h3 className="text-base sm:text-lg font-semibold font-mono">Type-Safe DB</h3>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans">
                    Drizzle ORM with PostgreSQL. Migrations, relations, and full TypeScript support.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Billing card */}
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
                        Revenue Ready
                      </h3>
                    </div>
                    <Badge variant="outline" className="font-mono text-xs">
                      Polar + Stripe
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-sans">
                    Complete subscription management with webhooks, usage tracking, and analytics.
                    Start monetizing from day one.
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
