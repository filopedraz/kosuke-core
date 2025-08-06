'use client';

import { motion } from 'framer-motion';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Code2, 
  GitBranch, 
  Zap, 
  ArrowRight, 
  ExternalLink,
  Sparkles,
  MessageCircle
} from 'lucide-react';

export default function Home() {
  const handleJoinAlpha = () => {
    window.open('https://www.linkedin.com/in/filippo-pedrazzini-a5083b242/', '_blank');
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Subtle background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-background" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6">
        <div className="container mx-auto max-w-4xl text-center">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Badge
              variant="outline"
              className="mb-8 px-3 py-1 text-sm font-mono bg-blue-500/10 border-blue-500/20 text-blue-600 hover:bg-blue-500/20 transition-all duration-300 cursor-default"
            >
              <Sparkles className="w-3 h-3 mr-2" />
              Private Alpha
            </Badge>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            className="text-5xl md:text-7xl font-bold mb-8 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Enabling
            <br />
            <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Collaboration
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            No more bullshit vibe-coding platforms promising to go to the moon. 
            Let's be honest and real. We need developers to ship end-to-end products. 
            But... <span className="text-foreground font-semibold">we can have non-developers contribute aggressively.</span>
            <br />
            <span className="text-lg text-muted-foreground/80 mt-4 block">
              This is a game changer.
            </span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Button
              size="lg"
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg"
              onClick={handleJoinAlpha}
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Join Private Alpha
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="px-8 py-4 font-semibold text-lg"
              onClick={handleJoinAlpha}
            >
              Contact on LinkedIn
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>

          {/* Contact Info */}
          <motion.p
            className="text-sm text-muted-foreground font-mono"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            Reach out to <span className="text-foreground">Filippo Pedrazzini</span> for access
          </motion.p>
        </div>
      </section>

      {/* Key Message */}
      <section className="py-24 px-4 sm:px-6 bg-muted/30">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              A developer centric experience for a bottom up first principles based experience.
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Any non-dev can now collaborate on the same repo.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Simple Features */}
      <section className="py-24 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-4">
              How it works
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Code2,
                title: "Developer Focused",
                description: "Built by developers, for developers. No compromise on technical excellence."
              },
              {
                icon: Users,
                title: "Non-Dev Friendly",
                description: "Enable your entire team to contribute meaningfully to the same codebase."
              },
              {
                icon: GitBranch,
                title: "Same Repo",
                description: "Everyone works on the same repository with proper collaboration tools."
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full border border-border/50 bg-card/30 hover:bg-card/60 transition-all duration-300">
                  <CardContent className="p-8 text-center">
                    <div className="inline-flex p-3 rounded-lg bg-blue-500/10 text-blue-500 mb-6">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h4 className="text-lg font-semibold mb-3">
                      {feature.title}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 sm:px-6 bg-muted/20">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              Ready to enable real collaboration?
            </h3>
            <p className="text-lg text-muted-foreground mb-8">
              Join the private alpha and be part of the first wave of teams revolutionizing how developers and non-developers work together.
            </p>
            
            <Button
              size="lg"
              className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg"
              onClick={handleJoinAlpha}
            >
              <Zap className="mr-2 h-5 w-5" />
              Get Alpha Access
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <p className="text-sm text-muted-foreground mt-6 font-mono">
              Contact Filippo Pedrazzini on LinkedIn for immediate access
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
