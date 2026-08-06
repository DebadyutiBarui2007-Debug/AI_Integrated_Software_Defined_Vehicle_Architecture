import React from "react";
import {
  Eye,
  Radio,
  Scan,
  Activity,
  Cpu,
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Zap
} from "lucide-react";
import { SensorMetrics } from "../types";

interface SensorHealthHeatmapProps {
  metrics: SensorMetrics;
  isFailsafe: boolean;
}

export const SensorHealthHeatmap: React.FC<SensorHealthHeatmapProps> = ({
  metrics,
  isFailsafe
}) => {
  const cameraConf = isFailsafe ? 0 : Math.round(metrics.camera_confidence * 100);
  const radarConf = isFailsafe ? 0 : metrics.obstacle_distance_m < 0 ? 0 : 96;
  const lidarConf = isFailsafe ? 0 : metrics.camera_confidence < 0.7 ? 72 : 98;
  const sonarConf = isFailsafe ? 0 : 99;
  const imuConf = isFailsafe ? 0 : 99;

  const sensors = [
    {
      id: "camera",
      name: "Front Stereo Vision Camera",
      type: "Optical / CMOS",
      icon: Eye,
      confidence: cameraConf,
      snr: isFailsafe ? "0 dB" : `${Math.round(metrics.camera_confidence * 32)} dB`,
      latency: isFailsafe ? "FAIL" : "12 ms",
      temp: "42°C",
      status: isFailsafe
        ? "FAULT"
        : metrics.camera_confidence < 0.7
        ? "DEGRADED"
        : "NOMINAL",
      description: isFailsafe
        ? "INVALID_DATA frame injected. Vision perception disabled."
        : metrics.camera_confidence < 0.7
        ? "Environmental noise (Rain / Low Light) reducing vision score."
        : "Crystal clear optical tracking active."
    },
    {
      id: "radar",
      name: "77 GHz Front MMIC Radar",
      type: "FMCW Radar",
      icon: Radio,
      confidence: radarConf,
      snr: isFailsafe ? "0 dB" : "28 dB",
      latency: isFailsafe ? "FAIL" : "8 ms",
      temp: "39°C",
      status: isFailsafe ? "FAULT" : "NOMINAL",
      description: isFailsafe
        ? "CAN bus communication timeout. System fallback."
        : "Micro-doppler speed & range measurement nominal."
    },
    {
      id: "lidar",
      name: "Solid-State 128-Beam LiDAR",
      type: "1550nm Laser",
      icon: Scan,
      confidence: lidarConf,
      snr: isFailsafe ? "0 dB" : metrics.camera_confidence < 0.7 ? "18 dB" : "34 dB",
      latency: isFailsafe ? "FAIL" : "15 ms",
      temp: "44°C",
      status: isFailsafe
        ? "FAULT"
        : metrics.camera_confidence < 0.7
        ? "DEGRADED"
        : "NOMINAL",
      description: isFailsafe
        ? "Laser emitter safety lockout triggered."
        : metrics.camera_confidence < 0.7
        ? "Rain droplet backscatter detected. Point cloud filtered."
        : "High-density 3D spatial point cloud active."
    },
    {
      id: "sonar",
      name: "12x Ultrasonic PDC Array",
      type: "Acoustic PDC",
      icon: Activity,
      confidence: sonarConf,
      snr: isFailsafe ? "0 dB" : "40 dB",
      latency: isFailsafe ? "FAIL" : "4 ms",
      temp: "31°C",
      status: isFailsafe ? "FAULT" : "NOMINAL",
      description: isFailsafe
        ? "PDC transducer bus power fault."
        : "Near-field parking & low-speed perimeter safety clear."
    },
    {
      id: "imu",
      name: "6-DOF IMU & Wheel Speed",
      type: "MEMS Kinematics",
      icon: Cpu,
      confidence: imuConf,
      snr: isFailsafe ? "0 dB" : "45 dB",
      latency: isFailsafe ? "FAIL" : "2 ms",
      temp: "36°C",
      status: isFailsafe ? "FAULT" : "NOMINAL",
      description: isFailsafe
        ? "ECU telemetry bus sync fault."
        : "Odometry & yaw velocity telemetry calibrated."
    }
  ];

  const overallScore = Math.round(
    sensors.reduce((acc, s) => acc + s.confidence, 0) / sensors.length
  );

  const getStatusBadge = (status: string, conf: number) => {
    if (status === "FAULT") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950 text-purple-300 border border-purple-600 animate-pulse flex items-center space-x-1">
          <AlertOctagon className="w-3 h-3" />
          <span>FAULT</span>
        </span>
      );
    }
    if (status === "DEGRADED") {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600 flex items-center space-x-1">
          <AlertTriangle className="w-3 h-3" />
          <span>DEGRADED</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center space-x-1">
        <ShieldCheck className="w-3 h-3" />
        <span>NOMINAL</span>
      </span>
    );
  };

  const getHeatmapColor = (conf: number, status: string) => {
    if (status === "FAULT") return "from-purple-600 via-purple-500 to-rose-600";
    if (conf >= 85) return "from-emerald-500 to-cyan-500";
    if (conf >= 60) return "from-amber-500 to-orange-500";
    return "from-rose-600 to-red-600";
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-200">
            Sensor Health Heatmap &amp; Fusion Diagnostic
          </h3>
          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
            ISO 26262 ASIL-D Matrix
          </span>
        </div>

        <div className="flex items-center space-x-3 font-mono text-xs">
          <span className="text-slate-400">System Perception Health:</span>
          <span
            className={`font-black px-2 py-0.5 rounded text-xs border ${
              isFailsafe
                ? "bg-purple-950 text-purple-300 border-purple-600 animate-pulse"
                : overallScore >= 80
                ? "bg-emerald-950 text-emerald-300 border-emerald-600"
                : "bg-amber-950 text-amber-300 border-amber-600"
            }`}
          >
            {overallScore}%
          </span>
        </div>
      </div>

      {/* Grid of Sensor Heat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {sensors.map((sensor) => {
          const Icon = sensor.icon;
          const heatGradient = getHeatmapColor(sensor.confidence, sensor.status);

          return (
            <div
              key={sensor.id}
              className={`bg-slate-950/80 border rounded-xl p-3 flex flex-col justify-between space-y-3 transition-all relative overflow-hidden ${
                sensor.status === "FAULT"
                  ? "border-purple-600/80 bg-purple-950/20 shadow-lg shadow-purple-950/40"
                  : sensor.status === "DEGRADED"
                  ? "border-amber-600/60"
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              {/* Header inside Card */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="p-1.5 bg-slate-800/80 rounded-lg text-cyan-400">
                    <Icon className="w-4 h-4" />
                  </div>
                  {getStatusBadge(sensor.status, sensor.confidence)}
                </div>

                <div className="font-bold text-xs text-white truncate" title={sensor.name}>
                  {sensor.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{sensor.type}</div>
              </div>

              {/* Heat Bar & Confidence Score */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Confidence:</span>
                  <span
                    className={`font-bold ${
                      sensor.status === "FAULT"
                        ? "text-purple-400"
                        : sensor.confidence >= 85
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {sensor.confidence}%
                  </span>
                </div>

                {/* Visual Heat Bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${heatGradient} transition-all duration-500`}
                    style={{ width: `${sensor.confidence}%` }}
                  />
                </div>
              </div>

              {/* Diagnostic Metrics */}
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-800/80 text-[10px] font-mono">
                <div>
                  <div className="text-slate-500">SNR</div>
                  <div className="text-slate-200 font-bold">{sensor.snr}</div>
                </div>
                <div>
                  <div className="text-slate-500">Latency</div>
                  <div className="text-slate-200 font-bold">{sensor.latency}</div>
                </div>
                <div>
                  <div className="text-slate-500">Temp</div>
                  <div className="text-slate-200 font-bold">{sensor.temp}</div>
                </div>
              </div>

              {/* Sensor Description text */}
              <p className="text-[10px] text-slate-400 line-clamp-2 italic leading-tight">
                {sensor.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
