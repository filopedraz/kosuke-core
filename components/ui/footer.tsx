'use client';

import { motion } from 'framer-motion';
import { Github, Linkedin, Twitter } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <motion.footer
      className="w-full mt-auto py-6 flex justify-center items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex items-center gap-6 backdrop-blur-sm bg-background/30 px-6 py-3 rounded-full border border-border/30">
        <p className="text-sm text-muted-foreground font-light">© {new Date().getFullYear()}</p>
        <div className="h-4 w-px bg-border/50"></div>
        <Link
          href="https://github.com/filopedraz/kosuke-core"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
          className="group transition-all duration-300"
        >
          <Github className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all" />
        </Link>
        <Link
          href="https://twitter.com/filopedraz"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Twitter"
          className="group transition-all duration-300"
        >
          <Twitter className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all" />
        </Link>
        <Link
          href="https://www.linkedin.com/in/filippo-pedrazzini-a5083b242/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LinkedIn"
          className="group transition-all duration-300"
        >
          <Linkedin className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all" />
        </Link>
      </div>
    </motion.footer>
  );
}
