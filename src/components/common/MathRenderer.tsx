/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';
import { Copy, Check } from 'lucide-react';

interface MathRendererProps {
  math: string;
  block?: boolean;
  className?: string;
  showCopy?: boolean;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  math,
  block = false,
  className = '',
  showCopy = false,
}) => {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          output: 'htmlAndMathml',
        });
      } catch (err) {
        containerRef.current.innerText = math;
      }
    }
  }, [math, block]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(math);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span className={`relative group inline-flex items-center ${block ? 'w-full justify-center overflow-x-auto py-1' : ''} ${className}`}>
      <span ref={containerRef} className="text-inherit" />
      {showCopy && (
        <button
          onClick={handleCopy}
          aria-label="Copy LaTeX formula"
          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-white rounded bg-slate-800/80 hover:bg-slate-700 text-xs"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </span>
  );
};
