'use client';

import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { AlertTriangle, CreditCard, Lock } from 'lucide-react';

export function ProblemsSection() {
  return (
    <section className="py-12 sm:py-14 md:py-20 lg:py-24">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-10 md:mb-14"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              Current vibe coding platforms have limitations
            </h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
              Here&apos;s why traditional AI coding platforms fall short for serious founders
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
              {/* Large featured problem card */}
              <motion.div
                className="md:col-span-2 md:row-span-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="h-full p-6 sm:p-8 bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/30 transition-all duration-300">
                  <CardContent className="p-0 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <div className="p-2 rounded-lg bg-red-500/20">
                          <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold">Only for mockups</h3>
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground font-sans mb-4 sm:mb-6 leading-relaxed">
                        It&apos;s good for functioning mockups, but when you need solid
                        authentication and billing, these solutions don&apos;t even reach that
                        point.
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-red-600">
                        <span>Auth</span>
                        <span>Limited</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Billing</span>
                        <span>Missing</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Production</span>
                        <span>Not Ready</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* No costs transparency */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="h-full p-4 sm:p-6 bg-card/50 border-red-500/20 hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      <h3 className="text-base sm:text-lg font-semibold">No transparency</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans">
                      Using Lovable credits is like going to the casino. You never know if it will
                      fix the issue.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Zero control */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="h-full p-4 sm:p-6 bg-card/50 border-red-500/20 hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      <h3 className="text-base sm:text-lg font-semibold">Zero control</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans">
                      You don&apos;t know what&apos;s going on and when it will break.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Bottom spanning card */}
              <motion.div
                className="md:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="h-full p-4 sm:p-6 bg-gradient-to-r from-red-500/10 to-red-500/5 border-red-500/20 hover:border-red-500/30 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                      <h3 className="text-base sm:text-lg font-semibold">
                        Built for demos, not deployment
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans">
                      No testing, no code reviews, no best practices. These platforms optimize for
                      speed over quality—leaving you with technical debt before you even launch.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
