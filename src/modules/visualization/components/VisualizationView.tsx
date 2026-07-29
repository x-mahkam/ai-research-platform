import React, { useState, useEffect, useRef } from 'react';
import { Experiment } from '../../../types';
import {
  LineChart,
  Layers,
  Eye,
  Sliders,
  Download,
  Activity,
  Maximize2,
  TrendingUp,
  Cpu,
} from 'lucide-react';

interface VisualizationViewProps {
  experiments: Experiment[];
  activeExperimentId: string | null;
}

export const VisualizationView: React.FC<VisualizationViewProps> = ({
  experiments,
  activeExperimentId,
}) => {
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>(
    activeExperimentId || experiments[0]?.id || ''
  );
  const [compareExperimentId, setCompareExperimentId] = useState<string>('');
  const [activeCurveType, setActiveCurveType] = useState<'id-vg' | 'id-vd' | 'mesh2d'>('id-vg');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const mainExperiment = experiments.find((e) => e.id === selectedExperimentId) || experiments[0];
  const compareExperiment = experiments.find((e) => e.id === compareExperimentId);

  // Render 2D TCAD Device Mesh Potential Heatmap on HTML Canvas
  useEffect(() => {
    if (activeCurveType !== 'mesh2d' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background grid
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw TCAD Transistor Device Structure Schematic & Potential Mesh Nodes
    // Source Contact (Left)
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(40, 40, 80, 50);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10px monospace';
    ctx.fillText('SOURCE (0V)', 50, 70);

    // Drain Contact (Right)
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(380, 40, 80, 50);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('DRAIN (0.7V)', 388, 70);

    // Gate Metal Stack (Top Center)
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(150, 20, 200, 30);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('GAA METAL GATE (Vg=0.7V)', 170, 38);

    // Silicon Nanosheet Channel (Center)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(120, 90, 260, 60);
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.strokeRect(120, 90, 260, 60);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '11px monospace';
    ctx.fillText('3nm Si Nanosheet Channel', 170, 125);

    // Render Mesh Triangles & Electrostatic Potential Contour Heatmap
    if (mainExperiment?.results?.mesh2D) {
      const nodes = mainExperiment.results.mesh2D.nodes;
      nodes.forEach((node, i) => {
        const nx = 50 + (node.x / 30) * 400;
        const ny = 180 + (node.y / 15) * 120;

        // Color mapping based on electrostatic potential (blue -> cyan -> yellow -> red)
        const potNorm = Math.min(Math.max(node.potential / 1.2, 0), 1);
        const r = Math.floor(potNorm * 255);
        const g = Math.floor((1 - Math.abs(potNorm - 0.5) * 2) * 255);
        const b = Math.floor((1 - potNorm) * 255);

        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();

        // Connect mesh lines to neighboring nodes
        if (i % 10 !== 9 && i + 1 < nodes.length) {
          const nextNode = nodes[i + 1];
          const nnx = 50 + (nextNode.x / 30) * 400;
          const nny = 180 + (nextNode.y / 15) * 120;
          ctx.strokeStyle = 'rgba(6,182,212,0.2)';
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(nnx, nny);
          ctx.stroke();
        }
      });
    }

    // Legend
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10px monospace';
    ctx.fillText('Electrostatic Potential Contour Map (V): 0.0V (Blue) ---> 1.2V (Red)', 40, 330);
  }, [activeCurveType, mainExperiment]);

  const curveData = mainExperiment?.results?.curves[0]?.data || [];
  const compareCurveData = compareExperiment?.results?.curves[0]?.data || [];

  return (
    <div id="visualization-view-root" className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-white tracking-tight">Scientific Visualizer (ARP-006)</h1>
            <span className="text-xs font-mono bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded">
              I-V / C-V & 2D TCAD Mesh
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Plot I-V transfer characteristics, output curves, and 2D electrostatic potential heatmaps with overlay experiment comparison.
          </p>
        </div>

        {/* Experiment Selector & Overlay Comparison Selectors */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <span className="text-slate-400 font-medium">Primary Exp:</span>
            <select
              value={selectedExperimentId}
              onChange={(e) => setSelectedExperimentId(e.target.value)}
              className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {experiments.map((e) => (
                <option key={e.id} value={e.id} className="bg-slate-900 text-slate-200">
                  {e.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
            <span className="text-slate-400 font-medium">Overlay Exp:</span>
            <select
              value={compareExperimentId}
              onChange={(e) => setCompareExperimentId(e.target.value)}
              className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              <option value="">None (Single Plot)</option>
              {experiments
                .filter((e) => e.id !== selectedExperimentId)
                .map((e) => (
                  <option key={e.id} value={e.id} className="bg-slate-900 text-slate-200">
                    {e.title}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Plot Stage */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 space-y-6">
        {/* Plot Mode Switcher */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3 text-xs font-semibold">
            <button
              onClick={() => setActiveCurveType('id-vg')}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeCurveType === 'id-vg'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              Transfer Curve (Log Id vs Vg)
            </button>
            <button
              onClick={() => setActiveCurveType('id-vd')}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeCurveType === 'id-vd'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              Output Curve (Id vs Vd)
            </button>
            <button
              onClick={() => setActiveCurveType('mesh2d')}
              className={`px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                activeCurveType === 'mesh2d'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              2D TCAD Potential Mesh Heatmap
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-3 h-3 rounded-full bg-cyan-400 inline-block" />
            <span>Primary: {mainExperiment?.title}</span>
            {compareExperiment && (
              <>
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block ml-3" />
                <span>Overlay: {compareExperiment.title}</span>
              </>
            )}
          </div>
        </div>

        {/* Display Plot Area */}
        {activeCurveType === 'mesh2d' ? (
          mainExperiment?.results?.mesh2D ? (
            <div className="flex justify-center bg-slate-950 p-4 rounded-xl border border-slate-800">
              <canvas ref={canvasRef} width={500} height={350} className="rounded border border-slate-800 max-w-full" />
            </div>
          ) : (
            <div className="bg-slate-950 p-12 rounded-xl border border-slate-800 text-center text-slate-400 text-xs">
              Waiting for real simulator integration. No 2D mesh dataset collected from solver output files yet.
            </div>
          )
        ) : curveData.length > 0 ? (
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
              <span>Y-Axis: Drain Current $I_d$ (A/µm)</span>
              <span>X-Axis: Voltage (V)</span>
            </div>

            {/* Custom SVG Curve Renderer */}
            <div className="h-64 w-full relative flex items-end pt-6 pb-2 px-8 border-b border-l border-slate-800">
              <svg className="w-full h-full overflow-visible">
                {/* SVG Polyline for Primary Curve */}
                {curveData.length > 0 && (
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="3"
                    points={curveData
                      .map((pt, index) => {
                        const xPct = (index / (curveData.length - 1)) * 100;
                        const yVal = Math.min(Math.max((Math.log10(pt.y || 1e-12) + 12) / 10, 0), 1);
                        const yPct = 100 - yVal * 100;
                        return `${xPct}%,${yPct}%`;
                      })
                      .join(' ')}
                  />
                )}

                {/* SVG Polyline for Comparison Curve */}
                {compareCurveData.length > 0 && (
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeDasharray="4"
                    points={compareCurveData
                      .map((pt, index) => {
                        const xPct = (index / (compareCurveData.length - 1)) * 100;
                        const yVal = Math.min(Math.max((Math.log10(pt.y || 1e-12) + 12) / 10, 0), 1);
                        const yPct = 100 - yVal * 100;
                        return `${xPct}%,${yPct}%`;
                      })
                      .join(' ')}
                  />
                )}
              </svg>
            </div>

            <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1">
              <span>-0.2V</span>
              <span>0.0V</span>
              <span>0.2V</span>
              <span>0.4V</span>
              <span>0.6V</span>
              <span>0.8V</span>
              <span>1.0V</span>
              <span>1.2V</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-950 p-12 rounded-xl border border-slate-800 text-center text-slate-400 text-xs">
            Waiting for real simulator integration. Submit and run an experiment using an integrated solver (Sentaurus, QuantumATK, COMSOL, Lumerical, Silvaco) to collect real simulation curve datasets.
          </div>
        )}
      </div>
    </div>
  );
};
