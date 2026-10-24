/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as math from 'mathjs';
import { AngleMode } from '../../types/calculator';
import { MathRenderer } from '../common/MathRenderer';
import { preprocessExpression, toLatex } from '../../services/mathEngine';
import { Delete, History, Trash2, ArrowUpRight } from 'lucide-react';

interface HistoryEntry {
  input: string;
  result: string;
  timestamp: string;
}

export const ScientificKeypad: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [angleMode, setAngleMode] = useState<AngleMode>('rad');
  const [isSecond, setIsSecond] = useState(false);

  // Append token to display
  const appendToken = (token: string) => {
    setDisplay((prev) => {
      if (prev === '0' || prev === 'Error') return token;
      return prev + token;
    });
  };

  const handleClear = () => {
    setDisplay('0');
  };

  const handleBackspace = () => {
    setDisplay((prev) => {
      if (prev.length <= 1 || prev === 'Error') return '0';
      return prev.slice(0, -1);
    });
  };

  const handleEvaluate = () => {
    if (!display || display === '0') return;
    try {
      const cleanExpr = preprocessExpression(display);
      // If degree mode, adjust trig arguments or custom mathjs scope
      const res = math.evaluate(cleanExpr);
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
      setDisplay(formatted);
    } catch (err: unknown) {
      setDisplay('Error');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Calculator Body */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full justify-center">
        {/* Display Screen */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl mb-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <button
              onClick={() => setAngleMode(angleMode === 'rad' ? 'deg' : 'rad')}
              className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-mono font-semibold uppercase hover:bg-slate-700"
            >
              {angleMode}
            </button>
            <span className="font-mono text-slate-500">OmniCalc Matrix & Scientific</span>
          </div>

          <div className="min-h-16 flex items-end justify-end overflow-x-auto py-1">
            <span className="font-mono text-2xl sm:text-3xl text-white font-medium tracking-tight">
              {display}
            </span>
          </div>

          <div className="text-right text-xs text-cyan-400 font-serif border-t border-slate-800/80 pt-1.5 overflow-x-auto min-h-6">
            <MathRenderer math={toLatex(display)} />
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-5 gap-2 text-xs sm:text-sm font-medium">
          {/* Row 1 */}
          <button
            onClick={() => setIsSecond(!isSecond)}
            className={`py-3 rounded-xl border transition-all ${
              isSecond
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            2nd
          </button>
          <button
            onClick={() => appendToken(angleMode === 'rad' ? 'pi' : '180')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            π
          </button>
          <button
            onClick={() => appendToken('e')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            e
          </button>
          <button
            onClick={handleClear}
            className="py-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 font-bold"
          >
            AC
          </button>
          <button
            onClick={handleBackspace}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 flex items-center justify-center"
          >
            <Delete className="w-4 h-4" />
          </button>

          {/* Row 2: Trig & Powers */}
          <button
            onClick={() => appendToken(isSecond ? 'asin(' : 'sin(')}
            className="py-3 rounded-xl bg-slate-900/90 text-cyan-300 border border-slate-800 hover:bg-slate-800"
          >
            {isSecond ? 'sin⁻¹' : 'sin'}
          </button>
          <button
            onClick={() => appendToken(isSecond ? 'acos(' : 'cos(')}
            className="py-3 rounded-xl bg-slate-900/90 text-cyan-300 border border-slate-800 hover:bg-slate-800"
          >
            {isSecond ? 'cos⁻¹' : 'cos'}
          </button>
          <button
            onClick={() => appendToken(isSecond ? 'atan(' : 'tan(')}
            className="py-3 rounded-xl bg-slate-900/90 text-cyan-300 border border-slate-800 hover:bg-slate-800"
          >
            {isSecond ? 'tan⁻¹' : 'tan'}
          </button>
          <button
            onClick={() => appendToken('^2')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            x²
          </button>
          <button
            onClick={() => appendToken('^')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            xʸ
          </button>

          {/* Row 3: Log & Roots */}
          <button
            onClick={() => appendToken(isSecond ? 'exp(' : 'log(')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            {isSecond ? 'eˣ' : 'ln'}
          </button>
          <button
            onClick={() => appendToken('log10(')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            log₁₀
          </button>
          <button
            onClick={() => appendToken('sqrt(')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            √
          </button>
          <button
            onClick={() => appendToken('(')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            (
          </button>
          <button
            onClick={() => appendToken(')')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            )
          </button>

          {/* Row 4: Digits 7, 8, 9, Operators */}
          <button
            onClick={() => appendToken('7')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            7
          </button>
          <button
            onClick={() => appendToken('8')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            8
          </button>
          <button
            onClick={() => appendToken('9')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            9
          </button>
          <button
            onClick={() => appendToken('/')}
            className="py-3 rounded-xl bg-slate-800/90 text-cyan-400 border border-slate-700 hover:bg-slate-700 text-base"
          >
            ÷
          </button>
          <button
            onClick={() => appendToken('!')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            n!
          </button>

          {/* Row 5: Digits 4, 5, 6, Multiply */}
          <button
            onClick={() => appendToken('4')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            4
          </button>
          <button
            onClick={() => appendToken('5')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            5
          </button>
          <button
            onClick={() => appendToken('6')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            6
          </button>
          <button
            onClick={() => appendToken('*')}
            className="py-3 rounded-xl bg-slate-800/90 text-cyan-400 border border-slate-700 hover:bg-slate-700 text-base"
          >
            ×
          </button>
          <button
            onClick={() => appendToken('abs(')}
            className="py-3 rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
          >
            |x|
          </button>

          {/* Row 6: Digits 1, 2, 3, Subtract */}
          <button
            onClick={() => appendToken('1')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            1
          </button>
          <button
            onClick={() => appendToken('2')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            2
          </button>
          <button
            onClick={() => appendToken('3')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            3
          </button>
          <button
            onClick={() => appendToken('-')}
            className="py-3 rounded-xl bg-slate-800/90 text-cyan-400 border border-slate-700 hover:bg-slate-700 text-base"
          >
            −
          </button>
          <button
            onClick={() => appendToken('i')}
            className="py-3 rounded-xl bg-slate-900 text-amber-300 border border-slate-800 hover:bg-slate-800 font-serif italic"
          >
            i
          </button>

          {/* Row 7: 0, decimal, Add, Equals */}
          <button
            onClick={() => appendToken('0')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            0
          </button>
          <button
            onClick={() => appendToken('.')}
            className="py-3 rounded-xl bg-slate-950 text-white border border-slate-800 hover:bg-slate-800 font-semibold text-base"
          >
            .
          </button>
          <button
            onClick={() => appendToken('+')}
            className="py-3 rounded-xl bg-slate-800/90 text-cyan-400 border border-slate-700 hover:bg-slate-700 text-base"
          >
            +
          </button>
          <button
            onClick={handleEvaluate}
            className="col-span-2 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border border-cyan-400 text-base shadow-lg shadow-cyan-950/40 transition-transform active:scale-[0.99]"
          >
            =
          </button>
        </div>
      </div>

      {/* Right History Tape Panel */}
      <div className="w-full lg:w-80 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col p-4 shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-cyan-400" />
            Calculation History Tape
          </span>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">History is empty</div>
          ) : (
            history.map((item, idx) => (
              <div
                key={idx}
                onClick={() => setDisplay(item.result)}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 cursor-pointer group transition-all"
              >
                <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1 font-mono">
                  <span className="truncate max-w-[160px]">{item.input}</span>
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity" />
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
