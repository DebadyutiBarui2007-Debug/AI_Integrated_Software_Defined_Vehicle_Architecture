import React from "react";
import { DrivePowerMode, SensorMetrics } from "../types";
import { Zap, Leaf, Scale, Cpu, Gauge, Clock, ShieldCheck, Activity, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface NpuPowerModeSelectorProps {
  metrics: SensorMetrics;
  onSelectPowerMode: (mode: DrivePowerMode) => void;
}

export const NpuPowerModeSelector: React.FC<NpuPowerModeSelectorProps> = ({
  metrics,
  onSelectPowerMode
}) => {
  const currentMode: DrivePowerMode = metrics.power_mode || "BALANCED";

  // Active or fallback metrics
  const powerWatts = metrics.npu_power_watts ?? (currentMode === "PERFORMANCE" ? 30.5 : currentMode === "ENERGY_SAVING" ? 8.8 : 14.5);
  const latencyMs = metrics.inference_latency_ms ?? (currentMode === "PERFORMANCE" ? 5.8 : currentMode === "ENERGY_SAVING" ? 32.4 : 16.5);
  const efficiencyPct = metrics.power_efficiency_percent ?? (currentMode === "PERFORMANCE" ? 78.4 : currentMode === "ENERGY_SAVING" ? 97.6 : 91.2);
  const targetEfficiencyPct = metrics.target_power_efficiency_percent ?? (currentMode === "PERFORMANCE" ? 85.0 : currentMode === "ENERGY_SAVING" ? 95.0 : 90.0);

  const efficiencyDelta = parseFloat((efficiencyPct - targetEfficiencyPct).toFixed(1));
  const isAboveTarget = efficiencyDelta >= 0;

  const modeConfig = [
    {
      id: "PERFORMANCE" as DrivePowerMode,
      label: "Performance Mode",
      subtitle: "Max NPU Clock / Min Latency",
      icon: Zap,
      activeColor: "bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/30",
      hoverColor: "hover:bg-amber-950/60 hover:border-amber-700/60 text-amber-200",
      badge: "P0 High Precision",
      latencyText: "~5.8ms Sub-10ms",
      powerText: "~30.5 Watts"
    },
    {
      id: "BALANCED" as DrivePowerMode,
      label: "Balanced Mode",
      subtitle: "Nominal ADAS Duty Cycle",
      icon: Scale,
      activeColor: "bg-cyan-500 text-slate-950 border-cyan-400 shadow-lg shadow-cyan-500/30",
      hoverColor: "hover:bg-cyan-950/60 hover:border-cyan-700/60 text-cyan-200",
      badge: "ISO Standard",
      latencyText: "~16.5ms Nominal",
      powerText: "~14.5 Watts"
    },
    {
      id: "ENERGY_SAVING" as DrivePowerMode,
      label: "Energy Saving Mode",
      subtitle: "Eco Power Optimization",
      icon: Leaf,
      activeColor: "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/30",
      hoverColor: "hover:bg-emerald-950/60 hover:border-emerald-700/60 text-emerald-200",
      badge: "Max Efficiency",
      latencyText: "~32.4ms Low Draw",
      powerText: "~8.8 Watts"
    }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 font-sans">
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500 via-amber-500 to-emerald-500 rounded-xl text-slate-950 shadow-md">
            <Gauge className="w-5 h-5 font-bold" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm text-slate-100">Edge NPU Drive &amp; Power Mode Controller</h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                Dynamic Clock Governor
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Toggle NPU performance profiles to balance real-time ADAS inference latency against thermal power budget
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400">Active Profile:</span>
          <span
            className={`font-black px-2.5 py-1 rounded-lg border text-xs ${
              currentMode === "PERFORMANCE"
                ? "bg-amber-950 text-amber-300 border-amber-700"
                : currentMode === "ENERGY_SAVING"
                ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                : "bg-cyan-950 text-cyan-300 border-cyan-700"
            }`}
          >
            {currentMode}
          </span>
        </div>
      </div>

      {/* Mode Selector Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modeConfig.map((item) => {
          const Icon = item.icon;
          const isActive = currentMode === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectPowerMode(item.id)}
              className={`p-4 rounded-xl border text-left transition-all duration-200 relative overflow-hidden flex flex-col justify-between space-y-3 ${
                isActive
                  ? item.activeColor
                  : `bg-slate-950/80 border-slate-800/90 text-slate-300 ${item.hoverColor}`
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`p-2 rounded-lg ${isActive ? "bg-slate-950/20 text-slate-950" : "bg-slate-900 text-slate-200"}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    isActive ? "bg-slate-950/30 text-slate-950 border border-slate-950/40" : "bg-slate-900 text-slate-400 border border-slate-800"
                  }`}
                >
                  {item.badge}
                </span>
              </div>

              <div>
                <h4 className="font-extrabold text-sm">{item.label}</h4>
                <p className={`text-[11px] mt-0.5 ${isActive ? "text-slate-900 font-medium" : "text-slate-400"}`}>
                  {item.subtitle}
                </p>
              </div>

              <div
                className={`pt-2 border-t font-mono text-[11px] flex justify-between ${
                  isActive ? "border-slate-950/20 text-slate-950 font-bold" : "border-slate-900 text-slate-400"
                }`}
              >
                <span>Latency: {item.latencyText}</span>
                <span>Power: {item.powerText}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Real-Time Power Efficiency vs Target Display Meter */}
      <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono border-b border-slate-900 pb-2">
          <div className="flex items-center space-x-2 text-slate-300 font-bold">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>REAL-TIME NPU POWER EFFICIENCY vs TARGET</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-slate-400">Target Benchmark:</span>
            <span className="text-amber-400 font-bold">{targetEfficiencyPct.toFixed(1)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Current Efficiency vs Target Comparison */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1 font-mono">
            <span className="text-[11px] text-slate-400">Current Power Efficiency</span>
            <div className="flex items-baseline space-x-2">
              <span className={`text-2xl font-black ${isAboveTarget ? "text-emerald-400" : "text-amber-400"}`}>
                {efficiencyPct.toFixed(1)}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center ${
                  isAboveTarget
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    : "bg-amber-950 text-amber-300 border border-amber-800"
                }`}
              >
                {isAboveTarget ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {isAboveTarget ? `+${efficiencyDelta}%` : `${efficiencyDelta}%`}
              </span>
            </div>
            {/* Visual Bar Meter */}
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 relative mt-2">
              <div
                className={`h-full transition-all duration-500 ${
                  isAboveTarget ? "bg-gradient-to-r from-emerald-500 to-cyan-400" : "bg-gradient-to-r from-amber-500 to-rose-500"
                }`}
                style={{ width: `${Math.min(100, Math.max(10, efficiencyPct))}%` }}
              />
              {/* Target Marker Pin */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-amber-400 shadow"
                style={{ left: `${Math.min(100, Math.max(10, targetEfficiencyPct))}%` }}
                title={`Target: ${targetEfficiencyPct}%`}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 pt-1">
              <span>0% Low</span>
              <span className="text-amber-400">Target {targetEfficiencyPct}%</span>
              <span>100% Ideal</span>
            </div>
          </div>

          {/* NPU Power Consumption */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1 font-mono">
            <span className="text-[11px] text-slate-400">NPU Power Usage</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-slate-100">{powerWatts.toFixed(1)} W</span>
              <span className="text-[10px] text-slate-400">Watts Draw</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mt-2">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (powerWatts / 35.0) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 pt-1">
              <span>5W Low</span>
              <span>Max Thermal 35W</span>
            </div>
          </div>

          {/* Inference Latency */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-1 font-mono">
            <span className="text-[11px] text-slate-400">Inference Latency</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-black text-cyan-400">{latencyMs.toFixed(1)} ms</span>
              <span className="text-[10px] text-slate-400">Loop Overhead</span>
            </div>
            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mt-2">
              <div
                className="h-full bg-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(10, (latencyMs / 40.0) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 pt-1">
              <span>Fast &lt;10ms</span>
              <span>ISO Limit 50ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
