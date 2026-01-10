"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Clock() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    if (!time) return <div className="h-10 w-40 bg-white/5 animate-pulse rounded-full" />;

    return (
        <div className="flex flex-col">
            <motion.h1 
                key={time.getMinutes()} // Animate on minute change
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-5xl md:text-7xl font-black tracking-tighter leading-none bg-clip-text text-transparent bg-gradient-to-br from-zinc-800 to-zinc-400 dark:from-white dark:to-zinc-500 font-mono"
            >
                {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </motion.h1>
            <div className="flex items-center gap-2 pl-1 mt-1">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-sm md:text-lg font-bold text-zinc-500 dark:text-zinc-400 capitalize tracking-wide">
                    {time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>
        </div>
    );
}
