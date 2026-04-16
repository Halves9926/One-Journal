'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

import { cx } from '@/lib/utils';

type RevealProps = PropsWithChildren<{
  className?: string;
  delay?: number;
  once?: boolean;
  y?: number;
}>;

export function Reveal({
  children,
  className,
  delay = 0,
  once = true,
  y = 22,
}: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ amount: 0.2, once }}
      transition={{
        duration: 0.68,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type HoverLiftProps = PropsWithChildren<{
  className?: string;
  lift?: number;
  scale?: number;
}>;

export function HoverLift({
  children,
  className,
  lift = -6,
  scale = 1.01,
}: HoverLiftProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      whileHover={{ y: lift, scale }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cx('transform-gpu', className)}
    >
      {children}
    </motion.div>
  );
}

