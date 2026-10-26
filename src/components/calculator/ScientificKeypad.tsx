/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as math from 'mathjs';
import { AngleMode } from '../../types/calculator';
import { MathRenderer } from '../common/MathRenderer';
import { preprocessExpression, toLatex } from '../../services/mathEngine';
import { CreativeButton } from '../common/CreativeButton';
import { 
  Delete, History, Trash2, ArrowUpRight, 
  Sparkles, ChevronDown, ChevronUp, Copy, Check,
  Volume2, VolumeX, Eye, EyeOff, Layers
} from 'lucide-react';

interface HistoryEntry {
  input: string;
  result: string;
  timestamp: string;
}

type FunctionCategory = 'all' | 'trig' | 'powers' | 'logs' | 'constants';

export const ScientificKeypad: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [angleMode, setAngleMode] = useState<AngleMode>('rad');
  const [isSecond, setIsSecond] = useState(false);
  const [mobileTab, setMobileTab] = useState<'keypad' | 'history'>('keypad');
  
  // Toggle to show/hide other elements (Scientific functions)
  const [showOtherElements, setShowOtherElements] = useState(false);
  const [functionCategory, setFunctionCategory] = useState<FunctionCategory>('all');
  
  // Feedback options
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<string>('0');

  // Append token to display
  const appendToken = useCallback((token: string) => {
    setDisplay((prev) => {
      if (prev === '0' || prev === 'Error') return token;
      return prev + token;
    });
  }, []);

  const handleClear = useCallback(() => {
    setDisplay('0');
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay((prev) => {
      if (prev.length <= 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  }, []);

  const handleEvaluate = useCallback(() => {
    if (!display || display === '0') return;
    try {
      const cleanExpr = preprocessExpression(display);
      
      // Configure trig functions based on angleMode (rad vs deg)
      const degScope = angleMode === 'deg' ? {
        sin: (x: number) => Math.sin((x * Math.PI) / 180),
        cos: (x: number) => Math.cos((x * Math.PI) / 180),
        tan: (x: number) => Math.tan((x * Math.PI) / 180),
        asin: (x: number) => (Math.asin(x) * 180) / Math.PI,
        acos: (x: number) => (Math.acos(x) * 180) / Math.PI,
        atan: (x: number) => (Math.atan(x) * 180) / Math.PI,
      } : {};

      const res = math.evaluate(cleanExpr, degScope);
      let formatted = '';
      if (typeof res === 'number') {
        formatted = Number.isInteger(res) ? String(res) : res.toFixed(6).replace(/\.?0+$/, '');
      } else if (typeof res === 'object' && res !== null) {
        formatted = res.toString();
      } else {
        formatted = String(res);
      }

      const newEntry: HistoryEntry = {
        input: display,
        result: formatted,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setHistory((prev) => [newEntry, ...prev.slice(0, 19)]);
      setLastAnswer(formatted);
      setDisplay(formatted);
    } catch {
      setDisplay('Error');
    }
  }, [display, angleMode]);

  // Copy current display result to clipboard
  const handleCopyDisplay = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard shortcut listener for calculations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key >= '0' && e.key <= '9') {
        appendToken(e.key);
      } else if (['+', '-', '*', '/'].includes(e.key)) {
        appendToken(e.key);
      } else if (e.key === '.') {
        appendToken('.');
      } else if (e.key === '(' || e.key === ')') {
        appendToken(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEvaluate();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appendToken, handleEvaluate, handleBackspace, handleClear]);

  // Scientific Extra Functions List
  const scientificButtons = useMemo(() => {
    const all = [
      // Trig
      { category: 'trig', label: isSecond ? 'sin⁻¹' : 'sin', token: isSecond ? 'asin(' : 'sin(', tip: 'Sine' },
      { category: 'trig', label: isSecond ? 'cos⁻¹' : 'cos', token: isSecond ? 'acos(' : 'cos(', tip: 'Cosine' },
      { category: 'trig', label: isSecond ? 'tan⁻¹' : 'tan', token: isSecond ? 'atan(' : 'tan(', tip: 'Tangent' },
      { category: 'trig', label: 'sinh', token: 'sinh(', tip: 'Hyperbolic Sine' },
      { category: 'trig', label: 'cosh', token: 'cosh(', tip: 'Hyperbolic Cosine' },
      { category: 'trig', label: 'tanh', token: 'tanh(', tip: 'Hyperbolic Tangent' },
      
      // Powers & Roots
      { category: 'powers', label: 'x²', token: '^2', tip: 'Square' },
      { category: 'powers', label: 'x³', token: '^3', tip: 'Cube' },
      { category: 'powers', label: 'xʸ', token: '^', tip: 'Power' },
      { category: 'powers', label: '√x', token: 'sqrt(', tip: 'Square Root' },
      { category: 'powers', label: '∛x', token: 'cbrt(', tip: 'Cube Root' },
      { category: 'powers', label: 'n!', token: '!', tip: 'Factorial' },
      
      // Logs & Exponents
      { category: 'logs', label: isSecond ? 'eˣ' : 'ln', token: isSecond ? 'exp(' : 'log(', tip: 'Natural Log' },
      { category: 'logs', label: isSecond ? '10ˣ' : 'log₁₀', token: isSecond ? '10^(' : 'log10(', tip: 'Log base 10' },
      { category: 'logs', label: 'log₂', token: 'log2(', tip: 'Log base 2' },
      { category: 'logs', label: 'exp', token: 'exp(', tip: 'Exponential' },
      { category: 'logs', label: '|x|', token: 'abs(', tip: 'Absolute Value' },
      { category: 'logs', label: '1/x', token: '^(-1)', tip: 'Reciprocal' },

      // Constants & Others
      { category: 'constants', label: 'π', token: angleMode === 'rad' ? 'pi' : '180', tip: 'Pi' },
      { category: 'constants', label: 'e', token: 'e', tip: 'Euler Number' },
      { category: 'constants', label: 'i', token: 'i', tip: 'Imaginary Unit' },
      { category: 'constants', label: 'rand', token: 'random()', tip: 'Random 0-1' },
      { category: 'constants', label: '(', token: '(', tip: 'Open Bracket' },
      { category: 'constants', label: ')', token: ')', tip: 'Close Bracket' },
    ];

    if (functionCategory === 'all') return all;
    return all.filter((b) => b.category === functionCategory);
  }, [isSecond, angleMode, functionCategory]);

  return (
    <div className="flex flex-col lg:flex-row w-full h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Mobile Top View Switcher */}
      <div className="lg:hidden px-3 pt-2.5 pb-1 bg-slate-950 flex items-center justify-center shrink-0">
        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl w-full max-w-sm">
          <button
            onClick={() => setMobileTab('keypad')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              mobileTab === 'keypad'
                ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Keypad
          </button>
          <button
            onClick={() => setMobileTab('history')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'history'
                ? 'bg-cyan-500 text-slate-950 shadow-sm font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
            {history.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  mobileTab === 'history'
                    ? 'bg-slate-950 text-cyan-300'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div
        className={`flex-1 flex-col p-2.5 sm:p-5 lg:p-6 max-w-5xl mx-auto w-full justify-start overflow-y-auto overflow-x-hidden ${
          mobileTab === 'history' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Large Prominent Display Screen */}
        <div className="relative overflow-hidden group bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-4 sm:p-6 shadow-2xl mb-3 sm:mb-4 transition-all duration-300 hover:border-cyan-500/40 hover:shadow-cyan-950/30 shrink-0">
          {/* Subtle Ambient Glow Mesh */}
          <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl opacity-75" />
          
          {/* Top Controls Bar */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1 sm:mb-2">
            <div className="flex items-center gap-2">
              {/* RAD / DEG Switch */}
              <button
                onClick={() => setAngleMode(angleMode === 'rad' ? 'deg' : 'rad')}
                className="px-2.5 py-1 rounded-lg bg-slate-800/90 text-cyan-400 font-mono font-semibold uppercase hover:bg-cyan-950/40 hover:border-cyan-500/50 border border-slate-700/60 transition-all text-xs active:scale-95 flex items-center gap-1 cursor-pointer"
                title="Toggle Angle Mode"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {angleMode}
              </button>

              {/* Sound Effect Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 rounded-lg border transition-all text-xs cursor-pointer active:scale-95 ${
                  soundEnabled
                    ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60 hover:border-cyan-400'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title={soundEnabled ? 'Click Sound Enabled' : 'Click Sound Muted'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-500 text-[11px] sm:text-xs tracking-wide">
                OmniCalc Studio
              </span>
              <button
                onClick={handleCopyDisplay}
                className="p-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center gap-1 text-[11px] cursor-pointer"
                title="Copy Value"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Primary Calculation Expression Display (Enlarged and High Contrast) */}
          <div className="min-h-14 sm:min-h-18 flex items-end justify-end overflow-x-auto py-1 sm:py-2">
            <span className="font-mono text-3xl sm:text-4xl md:text-5xl text-white font-bold tracking-tight select-all">
              {display}
            </span>
          </div>

          {/* Real-time Mathematical LaTeX Formula Output */}
          <div className="text-right text-xs sm:text-sm text-cyan-400/90 font-serif border-t border-slate-800/80 pt-2 overflow-x-auto min-h-6 flex items-center justify-end">
            <MathRenderer math={toLatex(display)} />
          </div>
        </div>

        {/* ======================================================== */}
        {/* MASTER TOGGLE BAR: Button/Element to Show Other Elements */}
        {/* ======================================================== */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 bg-slate-900/70 border border-slate-800 rounded-2xl mb-3 shadow-lg shrink-0">
          <div className="flex items-center gap-2">
            {/* The main requested toggle button to reveal/hide the other elements */}
            <CreativeButton
              id="toggle-extra-functions-btn"
              onClick={() => setShowOtherElements(!showOtherElements)}
              variant={showOtherElements ? 'toggle' : 'secondary'}
              size="sm"
              enableSound={soundEnabled}
              isActive={showOtherElements}
              className="px-3.5 py-1.5 font-semibold text-xs flex items-center gap-2 shadow-sm rounded-xl cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 transition-transform duration-300 ${showOtherElements ? 'rotate-12 text-amber-950' : 'text-cyan-400'}`} />
              <span>{showOtherElements ? 'Hide Extra Functions' : 'Scientific Functions (fx)'}</span>
              {showOtherElements ? (
                <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
              )}
            </CreativeButton>

            {/* Segmented Mode Switcher */}
            <div className="flex items-center p-0.5 sm:p-1 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px]">
              <button
                type="button"
                id="mode-main-keypad-btn"
                onClick={() => setShowOtherElements(false)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  !showOtherElements 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Show only large main calculation keys"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Main Keypad</span>
              </button>
              <button
                type="button"
                id="mode-scientific-studio-btn"
                onClick={() => setShowOtherElements(true)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  showOtherElements 
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Show extended scientific functions"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Scientific Functions</span>
              </button>
            </div>
          </div>

          {/* Category Filter Pills (Visible when other elements are shown) */}
          {showOtherElements && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full py-0.5">
              {(['all', 'trig', 'powers', 'logs', 'constants'] as FunctionCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFunctionCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all cursor-pointer ${
                    functionCategory === cat
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-700/60'
                  }`}
                >
                  {cat === 'all' ? 'All fx' : cat}
                </button>
              ))}

              {/* 2nd Function Toggle */}
              <button
                onClick={() => setIsSecond(!isSecond)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold font-mono transition-all ml-1 cursor-pointer ${
                  isSecond
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                }`}
                title="Toggle Inverse / 2nd Functions"
              >
                2nd {isSecond && '✓'}
              </button>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* CALCULATION WORKSPACE: DUAL-STUDIO OR MASSIVE SINGLE PAD */}
        {/* ======================================================== */}
        <div className="flex-1 flex flex-col justify-center">
          {showOtherElements ? (
            /* DUAL STUDIO VIEW: Extended Functions on Left + Large Main Keypad on Right */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-start">
              {/* LEFT: THE OTHER ELEMENTS (SCIENTIFIC FUNCTIONS) */}
              <div className="lg:col-span-5 bg-slate-900/60 border border-violet-900/40 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-left-2 duration-200">
                <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-800/80 text-xs">
                  <span className="font-semibold text-violet-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    Extended Functions
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {scientificButtons.length} keys
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
                  {scientificButtons.map((btn, idx) => (
                    <CreativeButton
                      key={`${btn.label}-${idx}`}
                      onClick={() => appendToken(btn.token)}
                      variant="scientific"
                      size="md"
                      enableSound={soundEnabled}
                      title={btn.tip}
                      className="font-medium text-xs sm:text-sm"
                    >
                      {btn.label}
                    </CreativeButton>
                  ))}
                </div>
              </div>

              {/* RIGHT: THE MAIN ELEMENTS OF CALCULATION (REMAINS PROMINENT & LARGE) */}
              <div className="lg:col-span-7">
                <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                  {/* Row 1: AC, Backspace, %, Divide */}
                  <CreativeButton
                    onClick={handleClear}
                    variant="action"
                    size="lg"
                    enableSound={soundEnabled}
                    className="font-bold tracking-wider"
                    title="Clear All (AC)"
                  >
                    AC
                  </CreativeButton>

                  <CreativeButton
                    onClick={handleBackspace}
                    variant="secondary"
                    size="lg"
                    enableSound={soundEnabled}
                    title="Backspace / Delete"
                  >
                    <Delete className="w-5 h-5" />
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('%')}
                    variant="secondary"
                    size="lg"
                    enableSound={soundEnabled}
                    className="font-semibold"
                    title="Percentage"
                  >
                    %
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('/')}
                    variant="operator"
                    size="lg"
                    enableSound={soundEnabled}
                    className="text-2xl font-light"
                    title="Divide"
                  >
                    ÷
                  </CreativeButton>

                  {/* Row 2: 7, 8, 9, Multiply */}
                  <CreativeButton
                    onClick={() => appendToken('7')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    7
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('8')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    8
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('9')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    9
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('*')}
                    variant="operator"
                    size="lg"
                    enableSound={soundEnabled}
                    className="text-2xl font-light"
                    title="Multiply"
                  >
                    ×
                  </CreativeButton>

                  {/* Row 3: 4, 5, 6, Subtract */}
                  <CreativeButton
                    onClick={() => appendToken('4')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    4
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('5')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    5
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('6')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    6
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('-')}
                    variant="operator"
                    size="lg"
                    enableSound={soundEnabled}
                    className="text-2xl font-light"
                    title="Subtract"
                  >
                    −
                  </CreativeButton>

                  {/* Row 4: 1, 2, 3, Add */}
                  <CreativeButton
                    onClick={() => appendToken('1')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    1
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('2')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    2
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('3')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    3
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('+')}
                    variant="operator"
                    size="lg"
                    enableSound={soundEnabled}
                    className="text-2xl font-light"
                    title="Add"
                  >
                    +
                  </CreativeButton>

                  {/* Row 5: 0, Decimal, Equals (Spans 2 columns) */}
                  <CreativeButton
                    onClick={() => appendToken('0')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                  >
                    0
                  </CreativeButton>

                  <CreativeButton
                    onClick={() => appendToken('.')}
                    variant="number"
                    size="lg"
                    enableSound={soundEnabled}
                    className="font-bold"
                    title="Decimal Point"
                  >
                    .
                  </CreativeButton>

                  <CreativeButton
                    onClick={handleEvaluate}
                    variant="equals"
                    size="lg"
                    enableSound={soundEnabled}
                    className="col-span-2 text-2xl font-black"
                    title="Evaluate Calculation"
                  >
                    =
                  </CreativeButton>
                </div>
              </div>
            </div>
          ) : (
            /* CLEAN MASSIVE MAIN KEYPAD VIEW */
            <div className="max-w-2xl mx-auto w-full">
              <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
                {/* Row 1: AC, Backspace, %, Divide */}
                <CreativeButton
                  onClick={handleClear}
                  variant="action"
                  size="xl"
                  enableSound={soundEnabled}
                  className="font-bold tracking-wider"
                  title="Clear All (AC)"
                >
                  AC
                </CreativeButton>

                <CreativeButton
                  onClick={handleBackspace}
                  variant="secondary"
                  size="xl"
                  enableSound={soundEnabled}
                  title="Backspace / Delete"
                >
                  <Delete className="w-6 h-6 sm:w-7 sm:h-7" />
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('%')}
                  variant="secondary"
                  size="xl"
                  enableSound={soundEnabled}
                  className="font-semibold text-xl sm:text-2xl"
                  title="Percentage"
                >
                  %
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('/')}
                  variant="operator"
                  size="xl"
                  enableSound={soundEnabled}
                  className="text-3xl sm:text-4xl font-light"
                  title="Divide"
                >
                  ÷
                </CreativeButton>

                {/* Row 2: 7, 8, 9, Multiply */}
                <CreativeButton
                  onClick={() => appendToken('7')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  7
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('8')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  8
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('9')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  9
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('*')}
                  variant="operator"
                  size="xl"
                  enableSound={soundEnabled}
                  className="text-3xl sm:text-4xl font-light"
                  title="Multiply"
                >
                  ×
                </CreativeButton>

                {/* Row 3: 4, 5, 6, Subtract */}
                <CreativeButton
                  onClick={() => appendToken('4')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  4
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('5')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  5
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('6')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  6
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('-')}
                  variant="operator"
                  size="xl"
                  enableSound={soundEnabled}
                  className="text-3xl sm:text-4xl font-light"
                  title="Subtract"
                >
                  −
                </CreativeButton>

                {/* Row 4: 1, 2, 3, Add */}
                <CreativeButton
                  onClick={() => appendToken('1')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  1
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('2')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  2
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('3')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  3
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('+')}
                  variant="operator"
                  size="xl"
                  enableSound={soundEnabled}
                  className="text-3xl sm:text-4xl font-light"
                  title="Add"
                >
                  +
                </CreativeButton>

                {/* Row 5: 0, Decimal, Equals (Spans 2 columns) */}
                <CreativeButton
                  onClick={() => appendToken('0')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                >
                  0
                </CreativeButton>

                <CreativeButton
                  onClick={() => appendToken('.')}
                  variant="number"
                  size="xl"
                  enableSound={soundEnabled}
                  className="font-bold text-2xl sm:text-3xl"
                  title="Decimal Point"
                >
                  .
                </CreativeButton>

                <CreativeButton
                  onClick={handleEvaluate}
                  variant="equals"
                  size="xl"
                  enableSound={soundEnabled}
                  className="col-span-2 text-3xl sm:text-4xl font-black"
                  title="Evaluate Calculation"
                >
                  =
                </CreativeButton>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right History Tape Panel */}
      <div
        className={`w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex-col p-4 shrink-0 h-full overflow-hidden ${
          mobileTab === 'keypad' ? 'hidden lg:flex' : 'flex'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 shrink-0">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-cyan-400" />
            Calculation History Tape
          </span>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {history.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <History className="w-8 h-8 text-slate-700 stroke-1" />
              <span>History is empty</span>
              <span className="text-[11px] text-slate-600">Calculations will appear here</span>
            </div>
          ) : (
            history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setDisplay(item.result);
                  setMobileTab('keypad');
                }}
                className="group relative overflow-hidden bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/50 rounded-xl p-3 cursor-pointer transition-all active:scale-[0.98] hover:shadow-lg hover:shadow-cyan-950/30"
              >
                <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1 font-mono">
                  <span className="truncate max-w-[180px]">{item.input}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-600">{item.timestamp}</span>
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity" />
                  </div>
                </div>
                <div className="text-sm font-mono font-bold text-white text-right overflow-x-auto">
                  = {item.result}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
