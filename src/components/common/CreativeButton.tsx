/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback } from 'react';

export type ButtonVariant = 
  | 'number' 
  | 'operator' 
  | 'action' 
  | 'equals' 
  | 'scientific' 
  | 'toggle' 
  | 'secondary';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface CreativeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isActive?: boolean;
  subLabel?: string;
  enableSound?: boolean;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  dx: string;
  dy: string;
  color: string;
}

// Global audio context singleton for tactile click sound
let audioCtx: AudioContext | null = null;

function playKeySound() {
  try {
    if (!audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    if (audioCtx) {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, audioCtx.currentTime + 0.035);
      gain.gain.setValueAtTime(0.09, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.035);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    }
  } catch {
    // Ignore audio restriction errors
  }
}

export const CreativeButton: React.FC<CreativeButtonProps> = ({
  children,
  variant = 'number',
  size = 'md',
  isActive = false,
  subLabel,
  enableSound = false,
  className = '',
  onClick,
  ...props
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50, isHovered: false });
  const [isFlashing, setIsFlashing] = useState(false);

  // Track mouse coordinates for cursor-following specular spotlight
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isHovered: true,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setMousePos((prev) => ({ ...prev, isHovered: true }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePos((prev) => ({ ...prev, isHovered: false }));
  }, []);

  // Variant styles and spotlight colors
  const getVariantStyles = () => {
    switch (variant) {
      case 'number':
        return {
          base: 'bg-slate-900/90 text-slate-100 border-slate-800 hover:border-cyan-400/80 hover:text-white shadow-md hover:shadow-cyan-950/50',
          spotlightColor: 'rgba(56, 189, 248, 0.25)',
          rippleColor: 'rgba(56, 189, 248, 0.55)',
          particleColor: '#38bdf8',
          glowRing: 'group-hover:ring-1 group-hover:ring-cyan-500/40',
        };
      case 'operator':
        return {
          base: 'bg-slate-900/95 text-cyan-400 font-semibold border-cyan-900/50 hover:border-cyan-300 hover:text-cyan-100 hover:bg-cyan-950/40 shadow-md',
          spotlightColor: 'rgba(34, 211, 238, 0.32)',
          rippleColor: 'rgba(34, 211, 238, 0.65)',
          particleColor: '#22d3ee',
          glowRing: 'group-hover:ring-1 group-hover:ring-cyan-400/50',
        };
      case 'action':
        return {
          base: 'bg-rose-950/25 text-rose-300 font-bold border-rose-900/40 hover:border-rose-400 hover:bg-rose-950/50 hover:text-rose-100 shadow-md',
          spotlightColor: 'rgba(244, 63, 94, 0.35)',
          rippleColor: 'rgba(244, 63, 94, 0.7)',
          particleColor: '#f43f5e',
          glowRing: 'group-hover:ring-1 group-hover:ring-rose-500/40',
        };
      case 'equals':
        return {
          base: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-black border-cyan-300/80 hover:from-cyan-400 hover:to-blue-500 hover:border-white shadow-xl shadow-cyan-500/30 hover:shadow-cyan-400/60',
          spotlightColor: 'rgba(255, 255, 255, 0.48)',
          rippleColor: 'rgba(255, 255, 255, 0.8)',
          particleColor: '#ffffff',
          glowRing: 'ring-1 ring-cyan-300/60 hover:ring-2 hover:ring-white',
        };
      case 'scientific':
        return {
          base: 'bg-slate-900/80 text-violet-300 border-slate-800 hover:border-violet-400/70 hover:text-violet-100 hover:bg-violet-950/30 shadow-sm',
          spotlightColor: 'rgba(168, 85, 247, 0.3)',
          rippleColor: 'rgba(168, 85, 247, 0.6)',
          particleColor: '#c084fc',
          glowRing: 'group-hover:ring-1 group-hover:ring-violet-500/30',
        };
      case 'toggle':
        return {
          base: isActive
            ? 'bg-amber-500 text-slate-950 font-bold border-amber-300 shadow-lg shadow-amber-500/30'
            : 'bg-slate-900/90 text-amber-300 border-slate-800 hover:border-amber-400/70 hover:text-amber-200 hover:bg-amber-950/20',
          spotlightColor: 'rgba(245, 158, 11, 0.35)',
          rippleColor: 'rgba(245, 158, 11, 0.65)',
          particleColor: '#fbbf24',
          glowRing: 'group-hover:ring-1 group-hover:ring-amber-400/40',
        };
      case 'secondary':
      default:
        return {
          base: 'bg-slate-900/70 text-slate-300 border-slate-800 hover:border-slate-500 hover:text-white',
          spotlightColor: 'rgba(148, 163, 184, 0.25)',
          rippleColor: 'rgba(148, 163, 184, 0.5)',
          particleColor: '#94a3b8',
          glowRing: 'group-hover:ring-1 group-hover:ring-slate-600/30',
        };
    }
  };

  const { base, spotlightColor, rippleColor, particleColor, glowRing } = getVariantStyles();

  // Handle interactive click with dynamic shockwave ripple and particle burst
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const validX = Number.isFinite(x) ? x : rect.width / 2;
      const validY = Number.isFinite(y) ? y : rect.height / 2;

      // 1. Shockwave Ripple
      const newRipple: Ripple = {
        id: Date.now() + Math.random(),
        x: validX,
        y: validY,
      };

      setRipples((prev) => [...prev.slice(-3), newRipple]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
      }, 600);

      // 2. Micro Sparkle Particles
      const newParticles: Particle[] = Array.from({ length: 5 }, (_, i) => {
        const angle = (i * (360 / 5) + Math.random() * 30) * (Math.PI / 180);
        const dist = 30 + Math.random() * 25;
        return {
          id: Date.now() + Math.random() + i,
          x: validX,
          y: validY,
          dx: `${Math.cos(angle) * dist}px`,
          dy: `${Math.sin(angle) * dist}px`,
          color: particleColor,
        };
      });

      setParticles((prev) => [...prev.slice(-10), ...newParticles]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => !newParticles.some((np) => np.id === p.id)));
      }, 500);

      // 3. Trigger flash burst
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 350);

      if (enableSound) {
        playKeySound();
      }
    }

    if (onClick) {
      onClick(e);
    }
  };

  // Size specifications
  const getSizeStyles = () => {
    switch (size) {
      case 'xl':
        return 'h-16 sm:h-20 text-2xl sm:text-3xl rounded-2xl';
      case 'lg':
        return 'h-13 sm:h-16 text-lg sm:text-2xl rounded-xl sm:rounded-2xl';
      case 'md':
        return 'h-10 sm:h-12 text-xs sm:text-sm rounded-xl';
      case 'sm':
      default:
        return 'h-8 sm:h-9 text-xs rounded-lg sm:rounded-xl';
    }
  };

  const sizeClass = getSizeStyles();

  return (
    <button
      ref={buttonRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`group relative overflow-hidden flex flex-col items-center justify-center select-none border transition-all duration-200 cursor-pointer 
        hover:-translate-y-0.5 active:translate-y-0.5 active:scale-[0.93] 
        ${base} ${sizeClass} ${glowRing} ${className}`}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Hover Mesh */}
      {mousePos.isHovered && (
        <span
          className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          style={{
            background: `radial-gradient(110px circle at ${mousePos.x}px ${mousePos.y}px, ${spotlightColor}, transparent 75%)`,
          }}
        />
      )}

      {/* Dynamic Click Flash Burst */}
      {isFlashing && (
        <span
          className="pointer-events-none absolute inset-0 animate-click-flash"
          style={{
            background: `radial-gradient(circle, ${rippleColor} 0%, transparent 80%)`,
          }}
        />
      )}

      {/* Dynamic Coordinates-Based Expanding Ripples */}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="pointer-events-none absolute rounded-full animate-ripple-wave"
          style={{
            left: `${ripple.x}px`,
            top: `${ripple.y}px`,
            width: '120px',
            height: '120px',
            backgroundColor: rippleColor,
            boxShadow: `0 0 25px ${rippleColor}`,
          }}
        />
      ))}

      {/* Dynamic Sparkle Burst Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="pointer-events-none absolute w-1.5 h-1.5 rounded-full animate-particle z-20"
          style={
            {
              left: `${p.x}px`,
              top: `${p.y}px`,
              backgroundColor: p.color,
              boxShadow: `0 0 8px ${p.color}`,
              '--dx': p.dx,
              '--dy': p.dy,
            } as React.CSSProperties
          }
        />
      ))}

      {/* Button Content */}
      <span className="relative z-10 flex items-center justify-center gap-1 transition-transform group-hover:scale-105 duration-200">
        {children}
      </span>

      {/* Optional sublabel for 2nd or inverse function */}
      {subLabel && (
        <span className="relative z-10 text-[9px] font-mono leading-none text-slate-400 group-hover:text-cyan-300 transition-colors mt-0.5">
          {subLabel}
        </span>
      )}
    </button>
  );
};
