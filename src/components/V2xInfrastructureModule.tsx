import React from "react";
import { SensorMetrics } from "../types";
import {
  Radio,
  Wifi,
  WifiOff,
  Signal,
  AlertTriangle,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  Layers,
  MapPin,
  Clock
} from "lucide-react";

interface V2xInfrastructureModuleProps {
  metrics: SensorMetrics;
  onMetricsChange: (updated: Partial<SensorMetrics>) => void;
}

export const V2xInfrastructureModule: React.FC<V2xInfrastructureModuleProps> = ({
  metrics,
  onMetricsChange
}) => {
  const isV2xEnabled = metrics.v2x_enabled ?? true;
  const currentFriction = metrics.road_friction ?? 0.85;
  const currentLight = metrics.traffic_light_state ?? "GREEN";
  const v2xLatency = metrics.v2x_latency_ms ?? 4.2;

  const getFrictionLabel = (mu: number) => {
    if (mu <= 0.25) return { label: "Black Ice / Glare Ice", color: "text-purple-400 bg-purple-950/80 border-purple-800" };
    if (mu <= 0.45) return { label: "Packed Snow / Slush", color: "text-blue-400 bg-blue-950/80 border-blue-800" };
    if (mu <= 0.65) return { label: "Wet Asphalt / Heavy Rain", color: "text-amber-400 bg-amber-950/80 border-amber-800" };
    return { label: "Dry Asphalt (Optimal)", color: "text-emerald-400 bg-emerald-950/80 border-emerald-800" };
  };

  const frictionMeta = getFrictionLabel(currentFriction);

  const handleToggleV2x = () => {
    onMetricsChange({
      v2x_enabled: !isV2xEnabled
    });
  };

  const handleSetFriction = (mu: number) => {
    onMetricsChange({
      road_friction: mu
    });
  };

  const handleSetLightState = (state: "RED" | "YELLOW" | "GREEN" | "NONE") => {
    onMetricsChange({
      traffic_light_state: state
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 font-sans">
      {/* Module Title & Toggle Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2.5 rounded-xl text-slate-950 shadow-md transition-all ${
              isV2xEnabled ? "bg-gradient-to-br from-cyan-400 to-blue-600 shadow-cyan-500/20" : "bg-slate-800 text-slate-500"
            }`}
          >
            {isV2xEnabled ? <Wifi className="w-5 h-5 font-bold animate-pulse" /> : <WifiOff className="w-5 h-5 font-bold" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm text-slate-100">
                5G C-V2X (Vehicle-to-Everything) Telematics Infrastructure
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
                IEEE 1609 / ETSI ITS-G5
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Direct PC5 sidelink communication broadcasting smart intersection signals and road friction friction coefficients
            </p>
          </div>
        </div>

        {/* Master V2X Switch */}
        <button
          onClick={handleToggleV2x}
          className={`px-4 py-2 rounded-xl font-bold flex items-center space-x-2 transition-all font-mono text-xs ${
            isV2xEnabled
              ? "bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20"
              : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700"
          }`}
        >
          {isV2xEnabled ? <Signal className="w-4 h-4 text-slate-950" /> : <WifiOff className="w-4 h-4 text-slate-500" />}
          <span>{isV2xEnabled ? "V2X Telematics: ACTIVE" : "V2X Telematics: DISABLED"}</span>
        </button>
      </div>

      {isV2xEnabled ? (
        <div className="space-y-4">
          {/* V2X Metrics Banner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
            {/* RSU Link Status */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Roadside Unit (RSU)</span>
                <span className="text-emerald-400 text-[10px] font-bold">CONNECTED</span>
              </div>
              <div className="text-sm font-black text-slate-200 flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span className="truncate">{metrics.v2x_intersection_id || "RSU-802-SEATTLE-MAIN"}</span>
              </div>
              <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-900">
                <span>Direct PC5 Sidelink</span>
                <span className="text-cyan-400">{v2xLatency.toFixed(1)} ms latency</span>
              </div>
            </div>

            {/* Road Friction Index */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>Road Surface Friction ($\mu$)</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${frictionMeta.color}`}>
                  $\mu$ = {currentFriction.toFixed(2)}
                </span>
              </div>
              <div className="text-sm font-black text-slate-200">{frictionMeta.label}</div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                {currentFriction < 0.5 ? "⚠️ Early braking required (High slip risk)" : "Nominal stopping distance factor"}
              </div>
            </div>

            {/* Smart Traffic Signal */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>V2I Traffic Light Signal</span>
                <span className="text-[10px] text-slate-400 font-bold">SPaT Broadcast</span>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`w-3.5 h-3.5 rounded-full animate-ping ${
                    currentLight === "RED"
                      ? "bg-rose-500"
                      : currentLight === "YELLOW"
                      ? "bg-amber-400"
                      : currentLight === "GREEN"
                      ? "bg-emerald-400"
                      : "bg-slate-700"
                  }`}
                />
                <span className="text-sm font-black text-slate-100">{currentLight} LIGHT</span>
              </div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                {currentLight === "RED" ? "🚨 Active V2X Red Light Hold" : "Intersection clear"}
              </div>
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl space-y-4">
            <div className="text-xs font-mono font-bold text-slate-300 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Simulate External Infrastructure Conditions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              {/* Friction Preset Buttons */}
              <div className="space-y-2">
                <label className="text-slate-400 block font-bold text-[11px]">
                  Road Surface Friction Coefficient ($\mu$):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSetFriction(0.85)}
                    className={`py-2 px-3 rounded-lg border font-bold text-left transition-all ${
                      currentFriction === 0.85
                        ? "bg-emerald-950 border-emerald-600 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div>Dry Asphalt</div>
                    <div className="text-[10px] font-normal text-slate-500 font-sans">$\mu$ = 0.85 (Dry)</div>
                  </button>

                  <button
                    onClick={() => handleSetFriction(0.50)}
                    className={`py-2 px-3 rounded-lg border font-bold text-left transition-all ${
                      currentFriction === 0.50
                        ? "bg-amber-950 border-amber-600 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div>Heavy Rain</div>
                    <div className="text-[10px] font-normal text-slate-500 font-sans">$\mu$ = 0.50 (Wet)</div>
                  </button>

                  <button
                    onClick={() => handleSetFriction(0.35)}
                    className={`py-2 px-3 rounded-lg border font-bold text-left transition-all ${
                      currentFriction === 0.35
                        ? "bg-blue-950 border-blue-600 text-blue-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div>Packed Snow</div>
                    <div className="text-[10px] font-normal text-slate-500 font-sans">$\mu$ = 0.35 (Slush)</div>
                  </button>

                  <button
                    onClick={() => handleSetFriction(0.20)}
                    className={`py-2 px-3 rounded-lg border font-bold text-left transition-all ${
                      currentFriction === 0.20
                        ? "bg-purple-950 border-purple-600 text-purple-300 animate-pulse"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <div>Black Ice</div>
                    <div className="text-[10px] font-normal text-slate-500 font-sans">$\mu$ = 0.20 (Slippery)</div>
                  </button>
                </div>
              </div>

              {/* Traffic Light Preset Buttons */}
              <div className="space-y-2">
                <label className="text-slate-400 block font-bold text-[11px]">
                  Smart Intersection SPaT Signal:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSetLightState("GREEN")}
                    className={`py-2 px-3 rounded-lg border font-bold flex items-center space-x-2 transition-all ${
                      currentLight === "GREEN"
                        ? "bg-emerald-950 border-emerald-600 text-emerald-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span>GREEN Light</span>
                  </button>

                  <button
                    onClick={() => handleSetLightState("YELLOW")}
                    className={`py-2 px-3 rounded-lg border font-bold flex items-center space-x-2 transition-all ${
                      currentLight === "YELLOW"
                        ? "bg-amber-950 border-amber-600 text-amber-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span>YELLOW Light</span>
                  </button>

                  <button
                    onClick={() => handleSetLightState("RED")}
                    className={`py-2 px-3 rounded-lg border font-bold flex items-center space-x-2 transition-all ${
                      currentLight === "RED"
                        ? "bg-rose-950 border-rose-600 text-rose-300"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span>RED Light</span>
                  </button>

                  <button
                    onClick={() => handleSetLightState("NONE")}
                    className={`py-2 px-3 rounded-lg border font-bold flex items-center space-x-2 transition-all ${
                      currentLight === "NONE"
                        ? "bg-slate-800 border-slate-600 text-slate-200"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                    <span>No Signal</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-xl text-center font-mono text-xs text-slate-500 space-y-2">
          <WifiOff className="w-8 h-8 text-slate-700 mx-auto animate-pulse" />
          <p>5G C-V2X Direct Communications offline. ADAS vehicle relies exclusively on local onboard Camera &amp; Radar sensors.</p>
        </div>
      )}
    </div>
  );
};
