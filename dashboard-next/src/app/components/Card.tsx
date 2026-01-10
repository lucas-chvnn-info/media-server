"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Card({ children, className, href, fanart, color, isDark }: any) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <motion.a 
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[2rem] border p-6 md:p-8 backdrop-blur-3xl transition-all duration-500 hover:shadow-xl",
        isDark 
          ? "border-white/10 bg-zinc-900/40 hover:border-white/20" 
          : "border-black/5 bg-white/60 hover:border-black/10 hover:bg-white/80",
        className
      )}
      style={fanart ? {
        backgroundImage: `url('${fanart}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : {}}
    >
        {/* Glow Effect */}
        <motion.div
            className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-300 group-hover:opacity-100"
            style={{
            background: useMotionTemplate`
                radial-gradient(
                650px circle at ${mouseX}px ${mouseY}px,
                ${color ? color + (isDark ? '40' : '20') : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)')},
                transparent 80%
                )
            `,
            }}
        />

        {/* Dark overlay for fanart readability */}
        {fanart && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20 z-0 transition-opacity duration-500 group-hover:via-black/40"></div>
        )}
        
        {/* Noise Texture */}
        {isDark && <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay"></div>}

        <div className="relative z-10 h-full w-full">
            {children}
        </div>
    </motion.a>
  );
}
