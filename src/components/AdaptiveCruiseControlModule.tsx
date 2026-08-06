import React, { useState } from "react";
import {
  Car,
  Gauge,
  Navigation,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Play,
  Square,
  Clock,
  Sliders,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  RotateCcw
} from "lucide-react";
import { SensorMetrics } from "../types";

interface AdaptiveCruiseControlModuleProps {
  metrics: SensorMetrics;
  onMetricsChange: (updated: Partial<SensorMetrics>) => void;
  lastCommand: string;
}

export const AdaptiveCruiseControlModule: React.FC<AdaptiveCruiseControlModuleProps> = ({
  metrics,
  onMetricsChange,
  lastCommand
}) => {
  const [accEnabled, setAccEnabled] = useState<boolean>(true);
  const [setCruiseSpeedKmh, setSetCruiseSpeedKmh] = useState<number>(90);
  const [targetTimeGap, setTargetTimeGap] = useState<number>(2.0); // 2.0s default safe gap

  const isFailsafe =
    lastCommand === "FAILSAFE" ||
    metrics.sensor_fault ||
    metrics.sensor_status === "INVALID_DATA" ||
    metrics.camera_confidence === 0;

  const currentSpeed = metrics.vehicle_speed_kmh;
  const currentSpeedMs = currentSpeed / 3.6;
  const distance = metrics.obstacle_distance_m < 0 ? 0 : metrics.obstacle_distance_m;

  // Calculate actual time gap based on current speed
  const actualTimeGap =
    currentSpeedMs > 0.5 ? parseFloat((distance / currentSpeedMs).toFixed(2)) : 99.9;

  // Calculate Target Speed recommendation to maintain the safe target time gap (default 2.0s)
  // Target Speed (m/s) = Distance (m) / Target Gap (s)
  // Target Speed (km/h) = (Distance / Gap) * 3.6
  let rawTargetSpeedKmh = 0;
  if (!isFailsafe && distance > 0) {
    const targetSpeedMs = distance / targetTimeGap;
    rawTargetSpeedKmh = targetSpeedMs * 3.6;
  }

  // Cap target speed to user's set cruise speed and floor to 0
  const recommendedTargetSpeedKmh = isFailsafe
    ? 0
    : Math.max(0, Math.min(setCruiseSpeedKmh, Math.round(rawTargetSpeedKmh * 10) / 10));

  // Speed Delta
  const speedDelta = recommendedTargetSpeedKmh - currentSpeed;

  // Action status calculation
  const getAccStatus = () => {
    if (!accEnabled) {
      return {
        label: "STANDBY / DISABLED",
        badgeBg: "bg-slate-800 text-slate-400 border-slate-700",
        actionText: "ACC disengaged. Manual driver speed control active."
      };
    }
    if (isFailsafe) {
      return {
        label: "ACC FAULT / DISENGAGED",
        badgeBg: "bg-purple-950 text-purple-300 border-purple-600 animate-pulse",
        actionText: "Sensor fault detected. ACC system automatically disabled for safety."
      };
    }
    if (lastCommand === "EMERGENCY_BRAKE") {
      return {
        label: "AEB OVERRIDE ACTIVE",
        badgeBg: "bg-rose-950 text-rose-300 border-rose-600 animate-pulse",
        actionText: "AEB emergency braking taking priority over cruise control."
      };
    }
    if (speedDelta < -3.0) {
      return {
        label: "DECELERATING (ACC ACTIVE)",
        badgeBg: "bg-amber-950 text-amber-300 border-amber-600",
        actionText: `Slowing down to maintain ${targetTimeGap}s headway gap behind lead object.`
      };
    }
    if (speedDelta > 3.0) {
      return {
        label: "ACCELERATING (ACC ACTIVE)",
        badgeBg: "bg-cyan-950 text-cyan-300 border-cyan-600",
        actionText: `Increasing speed towards cruise setpoint (${setCruiseSpeedKmh} km/h).`
      };
    }
    return {
      label: "MAINTAINING GAP (ACC ACTIVE)",
      badgeBg: "bg-emerald-950 text-emerald-300 border-emerald-600",
      actionText: `Cruising steadily with safe ${targetTimeGap}s time gap.`
    };
  };

  const accStatus = getAccStatus();

  const handleApplyTargetSpeed = () => {
    if (!accEnabled || isFailsafe) return;
    onMetricsChange({
      vehicle_speed_kmh: recommendedTargetSpeedKmh,
      time_to_collision_s:
        recommendedTargetSpeedKmh > 0
          ? parseFloat((distance / (recommendedTargetSpeedKmh / 3.6)).toFixed(2))
          : 99.0
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header with Enable/Disable Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center space-x-2">
          <Car className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-sm text-slate-200">
                Adaptive Cruise Control (ACC) Sub-module
              </h3>
              <span className="text-[10px] font-mono bg-slate-800 text-cyan-400 px-2 py-0.5 rounded font-bold border border-slate-700">
                2.0s Headway Algorithm
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Calculates dynamic target speed recommendation to maintain safe distance gap
            </p>
          </div>
        </div>

        {/* ACC Enable / Disable Toggle Switch */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400">ACC Power:</span>
          <button
            onClick={() => setAccEnabled(!accEnabled)}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 border shadow-md ${
              accEnabled
                ? "bg-cyan-950 text-cyan-300 border-cyan-600 hover:bg-cyan-900 shadow-cyan-950/50"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
            }`}
          >
            {accEnabled ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>ACC ENABLED</span>
              </>
            ) : (
              <>
                <Square className="w-4 h-4 text-slate-500" />
                <span>ACC DISABLED</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Recommended Target Speed Banner + Control Gauges */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Main Recommendation Spotlight Card (5 Cols) */}
        <div
          className={`md:col-span-5 rounded-xl p-4 border flex flex-col justify-between space-y-3 relative overflow-hidden transition-all ${
            !accEnabled
              ? "bg-slate-950/60 border-slate-800"
              : isFailsafe
              ? "bg-purple-950/40 border-purple-600/80"
              : "bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950/30 border-cyan-500/50 shadow-lg shadow-cyan-950/30"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-slate-400 uppercase font-bold flex items-center space-x-1">
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                <span>Recommended Target Speed</span>
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${accStatus.badgeBg}`}>
                {accStatus.label}
              </span>
            </div>

            {/* Target Speed Big Readout */}
            <div className="flex items-baseline space-x-2 my-1">
              <span
                className={`text-3xl font-black font-mono tracking-tight ${
                  !accEnabled
                    ? "text-slate-500"
                    : isFailsafe
                    ? "text-purple-400"
                    : "text-cyan-300"
                }`}
              >
                {!accEnabled ? "N/A" : isFailsafe ? "0.0" : recommendedTargetSpeedKmh.toFixed(1)}
              </span>
              <span className="text-sm font-mono text-slate-400 font-bold">km/h</span>
            </div>

            <p className="text-xs text-slate-300 italic leading-snug mt-1">
              {accStatus.actionText}
            </p>
          </div>

          {/* Sync / Apply Target Speed Button */}
          {accEnabled && !isFailsafe && (
            <button
              onClick={handleApplyTargetSpeed}
              className="w-full py-2 px-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow-md shadow-cyan-600/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Apply Recommended Target Speed ({recommendedTargetSpeedKmh.toFixed(1)} km/h)</span>
            </button>
          )}
        </div>

        {/* Detailed Gap & Speed Metrics Cards (7 Cols) */}
        <div className="md:col-span-7 grid grid-cols-2 gap-3 font-mono text-xs">
          {/* Target Gap Selector */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span>Target Time Gap</span>
              </span>
              <span className="text-cyan-300 font-bold">{targetTimeGap.toFixed(1)}s</span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[1.5, 2.0, 2.5].map((gap) => (
                <button
                  key={gap}
                  onClick={() => setTargetTimeGap(gap)}
                  className={`py-1 text-[11px] font-bold rounded border transition-all ${
                    targetTimeGap === gap
                      ? "bg-cyan-600 text-slate-950 border-cyan-400"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  {gap}s
                </button>
              ))}
            </div>

            <div className="text-[10px] text-slate-400">
              Actual Headway Gap:{" "}
              <span
                className={`font-bold ${
                  actualTimeGap < targetTimeGap
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {actualTimeGap > 10 ? ">10s" : `${actualTimeGap.toFixed(2)}s`}
              </span>
            </div>
          </div>

          {/* Cruise Setpoint Controller */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase font-bold">
              <span className="flex items-center space-x-1">
                <Sliders className="w-3 h-3 text-emerald-400" />
                <span>Cruise Setpoint</span>
              </span>
              <span className="text-emerald-400 font-bold">{setCruiseSpeedKmh} km/h</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSetCruiseSpeedKmh((prev) => Math.max(30, prev - 5))}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-bold"
              >
                -5
              </button>
              <input
                type="range"
                min="30"
                max="130"
                step="5"
                value={setCruiseSpeedKmh}
                onChange={(e) => setSetCruiseSpeedKmh(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <button
                onClick={() => setSetCruiseSpeedKmh((prev) => Math.min(130, prev + 5))}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-bold"
              >
                +5
              </button>
            </div>

            <div className="text-[10px] text-slate-400">Max Cruise Speed Limit</div>
          </div>

          {/* Speed Comparison */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-bold">Current vs Target Speed</div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300">Ego Speed: {currentSpeed.toFixed(1)} km/h</span>
              <span className="text-xs font-bold text-cyan-400">
                Target: {accEnabled && !isFailsafe ? `${recommendedTargetSpeedKmh.toFixed(1)} km/h` : "N/A"}
              </span>
            </div>

            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${Math.min(100, (currentSpeed / 130) * 100)}%` }}
              />
            </div>
          </div>

          {/* Kinematic Formula Note */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="text-[10px] text-slate-400 uppercase font-bold">2.0s Formula Matrix</div>
            <div className="text-[11px] text-slate-300 font-mono">
              v_target = min(d / {targetTimeGap}s, {setCruiseSpeedKmh}km/h)
            </div>
            <div className="text-[10px] text-slate-500">
              ISO 15622 Adaptive Cruise Control Standard
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
