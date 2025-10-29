'use client';

import { motion } from 'framer-motion';
import { Github, Linkedin, Twitter } from 'lucide-react';
import Link from 'next/link';

export default function Footer() {
  return (
    <motion.footer
      className="w-full mt-auto py-6 px-4 flex justify-center items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
    >
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 backdrop-blur-sm bg-background/30 px-6 py-5 sm:py-3 rounded-2xl sm:rounded-full border-0 sm:border sm:border-border/30">
        {/* Legal Links */}
        <div className="flex items-center gap-4 text-base sm:text-sm">
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground transition-colors duration-300 font-mono"
          >
            Terms
          </Link>
          <div className="hidden sm:block h-4 w-px bg-border/50"></div>
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground transition-colors duration-300 font-mono"
          >
            Privacy
          </Link>
        </div>

        {/* Separator - vertical on desktop only */}
        <div className="hidden sm:block h-4 w-px bg-border/40"></div>

        {/* Copyright and Social Icons Row */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Copyright */}
          <p className="text-base sm:text-sm text-muted-foreground font-light">
            © {new Date().getFullYear()}
          </p>

          {/* Separator - vertical on desktop only */}
          <div className="hidden sm:block h-4 w-px bg-border/40"></div>

          {/* Social Icons */}
          <div className="flex items-center gap-5 sm:gap-4">
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
              href="https://x.com/kosuke_vibe"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Twitter"
              className="group transition-all duration-300"
            >
              <Twitter className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all" />
            </Link>
            <Link
              href="https://www.linkedin.com/company/kosuke-ai/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="group transition-all duration-300"
            >
              <Linkedin className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-hover:scale-110 transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
