/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AppMode = 'scientific' | 'calculus' | '2d-graph' | 'matrix';

export type AngleMode = 'rad' | 'deg';


export interface Graph3DSettings {
  equation: string;          // e.g. "sin(sqrt(x^2 + y^2) - t)"
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  resolution: number;        // grid steps, e.g. 60
  time: number;              // t parameter for animation
  isAnimated: boolean;
  colorScheme: 'turbo' | 'viridis' | 'ocean' | 'neon' | 'sunset';
  wireframe: boolean;
  showAxes: boolean;
  showGrid: boolean;
  showTangentPlane: boolean;
  tangentPoint: { x: number; y: number };
  showRiemannSum: boolean;
  riemannN: number;          // subdivisions for 3D Riemann prisms
  mode3D: 'surface' | 'revolution' | 'parametric' | 'riemann';
  revolutionAxis: 'x' | 'y';
  revolutionEq: string;      // e.g. "sqrt(x)"
  parametric: {
    x: string;               // e.g. "cos(t) * (3 + cos(5*t))"
    y: string;               // e.g. "sin(t) * (3 + cos(5*t))"
    z: string;               // e.g. "sin(5*t)"
    tMin: number;
    tMax: number;
    steps: number;
  };
}

export interface Graph2DFunction {
  id: string;
  expression: string;
  color: string;
  visible: boolean;
  showDerivative: boolean;
  showSecondDerivative: boolean;
  showIntegral: boolean;
  integralRange: [number, number];
}

export interface CalculusStep {
  title: string;
  description: string;
  latex: string;
  rule?: string;
}

export interface CalculusResult {
  problemType: 'derivative' | 'integral' | 'limit' | 'taylor' | 'critical' | 'ode';
  inputLatex: string;
  resultLatex: string;
  numericalValue?: number;
  steps: CalculusStep[];
  additionalInfo?: {
    label: string;
    value: string;
  }[];
}

export interface PresetItem {
  id: string;
  title: string;
  category: 'calculus' | '3d-surface' | 'physics' | 'space-curves';
  description: string;
  latex: string;
}
