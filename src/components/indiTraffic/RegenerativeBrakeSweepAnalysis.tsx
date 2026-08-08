import React, { useState } from "react";
import { TrafficMetrics, ArchitectureConfig } from "../../types/indiTraffic";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceDot
} from "recharts";
import { Sliders, ShieldCheck, Zap, AlertCircle, Sparkles, Activity, Disc, CheckCircle } from "lucide-react";

interface Props {
  metrics: TrafficMetrics;
  config: ArchitectureConfig;
  onConfigChange?: (updated: Partial<ArchitectureConfig>) => void;
}

export const RegenerativeBrakeSweepAnalysis: React.FC<Props> = ({
  metrics,
  config,
  onConfigChange
}) => {
  const [selectedRampMs, setSelectedRampMs] = useState<number>(config.brakeBlendRampMs || 45);

  const handleRampChange = (val: number) => {
    setSelectedRampMs(val);
    if (onConfigChange) {
      onConfigChange({ brakeBlendRampMs: val });
    }
  };

  // Generate 10-point parameter sweep dataset for brakeBlendRampMs (20ms to 200ms)
  const sweepData = [20, 35, 50, 65, 80, 100, 120, 150, 175, 200].map((ramp) => {
    // Energy recovery drops as ramp time delays regen engagement vs mechanical friction
    const energyRecoveryPercent = Math.max(15, Number((43.5 - (ramp - 20) * 0.135).toFixed(1)));

    // Battery life extension increases with smoother ramp (dampens C-rate current pulses) up to ~120ms
    const sohGainYears = Number((1.2 + (ramp - 20) * 0.012 - Math.max(0, (ramp - 140) * 0.005)).toFixed(2));

    // NVH Passenger Smoothness Score (0 - 100%)
    const nvhSmoothness = Math.min(99, Math.round(50 + (ramp - 20) * 0.28));

    // Mechanical Disc Brake Friction Contribution (%)
    const frictionSharePercent = Math.min(85, Math.round(10 + (ramp - 20) * 0.38));

    return {
      rampMs: ramp,
      energyRecoveryPercent,
      sohGainYears,
      nvhSmoothness,
      frictionSharePercent
    };
  });

  // Calculate stats for current selected rampMs
  const currentPoint = sweepData.reduce((prev, curr) =>
    Math.abs(curr.rampMs - selectedRampMs) < Math.abs(prev.rampMs - selectedRampMs) ? curr : prev
  );

  const isOptimalZone = selectedRampMs >= 35 && selectedRampMs <= 75;
  const isTooAggressive = selectedRampMs < 35;
  const isTooLazy = selectedRampMs > 100;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 shadow-2xl text-slate-100 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Regenerative Brake Sweep & Blending Trade-off
              <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded ${
                isOptimalZone
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                  : isTooAggressive
                  ? "bg-amber-950 text-amber-400 border border-amber-800"
                  : "bg-sky-950 text-sky-400 border border-sky-800"
              }`}>
                {isOptimalZone ? "PARETO OPTIMAL ZONE" : isTooAggressive ? "HIGH C-RATE RIPPLE" : "HIGH FRICTION LOSS"}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Parametric analysis balancing Battery Thermal Lifespan (SOH) vs Kinetic Energy Recovery Efficiency
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl font-mono text-xs">
          <span className="text-slate-400">Ramp Time:</span>
          <span className="text-sky-400 font-extrabold text-sm">{selectedRampMs} ms</span>
        </div>
      </div>

      {/* Interactive Parameter Control Slider */}
      <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <label className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-sky-400" />
            Tune Brake Blending Ramp Time (<code className="text-sky-400 font-mono">brakeBlendRampMs</code>):
          </label>
          <span className="text-slate-400 font-mono">Range: 20 ms (Instant) → 200 ms (Comfort Soft)</span>
        </div>

        <input
          type="range"
          min={20}
          max={200}
          step={5}
          value={selectedRampMs}
          onChange={(e) => handleRampChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none"
        />

        {/* Quick Preset Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            onClick={() => handleRampChange(25)}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition border ${
              selectedRampMs === 25
                ? "bg-amber-500/20 text-amber-300 border-amber-500"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            ⚡ Aggressive (25ms)
          </button>

          <button
            onClick={() => handleRampChange(45)}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition border ${
              selectedRampMs === 45
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 font-bold"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            🎯 Indian Traffic Sweetspot (45ms)
          </button>

          <button
            onClick={() => handleRampChange(80)}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition border ${
              selectedRampMs === 80
                ? "bg-sky-500/20 text-sky-300 border-sky-500"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            🛡️ Battery SOH Saver (80ms)
          </button>

          <button
            onClick={() => handleRampChange(150)}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition border ${
              selectedRampMs === 150
                ? "bg-purple-500/20 text-purple-300 border-purple-500"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            ☁️ Soft Passenger Comfort (150ms)
          </button>
        </div>
      </div>

      {/* Sweep Trade-Off Chart */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Parametric Trade-off Curve: Energy Recovery (%) vs. Battery SOH Extension (+Years)
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Selected Point: {selectedRampMs}ms
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sweepData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="rampMs"
                stroke="#94a3b8"
                fontSize={11}
                unit="ms"
                label={{ value: "Brake Ramp Time (ms)", position: "insideBottom", offset: -5, fill: "#64748b", fontSize: 10 }}
              />
              <YAxis
                yAxisId="left"
                stroke="#38bdf8"
                fontSize={11}
                domain={[10, 50]}
                unit="%"
                label={{ value: "Regen Efficiency (%)", angle: -90, position: "insideLeft", fill: "#38bdf8", fontSize: 10 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#34d399"
                fontSize={11}
                domain={[0.5, 3.0]}
                unit=" yrs"
                label={{ value: "Battery SOH Gain (Yrs)", angle: 90, position: "insideRight", fill: "#34d399", fontSize: 10 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                formatter={(val: any, name: string) => {
                  if (name.includes("Energy")) return [`${val}%`, "Kinetic Energy Recovered"];
                  if (name.includes("SOH")) return [`+${val} Yrs`, "Battery Life Extension"];
                  if (name.includes("NVH")) return [`${val}%`, "Ride Smoothness Score"];
                  return [val, name];
                }}
              />
              <Legend />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="energyRecoveryPercent"
                name="Energy Recovery (%)"
                fill="#0284c7"
                fillOpacity={0.15}
                stroke="#38bdf8"
                strokeWidth={3}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="sohGainYears"
                name="Battery SOH Gain (Yrs)"
                stroke="#34d399"
                strokeWidth={3}
                dot={{ r: 4 }}
              />

              {/* Reference Dot for current selected position */}
              <ReferenceDot
                yAxisId="left"
                x={currentPoint.rampMs}
                y={currentPoint.energyRecoveryPercent}
                r={7}
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sweep Trade-off Metrics Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
        {/* 1. Kinetic Recovery */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Kinetic Energy Recaptured</span>
            <span className="text-lg font-mono font-bold text-sky-400">
              {currentPoint.energyRecoveryPercent}%
            </span>
          </div>
          <Zap className="w-5 h-5 text-sky-400 opacity-80" />
        </div>

        {/* 2. Battery SOH Extension */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Battery SOH Life Extension</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              +{currentPoint.sohGainYears} Years
            </span>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-400 opacity-80" />
        </div>

        {/* 3. NVH Ride Smoothness */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">NVH Passenger Comfort</span>
            <span className="text-lg font-mono font-bold text-purple-400">
              {currentPoint.nvhSmoothness}%
            </span>
          </div>
          <Sparkles className="w-5 h-5 text-purple-400 opacity-80" />
        </div>

        {/* 4. Disc Brake Wear Share */}
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-slate-400 block text-[11px]">Friction Brake Share</span>
            <span className="text-lg font-mono font-bold text-amber-400">
              {currentPoint.frictionSharePercent}%
            </span>
          </div>
          <Disc className="w-5 h-5 text-amber-400 opacity-80" />
        </div>
      </div>

      {/* Trade-off Verdict Analysis */}
      <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
        isOptimalZone
          ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
          : isTooAggressive
          ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
          : "bg-sky-950/40 border-sky-800/60 text-sky-200"
      }`}>
        {isOptimalZone ? (
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        ) : (
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <h4 className="font-bold uppercase tracking-wider text-white">
            Architectural Trade-off Verdict ({selectedRampMs} ms Ramp Time)
          </h4>
          <p className="leading-relaxed text-[11px]">
            {isOptimalZone &&
              `Optimal 45ms - 75ms configuration for heavy Indian urban stop-and-go. Recaptures ~${currentPoint.energyRecoveryPercent}% kinetic energy while shielding battery cells from sharp C-rate current pulses, yielding a +${currentPoint.sohGainYears} year SOH extension.`}
            {isTooAggressive &&
              `Aggressive ${selectedRampMs}ms ramp achieves high energy recovery (${currentPoint.energyRecoveryPercent}%), but rapid step-response causes higher thermal current ripple across cell interconnects.`}
            {isTooLazy &&
              `Extended ${selectedRampMs}ms ramp provides ultra-smooth NVH (${currentPoint.nvhSmoothness}%), but mechanical friction brakes absorb ${currentPoint.frictionSharePercent}% of deceleration energy before regen fully ramps up.`}
          </p>
        </div>
      </div>
    </div>
  );
};
