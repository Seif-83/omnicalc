/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { Graph2DFunction, AppMode } from '../../types/calculator';

interface PresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect2DPreset: (preset: Graph2DFunction[]) => void;
  onSwitchMode: (mode: AppMode) => void;
}

export const PresetsModal: React.FC<PresetsModalProps> = ({
  isOpen,
  onClose,
  onSelect2DPreset,
  onSwitchMode,
}) => {
  if (!isOpen) return null;

  const presets2D: {
    title: string;
    subtitle: string;
    eq: string;
    functions: Graph2DFunction[];
  }[] = [
    {
      title: 'Damped Harmonic Oscillator',
      subtitle: 'Exponential decay envelope e^(-0.3x) * sin(3x)',
      eq: 'exp(-0.3*x) * sin(3*x)',
      functions: [
        {
          id: 'fn-p1',
          expression: 'exp(-0.3*x) * sin(3*x)',
          color: '#38bdf8',
          visible: true,
          showDerivative: true,
          showSecondDerivative: false,
          showIntegral: true,
          integralRange: [0, 6],
        },
        {
          id: 'fn-p2',
          expression: 'exp(-0.3*x)',
          color: '#f43f5e',
          visible: true,
          showDerivative: false,
          showSecondDerivative: false,
          showIntegral: false,
          integralRange: [0, 6],
        },
      ],
    },
    {
      title: 'Polynomial Extrema & Tangents',
      subtitle: 'Cubic curve with distinct local min, max, and inflection',
      eq: '0.2*x^3 - x^2 - 0.5*x + 2',
      functions: [
        {
          id: 'fn-p3',
          expression: '0.2*x^3 - x^2 - 0.5*x + 2',
          color: '#10b981',
          visible: true,
          showDerivative: true,
          showSecondDerivative: false,
          showIntegral: true,
          integralRange: [-1.5, 3.5],
        },
      ],
    },
    {
      title: 'Gaussian Normal Distribution',
      subtitle: 'Standard bell curve with integral area shading',
      eq: '(1/sqrt(2*pi)) * exp(-0.5*x^2)',
      functions: [
        {
          id: 'fn-p4',
          expression: '(1/sqrt(2*pi)) * exp(-0.5*x^2)',
          color: '#a855f7',
          visible: true,
          showDerivative: true,
          showSecondDerivative: false,
          showIntegral: true,
          integralRange: [-1.96, 1.96],
        },
      ],
    },
    {
      title: 'Trigonometric Resonance & Harmonics',
      subtitle: 'Superposition of fundamental and higher harmonics',
      eq: 'sin(x) + 0.5*sin(3*x) + 0.2*sin(5*x)',
      functions: [
        {
          id: 'fn-p5',
          expression: 'sin(x) + 0.5*sin(3*x) + 0.2*sin(5*x)',
          color: '#f59e0b',
          visible: true,
          showDerivative: true,
          showSecondDerivative: false,
          showIntegral: false,
          integralRange: [0, 6.28],
        },
      ],
    },
    {
      title: 'Area Between Two Curves',
      subtitle: 'Parabola intersecting line: x^2 - 2 vs 2 - x^2',
      eq: 'x^2 - 2 and 2 - x^2',
      functions: [
        {
          id: 'fn-p6',
          expression: '2 - x^2',
          color: '#06b6d4',
          visible: true,
          showDerivative: false,
          showSecondDerivative: false,
          showIntegral: true,
          integralRange: [-1.414, 1.414],
        },
        {
          id: 'fn-p7',
          expression: 'x^2 - 2',
          color: '#ec4899',
          visible: true,
          showDerivative: false,
          showSecondDerivative: false,
          showIntegral: true,
          integralRange: [-1.414, 1.414],
        },
      ],
    },
    {
      title: 'Rational Witch of Agnesi',
      subtitle: 'Smooth bell-shaped algebraic curve: 4 / (x^2 + 1)',
      eq: '4 / (x^2 + 1)',
      functions: [
        {
          id: 'fn-p8',
          expression: '4 / (x^2 + 1)',
          color: '#84cc16',
          visible: true,
          showDerivative: true,
          showSecondDerivative: false,
          showIntegral: true,
          integralRange: [-2, 2],
        },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Mathematical Curated Presets</h2>
              <p className="text-xs text-slate-400">Famous curves, calculus integrals, and waveforms</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset Cards */}
        <div className="p-6 overflow-y-auto space-y-3">
          <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
            Real-Time Graphing & Calculus Scenarios
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {presets2D.map((p, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onSelect2DPreset(p.functions);
                  onSwitchMode('2d-graph');
                  onClose();
                }}
                className="bg-slate-950/80 border border-slate-800/80 hover:border-cyan-500/60 rounded-xl p-4 cursor-pointer group transition-all hover:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {p.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{p.subtitle}</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono text-cyan-400">
                  <span className="truncate max-w-[200px]">{p.eq}</span>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
