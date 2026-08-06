import React, { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Zap,
  Gauge,
  Navigation,
  Eye,
  Sliders,
  ShieldCheck,
  CheckCircle2,
  CloudRain,
  Car,
  UserCheck,
  AlertOctagon,
  Wrench,
  ShieldOff,
  Volume2,
  VolumeX,
  Radio
} from "lucide-react";
import { SensorMetrics, ScenarioType, TelemetryEvent } from "../types";
import { SensorHealthHeatmap } from "./SensorHealthHeatmap";
import { NetworkUtilizationGauge } from "./NetworkUtilizationGauge";
import { AdaptiveCruiseControlModule } from "./AdaptiveCruiseControlModule";
import { FirebaseSyncBar } from "./FirebaseSyncBar";
import { VoiceLogPanel } from "./VoiceLogPanel";
import { NpuPowerModeSelector } from "./NpuPowerModeSelector";
import { V2xInfrastructureModule } from "./V2xInfrastructureModule";
import {
  playEmergencyBrakeCue,
  playFailsafeCue,
  announceEmergencyBrakeVoiceLog,
  announceFailsafeVoiceLog,
  toggleAudioMute,
  getIsAudioMuted
} from "../utils/audioCues";

interface CockpitHudProps {
  metrics: SensorMetrics;
  onMetricsChange: (updated: Partial<SensorMetrics>) => void;
  lastCommand: string;
  onApplyScenario: (scenario: ScenarioType) => void;
  activeScenario: ScenarioType;
  onToggleSensorFault?: () => void;
  telemetryLogs?: TelemetryEvent[];
  isSimulating?: boolean;
}

