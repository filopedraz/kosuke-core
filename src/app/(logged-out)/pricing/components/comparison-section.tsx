'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

const comparisonData = [
  {
    feature: 'Quality',
    lovable: { value: 'Low', description: 'AI-generated prototypes, no human oversight' },
    kosuke: { value: 'High', description: 'AI + Senior engineers ensure production quality' },
    agency: { value: 'High', description: 'Manual development, slower iterations' },
  },
  {
    feature: 'Cost',
    lovable: { value: 'Mid', description: 'Credits burn fast, unpredictable costs' },
    kosuke: { value: 'Low', description: 'Transparent pricing, no usage surprises' },
    agency: { value: 'High', description: '$50k-$500k per project, long timelines' },
  },
  {
    feature: 'Lock In',
    lovable: { value: 'High', description: 'Proprietary platform, hard to export' },
    kosuke: { value: 'Low', description: 'Your repo, export anytime, open-source' },
    agency: { value: 'Low', description: 'Own the code, but expensive to maintain' },
  },
  {
    feature: 'Support',
    lovable: { value: 'Low', description: 'Community forums, no direct engineering help' },
    kosuke: { value: 'High', description: 'Real engineers fix bugs and unblock you' },
    agency: { value: 'High', description: 'Dedicated team, but costly retainers' },
  },
];

function getValueBadge(value: 'Low' | 'Mid' | 'High', isKosuke: boolean = false) {
  const baseClasses = 'px-3 py-1 rounded-full text-sm font-semibold font-mono';

  if (value === 'Low') {
    return (
      <Badge className={`${baseClasses} bg-emerald-500/10 text-emerald-600 border-emerald-500/20`}>
        Low
      </Badge>
    );
  }

  if (value === 'Mid') {
    return (
      <Badge className={`${baseClasses} bg-yellow-500/10 text-yellow-600 border-yellow-500/20`}>
        Mid
      </Badge>
    );
  }

  if (value === 'High') {
    if (isKosuke) {
      return (
        <Badge
          className={`${baseClasses} bg-emerald-500/10 text-emerald-600 border-emerald-500/20`}
        >
          High
        </Badge>
      );
    }
    return (
      <Badge className={`${baseClasses} bg-red-500/10 text-red-600 border-red-500/20`}>High</Badge>
    );
  }
}

export function ComparisonSection() {
  return (
    <section className="py-16 md:py-24 bg-muted/50 dark:bg-transparent">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Layout */}
          <div className="hidden md:block">
            {/* Provider Headers - Centered */}
            <div className="flex justify-center mb-8">
              <div className="grid grid-cols-3 gap-6 max-w-4xl w-full">
                {/* Lovable */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6 text-center">
                      <h3 className="text-2xl font-bold font-mono">Lovable</h3>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Kosuke - Featured */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/10 relative overflow-hidden">
                    <div className="absolute inset-0 bg-grid-white/5 bg-size-[20px_20px]" />
                    <CardContent className="p-6 text-center relative">
                      <h3 className="text-2xl font-bold font-mono text-emerald-600">Kosuke</h3>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Software Agency */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6 text-center">
                      <h3 className="text-2xl font-bold font-mono">Software Agency</h3>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Comparison Rows - Centered with labels on left */}
            <div className="space-y-4">
              {comparisonData.map((row, rowIndex) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: rowIndex * 0.1 }}
                  className="relative"
                >
                  {/* Three provider columns - centered */}
                  <div className="flex justify-center">
                    <div className="grid grid-cols-3 gap-6 max-w-4xl w-full">
                      {/* Lovable */}
                      <Card className="bg-card/50 border-border/50 hover:bg-card transition-all duration-300">
                        <CardContent className="p-6 flex justify-center">
                          {getValueBadge(row.lovable.value as 'Low' | 'Mid' | 'High')}
                        </CardContent>
                      </Card>

                      {/* Kosuke - Featured */}
                      <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-grid-white/5 bg-size-[20px_20px] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 flex justify-center relative">
                          {getValueBadge(row.kosuke.value as 'Low' | 'Mid' | 'High', true)}
                        </CardContent>
                      </Card>

                      {/* Software Agency */}
                      <Card className="bg-card/50 border-border/50 hover:bg-card transition-all duration-300">
                        <CardContent className="p-6 flex justify-center">
                          {getValueBadge(row.agency.value as 'Low' | 'Mid' | 'High')}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Feature Label - absolutely positioned to the left */}
                  <div className="absolute left-30 top-1/2 -translate-y-1/2 -translate-x-full pr-8">
                    <h4 className="text-lg font-bold font-mono whitespace-nowrap">{row.feature}</h4>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden space-y-8">
            {comparisonData.map((row, index) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <h3 className="text-xl font-bold font-mono mb-4">{row.feature}</h3>
                <div className="space-y-4">
                  {/* Kosuke - Featured First */}
                  <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="font-bold font-mono text-emerald-600">Kosuke</span>
                        {getValueBadge(row.kosuke.value as 'Low' | 'Mid' | 'High', true)}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Lovable */}
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold font-mono">Lovable</span>
                        {getValueBadge(row.lovable.value as 'Low' | 'Mid' | 'High')}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Software Agency */}
                  <Card className="bg-card/50 border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold font-mono">Software Agency</span>
                        {getValueBadge(row.agency.value as 'Low' | 'Mid' | 'High')}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
