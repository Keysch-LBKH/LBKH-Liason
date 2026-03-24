import React from 'react';
import { motion } from 'motion/react';

interface FooterProps {
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
}

export function Footer({ branding }: FooterProps) {
  return (
    <footer className="py-4 px-6 border-t border-white/5 bg-black/20 backdrop-blur-sm flex items-center justify-center gap-3">
      <a 
        href="https://lbkhsolutions.com" 
        target="_blank" 
        rel="noopener noreferrer"
        className="flex items-center gap-2 group transition-all hover:opacity-80"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white/60 transition-colors">
            Powered by LBKH.Solutions
          </span>
          <div className="relative w-4 h-4">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="48" fill={branding.primaryColor} fillOpacity="0.2" />
              <path 
                d="M35 25 C 35 20, 45 20, 45 25 L 45 75 C 45 80, 35 80, 35 75 Z" 
                fill={branding.primaryColor} 
              />
              <path 
                d="M55 25 C 55 20, 65 20, 65 25 L 65 75 C 65 80, 55 80, 55 75 Z" 
                fill={branding.primaryColor} 
              />
            </svg>
            <motion.div 
              className="absolute inset-0 rounded-full"
              animate={{ 
                boxShadow: [`0 0 0px ${branding.primaryColor}00`, `0 0 10px ${branding.primaryColor}40`, `0 0 0px ${branding.primaryColor}00`]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>
      </a>
    </footer>
  );
}