export const CockpitHud: React.FC<CockpitHudProps> = ({
  metrics,
  onMetricsChange,
  lastCommand,
  onApplyScenario,
  activeScenario,
  onToggleSensorFault,
  telemetryLogs = [],
  isSimulating = true
}) => {
  const isFailsafe =
    lastCommand === "FAILSAFE" ||
    metrics.sensor_fault ||
    metrics.sensor_status === "INVALID_DATA" ||
    metrics.camera_confidence === 0;

  const isEmergencyBrake =
    !isFailsafe &&
    metrics.obstacle_distance_m < 15.0 &&
    metrics.vehicle_speed_kmh > 30.0;

  const isWarning =
    !isFailsafe &&
    !isEmergencyBrake &&
    (metrics.obstacle_distance_m < 25.0 || metrics.time_to_collision_s < 2.5);

  // Web Audio API Sound Cues transition tracker
  const prevFailsafeRef = useRef(isFailsafe);
  const prevEmergencyBrakeRef = useRef(isEmergencyBrake);
  const [isAudioMuted, setIsAudioMuted] = useState(getIsAudioMuted());

  useEffect(() => {
    if (isFailsafe && !prevFailsafeRef.current) {
      announceFailsafeVoiceLog();
    } else if (isEmergencyBrake && !prevEmergencyBrakeRef.current && !isFailsafe) {
      announceEmergencyBrakeVoiceLog(metrics.vehicle_speed_kmh, metrics.obstacle_distance_m);
    }

    prevFailsafeRef.current = isFailsafe;
    prevEmergencyBrakeRef.current = isEmergencyBrake;
  }, [isFailsafe, isEmergencyBrake, metrics.vehicle_speed_kmh, metrics.obstacle_distance_m]);

  const handleToggleAudio = () => {
    const nextState = toggleAudioMute();
    setIsAudioMuted(nextState);
  };

  // Calculate top-down radar position (0% = front bumper, 100% = 50m out)
  const effectiveDistance = metrics.obstacle_distance_m < 0 ? 0 : metrics.obstacle_distance_m;
  const distancePct = Math.min(100, Math.max(5, (effectiveDistance / 50.0) * 100));

  return (
    <div className="space-y-6">
      {/* Firebase Auth & Firestore Sync Bar */}
      <FirebaseSyncBar
        metrics={metrics}
        onApplyCustomScenario={(custom) => {
          onMetricsChange(custom);
          onApplyScenario("CUSTOM");
        }}
      />

      {/* Voice Log Assistant Panel (Text-to-Speech) */}
      <VoiceLogPanel />

      {/* Edge NPU Drive & Power Mode Controller */}
      <NpuPowerModeSelector
        metrics={metrics}
        onSelectPowerMode={(mode) => {
          let basePower = 14.5;
          let baseInferenceLatency = 16.5;
          let baseEfficiency = 91.2;
          let targetEfficiency = 90.0;

          if (mode === "PERFORMANCE") {
            basePower = 30.5;
            baseInferenceLatency = 5.8;
            baseEfficiency = 78.4;
            targetEfficiency = 85.0;
          } else if (mode === "ENERGY_SAVING") {
            basePower = 8.8;
            baseInferenceLatency = 32.4;
            baseEfficiency = 97.6;
            targetEfficiency = 95.0;
          }

          onMetricsChange({
            power_mode: mode,
            npu_power_watts: basePower,
            inference_latency_ms: baseInferenceLatency,
            power_efficiency_percent: baseEfficiency,
            target_power_efficiency_percent: targetEfficiency
          });
        }}
      />

      {/* 5G C-V2X Vehicle-to-Everything Infrastructure Module */}
      <V2xInfrastructureModule
        metrics={metrics}
        onMetricsChange={onMetricsChange}
      />

      {/* FAILSAFE Strobe Banner when Sensor Fault / INVALID_DATA Injected */}
      {isFailsafe && (
        <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-slate-950 border-2 border-purple-500 rounded-2xl p-4 text-white shadow-2xl shadow-purple-950/70 animate-pulse flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-600 rounded-xl">
              <AlertOctagon className="w-8 h-8 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider bg-purple-950 px-2.5 py-0.5 rounded text-purple-300 border border-purple-700">
                  P0_CRITICAL &bull; ISO 26262 ASIL-D FAILSAFE
                </span>
                <span className="text-xs text-purple-200">
                  Signal Injected: INVALID_DATA stream active
                </span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
                ADAS CONTROLLER FORCED INTO FAILSAFE MODE
              </h2>
              <p className="text-xs text-purple-200 font-mono">
                Camera Vision Stream: INVALID_DATA (0% Confidence) | Sensor Fault Status: {metrics.sensor_status || "INVALID_DATA"}
              </p>
            </div>
          </div>
          <div className="text-right font-mono hidden md:block">
            <div className="text-2xl font-black text-purple-300">DEGRADED_FALLBACK</div>
            <div className="text-xs text-purple-400">Safety State: FAILSAFE (ASIL-D)</div>
          </div>
        </div>
      )}

      {/* Emergency Strobe Banner when Emergency Brake Triggered */}
      {isEmergencyBrake && (
        <div className="bg-gradient-to-r from-rose-950 via-rose-900 to-rose-950 border-2 border-rose-500 rounded-2xl p-4 text-white shadow-2xl shadow-rose-900/50 animate-pulse flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-600 rounded-xl">
              <AlertTriangle className="w-8 h-8 text-white animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider bg-rose-950 px-2.5 py-0.5 rounded text-rose-300 border border-rose-700">
                  P0_CRITICAL &bull; ISO 26262 AEB
                </span>
                <span className="text-xs text-rose-200">Rule Triggered: Distance &lt; 15m &amp; Speed &gt; 30km/h</span>
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
                EMERGENCY BRAKE ACTUATED (100% DECELEATION)
              </h2>
              <p className="text-xs text-rose-200 font-mono">
                Obstacle at {metrics.obstacle_distance_m.toFixed(1)}m | Speed: {metrics.vehicle_speed_kmh.toFixed(1)} km/h | TTC: {metrics.time_to_collision_s.toFixed(2)}s
              </p>
              <div className="mt-1 flex items-center space-x-2 text-[11px] font-mono text-emerald-300 font-bold bg-slate-950/80 px-2.5 py-1 rounded-lg border border-emerald-700/60 w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Firestore Flight Recorder: Last 5-min telemetry buffer automatically saved for forensic audit</span>
              </div>
            </div>
          </div>
          <div className="text-right font-mono hidden md:block">
            <div className="text-2xl font-black text-rose-300">MAX_BRAKE_PRESSURE</div>
            <div className="text-xs text-rose-400">Actuation Priority: P0 CRITICAL</div>
          </div>
        </div>
      )}

      {/* Main HUD Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar & Vision Stage (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[460px]">
          {/* Header Bar */}
          <div className="flex items-center justify-between z-10 border-b border-slate-800/80 pb-3">
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-sm text-slate-200">2D LiDAR &amp; Vision Fusion Field</span>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                Zone Front ECU Stream
              </span>
            </div>
            <div className="flex items-center space-x-3 text-xs font-mono">
              <span className="text-slate-400">Confidence:</span>
              <span className={`font-bold ${isFailsafe ? "text-purple-400 animate-pulse" : metrics.camera_confidence >= 0.8 ? "text-emerald-400" : "text-amber-400"}`}>
                {isFailsafe ? "0% (INVALID_DATA)" : `${(metrics.camera_confidence * 100).toFixed(0)}%`}
              </span>
            </div>
          </div>

          {/* Top Down Radar Stage Area */}
          <div className="relative flex-1 my-4 bg-slate-950/80 border border-slate-800/60 rounded-xl overflow-hidden flex flex-col items-center justify-end pb-8 pt-4 px-4">
            {/* Grid Ring Overlays */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            {/* Threshold Distance Rings */}
            {/* 40m Ring (Safe) */}
            <div className="absolute top-[15%] w-full border-t border-dashed border-emerald-500/30 flex justify-between px-3 text-[10px] text-emerald-500/70 font-mono">
              <span>40m Safe Threshold</span>
              <span>40m</span>
            </div>
            {/* 25m Ring (Warning) */}
            <div className="absolute top-[40%] w-full border-t border-dashed border-amber-500/40 flex justify-between px-3 text-[10px] text-amber-500/80 font-mono">
              <span>25m FCW Warning Zone</span>
              <span>25m</span>
            </div>
            {/* 15m Ring (Emergency Brake) */}
            <div className="absolute top-[65%] w-full border-t border-2 border-rose-500/60 bg-rose-950/20 flex justify-between px-3 text-[10px] text-rose-400 font-mono font-bold">
              <span>15m AEB EMERGENCY BRAKE TRIGGER ZONE</span>
              <span>15m</span>
            </div>

            {/* Approaching Detected Object Bounding Box */}
            <div
              className={`absolute transition-all duration-300 transform -translate-x-1/2 flex flex-col items-center z-20`}
              style={{
                top: isFailsafe ? "50%" : `${100 - distancePct}%`,
                left: "50%",
              }}
            >
              {/* Distance Callout Tag */}
              <div
                className={`px-2 py-1 rounded text-[11px] font-mono font-bold shadow-lg flex items-center space-x-1 mb-1 whitespace-nowrap ${
                  isFailsafe
                    ? "bg-purple-900 text-purple-100 border border-purple-500 animate-pulse"
                    : isEmergencyBrake
                    ? "bg-rose-600 text-white animate-bounce"
                    : isWarning
                    ? "bg-amber-500 text-slate-950"
                    : "bg-cyan-600 text-white"
                }`}
              >
                {isFailsafe ? <AlertOctagon className="w-3.5 h-3.5 text-purple-300" /> : <AlertTriangle className="w-3 h-3" />}
                <span>
                  {isFailsafe ? "INVALID_DATA (SENSOR FAULT)" : `${metrics.detected_object_type || "OBSTACLE"}: ${metrics.obstacle_distance_m.toFixed(1)}m`}
                </span>
              </div>

              {/* Bounding Box Visual Representation */}
              <div
                className={`w-16 h-12 rounded-lg border-2 flex items-center justify-center transition-all ${
                  isFailsafe
                    ? "border-purple-500 bg-purple-950/60 shadow-lg shadow-purple-500/40 animate-pulse"
                    : isEmergencyBrake
                    ? "border-rose-500 bg-rose-500/30 shadow-lg shadow-rose-500/40 animate-pulse"
                    : isWarning
                    ? "border-amber-400 bg-amber-400/20 shadow-md shadow-amber-400/30"
                    : "border-cyan-400 bg-cyan-400/20"
                }`}
              >
                {isFailsafe ? <ShieldOff className="w-6 h-6 text-purple-300" /> : <UserCheck className="w-6 h-6 text-white" />}
              </div>

              {/* Approach Vector Line */}
              <div className={`w-0.5 h-8 my-1 ${isFailsafe ? "bg-gradient-to-b from-purple-500 to-transparent" : "bg-gradient-to-b from-cyan-400 to-transparent"}`} />
            </div>

            {/* Ego Vehicle Bumper Representation at Bottom */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-32 h-14 bg-slate-800 border-2 border-cyan-500 rounded-t-2xl flex flex-col items-center justify-center shadow-2xl shadow-cyan-500/20 text-center px-2">
                <Car className="w-6 h-6 text-cyan-400" />
                <span className="text-[10px] font-mono font-bold text-slate-200 uppercase">EGO VEHICLE</span>
              </div>
            </div>
          </div>

          {/* HUD Metric Pills */}
          <div className="grid grid-cols-3 gap-3 z-10">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
              <div className="p-2 bg-slate-800 rounded-lg text-cyan-400">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-mono uppercase">Vehicle Speed</div>
                <div className="text-base font-extrabold text-white font-mono">
                  {metrics.vehicle_speed_kmh.toFixed(1)} <span className="text-xs font-normal text-slate-400">km/h</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
              <div className="p-2 bg-slate-800 rounded-lg text-amber-400">
                <Navigation className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-mono uppercase">Obstacle Distance</div>
                <div className={`text-base font-extrabold font-mono ${isFailsafe ? "text-purple-400" : "text-white"}`}>
                  {isFailsafe ? "INVALID" : `${metrics.obstacle_distance_m.toFixed(1)} m`}
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${isFailsafe ? "bg-purple-900 text-purple-300" : "bg-slate-800 text-rose-400"}`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-mono uppercase">Time-To-Collision</div>
                <div className={`text-base font-extrabold font-mono ${isFailsafe ? "text-purple-400" : "text-white"}`}>
                  {isFailsafe ? "N/A" : `${metrics.time_to_collision_s.toFixed(2)} sec`}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Interactive Control Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Prominent Toggle Sensor Fault Button Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Wrench className="w-4 h-4 text-purple-400" />
                <h3 className="font-semibold text-sm text-slate-200">ISO 26262 Fault Injector</h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${isFailsafe ? "bg-purple-900 text-purple-200 border-purple-500 animate-pulse" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                {isFailsafe ? "FAILSAFE ACTIVE" : "SYSTEM NORMAL"}
              </span>
            </div>

            <button
              onClick={() => {
                if (onToggleSensorFault) {
                  onToggleSensorFault();
                } else {
                  onApplyScenario("SENSOR_FAULT");
                }
              }}
              className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between shadow-lg ${
                isFailsafe
                  ? "bg-purple-950/90 border-purple-500 text-purple-100 shadow-purple-950/60 ring-2 ring-purple-500/50"
                  : "bg-gradient-to-r from-purple-950/50 to-slate-900 border-purple-800/80 text-purple-200 hover:bg-purple-950/80"
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2.5 rounded-lg border ${isFailsafe ? "bg-purple-600 border-purple-400 text-white animate-pulse" : "bg-purple-950 text-purple-300 border-purple-800"}`}>
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm text-purple-200 flex items-center space-x-2">
                    <span>Toggle Sensor Fault</span>
                  </div>
                  <p className="text-xs text-purple-300/80">
                    {isFailsafe
                      ? "Clear injected fault & restore nominal metrics"
                      : "Inject INVALID_DATA signal into bus to trigger FAILSAFE"}
                  </p>
                </div>
              </div>
              <span className={`px-2.5 py-1 text-xs font-mono font-extrabold rounded-lg border ${isFailsafe ? "bg-purple-600 text-white border-purple-400" : "bg-purple-950 text-purple-300 border-purple-800"}`}>
                {isFailsafe ? "CLEAR FAULT" : "INJECT FAULT"}
              </span>
            </button>

            {/* Web Audio API Audio Cues Control Bar */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center space-x-2 text-slate-400">
                {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                <span>HUD Audio Cues:</span>
                <span className={isAudioMuted ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                  {isAudioMuted ? "MUTED" : "ACTIVE"}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleToggleAudio}
                  className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] transition-all flex items-center space-x-1 ${
                    isAudioMuted
                      ? "bg-rose-950/80 text-rose-300 border-rose-700 hover:bg-rose-900"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                  }`}
                >
                  {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>{isAudioMuted ? "UNMUTE" : "MUTE"}</span>
                </button>

                <button
                  onClick={() => playEmergencyBrakeCue()}
                  className="px-2 py-1 bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 rounded-lg text-[10px] font-bold transition-all"
                  title="Test Emergency Brake Web Audio Chime"
                >
                  Test AEB Sound
                </button>

                <button
                  onClick={() => playFailsafeCue()}
                  className="px-2 py-1 bg-purple-950/80 hover:bg-purple-900 text-purple-300 border border-purple-700 rounded-lg text-[10px] font-bold transition-all"
                  title="Test Failsafe Web Audio Chime"
                >
                  Test Failsafe Sound
                </button>
              </div>
            </div>
          </div>

          {/* Preset Scenario Injectors */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-sm text-slate-200">Scenario Injection Presets</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-3">
              <button
                onClick={() => onApplyScenario("CRITICAL")}
                className={`p-3 rounded-xl border text-left transition-all text-xs font-medium ${
                  activeScenario === "CRITICAL"
                    ? "bg-rose-950/90 border-rose-500 text-rose-200 shadow-md shadow-rose-950/50"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-rose-400">🚨 Critical AEB</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-200">&lt;15m</span>
                </div>
                <p className="text-[11px] text-slate-400">Speed: 45 km/h, Dist: 11.2m</p>
              </button>

              <button
                onClick={() => onApplyScenario("WARNING")}
                className={`p-3 rounded-xl border text-left transition-all text-xs font-medium ${
                  activeScenario === "WARNING"
                    ? "bg-amber-950/90 border-amber-500 text-amber-200 shadow-md shadow-amber-950/50"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-amber-400">⚠️ Proximity FCW</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-200">&lt;25m</span>
                </div>
                <p className="text-[11px] text-slate-400">Speed: 50 km/h, Dist: 21m</p>
              </button>

              <button
                onClick={() => onApplyScenario("SAFE")}
                className={`p-3 rounded-xl border text-left transition-all text-xs font-medium ${
                  activeScenario === "SAFE"
                    ? "bg-emerald-950/90 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/50"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-emerald-400">🟢 Nominal Highway</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-200">Clear</span>
                </div>
                <p className="text-[11px] text-slate-400">Speed: 60 km/h, Dist: 42m</p>
              </button>

              <button
                onClick={() => {
                  onMetricsChange({ camera_confidence: 0.58, obstacle_distance_m: 14.5, vehicle_speed_kmh: 40.0, sensor_fault: false, sensor_status: "NORMAL" });
                  onApplyScenario("CUSTOM");
                }}
                className={`p-3 rounded-xl border text-left transition-all text-xs font-medium ${
                  metrics.camera_confidence < 0.7 && !isFailsafe
                    ? "bg-cyan-950/90 border-cyan-500 text-cyan-200 shadow-md shadow-cyan-950/50"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-cyan-300">🌧️ Rain Noise</span>
                  <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <p className="text-[11px] text-slate-400">Low Vision Confidence (58%)</p>
              </button>
            </div>
          </div>

          {/* Interactive Manual Metric Sliders */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-semibold text-xs text-slate-200 uppercase tracking-wider font-mono">
                Manual Metric Calibrator
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">Live Bus Injector</span>
            </div>

            {/* Speed Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-slate-400">Vehicle Speed (km/h):</span>
                <span className="text-white font-bold">{metrics.vehicle_speed_kmh.toFixed(1)} km/h</span>
              </div>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={metrics.vehicle_speed_kmh}
                onChange={(e) => {
                  const spd = parseFloat(e.target.value);
                  const ttc = spd > 0 ? (metrics.obstacle_distance_m / (spd / 3.6)) : 99;
                  onMetricsChange({ vehicle_speed_kmh: spd, time_to_collision_s: ttc });
                }}
                className="w-full accent-cyan-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>0 km/h</span>
                <span className="text-rose-400 font-bold">&gt;30 km/h (AEB Threshold)</span>
                <span>120 km/h</span>
              </div>
            </div>

            {/* Distance Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-slate-400">Obstacle Distance (m):</span>
                <span className={`font-bold ${metrics.obstacle_distance_m < 15 ? "text-rose-400" : "text-white"}`}>
                  {metrics.obstacle_distance_m < 0 ? "INVALID_DATA" : `${metrics.obstacle_distance_m.toFixed(1)} m`}
                </span>
              </div>
              <input
                type="range"
                min="2"
                max="60"
                step="0.5"
                value={metrics.obstacle_distance_m < 0 ? 0 : metrics.obstacle_distance_m}
                onChange={(e) => {
                  const dist = parseFloat(e.target.value);
                  const spd = metrics.vehicle_speed_kmh;
                  const ttc = spd > 0 ? (dist / (spd / 3.6)) : 99;
                  onMetricsChange({ obstacle_distance_m: dist, time_to_collision_s: ttc, sensor_fault: false, sensor_status: "NORMAL" });
                }}
                className="w-full accent-rose-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span className="text-rose-400 font-bold">&lt;15m (AEB Trigger)</span>
                <span>25m (FCW)</span>
                <span>60m</span>
              </div>
            </div>

            {/* Camera Confidence Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-mono">
                <span className="text-slate-400">Camera Vision Confidence:</span>
                <span className="text-white font-bold">{(metrics.camera_confidence * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.00"
                max="1.00"
                step="0.02"
                value={metrics.camera_confidence}
                onChange={(e) => {
                  const conf = parseFloat(e.target.value);
                  onMetricsChange({
                    camera_confidence: conf,
                    sensor_fault: conf === 0,
                    sensor_status: conf === 0 ? "INVALID_DATA" : "NORMAL"
                  });
                }}
                className="w-full accent-amber-500 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Functional Safety Rules Summary Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs font-mono space-y-2">
            <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px] flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>ISO 26262 ASIL-D Rule Matrix</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className={`p-2 rounded border ${isFailsafe ? "bg-purple-950/80 border-purple-500 text-purple-200 font-bold animate-pulse" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                RULE 0: IF Sensor Status == INVALID_DATA OR Confidence == 0 &#8594; <span className="text-purple-400">FAILSAFE (Degraded Mode)</span>
              </div>
              <div className={`p-2 rounded border ${isEmergencyBrake ? "bg-rose-950/80 border-rose-600 text-rose-200 font-bold" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                RULE 1: IF Distance &lt; 15.0m AND Speed &gt; 30.0 km/h &#8594; <span className="text-rose-400">EMERGENCY_BRAKE</span>
              </div>
              <div className={`p-2 rounded border ${isWarning ? "bg-amber-950/80 border-amber-600 text-amber-200 font-bold" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                RULE 2: IF Distance &lt; 25.0m OR TTC &lt; 2.5s &#8594; <span className="text-amber-400">WARNING</span>
              </div>
              <div className={`p-2 rounded border ${!isFailsafe && !isEmergencyBrake && !isWarning ? "bg-emerald-950/80 border-emerald-600 text-emerald-200 font-bold" : "bg-slate-950 border-slate-800 text-slate-400"}`}>
                RULE 3: ELSE &#8594; <span className="text-emerald-400">MAINTAIN</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Sensor Health Heatmap Section */}
      <SensorHealthHeatmap metrics={metrics} isFailsafe={isFailsafe} />

      {/* Network Utilization Gauge Section */}
      <NetworkUtilizationGauge
        telemetryLogs={telemetryLogs}
        metrics={metrics}
        lastCommand={lastCommand}
        isSimulating={isSimulating}
      />

      {/* Adaptive Cruise Control (ACC) Sub-module Section */}
      <AdaptiveCruiseControlModule
        metrics={metrics}
        onMetricsChange={onMetricsChange}
        lastCommand={lastCommand}
      />
    </div>
  );
};
