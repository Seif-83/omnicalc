/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Graph2DFunction } from '../../types/calculator';
import { compileSafe, preprocessExpression } from '../../services/mathEngine';
import * as math from 'mathjs';
import { Plus, Trash2, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw, Crosshair } from 'lucide-react';
import { MathRenderer } from '../common/MathRenderer';

interface Grapher2DProps {
  functions: Graph2DFunction[];
  onUpdateFunctions: (funcs: Graph2DFunction[]) => void;
}

export const Grapher2D: React.FC<Grapher2DProps> = ({ functions, onUpdateFunctions }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // View viewport bounds in math space
  const [view, setView] = useState({
    xMin: -10,
    xMax: 10,
    yMin: -6,
    yMax: 6,
  });

  // Interactive probe / tangent line at x0
  const [probeX, setProbeX] = useState<number | null>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [mobileTab, setMobileTab] = useState<'graph' | 'functions'>('graph');
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; initialView: typeof view }>({
    mouseX: 0,
    mouseY: 0,
    initialView: view,
  });

  const touchStartRef = useRef<{
    touch1: { x: number; y: number };
    initialDist?: number;
    initialView: typeof view;
  }>({
    touch1: { x: 0, y: 0 },
    initialView: view,
  });

  // Add a new function
  const addFunction = () => {
    const palette = ['#38bdf8', '#f43f5e', '#10b981', '#a855f7', '#f59e0b', '#06b6d4'];
    const color = palette[functions.length % palette.length];
    const newFn: Graph2DFunction = {
      id: Math.random().toString(36).substring(2, 9),
      expression: functions.length === 0 ? 'sin(x)' : functions.length === 1 ? '0.2*x^3 - x' : 'cos(x)',
      color,
      visible: true,
      showDerivative: false,
      showSecondDerivative: false,
      showIntegral: false,
      integralRange: [-2, 2],
    };
    onUpdateFunctions([...functions, newFn]);
  };

  const removeFunction = (id: string) => {
    onUpdateFunctions(functions.filter((f) => f.id !== id));
  };

  const updateFunction = (id: string, partial: Partial<Graph2DFunction>) => {
    onUpdateFunctions(functions.map((f) => (f.id === id ? { ...f, ...partial } : f)));
  };

  const resetZoom = () => {
    setView({ xMin: -10, xMax: 10, yMin: -6, yMax: 6 });
  };

  const zoom = (factor: number) => {
    setView((prev) => {
      const cx = (prev.xMin + prev.xMax) / 2;
      const cy = (prev.yMin + prev.yMax) / 2;
      const w = (prev.xMax - prev.xMin) * factor;
      const h = (prev.yMax - prev.yMin) * factor;
      return {
        xMin: cx - w / 2,
        xMax: cx + w / 2,
        yMin: cy - h / 2,
        yMax: cy + h / 2,
      };
    });
  };

  // Draw 2D Graph onto Canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, width, height);

    const { xMin, xMax, yMin, yMax } = view;

    // Coordinate transforms
    const toScreenX = (x: number) => ((x - xMin) / (xMax - xMin)) * width;
    const toScreenY = (y: number) => height - ((y - yMin) / (yMax - yMin)) * height;
    const toMathX = (sx: number) => xMin + (sx / width) * (xMax - xMin);
    const toMathY = (sy: number) => yMax - (sy / height) * (yMax - yMin);

    // 1. Draw Grid lines & axes
    const drawGrid = () => {
      const xRange = xMax - xMin;
      const yRange = yMax - yMin;

      // Determine step size
      const getStep = (range: number) => {
        const rough = range / 10;
        const power = Math.pow(10, Math.floor(Math.log10(rough)));
        const mult = rough / power;
        if (mult < 2) return power * 1;
        if (mult < 5) return power * 2;
        return power * 5;
      };

      const xStep = getStep(xRange);
      const yStep = getStep(yRange);

      // Grid lines
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#1e293b';
      ctx.fillStyle = '#64748b';
      ctx.font = '10px monospace';

      // Vertical lines
      const firstX = Math.floor(xMin / xStep) * xStep;
      for (let x = firstX; x <= xMax; x += xStep) {
        const sx = toScreenX(x);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, height);
        ctx.stroke();

        // Label
        if (Math.abs(x) > 1e-6) {
          const sy = Math.max(16, Math.min(height - 6, toScreenY(0) + 14));
          ctx.fillText(x.toFixed(xStep < 1 ? 2 : 0), sx + 2, sy);
        }
      }

      // Horizontal lines
      const firstY = Math.floor(yMin / yStep) * yStep;
      for (let y = firstY; y <= yMax; y += yStep) {
        const sy = toScreenY(y);
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(width, sy);
        ctx.stroke();

        // Label
        if (Math.abs(y) > 1e-6) {
          const sx = Math.max(6, Math.min(width - 35, toScreenX(0) + 4));
          ctx.fillText(y.toFixed(yStep < 1 ? 2 : 0), sx, sy - 2);
        }
      }

      // Main Axes (X and Y = 0)
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#475569';

      // X-Axis
      const sy0 = toScreenY(0);
      ctx.beginPath();
      ctx.moveTo(0, sy0);
      ctx.lineTo(width, sy0);
      ctx.stroke();

      // Y-Axis
      const sx0 = toScreenX(0);
      ctx.beginPath();
      ctx.moveTo(sx0, 0);
      ctx.lineTo(sx0, height);
      ctx.stroke();
    };

    drawGrid();

    // 2. Plot each active function
    functions.forEach((fn) => {
      if (!fn.visible) return;
      const compiled = compileSafe(fn.expression);
      if (!compiled) return;

      // Integral Area Shading if enabled
      if (fn.showIntegral && fn.integralRange) {
        const [a, b] = fn.integralRange;
        const startX = Math.min(a, b);
        const endX = Math.max(a, b);
        const sxStart = toScreenX(startX);
        const sxEnd = toScreenX(endX);

        ctx.fillStyle = `${fn.color}25`; // 15% opacity tint
        ctx.beginPath();
        ctx.moveTo(sxStart, toScreenY(0));

        const intSteps = 150;
        const intDx = (endX - startX) / intSteps;
        for (let s = 0; s <= intSteps; s++) {
          const mx = startX + s * intDx;
          const my = compiled({ x: mx });
          if (!isNaN(my) && isFinite(my)) {
            ctx.lineTo(toScreenX(mx), toScreenY(my));
          }
        }
        ctx.lineTo(sxEnd, toScreenY(0));
        ctx.closePath();
        ctx.fill();

        // Outline bounds
        ctx.strokeStyle = `${fn.color}88`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Plot Main Curve f(x)
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = fn.color;
      ctx.beginPath();

      let started = false;
      const screenSteps = width;
      for (let px = 0; px <= screenSteps; px++) {
        const mx = toMathX(px);
        const my = compiled({ x: mx });

        if (isNaN(my) || !isFinite(my) || Math.abs(my) > 1e4) {
          started = false;
          continue;
        }

        const py = toScreenY(my);
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Plot First Derivative f'(x) if enabled
      if (fn.showDerivative) {
        try {
          const deriv = math.derivative(math.parse(preprocessExpression(fn.expression)), 'x');
          const derivCompiled = compileSafe(deriv.toString());
          if (derivCompiled) {
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = `${fn.color}aa`;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            let dStarted = false;
            for (let px = 0; px <= screenSteps; px++) {
              const mx = toMathX(px);
              const my = derivCompiled({ x: mx });
              if (isNaN(my) || !isFinite(my) || Math.abs(my) > 1e4) {
                dStarted = false;
                continue;
              }
              const py = toScreenY(my);
              if (!dStarted) {
                ctx.moveTo(px, py);
                dStarted = true;
              } else {
                ctx.lineTo(px, py);
              }
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } catch {
          // ignore
        }
      }

      // 3. Critical Points Search (Roots, Local Extrema, Inflections)
      const samples = 120;
      const sDx = (xMax - xMin) / samples;
      for (let i = 0; i < samples; i++) {
        const x1 = xMin + i * sDx;
        const x2 = x1 + sDx;
        const y1 = compiled({ x: x1 });
        const y2 = compiled({ x: x2 });

        // Root detection: sign change
        if (!isNaN(y1) && !isNaN(y2) && y1 * y2 < 0) {
          const rootX = x1 - y1 * ((x2 - x1) / (y2 - y1));
          const srx = toScreenX(rootX);
          const sry = toScreenY(0);
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(srx, sry, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Interactive Tangent Line at probeX
      if (probeX !== null && probeX >= xMin && probeX <= xMax) {
        const y0 = compiled({ x: probeX });
        if (!isNaN(y0) && isFinite(y0)) {
          // Compute derivative at probeX numerically
          const h = 0.0001;
          const slope = (compiled({ x: probeX + h }) - compiled({ x: probeX - h })) / (2 * h);

          const px0 = toScreenX(probeX);
          const py0 = toScreenY(y0);

          // Draw tangent line
          const tanLen = (xMax - xMin) * 0.35;
          const xA = probeX - tanLen;
          const yA = y0 - slope * tanLen;
          const xB = probeX + tanLen;
          const yB = y0 + slope * tanLen;

          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(toScreenX(xA), toScreenY(yA));
          ctx.lineTo(toScreenX(xB), toScreenY(yB));
          ctx.stroke();

          // Probe point dot
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(px0, py0, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }, [functions, view, probeX]);

  // Handle Resize & Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      draw();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse pan & zoom handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialView: { ...view },
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (isDragging) {
      const dxPixels = e.clientX - dragStartRef.current.mouseX;
      const dyPixels = e.clientY - dragStartRef.current.mouseY;

      const xSpan = dragStartRef.current.initialView.xMax - dragStartRef.current.initialView.xMin;
      const ySpan = dragStartRef.current.initialView.yMax - dragStartRef.current.initialView.yMin;

      const dxMath = (dxPixels / rect.width) * xSpan;
      const dyMath = (dyPixels / rect.height) * ySpan;

      setView({
        xMin: dragStartRef.current.initialView.xMin - dxMath,
        xMax: dragStartRef.current.initialView.xMax - dxMath,
        yMin: dragStartRef.current.initialView.yMin + dyMath,
        yMax: dragStartRef.current.initialView.yMax + dyMath,
      });
    } else {
      // Hover probe
      const relX = (e.clientX - rect.left) / rect.width;
      const mathX = view.xMin + relX * (view.xMax - view.xMin);
      setProbeX(mathX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStartRef.current = {
        touch1: { x: t.clientX, y: t.clientY },
        initialView: { ...view },
      };
      const relX = (t.clientX - rect.left) / rect.width;
      const mathX = view.xMin + relX * (view.xMax - view.xMin);
      setProbeX(mathX);
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      touchStartRef.current = {
        touch1: { x: t1.clientX, y: t1.clientY },
        initialDist: dist,
        initialView: { ...view },
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (e.touches.length === 1 && touchStartRef.current.touch1) {
      const t = e.touches[0];
      const dxPixels = t.clientX - touchStartRef.current.touch1.x;
      const dyPixels = t.clientY - touchStartRef.current.touch1.y;

      const xSpan = touchStartRef.current.initialView.xMax - touchStartRef.current.initialView.xMin;
      const ySpan = touchStartRef.current.initialView.yMax - touchStartRef.current.initialView.yMin;

      const dxMath = (dxPixels / rect.width) * xSpan;
      const dyMath = (dyPixels / rect.height) * ySpan;

      setView({
        xMin: touchStartRef.current.initialView.xMin - dxMath,
        xMax: touchStartRef.current.initialView.xMax - dxMath,
        yMin: touchStartRef.current.initialView.yMin + dyMath,
        yMax: touchStartRef.current.initialView.yMax + dyMath,
      });

      const relX = (t.clientX - rect.left) / rect.width;
      const mathX = view.xMin + relX * (view.xMax - view.xMin);
      setProbeX(mathX);
    } else if (e.touches.length === 2 && touchStartRef.current.initialDist) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      if (currentDist > 10 && touchStartRef.current.initialDist > 10) {
        const factor = touchStartRef.current.initialDist / currentDist;
        zoom(factor > 1 ? 1.04 : 0.96);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 0.89;
    zoom(factor);
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-full bg-slate-950 overflow-hidden">
      {/* Mobile Top View Switcher */}
      <div className="lg:hidden px-3 pt-2.5 pb-1 bg-slate-950 flex items-center justify-center shrink-0">
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm">
          <button
            onClick={() => setMobileTab('graph')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mobileTab === 'graph'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Graph Canvas
          </button>
          <button
            onClick={() => setMobileTab('functions')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'functions'
                ? 'bg-cyan-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Functions</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                mobileTab === 'functions'
                  ? 'bg-slate-950 text-cyan-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {functions.length}
            </span>
          </button>
        </div>
      </div>

      {/* Sidebar Function List & Controls */}
      <div
        className={`w-full lg:w-96 bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 flex-col h-full shrink-0 ${
          mobileTab === 'graph' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <button
          onClick={() => setMobileTab('graph')}
          className="lg:hidden m-3 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs shadow-md active:scale-98"
        >
          View Updated Graph Canvas →
        </button>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-white">Functions & Calculus</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
              {functions.length} Active
            </span>
          </div>
          <button
            onClick={addFunction}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold rounded-lg shadow transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Function
          </button>
        </div>

        {/* Functions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 max-h-72 lg:max-h-none">
          {functions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No functions plotted. Click "Add Function" to get started.
            </div>
          ) : (
            functions.map((fn, idx) => (
              <div
                key={fn.id}
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-2.5 transition-all hover:border-slate-700"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-2 ring-slate-800"
                    style={{ backgroundColor: fn.color }}
                  />
                  <span className="text-xs font-mono font-bold text-slate-300">f_{idx + 1}(x) =</span>
                  <input
                    type="text"
                    value={fn.expression}
                    onChange={(e) => updateFunction(fn.id, { expression: e.target.value })}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. sin(x)"
                  />
                  <button
                    onClick={() => updateFunction(fn.id, { visible: !fn.visible })}
                    className="p-1 text-slate-400 hover:text-white"
                    title={fn.visible ? 'Hide curve' : 'Show curve'}
                  >
                    {fn.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-slate-600" />}
                  </button>
                  <button
                    onClick={() => removeFunction(fn.id)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                    title="Delete function"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Calculus toggles for this function */}
                <div className="pt-1.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-[11px]">
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fn.showDerivative}
                      onChange={(e) => updateFunction(fn.id, { showDerivative: e.target.checked })}
                      className="rounded border-slate-700 text-cyan-500"
                    />
                    <span>f'(x) Derivative</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fn.showIntegral}
                      onChange={(e) => updateFunction(fn.id, { showIntegral: e.target.checked })}
                      className="rounded border-slate-700 text-cyan-500"
                    />
                    <span>∫ Area Shading</span>
                  </label>
                </div>

                {/* Integral bounds slider if enabled */}
                {fn.showIntegral && (
                  <div className="bg-slate-900/90 p-2 rounded-lg space-y-1.5 text-[11px] text-slate-300 font-mono">
                    <div className="flex justify-between text-cyan-300">
                      <span>Integral Range [a, b]:</span>
                      <span>[{fn.integralRange[0].toFixed(1)}, {fn.integralRange[1].toFixed(1)}]</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500">a:</span>
                      <input
                        type="range"
                        min={-10}
                        max={10}
                        step={0.5}
                        value={fn.integralRange[0]}
                        onChange={(e) =>
                          updateFunction(fn.id, {
                            integralRange: [parseFloat(e.target.value), fn.integralRange[1]],
                          })
                        }
                        className="w-full accent-cyan-400 h-1"
                      />
                      <span className="text-[10px] text-slate-500">b:</span>
                      <input
                        type="range"
                        min={-10}
                        max={10}
                        step={0.5}
                        value={fn.integralRange[1]}
                        onChange={(e) =>
                          updateFunction(fn.id, {
                            integralRange: [fn.integralRange[0], parseFloat(e.target.value)],
                          })
                        }
                        className="w-full accent-cyan-400 h-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Tangent Probe & Info Footer */}
        {probeX !== null && functions.length > 0 && (
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs font-mono space-y-1">
            <div className="text-amber-300 flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1">
                <Crosshair className="w-3.5 h-3.5" /> Tangent Inspector:
              </span>
              <span>x₀ = {probeX.toFixed(3)}</span>
            </div>
            {functions.slice(0, 2).map((fn, idx) => {
              const comp = compileSafe(fn.expression);
              if (!comp) return null;
              const yVal = comp({ x: probeX });
              const h = 0.001;
              const slope = (comp({ x: probeX + h }) - comp({ x: probeX - h })) / (2 * h);
              return (
                <div key={fn.id} className="text-slate-400 flex justify-between text-[11px]">
                  <span style={{ color: fn.color }}>f_{idx + 1}(x₀) = {isNaN(yVal) ? 'NaN' : yVal.toFixed(3)}</span>
                  <span className="text-amber-400">Slope m = {isNaN(slope) ? 'NaN' : slope.toFixed(3)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main 2D Canvas Area */}
      <div
        className={`relative flex-1 h-full w-full min-h-[350px] overflow-hidden ${
          mobileTab === 'functions' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onTouchCancel={handleMouseUp}
          onWheel={handleWheel}
          className="w-full h-full cursor-crosshair block touch-none"
        />

        {/* Floating Mobile Tangent Inspector */}
        {probeX !== null && functions.length > 0 && (
          <div className="lg:hidden absolute top-4 left-4 z-10 bg-slate-900/95 border border-slate-800 px-3 py-1.5 rounded-xl shadow-lg text-[11px] font-mono text-amber-300 flex items-center gap-2 backdrop-blur-md">
            <Crosshair className="w-3.5 h-3.5" />
            <span>x₀ = {probeX.toFixed(2)}</span>
          </div>
        )}

        {/* Viewport Floating Zoom & Reset Tools */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl shadow-lg backdrop-blur-md z-10">
          <button
            onClick={() => zoom(0.8)}
            className="p-2 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => zoom(1.25)}
            className="p-2 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetZoom}
            className="p-2 sm:p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Mobile Function Manager Badge */}
        <button
          onClick={() => setMobileTab('functions')}
          className="lg:hidden absolute bottom-4 left-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/95 border border-slate-700 text-cyan-300 text-xs font-semibold shadow-xl backdrop-blur-md active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Functions ({functions.length})</span>
        </button>

        {/* Legend Overlay at bottom left (desktop) */}
        <div className="hidden sm:flex absolute bottom-4 left-4 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl shadow-lg text-[11px] text-slate-300 items-center gap-4 backdrop-blur-md">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Real Root
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Tangent Line
          </span>
          <span className="text-slate-500">Drag to Pan | Scroll / Pinch to Zoom</span>
        </div>
      </div>
    </div>
  );
};
