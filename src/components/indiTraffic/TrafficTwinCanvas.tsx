import React, { useEffect, useRef } from "react";
import { TrafficMetrics, ArchitectureConfig } from "../../types/indiTraffic";
import { Thermometer, Zap, ShieldAlert, Cpu, Fan, ShieldCheck, TrendingUp } from "lucide-react";
import { PredictiveTrafficAnalyzer, calculateTrafficForecast } from "./PredictiveTrafficAnalyzer";

interface Props {
  metrics: TrafficMetrics;
  config: ArchitectureConfig;
  isSimulating: boolean;
}

export const TrafficTwinCanvas: React.FC<Props> = ({ metrics, config, isSimulating }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const metricsRef = useRef(metrics);
  const configRef = useRef(config);

  // Keep refs up to date without triggering effect teardown
  useEffect(() => {
    metricsRef.current = metrics;
    configRef.current = config;
  }, [metrics, config]);

  const forecast = calculateTrafficForecast(metrics, config);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const render = () => {
      const currentMetrics = metricsRef.current;
      const currentConfig = configRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      // 1. Draw Asphalt Road
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, width, height);

      // Road lanes
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.25);
      ctx.lineTo(width, height * 0.25);
      ctx.moveTo(0, height * 0.75);
      ctx.lineTo(width, height * 0.75);
      ctx.stroke();

      // Lane dividers (moving with speed)
      if (isSimulating) {
        offset = (offset + currentMetrics.vehicle_speed_kmh * 0.15) % 40;
      }
      ctx.setLineDash([20, 20]);
      ctx.lineDashOffset = -offset;
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.5);
      ctx.lineTo(width, height * 0.5);
      ctx.stroke();
      ctx.setLineDash([]); // Reset dash

      // DYNAMIC WEATHER CANVASES OVERLAY (Monsoon Rain / Heatwave Shimmer / Winter Fog)
      if (currentConfig.weatherCondition === "MONSOON_MUMBAI") {
        // Rain streaks
        ctx.strokeStyle = "rgba(186, 230, 253, 0.45)";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 40; i++) {
          const rx = (i * 28 + offset * 8) % width;
          const ry = (i * 17 + offset * 12) % height;
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 10, ry + 18);
        }
        ctx.stroke();

        // Water splash ripple under vehicle
        ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(width * 0.35 + 50, height * 0.5 + 24, 32, 6, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Canvas Monsoon Tag
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`🌧️ MONSOON WATER-LOGGING | Friction 0.42 | Hydrodynamic Drag +28 Wh/km`, 12, 20);
      } else if (currentConfig.weatherCondition === "HEATWAVE_DELHI") {
        // Ambient heat shimmer overlay
        const heatGrad = ctx.createLinearGradient(0, 0, 0, height);
        heatGrad.addColorStop(0, "rgba(244, 63, 94, 0.08)");
        heatGrad.addColorStop(0.5, "rgba(245, 158, 11, 0.04)");
        heatGrad.addColorStop(1, "rgba(244, 63, 94, 0.08)");
        ctx.fillStyle = heatGrad;
        ctx.fillRect(0, 0, width, height);

        // Canvas Heatwave Tag
        ctx.fillStyle = "#f43f5e";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`🔥 EXTREME HEATWAVE 48°C | HVAC Burden 3.8 kW | Inverter Heat Soak Risk`, 12, 20);
      } else if (currentConfig.weatherCondition === "WINTER_FOG_NORTH") {
        // Fog haze gradient
        const fogGrad = ctx.createLinearGradient(width * 0.3, 0, width, 0);
        fogGrad.addColorStop(0, "rgba(203, 213, 225, 0.02)");
        fogGrad.addColorStop(1, "rgba(203, 213, 225, 0.22)");
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, 0, width, height);

        // Canvas Fog Tag
        ctx.fillStyle = "#a5b4fc";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`🌫️ WINTER DENSE FOG 8°C | PTC Cabin Heating Load +22 Wh/km`, 12, 20);
      } else {
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`☀️ OPTIMAL CLIMATE 25°C | Nominal Rolling Drag & Baseline Auxiliary Load`, 12, 20);
      }

      // 5-MIN PREDICTIVE TRAFFIC JAM HAZARD OVERLAY ON CANVAS ROAD
      const forecastData = calculateTrafficForecast(currentMetrics, currentConfig);
      const isJamAhead = forecastData.jamRiskScore >= 35;
      const hazardStartX = width * 0.68;
      const hazardWidth = width * 0.3;

      if (isJamAhead) {
        const isCriticalJam = forecastData.jamRiskScore >= 65;
        // Semi-transparent hazard gridlock fill
        ctx.fillStyle = isCriticalJam ? "rgba(225, 29, 72, 0.18)" : "rgba(245, 158, 11, 0.15)";
        ctx.fillRect(hazardStartX, height * 0.1, hazardWidth, height * 0.8);

        // Dashed hazard border line
        ctx.strokeStyle = isCriticalJam ? "#f43f5e" : "#f59e0b";
        ctx.setLineDash([6, 6]);
        ctx.lineWidth = 2;
        ctx.strokeRect(hazardStartX, height * 0.1, hazardWidth, height * 0.8);
        ctx.setLineDash([]);

        // Pulsing hazard waves
        const waveX = hazardStartX + (offset * 2) % hazardWidth;
        ctx.strokeStyle = isCriticalJam ? "rgba(244, 63, 94, 0.6)" : "rgba(245, 158, 11, 0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(waveX, height * 0.1);
        ctx.lineTo(waveX, height * 0.9);
        ctx.stroke();

        // Canvas Warning Banner text on road
        ctx.fillStyle = isCriticalJam ? "#fecdd3" : "#fef3c7";
        ctx.font = "bold 11px sans-serif";
        ctx.fillText(`⚠️ 5-MIN FORECAST: ${forecastData.jamRiskScore}% JAM RISK`, hazardStartX + 10, height * 0.22);
        ctx.font = "10px monospace";
        ctx.fillText(`+${forecastData.forecastDelayMinutes}m delay | Tailback: ${forecastData.forecast5MinQueueMeters}m`, hazardStartX + 10, height * 0.82);
      }

      // 2. Draw Ego Vehicle (Center)
      const egoX = width * 0.35;
      const egoY = height * 0.5 - 28;
      const egoW = 110;
      const egoH = 56;

      // Draw Sensor Radar/NPU Arc Cone
      const coneGradient = ctx.createRadialGradient(
        egoX + egoW,
        egoY + egoH / 2,
        10,
        egoX + egoW + 180,
        egoY + egoH / 2,
        220
      );
      if (currentMetrics.cut_in_probability > 0.6) {
        coneGradient.addColorStop(0, "rgba(239, 68, 68, 0.4)");
        coneGradient.addColorStop(1, "rgba(239, 68, 68, 0.0)");
      } else {
        coneGradient.addColorStop(0, "rgba(16, 185, 129, 0.3)");
        coneGradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");
      }

      ctx.fillStyle = coneGradient;
      ctx.beginPath();
      ctx.moveTo(egoX + egoW, egoY + egoH / 2);
      ctx.arc(egoX + egoW, egoY + egoH / 2, 220, -0.4, 0.4);
      ctx.closePath();
      ctx.fill();

      // Ego Vehicle Body
      ctx.fillStyle = currentConfig.archType === "INDITRAFFIC_SDV_EDGE" ? "#0284c7" : "#475569";
      ctx.beginPath();
      ctx.roundRect(egoX, egoY, egoW, egoH, 10);
      ctx.fill();
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Windshield & Roof
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(egoX + 30, egoY + 8, egoW - 55, egoH - 16);

      // Inverter / Motor Glow on Ego Vehicle (Front axle)
      const invGlow = ctx.createRadialGradient(
        egoX + 25,
        egoY + egoH / 2,
        2,
        egoX + 25,
        egoY + egoH / 2,
        25
      );
      const isThermalHigh = currentMetrics.inverter_junction_temp_c > 85;
      invGlow.addColorStop(0, isThermalHigh ? "rgba(239, 68, 68, 0.9)" : "rgba(56, 189, 248, 0.9)");
      invGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = invGlow;
      ctx.beginPath();
      ctx.arc(egoX + 25, egoY + egoH / 2, 25, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Chaotic Swarm Obstacles (Indian Traffic Cut-ins)
      // Auto-rickshaw ahead
      const autoX = egoX + egoW + Math.max(20, currentMetrics.creep_distance_m * 12);
      const autoY = height * 0.5 - 22;
      ctx.fillStyle = "#f59e0b"; // Auto Yellow/Green
      ctx.beginPath();
      ctx.roundRect(autoX, autoY, 55, 44, 6);
      ctx.fill();
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(autoX + 10, autoY + 6, 35, 32);
      ctx.fillStyle = "#fef08a";
      ctx.fillText("AUTO", autoX + 12, autoY + 24);

      // Two-wheeler Motorbike splitting lanes
      const bikeX = egoX + egoW + Math.max(10, currentMetrics.creep_distance_m * 8) - 15;
      const bikeY = height * 0.28;
      ctx.fillStyle = "#ec4899";
      ctx.fillRect(bikeX, bikeY, 35, 16);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("2W", bikeX + 6, bikeY + 12);

      // Draw Trajectory Cut-In Vector Line
      if (currentMetrics.cut_in_probability > 0.4) {
        ctx.strokeStyle = "#ef4444";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bikeX, bikeY + 8);
        ctx.lineTo(egoX + egoW + 30, egoY + egoH / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 4. Overlay Regenerative vs Friction Energy Flow Vectors
      if (currentMetrics.regen_torque_nm > 5) {
        // Green Regen Flow arrows returning to battery
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(egoX + 25, egoY + egoH / 2);
        ctx.lineTo(egoX - 40, egoY + egoH / 2);
        ctx.stroke();

        ctx.fillStyle = "#10b981";
        ctx.font = "10px monospace";
        ctx.fillText(`+REGEN ${currentMetrics.regen_torque_nm.toFixed(0)}Nm`, egoX - 95, egoY + egoH / 2 + 3);
      } else if (currentMetrics.friction_brake_torque_nm > 5) {
        // Red Friction Loss
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(egoX + 85, egoY + egoH - 5);
        ctx.lineTo(egoX + 115, egoY + egoH + 20);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.font = "10px monospace";
        ctx.fillText(`FRICTION LOSS ${currentMetrics.friction_brake_torque_nm.toFixed(0)}Nm`, egoX + 40, egoY + egoH + 32);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSimulating]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 relative">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              IndiTraffic Real-Time Micro-Regen & Swarm Twin
            </h3>
            <p className="text-xs text-slate-400">
              Live CAN Motor Inverter & Edge NPU Trajectory Actuation Stream
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
            PWM: <strong className="text-sky-400">{config.pwmMode}</strong>
          </span>
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
            Cutoff: <strong className="text-emerald-400">{config.lowSpeedRegenCutoffKmh} km/h</strong>
          </span>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div className="relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
        <canvas
          ref={canvasRef}
          width={800}
          height={260}
          className="w-full h-[260px] object-cover block"
        />

        {/* Live Overlay Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-2">
          <div className="bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
            <Thermometer className="w-4 h-4 text-amber-400" />
            <span>
              Inv Temp: <strong className="text-amber-300">{metrics.inverter_junction_temp_c.toFixed(1)}°C</strong>
            </span>
          </div>

          <div className="bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
            <Fan className="w-4 h-4 text-cyan-400" />
            <span>
              Aux HVAC: <strong className="text-cyan-300">{metrics.hvac_power_kw.toFixed(2)} kW</strong>
            </span>
          </div>

          <div className="bg-slate-950/80 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>
              NPU Latency: <strong className="text-purple-300">{metrics.npu_latency_ms.toFixed(1)} ms</strong>
            </span>
          </div>
        </div>

        {/* Top-Right Predictive Jam Overlay Badge */}
        <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
          <TrendingUp className={`w-4 h-4 ${forecast.jamRiskScore >= 65 ? "text-rose-400 animate-bounce" : "text-amber-400"}`} />
          <span className="font-mono">
            5-Min Jam Forecast:{" "}
            <strong className={forecast.jamRiskScore >= 65 ? "text-rose-400 font-bold" : "text-amber-300"}>
              {forecast.jamRiskScore}% Risk
            </strong>
          </span>
        </div>

        <div className="absolute bottom-3 right-3 bg-slate-950/90 backdrop-blur border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs">
          {metrics.cut_in_probability > 0.5 ? (
            <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
              <ShieldAlert className="w-4 h-4 animate-pulse text-rose-500" />
              <span>Unstructured Cut-In Detected ({Math.round(metrics.cut_in_probability * 100)}%)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Trajectory Clear (Smooth Crawl)</span>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Predictive Traffic Flow Analyzer Module */}
      <PredictiveTrafficAnalyzer metrics={metrics} config={config} />
    </div>
  );
};
