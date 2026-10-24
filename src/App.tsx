/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppMode, Graph2DFunction } from './types/calculator';
import { Header } from './components/layout/Header';
import { Grapher2D } from './components/2d/Grapher2D';
import { CalculusSolver } from './components/calculus/CalculusSolver';
import { ScientificKeypad } from './components/calculator/ScientificKeypad';
import { MatrixCalculator } from './components/matrix/MatrixCalculator';
import { PresetsModal } from './components/presets/PresetsModal';

export default function App() {
  // Default to Scientific Calc as requested
  const [currentMode, setCurrentMode] = useState<AppMode>('scientific');
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  // 2D Grapher initial functions
  const [functions2D, setFunctions2D] = useState<Graph2DFunction[]>([
    {
      id: 'fn-1',
      expression: 'sin(x)',
      color: '#38bdf8',
      visible: true,
      showDerivative: true,
      showSecondDerivative: false,
      showIntegral: true,
      integralRange: [0, 3.14159],
    },
    {
      id: 'fn-2',
      expression: '0.15 * x^3 - x',
      color: '#f43f5e',
      visible: true,
      showDerivative: false,
      showSecondDerivative: false,
      showIntegral: false,
      integralRange: [-2, 2],
    },
  ]);

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 overflow-hidden font-sans select-none">
      {/* Header Bar */}
      <Header
        currentMode={currentMode}
        onSelectMode={setCurrentMode}
        onOpenPresets={() => setIsPresetsOpen(true)}
      />

      {/* Main Workspace Mode Viewport */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] relative overflow-hidden">
        {currentMode === 'scientific' && <ScientificKeypad />}

        {currentMode === 'calculus' && <CalculusSolver />}

        {currentMode === '2d-graph' && (
          <Grapher2D
            functions={functions2D}
            onUpdateFunctions={setFunctions2D}
          />
        )}

        {currentMode === 'matrix' && <MatrixCalculator />}
      </main>

      {/* Presets Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onSelect2DPreset={setFunctions2D}
        onSwitchMode={setCurrentMode}
      />
    </div>
  );
}
