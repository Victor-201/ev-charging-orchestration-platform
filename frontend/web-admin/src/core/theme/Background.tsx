'use client';

import { motion } from 'framer-motion';

export default function Background() {
  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* Dynamic Grid Overlay */}
      <div className="absolute inset-0 grid-overlay" />
      
      {/* Scanline Grid Effect */}
      <div 
        className="absolute inset-0 w-full h-full opacity-[0.015]"
        style={{
          backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
          backgroundSize: '100% 4px, 6px 100%',
        }}
      />

      {/* Floating Aurora Blob 1: Cyan Glow */}
      <motion.div
        animate={{
          x: [0, 80, -40, 0],
          y: [0, -60, 40, 0],
          scale: [1, 1.25, 0.9, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[10%] left-[10%] w-[500px] h-[500px] rounded-full blur-[140px]"
        style={{
          background: 'radial-gradient(circle, rgba(16, 191, 201, 0.16) 0%, transparent 70%)',
        }}
      />

      {/* Floating Aurora Blob 2: Lime Glow */}
      <motion.div
        animate={{
          x: [0, -70, 50, 0],
          y: [0, 80, -60, 0],
          scale: [1, 0.85, 1.15, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute bottom-[10%] right-[10%] w-[550px] h-[550px] rounded-full blur-[140px]"
        style={{
          background: 'radial-gradient(circle, rgba(154, 237, 87, 0.1) 0%, transparent 70%)',
        }}
      />

      {/* Floating Aurora Blob 3: Blue Glow */}
      <motion.div
        animate={{
          x: [0, 50, -60, 0],
          y: [0, 50, 50, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[40%] left-[45%] w-[450px] h-[450px] rounded-full blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(102, 166, 255, 0.08) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
