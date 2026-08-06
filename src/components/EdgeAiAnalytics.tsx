import React from "react";
import { Cpu, Zap, Activity, ShieldAlert, CheckCircle, BarChart3, Clock, Layers } from "lucide-react";
import { SensorMetrics, TelemetryEvent } from "../types";
import { TrajectoryTrendChart } from "./TrajectoryTrendChart";
import { EdgePowerConsumptionChart } from "./EdgePowerConsumptionChart";

interface EdgeAiAnalyticsProps {
  metrics: SensorMetrics;
  lastCommand: string;
  telemetryLogs?: TelemetryEvent[];
}

export const EdgeAiAnalytics: React.FC<EdgeAiAnalyticsProps> = ({
  metrics,
  lastCommand,
  telemetryLogs = []
}) => {
  const isEmergencyBrake = metrics.obstacle_distance_m < 15.0 && metrics.vehicle_speed_kmh > 30.0;
  const isWarning = !isEmergencyBrake && (metrics.obstacle_distance_m < 25.0 || metrics.time_to_collision_s < 2.5);

  const currentPowerMode = metrics.power_mode || "BALANCED";
  const inferenceLatencyMs =
    metrics.inference_latency_ms ??
    (currentPowerMode === "PERFORMANCE" ? 5.8 : currentPowerMode === "ENERGY_SAVING" ? 32.4 : 16.5);

  const latestPowerWatts =
    metrics.npu_power_watts ??
    (telemetryLogs.length > 0 && telemetryLogs[0].system_state?.edge_ai_power_watts
      ? telemetryLogs[0].system_state.edge_ai_power_watts
      : 14.2);

  const powerEfficiencyPct = metrics.power_efficiency_percent ?? (currentPowerMode === "PERFORMANCE" ? 78.4 : currentPowerMode === "ENERGY_SAVING" ? 97.6 : 91.2);
  const targetEfficiencyPct = metrics.target_power_efficiency_percent ?? (currentPowerMode === "PERFORMANCE" ? 85.0 : currentPowerMode === "ENERGY_SAVING" ? 95.0 : 90.0);

  return (
    <div className="space-y-6">
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase">Inference Latency</span>
            <div className="text-2xl font-black text-cyan-400 font-mono mt-1">{inferenceLatencyMs.toFixed(1)} ms</div>
            <span className="text-[10px] text-slate-500 font-mono">Mode: {currentPowerMode}</span>
          </div>
          <div className="p-3 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800/60">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase">Power Efficiency</span>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
              {powerEfficiencyPct.toFixed(1)}%
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Target: {targetEfficiencyPct.toFixed(1)}%</span>
          </div>
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/60">
            <BarChart3 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase">Time-To-Collision (TTC)</span>
            <div
              className={`text-2xl font-black font-mono mt-1 ${
                metrics.time_to_collision_s < 2.5 ? "text-rose-400" : "text-emerald-400"
              }`}
            >
              {metrics.time_to_collision_s.toFixed(2)}s
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Kinematic Fusion Vector</span>
          </div>
          <div className="p-3 bg-slate-800 text-slate-300 rounded-xl">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-mono uppercase">NPU Power Consumption</span>
            <div className="text-2xl font-black text-slate-200 font-mono mt-1">{latestPowerWatts.toFixed(1)} W</div>
            <span className="text-[10px] text-slate-500 font-mono">Thermal Enclosure Peak</span>
          </div>
          <div className="p-3 bg-slate-800 text-amber-400 rounded-xl">
            <Cpu className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Edge AI Power Consumption vs Safety Event Line Chart */}
      <EdgePowerConsumptionChart
        telemetryLogs={telemetryLogs}
        metrics={metrics}
        lastCommand={lastCommand}
      />

      {/* Decision Engine Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collision Risk Algorithm Logic */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">Onboard Collision Risk Model Architecture</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>1. Multi-Modal Sensor Fusion Layer</span>
                <span className="text-cyan-400">Camera + Radar</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Fuses 1080p 60fps Front Camera vision confidence with 77GHz Radar millimeter wave range. Radar distance takes priority for ranging, while Vision handles object classification ({metrics.detected_object_type || "PEDESTRIAN"}).
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>2. Kinematic Risk Calculation</span>
                <span className="text-amber-400">TTC = {metrics.time_to_collision_s.toFixed(2)}s</span>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Computes relative closing velocity based on CAN vehicle speed ({metrics.vehicle_speed_kmh.toFixed(1)} km/h) and obstacle distance ({metrics.obstacle_distance_m.toFixed(1)} m).
              </p>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-bold">
                <span>3. Actuation Trigger Policy</span>
                <span className="text-rose-400">ISO 26262 ASIL-D</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span>Dist &lt; 15m AND Speed &gt; 30km/h:</span>
                  <span className="font-bold text-rose-400">EMERGENCY_BRAKE (100% Brake)</span>
                </div>
                <div className="flex justify-between">
                  <span>Dist &lt; 25m OR TTC &lt; 2.5s:</span>
                  <span className="font-bold text-amber-400">WARNING (Audible/HMI)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Evaluation State Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="font-bold text-sm text-white">Live Decision Controller Output</h3>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2.5 py-1 rounded-full">
                ECU Cycle: 1000ms
              </span>
            </div>

            <div className="space-y-4 font-mono">
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  isEmergencyBrake
                    ? "bg-rose-950/80 border-rose-500 text-rose-200"
                    : isWarning
                    ? "bg-amber-950/80 border-amber-500 text-amber-200"
                    : "bg-emerald-950/80 border-emerald-500 text-emerald-200"
                }`}
              >
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider">Actuation Command</div>
                  <div className="text-2xl font-black mt-1">{lastCommand || "MAINTAIN"}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold tracking-wider">Priority Level</div>
                  <div className="text-lg font-bold mt-1">
                    {isEmergencyBrake ? "P0_CRITICAL" : isWarning ? "P1_HIGH" : "P3_NORMAL"}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="text-slate-400 font-bold uppercase text-[10px]">Active Evaluation Rules</div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Obstacle Distance &lt; 15.0m:</span>
                  <span className={`font-bold ${metrics.obstacle_distance_m < 15 ? "text-rose-400" : "text-emerald-400"}`}>
                    {metrics.obstacle_distance_m < 15 ? "TRUE (11.2m)" : "FALSE"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-800/80 pb-1.5">
                  <span className="text-slate-400">Vehicle Speed &gt; 30.0 km/h:</span>
                  <span className={`font-bold ${metrics.vehicle_speed_kmh > 30 ? "text-rose-400" : "text-emerald-400"}`}>
                    {metrics.vehicle_speed_kmh > 30 ? "TRUE (" + metrics.vehicle_speed_kmh.toFixed(1) + "km/h)" : "FALSE"}
                  </span>
                </div>
                <div className="flex justify-between pt-0.5">
                  <span className="text-slate-400">AEB Rule Result:</span>
                  <span
                    className={`font-bold ${
                      isEmergencyBrake ? "text-rose-400 uppercase" : "text-emerald-400 uppercase"
                    }`}
                  >
                    {isEmergencyBrake ? "EMERGENCY BRAKE ACTIVE" : "SAFETY MARGIN OK"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono flex items-center justify-between">
            <span>Model: YOLO-v8-Auto-Edge-v2.1</span>
            <span>Target Platform: Automotive Grade SoC</span>
          </div>
        </div>
      </div>

      {/* D3 Trajectory Trend Prediction Chart */}
      <TrajectoryTrendChart metrics={metrics} lastCommand={lastCommand} />
    </div>
  );
};
