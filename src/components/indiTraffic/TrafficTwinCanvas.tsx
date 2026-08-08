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
  const forecast = calculateTrafficForecast(metrics, config);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const render = () => {
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
        offset = (offset + metrics.vehicle_speed_kmh * 0.15) % 40;
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

      // 5-MIN PREDICTIVE TRAFFIC JAM HAZARD OVERLAY ON CANVAS ROAD
      const forecastData = calculateTrafficForecast(metrics, config);
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
      if (metrics.cut_in_probability > 0.6) {
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
      ctx.fillStyle = config.archType === "INDITRAFFIC_SDV_EDGE" ? "#0284c7" : "#475569";
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
      const isThermalHigh = metrics.inverter_junction_temp_c > 85;
      invGlow.addColorStop(0, isThermalHigh ? "rgba(239, 68, 68, 0.9)" : "rgba(56, 189, 248, 0.9)");
      invGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = invGlow;
      ctx.beginPath();
      ctx.arc(egoX + 25, egoY + egoH / 2, 25, 0, Math.PI * 2);
      ctx.fill();

      // 3. Draw Chaotic Swarm Obstacles (Indian Traffic Cut-ins)
      // Auto-rickshaw ahead
      const autoX = egoX + egoW + Math.max(20, metrics.creep_distance_m * 12);
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
      const bikeX = egoX + egoW + Math.max(10, metrics.creep_distance_m * 8) - 15;
      const bikeY = height * 0.28;
      ctx.fillStyle = "#ec4899";
      ctx.fillRect(bikeX, bikeY, 35, 16);
      ctx.fillStyle = "#cbd5e1";
      ctx.fillText("2W", bikeX + 6, bikeY + 12);

      // Draw Trajectory Cut-In Vector Line
      if (metrics.cut_in_probability > 0.4) {
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
      if (metrics.regen_torque_nm > 5) {
        // Green Regen Flow arrows returning to battery
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(egoX + 25, egoY + egoH / 2);
        ctx.lineTo(egoX - 40, egoY + egoH / 2);
        ctx.stroke();

        ctx.fillStyle = "#10b981";
        ctx.font = "10px monospace";
        ctx.fillText(`+REGEN ${metrics.regen_torque_nm.toFixed(0)}Nm`, egoX - 95, egoY + egoH / 2 + 3);
      } else if (metrics.friction_brake_torque_nm > 5) {
        // Red Friction Loss
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(egoX + 85, egoY + egoH - 5);
        ctx.lineTo(egoX + 115, egoY + egoH + 20);
        ctx.stroke();

        ctx.fillStyle = "#ef4444";
        ctx.font = "10px monospace";
        ctx.fillText(`FRICTION LOSS ${metrics.friction_brake_torque_nm.toFixed(0)}Nm`, egoX + 40, egoY + egoH + 32);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [metrics, config, isSimulating]);

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
