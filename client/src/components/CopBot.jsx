import React from 'react';
import { motion } from 'framer-motion';
import { TypeAnimation } from 'react-type-animation';

export default function CopBot({ currentState = 'idle', onClick }) {
  const terminalText = {
    idle: "> Standing by...",
    thinking: "> Analyzing...",
    typing: "> Generating...",
    happy: "> Secure!",
    error: "> Error!",
  };

  // Bot colors based on state
  const getColors = () => {
    switch (currentState) {
      case 'error': return { main: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' }; // Red
      case 'happy': return { main: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)' }; // Green
      case 'thinking':
      case 'typing': return { main: '#f59e0b', glow: 'rgba(245, 158, 11, 0.4)' }; // Amber
      default: return { main: '#3b82f6', glow: 'rgba(59, 130, 246, 0.4)' }; // Blue
    }
  };

  const colors = getColors();

  return (
    <div 
      className="relative cursor-pointer" 
      onClick={onClick}
      style={{ width: '80px', height: '90px' }}
      title="Click to open Zia"
    >
      {/* Container for bobbing animation */}
      <motion.div
        className="w-full h-full relative flex items-center justify-center"
        animate={{ 
          y: currentState === 'error' ? [0, -2, 2, -2, 0] : [0, -3, 0],
          rotate: currentState === 'thinking' ? [0, -2, 2, 0] : 0 
        }}
        transition={{ 
          duration: currentState === 'error' ? 0.4 : 2.5, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        {/* Glow behind bot */}
        <motion.div 
          className="absolute inset-0 rounded-full blur-md z-0"
          animate={{ backgroundColor: colors.glow }}
          transition={{ duration: 0.5 }}
        />

        {/* SVG Bot Construction */}
        <svg viewBox="0 0 100 120" className="w-full h-full z-10 drop-shadow-xl">
          <defs>
            <filter id="outline" x="-20%" y="-20%" width="140%" height="140%">
              <feMorphology in="SourceAlpha" result="DILATED" operator="dilate" radius="1.5" />
              <feFlood floodColor="rgba(0,0,0,0.5)" result="COLOR" />
              <feComposite in="COLOR" in2="DILATED" operator="in" result="OUTLINE" />
              <feMerge>
                <feMergeNode in="OUTLINE" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g filter="url(#outline)">
            {/* Cloud Bumps for Head */}
            <motion.circle cx="35" cy="30" r="18" fill={colors.main} animate={{ fill: colors.main }} transition={{ duration: 0.3 }} />
            <motion.circle cx="65" cy="30" r="18" fill={colors.main} animate={{ fill: colors.main }} transition={{ duration: 0.3 }} />
            <motion.circle cx="50" cy="22" r="22" fill={colors.main} animate={{ fill: colors.main }} transition={{ duration: 0.3 }} />
            
            {/* Main Head Base */}
            <motion.rect x="15" y="30" width="70" height="45" rx="18" fill={colors.main} animate={{ fill: colors.main }} transition={{ duration: 0.3 }} />

            {/* Body */}
            <motion.rect x="32" y="70" width="36" height="28" rx="14" fill={colors.main} animate={{ fill: colors.main }} transition={{ duration: 0.3 }} />
            
            {/* Legs */}
            <motion.rect x="38" y="92" width="10" height="15" rx="5" fill={colors.main} animate={{ fill: colors.main }} transition={{ duration: 0.3 }} />
            <motion.rect x="52" y="92" width="10" height="15" rx="5" fill={colors.main} animate={{ fill: colors.main }} transition={{ duration: 0.3 }} />

            {/* Arms */}
            <motion.rect 
              x="22" y="72" width="10" height="22" rx="5" fill={colors.main} 
              transform="rotate(15, 27, 83)" 
              animate={{ fill: colors.main, rotate: currentState === 'happy' ? [15, 45, 15] : 15 }} 
              transition={{ duration: 0.5 }}
            />
            <motion.rect 
              x="68" y="72" width="10" height="22" rx="5" fill={colors.main} 
              transform="rotate(-15, 73, 83)" 
              animate={{ fill: colors.main, rotate: currentState === 'happy' ? [-15, -45, -15] : -15 }} 
              transition={{ duration: 0.5 }}
            />
          </g>

          {/* Screen / Visor (Rendered outside the outline filter so it doesn't get a border if we don't want it, or we can just keep it crisp) */}
          <rect x="25" y="38" width="50" height="30" rx="8" fill="#020617" stroke="#1e293b" strokeWidth="1" />
          
          {/* Blinking Eyes (Only for idle/happy/error) */}
          {(currentState === 'idle' || currentState === 'happy' || currentState === 'error') && (
            <motion.g 
              animate={{ opacity: [1, 1, 0, 1] }} 
              transition={{ duration: 4, times: [0, 0.95, 0.97, 1], repeat: Infinity }}
            >
              {/* Cute pill-shaped eyes */}
              <ellipse cx="40" cy="53" rx="3" ry="5" fill={currentState === 'error' ? '#ef4444' : '#00e5ff'} />
              <ellipse cx="60" cy="53" rx="3" ry="5" fill={currentState === 'error' ? '#ef4444' : '#00e5ff'} />
            </motion.g>
          )}
        </svg>

        {/* Terminal Face Overlay (Inside the Visor for thinking/typing) */}
        {(currentState === 'thinking' || currentState === 'typing') && (
          <div className="absolute top-[37%] left-[30%] w-[40%] h-[20%] z-20 flex items-center justify-start overflow-hidden">
            <motion.div 
              className="w-full flex justify-center gap-[3px]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ animationDelay: '0.2s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" style={{ animationDelay: '0.4s' }} />
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
