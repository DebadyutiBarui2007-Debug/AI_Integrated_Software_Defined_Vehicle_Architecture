import React from "react";
import { TrafficMetrics, ArchitectureConfig } from "../../types/indiTraffic";
import { AlertTriangle, Clock, TrendingUp, Navigation, ShieldAlert, Cpu, Zap, Radio, ShieldCheck } from "lucide-react";

interface Props {
  metrics: TrafficMetrics;
  config: ArchitectureConfig;
}

export interface TrafficForecastData {
  jamRiskScore: number; // 0 to 100
  forecast5MinQueueMeters: number;
  forecastDelayMinutes: number;
  flowState: "FLOW_OPTIMAL" | "MODERATE_BOTTLENECK" | "CRITICAL_GRIDLOCK_AHEAD";
  trafficDensityPerKm: number;
  recommendedAction: string;
}

export const calculateTrafficForecast = (
  metrics: TrafficMetrics,
  config: ArchitectureConfig
): TrafficForecastData => {
  // Density estimation based on speed & stop frequency & cut-in probability
  const speedFactor = Math.max(0, (50 - metrics.vehicle_speed_kmh) / 50); // slower speed = higher density
  const cutInFactor = metrics.cut_in_probability; // 0 to 1
  const stopFreqFactor = Math.min(1, metrics.micro_stop_count_per_hr / 120);

  // Raw risk calculation (0 - 100)
  const rawRisk = speedFactor * 40 + cutInFactor * 35 + stopFreqFactor * 25;
  const jamRiskScore = Math.min(99, Math.max(8, Math.round(rawRisk)));

  const forecast5MinQueueMeters = Math.round(jamRiskScore * 5.2);
  const forecastDelayMinutes = Number((jamRiskScore / 16).toFixed(1));

  let flowState: "FLOW_OPTIMAL" | "MODERATE_BOTTLENECK" | "CRITICAL_GRIDLOCK_AHEAD" = "FLOW_OPTIMAL";
  if (jamRiskScore >= 65) {
    flowState = "CRITICAL_GRIDLOCK_AHEAD";
  } else if (jamRiskScore >= 35) {
    flowState = "MODERATE_BOTTLENECK";
  }

  const isSdv = config.archType === "INDITRAFFIC_SDV_EDGE";
  let recommendedAction = "";
  if (flowState === "CRITICAL_GRIDLOCK_AHEAD") {
    recommendedAction = isSdv
      ? "Pre-cooling Inverter & Actuating 1.5 km/h Micro-Pedal Regen prior to 450m bottleneck entry"
      : "High friction brake wear & thermal derate expected in upcoming gridlock. Switch to SDV Micro-Regen.";
  } else if (flowState === "MODERATE_BOTTLENECK") {
    recommendedAction = isSdv
      ? "Adaptive 6kHz PWM active. Recapturing stop-and-go energy while damping HVAC compressor spillover"
      : "Standard 10kHz PWM active. High switching loss during impending crawl.";
  } else {
    recommendedAction = "Traffic flow smooth. Continuous trajectory prediction active.";
  }

  const trafficDensityPerKm = Math.round(jamRiskScore * 1.8 + 20);

  return {
    jamRiskScore,
    forecast5MinQueueMeters,
    forecastDelayMinutes,
    flowState,
    trafficDensityPerKm,
    recommendedAction
  };
};

export const PredictiveTrafficAnalyzer: React.FC<Props> = ({ metrics, config }) => {
  const forecast = calculateTrafficForecast(metrics, config);
  const isCritical = forecast.flowState === "CRITICAL_GRIDLOCK_AHEAD";
  const isModerate = forecast.flowState === "MODERATE_BOTTLENECK";

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-100 space-y-3 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${
            isCritical
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
              : isModerate
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          }`}>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Predictive Traffic Flow Analyzer (5-Min Horizon)
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                isCritical
                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                  : isModerate
                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                  : "bg-emerald-950 text-emerald-300 border border-emerald-800"
              }`}>
                {forecast.flowState.replace(/_/g, " ")}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Edge NPU Swarm Trajectory Forecast & 300s Jam Risk Matrix
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Density:</span>
          <span className="text-sky-400 font-bold">{forecast.trafficDensityPerKm} veh/km</span>
        </div>
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Jam Risk Score Gauge */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>5-Min Jam Probability</span>
            <AlertTriangle className={`w-3.5 h-3.5 ${isCritical ? "text-rose-400 animate-bounce" : "text-amber-400"}`} />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className={`text-2xl font-mono font-extrabold ${
              isCritical ? "text-rose-400" : isModerate ? "text-amber-400" : "text-emerald-400"
            }`}>
              {forecast.jamRiskScore}%
            </span>
            <span className="text-[10px] text-slate-500">Risk Score</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isCritical ? "bg-rose-500" : isModerate ? "bg-amber-400" : "bg-emerald-500"
              }`}
              style={{ width: `${forecast.jamRiskScore}%` }}
            />
          </div>
        </div>

        {/* 2. Forecast Queue Length */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Projected Queue Length</span>
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-sky-400">
              {forecast.forecast5MinQueueMeters}
            </span>
            <span className="text-xs text-slate-400 font-mono">meters ahead</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Estimated tailback at current arrival rate
          </p>
        </div>

        {/* 3. Anticipated Delay */}
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-[11px]">
            <span>Expected Bottleneck Delay</span>
            <Clock className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-mono font-extrabold text-purple-400">
              +{forecast.forecastDelayMinutes}
            </span>
            <span className="text-xs text-slate-400 font-mono">mins</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Stop-and-go dwell time prediction
          </p>
        </div>
      </div>

      {/* Actuation Strategy Banner */}
      <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
        isCritical
          ? "bg-rose-950/40 border-rose-800/60 text-rose-200"
          : isModerate
          ? "bg-amber-950/40 border-amber-800/60 text-amber-200"
          : "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
      }`}>
        <div className="flex items-center gap-2">
          {config.archType === "INDITRAFFIC_SDV_EDGE" ? (
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span className="font-mono text-[11px] leading-snug">
            <strong>Strategy:</strong> {forecast.recommendedAction}
          </span>
        </div>

        <div className="shrink-0 font-mono text-[10px] text-slate-400 bg-slate-900/80 px-2 py-1 rounded border border-slate-800">
          Horizon: {config.edgeAiPredictionHorizonMs}ms
        </div>
      </div>
    </div>
  );
};
