'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

type Sentiment = 'positive' | 'neutral' | 'negative';

const comparisonData = [
  {
    feature: 'Quality',
    lovable: {
      value: 'Low',
      sentiment: 'negative' as Sentiment,
      description: 'AI-generated prototypes, no human oversight',
    },
    kosuke: {
      value: 'High',
      sentiment: 'positive' as Sentiment,
      description: 'AI + Senior engineers ensure production quality',
    },
    agency: {
      value: 'High',
      sentiment: 'positive' as Sentiment,
      description: 'Manual development, slower iterations',
    },
  },
  {
    feature: 'Cost',
    lovable: {
      value: 'Mid',
      sentiment: 'neutral' as Sentiment,
      description: 'Credits burn fast, unpredictable costs',
    },
    kosuke: {
      value: 'Low',
      sentiment: 'positive' as Sentiment,
      description: 'Transparent pricing, no usage surprises',
    },
    agency: {
      value: 'High',
      sentiment: 'negative' as Sentiment,
      description: '$50k-$500k per project, long timelines',
    },
  },
  {
    feature: 'Lock In',
    lovable: {
      value: 'High',
      sentiment: 'negative' as Sentiment,
      description: 'Proprietary platform, hard to export',
    },
    kosuke: {
      value: 'Low',
      sentiment: 'positive' as Sentiment,
      description: 'Your repo, export anytime, open-source',
    },
    agency: {
      value: 'Low',
      sentiment: 'positive' as Sentiment,
      description: 'Own the code, but expensive to maintain',
    },
  },
  {
    feature: 'Support',
    lovable: {
      value: 'Low',
      sentiment: 'negative' as Sentiment,
      description: 'Community forums, no direct engineering help',
    },
    kosuke: {
      value: 'High',
      sentiment: 'positive' as Sentiment,
      description: 'Real engineers fix bugs and unblock you',
    },
    agency: {
      value: 'High',
      sentiment: 'positive' as Sentiment,
      description: 'Dedicated team, but costly retainers',
    },
  },
];

function getValueBadge(value: 'Low' | 'Mid' | 'High', sentiment: Sentiment) {
  const baseClasses =
    'px-2.5 sm:px-3 md:px-3.5 py-1 rounded-full text-xs sm:text-sm font-semibold ';

  if (sentiment === 'positive') {
    return (
      <Badge className={`${baseClasses} bg-emerald-500/10 text-emerald-600 border-emerald-500/20`}>
        {value}
      </Badge>
    );
  }

  if (sentiment === 'neutral') {
    return (
      <Badge className={`${baseClasses} bg-yellow-500/10 text-yellow-600 border-yellow-500/20`}>
        {value}
      </Badge>
    );
  }

  if (sentiment === 'negative') {
    return (
      <Badge className={`${baseClasses} bg-red-500/10 text-red-600 border-red-500/20`}>
        {value}
      </Badge>
    );
  }
}

export function ComparisonSection() {
  return (
    <section className="py-12 md:py-24 bg-muted/50 dark:bg-transparent">
      <div className="container mx-auto px-8 sm:px-12 md:px-6">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Layout */}
          <div className="hidden xl:block">
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
                      <h3 className="text-2xl font-bold ">Lovable</h3>
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
                      <h3 className="text-2xl font-bold  text-emerald-600">Kosuke</h3>
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
                      <h3 className="text-2xl font-bold ">Software Agency</h3>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </div>

            {/* Comparison Rows */}
            <div className="space-y-6">
              {comparisonData.map((row, rowIndex) => (
                <motion.div
                  key={row.feature}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: rowIndex * 0.1 }}
                  className="relative"
                >
                  {/* Feature Label - above on mobile, left on desktop */}
                  <h4 className="text-lg font-bold  mb-3 xl:mb-0 xl:absolute xl:left-30 xl:top-1/2 xl:-translate-y-1/2 xl:-translate-x-full xl:pr-8 xl:whitespace-nowrap">
                    {row.feature}
                  </h4>

                  {/* Three provider columns - centered */}
                  <div className="flex justify-center">
                    <div className="grid grid-cols-3 gap-6 max-w-4xl w-full">
                      {/* Lovable */}
                      <Card className="bg-card/50 border-border/50 hover:bg-card transition-all duration-300">
                        <CardContent className="p-6 flex justify-center">
                          {getValueBadge(
                            row.lovable.value as 'Low' | 'Mid' | 'High',
                            row.lovable.sentiment
                          )}
                        </CardContent>
                      </Card>

                      {/* Kosuke - Featured */}
                      <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/20 transition-all duration-300 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-grid-white/5 bg-size-[20px_20px] opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardContent className="p-6 flex justify-center relative">
                          {getValueBadge(
                            row.kosuke.value as 'Low' | 'Mid' | 'High',
                            row.kosuke.sentiment
                          )}
                        </CardContent>
                      </Card>

                      {/* Software Agency */}
                      <Card className="bg-card/50 border-border/50 hover:bg-card transition-all duration-300">
                        <CardContent className="p-6 flex justify-center">
                          {getValueBadge(
                            row.agency.value as 'Low' | 'Mid' | 'High',
                            row.agency.sentiment
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile/Tablet Layout - Compact Side-by-Side */}
          <div className="xl:hidden space-y-5 md:space-y-6">
            {comparisonData.map((row, index) => (
              <motion.div
                key={row.feature}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                {/* Feature label */}
                <h3 className="text-base sm:text-lg md:text-xl font-bold  mb-3 md:mb-4">
                  {row.feature}
                </h3>

                {/* Compact 3-column grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
                  {/* Lovable */}
                  <Card className="bg-card/50 border-border/50 shadow-sm">
                    <CardContent className="p-3 sm:p-4 md:p-5">
                      <div className="flex flex-col items-center gap-2 md:gap-3 text-center">
                        <span className="font-semibold  text-xs sm:text-sm md:text-base leading-tight">
                          Lovable
                        </span>
                        {getValueBadge(
                          row.lovable.value as 'Low' | 'Mid' | 'High',
                          row.lovable.sentiment
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Kosuke - Featured (Middle) */}
                  <Card className="bg-linear-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 shadow-sm">
                    <CardContent className="p-3 sm:p-4 md:p-5">
                      <div className="flex flex-col items-center gap-2 md:gap-3 text-center">
                        <span className="font-bold  text-emerald-600 text-xs sm:text-sm md:text-base leading-tight">
                          Kosuke
                        </span>
                        {getValueBadge(
                          row.kosuke.value as 'Low' | 'Mid' | 'High',
                          row.kosuke.sentiment
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Software Agency */}
                  <Card className="bg-card/50 border-border/50 shadow-sm">
                    <CardContent className="p-3 sm:p-4 md:p-5">
                      <div className="flex flex-col items-center gap-2 md:gap-3 text-center">
                        <span className="font-semibold  text-xs sm:text-sm md:text-base leading-tight">
                          Agency
                        </span>
                        {getValueBadge(
                          row.agency.value as 'Low' | 'Mid' | 'High',
                          row.agency.sentiment
                        )}
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
