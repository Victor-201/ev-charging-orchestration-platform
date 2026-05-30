'use client';

import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/core/utils/cn';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  showShine?: boolean;
  showMarkers?: boolean;
}

export default function GlassCard({
  children,
  showShine = true,
  showMarkers = true,
  className,
  style,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      className={cn(
        'relative overflow-hidden glass-card glass-shine',
        className
      )}
      style={{
        background: 'var(--card-bg)',
        backdropFilter: 'blur(60px)',
        WebkitBackdropFilter: 'blur(60px)',
        border: '1.5px solid var(--card-border)',
        borderRadius: '36px',
        boxShadow: 'var(--card-shadow)',
        transition: 'background-color 0.4s ease, border-color 0.4s ease, box-shadow 0.4s ease',
        ...style,
      }}
      {...props}
    >
      {/* HUD Corner Markers */}
      {showMarkers && (
        <>
          <div className="corner-marker cm-tl" />
          <div className="corner-marker cm-tr" />
          <div className="corner-marker cm-bl" />
          <div className="corner-marker cm-br" />
        </>
      )}

      {/* Shine overlay */}
      {showShine && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-[36px]"
          style={{ background: 'var(--sq-shine)' }}
        />
      )}

      {/* Inner Content Container */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
