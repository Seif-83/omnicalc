/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CalculusEngine } from '../../services/mathEngine';
import { CalculusResult } from '../../types/calculator';
import { MathRenderer } from '../common/MathRenderer';
import { 
  Calculator, Sparkles, ArrowRight, CheckCircle2, 
  HelpCircle, Copy, Check, RefreshCw 
} from 'lucide-react';

export const CalculusSolver: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'derivative' | 'integral' | 'limit' | 'taylor' | 'critical' | 'ode'>('derivative');

  // Form states
  const [expression, setExpression] = useState('x^3 * sin(x)');
  const [variable, setVariable] = useState('x');
  const [order, setOrder] = useState(1);

  // Integration specific
  const [isDefinite, setIsDefinite] = useState(true);
  const [boundA, setBoundA] = useState(0);
  const [boundB, setBoundB] = useState(3.14159);

  // Limit specific
  const [limitPoint, setLimitPoint] = useState(0);
  const [limitDir, setLimitDir] = useState<'both' | 'left' | 'right'>('both');

  // Taylor series specific
  const [taylorCenter, setTaylorCenter] = useState(0);
  const [taylorOrder, setTaylorOrder] = useState(4);

  // Critical points range
  const [critMin, setCritMin] = useState(-5);
  const [critMax, setCritMax] = useState(5);

  // ODE specific
  const [odeExpr, setOdeExpr] = useState('x - y');
  const [odeX0, setOdeX0] = useState(0);
  const [odeY0, setOdeY0] = useState(1);
  const [odeXTarget, setOdeXTarget] = useState(3);

  // Results
  const [result, setResult] = useState<CalculusResult | null>(() => {
    return CalculusEngine.differentiate('x^3 * sin(x)', 'x', 1);
  });

  const [copied, setCopied] = useState(false);

  // Solve based on active tab
  const handleSolve = () => {
    switch (activeTab) {
      case 'derivative':
        setResult(CalculusEngine.differentiate(expression, variable, order));
        break;
      case 'integral':
        setResult(CalculusEngine.integrate(expression, variable, isDefinite, boundA, boundB));
        break;
      case 'limit':
        setResult(CalculusEngine.limit(expression, variable, limitPoint, limitDir));
        break;
      case 'taylor':
        setResult(CalculusEngine.taylorSeries(expression, variable, taylorCenter, taylorOrder));
        break;
      case 'critical':
        setResult(CalculusEngine.analyzeCriticalPoints(expression, variable, critMin, critMax));
        break;
      case 'ode': {
        const odeRes = CalculusEngine.solveODE(odeExpr, odeX0, odeY0, odeXTarget);
        setResult({
          problemType: 'ode',
          inputLatex: `\\frac{dy}{dx} = ${odeExpr}, \\quad y(${odeX0}) = ${odeY0}`,
          resultLatex: odeRes.resultLatex,
          steps: [
            {
              title: 'Initial Value Problem Setup',
              description: `Solve the first-order differential equation with initial condition $y(${odeX0}) = ${odeY0}$ up to $x = ${odeXTarget}$.`,
              latex: `\\frac{dy}{dx} = ${odeExpr}, \\quad y(${odeX0}) = ${odeY0}`,
            },
            {
              title: 'Runge-Kutta 4th Order (RK4) Integration',
              description: 'Compute weighted slopes $k_1, k_2, k_3, k_4$ across intervals with local error truncation $O(h^5)$.',
              latex: 'y_{n+1} = y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4)',
              rule: 'Classical RK4 Quadrature',
            },
            {
              title: 'Approximated Numerical Value',
              description: `At target $x = ${odeXTarget}$:`,
              latex: odeRes.resultLatex,
            },
          ],
          additionalInfo: odeRes.trajectory.slice(-5).map((pt, i) => ({
            label: `Step ${i + 1}`,
            value: `x = ${pt.x.toFixed(2)}, y = ${pt.y.toFixed(4)}`,
          })),
        });
        break;
      }
    }
  };

  // Presets for quick switching
  const applyPreset = (preset: {
    tab: typeof activeTab;
    expr: string;
    var?: string;
    extra?: Record<string, any>;
  }) => {
    setActiveTab(preset.tab);
    setExpression(preset.expr);
    if (preset.var) setVariable(preset.var);
    if (preset.extra) {
      if (preset.extra.order) setOrder(preset.extra.order);
      if (preset.extra.isDefinite !== undefined) setIsDefinite(preset.extra.isDefinite);
      if (preset.extra.boundA !== undefined) setBoundA(preset.extra.boundA);
      if (preset.extra.boundB !== undefined) setBoundB(preset.extra.boundB);
      if (preset.extra.limitPoint !== undefined) setLimitPoint(preset.extra.limitPoint);
      if (preset.extra.taylorOrder !== undefined) setTaylorOrder(preset.extra.taylorOrder);
      if (preset.extra.odeExpr) setOdeExpr(preset.extra.odeExpr);
    }
    setTimeout(() => {
      handleSolve();
    }, 50);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Left Input Configuration Column */}
      <div className="w-full lg:w-[420px] bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
            ∫
          </div>
          <div>
            <h2 className="font-semibold text-sm text-white">Calculus Problem Solver</h2>
            <p className="text-xs text-slate-400">Step-by-step symbolic & numerical engine</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 mb-5 text-xs">
          {[
            { id: 'derivative', label: 'Derivative' },
            { id: 'integral', label: 'Integral' },
            { id: 'limit', label: 'Limits' },
            { id: 'taylor', label: 'Taylor Series' },
            { id: 'critical', label: 'Extrema / Roots' },
            { id: 'ode', label: 'ODE (RK4)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
              }}
              className={`py-1.5 px-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input Parameters based on Active Tab */}
        <div className="space-y-4">
          {activeTab !== 'ode' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Mathematical Expression <span className="text-slate-500 font-mono">f(x)</span>
              </label>
              <input
                type="text"
                value={expression}
                onChange={(e) => setExpression(e.target.value)}
                placeholder="e.g. x^3 * sin(x)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              />
              <div className="mt-1 text-[11px] text-slate-400">
                Supports <code className="text-cyan-400 font-mono">sin, cos, exp, log, sqrt, ^, *, +, -</code>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                First-Order ODE <span className="text-slate-500 font-mono">dy/dx = f(x, y)</span>
              </label>
              <input
                type="text"
                value={odeExpr}
                onChange={(e) => setOdeExpr(e.target.value)}
                placeholder="e.g. x - y or sin(x) + y"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {/* Tab Specific Options */}
          {activeTab === 'derivative' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Variable</label>
                <input
                  type="text"
                  value={variable}
                  onChange={(e) => setVariable(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Derivative Order: {order}
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 mt-2"
                />
              </div>
            </div>
          )}

          {activeTab === 'integral' && (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="intType"
                    checked={!isDefinite}
                    onChange={() => setIsDefinite(false)}
                    className="text-cyan-500"
                  />
                  <span>Indefinite ∫ f(x) dx</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="intType"
                    checked={isDefinite}
                    onChange={() => setIsDefinite(true)}
                    className="text-cyan-500"
                  />
                  <span>Definite ∫ₐᵇ f(x) dx</span>
                </label>
              </div>

              {isDefinite && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Lower Bound (a)</label>
                    <input
                      type="number"
                      step="any"
                      value={boundA}
                      onChange={(e) => setBoundA(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Upper Bound (b)</label>
                    <input
                      type="number"
                      step="any"
                      value={boundB}
                      onChange={(e) => setBoundB(parseFloat(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'limit' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Approaching Point (c)</label>
                <input
                  type="number"
                  step="any"
                  value={limitPoint}
                  onChange={(e) => setLimitPoint(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Direction</label>
                <select
                  value={limitDir}
                  onChange={(e) => setLimitDir(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="both">Both sides (Two-sided)</option>
                  <option value="left">Left side (x → c⁻)</option>
                  <option value="right">Right side (x → c⁺)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'taylor' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Center Point (a)</label>
                <input
                  type="number"
                  step="any"
                  value={taylorCenter}
                  onChange={(e) => setTaylorCenter(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Polynomial Degree: {taylorOrder}
                </label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={taylorOrder}
                  onChange={(e) => setTaylorOrder(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 mt-2"
                />
              </div>
            </div>
          )}

          {activeTab === 'critical' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Search Interval Min</label>
                <input
                  type="number"
                  value={critMin}
                  onChange={(e) => setCritMin(parseFloat(e.target.value) || -10)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Search Interval Max</label>
                <input
                  type="number"
                  value={critMax}
                  onChange={(e) => setCritMax(parseFloat(e.target.value) || 10)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
                />
              </div>
            </div>
          )}

          {activeTab === 'ode' && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">x₀</label>
                <input
                  type="number"
                  value={odeX0}
                  onChange={(e) => setOdeX0(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">y(x₀)</label>
                <input
                  type="number"
                  value={odeY0}
                  onChange={(e) => setOdeY0(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Target x</label>
                <input
                  type="number"
                  value={odeXTarget}
                  onChange={(e) => setOdeXTarget(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs font-mono text-white"
                />
              </div>
            </div>
          )}

          {/* Solve Button */}
          <button
            onClick={handleSolve}
            className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4" />
            Calculate & Show Steps
          </button>
        </div>

        {/* Quick Famous Calculus Benchmarks */}
        <div className="mt-8 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
            Famous Problem Presets
          </h3>
          <div className="space-y-1.5">
            {[
              {
                title: 'Product & Chain: x³ sin(x)',
                action: () => applyPreset({ tab: 'derivative', expr: 'x^3 * sin(x)' }),
              },
              {
                title: 'Quotient Rule: eˣ / (x² + 1)',
                action: () => applyPreset({ tab: 'derivative', expr: 'exp(x) / (x^2 + 1)' }),
              },
              {
                title: 'Definite: ∫₀^π sin²(x) dx',
                action: () => applyPreset({ tab: 'integral', expr: 'sin(x)^2', extra: { isDefinite: true, boundA: 0, boundB: Math.PI } }),
              },
              {
                title: 'Gaussian Bell: ∫₀¹ e^(-x²) dx',
                action: () => applyPreset({ tab: 'integral', expr: 'exp(-x^2)', extra: { isDefinite: true, boundA: 0, boundB: 1 } }),
              },
              {
                title: 'Indeterminate: lim_{x→0} sin(x)/x',
                action: () => applyPreset({ tab: 'limit', expr: 'sin(x)/x', extra: { limitPoint: 0 } }),
              },
              {
                title: 'Taylor Exp: sin(x) at a=0 (N=5)',
                action: () => applyPreset({ tab: 'taylor', expr: 'sin(x)', extra: { taylorCenter: 0, taylorOrder: 5 } }),
              },
              {
                title: 'Extrema: x³ - 3x² + 2',
                action: () => applyPreset({ tab: 'critical', expr: 'x^3 - 3*x^2 + 2' }),
              },
            ].map((p, idx) => (
              <button
                key={idx}
                onClick={p.action}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/60 text-xs text-slate-300 hover:text-white transition-colors flex items-center justify-between"
              >
                <span>{p.title}</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-500 opacity-60" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Step-by-Step Mathematical Walkthrough */}
      <div className="flex-1 h-full overflow-y-auto p-6 lg:p-8 space-y-6">
        {result ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Hero Result Banner */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3 text-xs text-cyan-400 font-mono">
                <span className="uppercase tracking-wider">Solution Result</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.resultLatex);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy LaTeX'}</span>
                </button>
              </div>

              <div className="text-xl sm:text-2xl font-serif text-white py-2 overflow-x-auto">
                <MathRenderer math={result.resultLatex} block />
              </div>

              {result.additionalInfo && result.additionalInfo.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {result.additionalInfo.map((info, idx) => (
                    <div key={idx} className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-xs">
                      <div className="text-slate-400 text-[11px]">{info.label}</div>
                      <div className="font-mono text-cyan-300 font-medium truncate mt-0.5">{info.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Step-by-Step Card Flow */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Detailed Step-by-Step Derivation
                </h3>
                <span className="text-xs text-slate-400">{result.steps.length} Steps</span>
              </div>

              {result.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md space-y-3 relative group hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="text-sm font-medium text-slate-100">{step.title}</h4>
                    </div>
                    {step.rule && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                        {step.rule}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{step.description}</p>

                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 overflow-x-auto text-cyan-200">
                    <MathRenderer math={step.latex} block showCopy />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 space-y-3">
            <Calculator className="w-12 h-12 text-slate-600 stroke-[1.5]" />
            <p className="text-sm">Configure your problem on the left and click "Calculate & Show Steps"</p>
          </div>
        )}
      </div>
    </div>
  );
};
