/**
 * App Template
 *
 * Wraps all pages with elegant fade-in animations.
 * Creates smooth transitions between pages throughout the app.
 *
 * Features:
 * - Fade-in animation on page load
 * - Smooth opacity transitions
 * - Minimal motion for performance
 */

'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
