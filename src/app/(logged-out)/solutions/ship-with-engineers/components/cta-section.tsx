'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Calendar, Phone } from 'lucide-react';

export function CTASection() {
  const handleScheduleCall = () => {
    window.open('https://form.typeform.com/to/A6zJtlUM', '_blank');
  };

  return (
    <section className="py-16 sm:py-32 pb-12 sm:pb-24 bg-muted/50 dark:bg-transparent">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            {/* Badge */}
            <div className="mb-6 sm:mb-8 flex justify-center">
              <Badge
                variant="outline"
                className="px-2 sm:px-3 py-1 text-xs font-mono bg-emerald-500/10 border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 cursor-default relative overflow-hidden"
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
                <Phone className="w-3 h-3 mr-1" />
                Let&apos;s Talk
              </Badge>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 font-mono">
              Ready to Ship Real Products?
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-12 font-sans px-2 max-w-2xl mx-auto">
              Schedule a call with our team. We&apos;ll discuss your project, provide a transparent
              estimate, and show you how we can ship your product in weeks, not months.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Button
                size="lg"
                className="w-full sm:w-auto px-6 sm:px-8 py-3 font-mono bg-primary hover:bg-primary/90"
                onClick={handleScheduleCall}
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule a Call
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
