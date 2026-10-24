/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppMode } from '../../types/calculator';
import { 
  Box, TrendingUp, Calculator, Grid, Sparkles, 
  Layers, Maximize, HelpCircle 
} from 'lucide-react';

interface HeaderProps {
  currentMode: AppMode;
  onSelectMode: (mode: AppMode) => void;
  onOpenPresets: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  onOpenPresets,
}) => {
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const navItems: { mode: AppMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'scientific', label: 'Scientific Calc', icon: <Calculator className="w-4 h-4" /> },
    { mode: 'calculus', label: 'Calculus Solver', icon: <span className="font-serif italic font-bold">∫</span> },
    { mode: '2d-graph', label: '2D Grapher', icon: <TrendingUp className="w-4 h-4" /> },
    { mode: 'matrix', label: 'Matrix Engine', icon: <Grid className="w-4 h-4" /> },
  ];

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Brand Logo & Name */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
          <span className="font-serif font-black text-slate-950 text-base">Ω</span>
        </div>
        <div className="hidden sm:block">
          <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
            OmniCalc <span className="text-cyan-400 font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/50">PRO</span>
          </h1>
        </div>
      </div>

      {/* Main Navigation Mode Switcher */}
      <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => onSelectMode(item.mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              currentMode === item.mode
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-850'
            }`}
          >
            {item.icon}
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Right Tools: Presets & Fullscreen */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenPresets}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 transition-colors shadow-sm"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">Presets</span>
        </button>

        <button
          onClick={toggleFullScreen}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800"
          title="Toggle Fullscreen"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
