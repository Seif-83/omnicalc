/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import * as math from 'mathjs';
import { MathRenderer } from '../common/MathRenderer';
import { Sparkles, Grid, ArrowRight, RefreshCw } from 'lucide-react';

export const MatrixCalculator: React.FC = () => {
  const [sizeA, setSizeA] = useState<2 | 3>(3);
  const [matrixA, setMatrixA] = useState<number[][]>([
    [2, -1, 0],
    [-1, 2, -1],
    [0, -1, 2],
  ]);
  const [matrixB, setMatrixB] = useState<number[][]>([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
  const [vectorB, setVectorB] = useState<number[]>([1, 0, 1]);

  const [operation, setOperation] = useState<'det' | 'inv' | 'transpose' | 'mult' | 'solve' | 'eigen'>('det');
  const [resultLatex, setResultLatex] = useState<string>('');
  const [resultDetails, setResultDetails] = useState<string>('');

  // Handle cell edits
  const handleCellChangeA = (r: number, c: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = matrixA.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? num : cell)));
    setMatrixA(next);
  };

  const handleCellChangeB = (r: number, c: number, val: string) => {
    const num = parseFloat(val) || 0;
    const next = matrixB.map((row, ri) => row.map((cell, ci) => (ri === r && ci === c ? num : cell)));
    setMatrixB(next);
  };

  const changeSize = (s: 2 | 3) => {
    setSizeA(s);
    if (s === 2) {
      setMatrixA([
        [4, 7],
        [2, 6],
      ]);
      setMatrixB([
        [1, 2],
        [3, 4],
      ]);
      setVectorB([1, 2]);
    } else {
      setMatrixA([
        [2, -1, 0],
        [-1, 2, -1],
        [0, -1, 2],
      ]);
      setMatrixB([
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
      ]);
      setVectorB([1, 0, 1]);
    }
  };

  // Format matrix to LaTeX
  const formatMatrixToLatex = (mat: number[][]): string => {
    const rows = mat.map((row) => row.map((v) => (Number.isInteger(v) ? v : v.toFixed(3))).join(' & ')).join(' \\\\ ');
    return `\\begin{pmatrix} ${rows} \\end{pmatrix}`;
  };

  // Perform Calculation
  const calculate = () => {
    try {
      if (operation === 'det') {
        const d = math.det(matrixA);
        setResultLatex(`\\det(A) = ${Number.isInteger(d) ? d : d.toFixed(4)}`);
        setResultDetails(`The determinant measures the scaling factor of the linear transformation. Since det(A) ${Math.abs(d) > 1e-9 ? '≠ 0, matrix A is invertible (non-singular).' : '= 0, matrix A is singular and has no inverse.'}`);
      } else if (operation === 'inv') {
        const d = math.det(matrixA);
        if (Math.abs(d) < 1e-9) {
          setResultLatex('\\text{Matrix is singular, inverse does not exist (}\\det = 0\\text{)}');
          setResultDetails('Since the determinant is zero, the row vectors are linearly dependent.');
        } else {
          const inv = math.inv(matrixA) as number[][];
          setResultLatex(`A^{-1} = ${formatMatrixToLatex(inv)}`);
          setResultDetails('Inverse computed via adjugate matrix and determinant division: A⁻¹ = (1/det(A)) * adj(A).');
        }
      } else if (operation === 'transpose') {
        const tr = math.transpose(matrixA) as number[][];
        setResultLatex(`A^T = ${formatMatrixToLatex(tr)}`);
        setResultDetails('Rows and columns swapped: (Aᵀ)ᵢⱼ = Aⱼᵢ.');
      } else if (operation === 'mult') {
        const prod = math.multiply(matrixA, matrixB) as number[][];
        setResultLatex(`A \\times B = ${formatMatrixToLatex(prod)}`);
        setResultDetails('Standard matrix dot-product multiplication Cᵢⱼ = Σₖ Aᵢₖ Bₖⱼ.');
      } else if (operation === 'solve') {
        // Ax = b
        const sol = math.lusolve(matrixA, vectorB) as number[][];
        const solFlat = sol.map((r) => r[0]);
        const solLatex = solFlat.map((v, i) => `x_${i + 1} = ${Number.isInteger(v) ? v : v.toFixed(4)}`).join(', \\; ');
        setResultLatex(`\\mathbf{x} = \\begin{pmatrix} ${solFlat.map((v) => (Number.isInteger(v) ? v : v.toFixed(3))).join(' \\\\ ')} \\end{pmatrix} \\implies ${solLatex}`);
        setResultDetails('System of linear equations Ax = b solved using LU decomposition with partial pivoting.');
      } else if (operation === 'eigen') {
        if (sizeA === 2) {
          // Analytical eigenvalues for 2x2: lambda^2 - tr(A) lambda + det(A) = 0
          const tr = matrixA[0][0] + matrixA[1][1];
          const det = matrixA[0][0] * matrixA[1][1] - matrixA[0][1] * matrixA[1][0];
          const disc = tr * tr - 4 * det;
          if (disc >= 0) {
            const l1 = (tr + Math.sqrt(disc)) / 2;
            const l2 = (tr - Math.sqrt(disc)) / 2;
            setResultLatex(`\\lambda_1 = ${l1.toFixed(4)}, \\quad \\lambda_2 = ${l2.toFixed(4)}`);
            setResultDetails(`Characteristic polynomial: λ² - (${tr.toFixed(2)})λ + (${det.toFixed(2)}) = 0. Trace = ${tr}, Det = ${det}.`);
          } else {
            const re = tr / 2;
            const im = Math.sqrt(-disc) / 2;
            setResultLatex(`\\lambda_{1,2} = ${re.toFixed(3)} \\pm ${im.toFixed(3)} i`);
            setResultDetails('Complex conjugate eigenvalues corresponding to rotation-dilation.');
          }
        } else {
          // 3x3 trace and det
          const tr = matrixA[0][0] + matrixA[1][1] + matrixA[2][2];
          const det = math.det(matrixA);
          setResultLatex(`\\text{Trace } \\mathrm{tr}(A) = ${tr.toFixed(3)}, \\quad \\det(A) = ${det.toFixed(3)}`);
          setResultDetails(`Characteristic equation: λ³ - tr(A)λ² + c₁λ - det(A) = 0.`);
        }
      }
    } catch (err: unknown) {
      setResultLatex('\\text{Error during matrix computation}');
      setResultDetails('Check matrix inputs for numerical stability.');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-full bg-slate-950 overflow-hidden text-slate-100 p-6 lg:p-8 gap-6">
      {/* Configuration & Matrix Inputs */}
      <div className="w-full lg:w-[480px] space-y-5 shrink-0 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Linear Algebra & Matrix Engine</h2>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => changeSize(2)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                sizeA === 2 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              2 × 2
            </button>
            <button
              onClick={() => changeSize(3)}
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                sizeA === 3 ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              3 × 3
            </button>
          </div>
        </div>

        {/* Operation Picker */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {[
            { id: 'det', label: 'Determinant det(A)' },
            { id: 'inv', label: 'Inverse A⁻¹' },
            { id: 'transpose', label: 'Transpose Aᵀ' },
            { id: 'mult', label: 'Multiply A × B' },
            { id: 'solve', label: 'Solve Ax = b' },
            { id: 'eigen', label: 'Eigenvalues λ' },
          ].map((op) => (
            <button
              key={op.id}
              onClick={() => setOperation(op.id as any)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                operation === op.id
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-semibold'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-850 hover:text-white'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>

        {/* Matrix A Input Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-300">
            <span>Matrix A</span>
            <span className="text-[11px] font-mono text-cyan-400">{sizeA} × {sizeA}</span>
          </div>

          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${sizeA}, minmax(0, 1fr))` }}
          >
            {matrixA.map((row, r) =>
              row.map((val, c) => (
                <input
                  key={`${r}-${c}`}
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => handleCellChangeA(r, c, e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-center font-mono text-sm text-cyan-300 focus:outline-none focus:border-cyan-500"
                />
              ))
            )}
          </div>
        </div>

        {/* Matrix B or Vector b Input if needed */}
        {operation === 'mult' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Matrix B</span>
              <span className="text-[11px] font-mono text-emerald-400">{sizeA} × {sizeA}</span>
            </div>

            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${sizeA}, minmax(0, 1fr))` }}
            >
              {matrixB.map((row, r) =>
                row.map((val, c) => (
                  <input
                    key={`${r}-${c}`}
                    type="number"
                    step="any"
                    value={val}
                    onChange={(e) => handleCellChangeB(r, c, e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-center font-mono text-sm text-emerald-300 focus:outline-none focus:border-emerald-500"
                  />
                ))
              )}
            </div>
          </div>
        )}

        {operation === 'solve' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-medium text-slate-300">Vector b in Ax = b</div>
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${sizeA}, minmax(0, 1fr))` }}
            >
              {vectorB.map((val, i) => (
                <input
                  key={i}
                  type="number"
                  step="any"
                  value={val}
                  onChange={(e) => {
                    const num = parseFloat(e.target.value) || 0;
                    const next = [...vectorB];
                    next[i] = num;
                    setVectorB(next);
                  }}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-center font-mono text-sm text-amber-300 focus:outline-none focus:border-amber-500"
                />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={calculate}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-950/40 flex items-center justify-center gap-2 text-sm transition-all"
        >
          <Sparkles className="w-4 h-4" />
          Execute Matrix Operation
        </button>
      </div>

      {/* Result Display */}
      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 flex flex-col justify-center space-y-6">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Matrix Result & Linear Transformation Analysis
        </h3>

        {resultLatex ? (
          <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl overflow-x-auto text-xl text-white">
              <MathRenderer math={resultLatex} block />
            </div>

            <div className="bg-slate-950/70 border border-slate-800/80 p-5 rounded-2xl text-xs text-slate-300 space-y-2">
              <span className="font-semibold text-cyan-400 uppercase tracking-wider text-[11px] block">
                Mathematical Context
              </span>
              <p className="leading-relaxed">{resultDetails}</p>
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-500 text-xs py-12">
            Select an operation and click "Execute Matrix Operation"
          </div>
        )}
      </div>
    </div>
  );
};
