'use client';

import { motion } from 'framer-motion';
import React from 'react';

import ChatInput from '@/app/(logged-out)/home/components/chat-input';

export default function Home() {
  return (
    <>
      <motion.div
        className="flex flex-col items-center justify-center gap-2 w-full max-w-3xl mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="text-4xl md:text-6xl text-center text-foreground leading-tight md:leading-tight mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          Build your next web project with AI
        </motion.h1>

        <motion.p
          className="text-lg md:text-xl text-center text-muted-foreground max-w-2xl mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          Describe what you want to build, and our AI will help you create it.
        </motion.p>
      </motion.div>

      <div className="w-full max-w-3xl">
        <ChatInput />
      </div>
    </>
  );
}
