import React, { useMemo } from "react";
import {
  Wifi,
  Activity,
  Zap,
  Server,
  AlertTriangle,
  Radio,
  Cpu,
  BarChart2,
  Database
} from "lucide-react";
import { TelemetryEvent, SensorMetrics } from "../types";

interface NetworkUtilizationGaugeProps {
  telemetryLogs?: TelemetryEvent[];
  metrics: SensorMetrics;
  lastCommand: string;
  isSimulating?: boolean;
}

export const NetworkUtilizationGauge: React.FC<NetworkUtilizationGaugeProps> = ({
  telemetryLogs = [],
  metrics,
  lastCommand,
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

  // Calculate telemetry frequency (events in the last 5 seconds)
  const networkMetrics = useMemo(() => {
    const nowUnix = Date.now() / 1000;
    const recentEvents = telemetryLogs.filter(
      (log) => nowUnix - log.timestamp_unix <= 5.0
    );

    // Event frequency (events/sec)
    const recentCount = recentEvents.length;
    // Calculate events per second over a 5s sliding window (minimum 1.0 Hz base clock)
    const frequencyHz = Math.max(
      1.0,
      parseFloat((recentCount > 0 ? recentCount / 5.0 : 1.2).toFixed(1))
    );

    // Bandwidth utilization calculation based on message frequency, active scenario, and vehicle status:
    // Base load: 22% (SOME/IP heartbeats + CAN FD cyclic frames)
    // Dynamic load: frequencyHz * 4.5% + high speed factor + emergency/failsafe burst
    let dynamicLoad = 22 + frequencyHz * 4.8;

    if (isFailsafe) {
      // In Failsafe/Sensor fault state, CAN/Ethernet bus experiences error frame retransmissions & diagnostic dumps
      dynamicLoad = Math.min(96, 78 + Math.random() * 12);
    } else if (isEmergencyBrake) {
      // Emergency braking triggers high-priority P0 telemetry bursts
      dynamicLoad = Math.min(92, 68 + Math.random() * 10);
    } else if (metrics.vehicle_speed_kmh > 60) {
      dynamicLoad += (metrics.vehicle_speed_kmh - 60) * 0.25;
    }

    const utilizationPct = Math.min(99, Math.max(15, Math.round(dynamicLoad)));

    // Throughput in Mbps (based on 1000BASE-T1 / CAN FD bandwidth)
    // 100% load ~ 85.0 Mbps total payload bandwidth allocated for zone controller stream
    const throughputMbps = ((utilizationPct / 100) * 85.0).toFixed(1);

    // Message frame count / second
    const msgsPerSec = Math.round(frequencyHz * 24); // Each telemetry record emits ~24 bus packets (Camera, Radar, LiDAR, IMU)

    return {
      frequencyHz,
      utilizationPct,
      throughputMbps,
      msgsPerSec,
      recentCount
    };
  }, [telemetryLogs, metrics, isFailsafe, isEmergencyBrake]);

  const { frequencyHz, utilizationPct, throughputMbps, msgsPerSec } = networkMetrics;

  // Arc Gauge Geometry Calculations
  // Angle range: -120 deg to +120 deg (240 degree total sweep arc)
  const radius = 70;
  const strokeWidth = 12;
  const center = 90;
  const startAngle = -120;
  const endAngle = 120;
  const totalSweep = endAngle - startAngle;

  const currentAngle = startAngle + (utilizationPct / 100) * totalSweep;

  const polarToCartesian = (cx: number, cy: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians)
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? "0" : "1";
    return [
      "M",
      start.x,
      start.y,
      "A",
      r,
      r,
      0,
      largeArcFlag,
      0,
      end.x,
      end.y
    ].join(" ");
  };

  const bgArc = describeArc(center, center, radius, startAngle, endAngle);
  const valueArc = describeArc(center, center, radius, startAngle, currentAngle);

  // Status color badge & stroke gradient
  const getStatusInfo = () => {
    if (isFailsafe) {
      return {
        label: "BUS SATURATED / FAULT",
        color: "text-purple-400",
        badgeBg: "bg-purple-950 text-purple-300 border-purple-600 animate-pulse",
        strokeColor: "#a855f7"
      };
    }
    if (utilizationPct >= 80) {
      return {
        label: "HIGH BURST LOAD",
        color: "text-rose-400",
        badgeBg: "bg-rose-950 text-rose-300 border-rose-600 animate-pulse",
        strokeColor: "#f43f5e"
      };
    }
    if (utilizationPct >= 50) {
      return {
        label: "MODERATE BUS LOAD",
        color: "text-amber-400",
        badgeBg: "bg-amber-950 text-amber-300 border-amber-600",
        strokeColor: "#f59e0b"
      };
    }
    return {
      label: "NOMINAL BANDWIDTH",
      color: "text-emerald-400",
      badgeBg: "bg-emerald-950 text-emerald-300 border-emerald-600",
      strokeColor: "#06b6d4"
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Wifi className="w-4 h-4 text-cyan-400" />
          <h3 className="font-semibold text-sm text-slate-200">
            Vehicle Bus Network Utilization
          </h3>
          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
            SOME/IP over 1000BASE-T1
          </span>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400">Bus Status:</span>
          <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] border ${statusInfo.badgeBg}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Main Gauge & Metrics Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* SVG Dial Gauge (5 Cols) */}
        <div className="md:col-span-5 flex flex-col items-center justify-center p-2 bg-slate-950/70 rounded-xl border border-slate-800/80 relative">
          <svg className="w-48 h-36" viewBox="0 0 180 150">
            {/* Background Track Arc */}
            <path
              d={bgArc}
              fill="none"
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />

            {/* Active Utilization Value Arc */}
            <path
              d={valueArc}
              fill="none"
              stroke={statusInfo.strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />

            {/* Center Dial Text Display */}
            <text
              x={center}
              y={center - 5}
              textAnchor="middle"
              className="fill-white font-mono text-2xl font-black"
            >
              {utilizationPct}%
            </text>
            <text
              x={center}
              y={center + 15}
              textAnchor="middle"
              className="fill-slate-400 font-mono text-[9px] uppercase tracking-wider font-bold"
            >
              Bandwidth Used
            </text>

            {/* Scale End Labels */}
            <text x="25" y="140" className="fill-slate-500 font-mono text-[9px]">
              0%
            </text>
            <text x="145" y="140" className="fill-slate-500 font-mono text-[9px]">
              100%
            </text>
          </svg>

          {/* Quick Frequency Tag under Gauge */}
          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-300 mt-[-10px] pb-1">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>Telemetry Rate:</span>
            <span className="font-bold text-cyan-300">{frequencyHz} Hz</span>
          </div>
        </div>

        {/* Detailed Telemetry & Bus Statistics Cards (7 Cols) */}
        <div className="md:col-span-7 grid grid-cols-2 gap-2.5 font-mono text-xs">
          {/* Card 1: Throughput */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
              <span className="flex items-center space-x-1">
                <BarChart2 className="w-3 h-3 text-cyan-400" />
                <span>Bus Throughput</span>
              </span>
              <span className="text-slate-500">1000Mbps</span>
            </div>
            <div className="text-base font-extrabold text-white">
              {throughputMbps} <span className="text-xs font-normal text-slate-400">Mbps</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-cyan-500 h-full transition-all duration-300"
                style={{ width: `${utilizationPct}%` }}
              />
            </div>
          </div>

          {/* Card 2: Packet Rate */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
              <span className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Message Rate</span>
              </span>
              <span className="text-slate-500">Frame Stream</span>
            </div>
            <div className="text-base font-extrabold text-white">
              {msgsPerSec} <span className="text-xs font-normal text-slate-400">pkts/sec</span>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {isSimulating ? "Real-time Broadcast Active" : "Sim Paused"}
            </div>
          </div>

          {/* Card 3: Bus Protocol & Channel */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
              <span className="flex items-center space-x-1">
                <Server className="w-3 h-3 text-emerald-400" />
                <span>Bus Protocol</span>
              </span>
            </div>
            <div className="text-xs font-bold text-slate-200 truncate" title="SOME/IP & CAN FD">
              SOME/IP over Ethernet
            </div>
            <div className="text-[10px] text-slate-400">
              Latency: {metrics.time_to_collision_s ? "12ms avg" : "N/A"}
            </div>
          </div>

          {/* Card 4: Error Rate & Health */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase">
              <span className="flex items-center space-x-1">
                <Database className="w-3 h-3 text-purple-400" />
                <span>Bus Health / BER</span>
              </span>
            </div>
            <div
              className={`text-xs font-bold ${
                isFailsafe ? "text-purple-300" : "text-emerald-300"
              }`}
            >
              {isFailsafe ? "HIGH RETRANSMITS" : "BER < 10⁻⁹ (CLEAR)"}
            </div>
            <div className="text-[10px] text-slate-400">
              {isFailsafe ? "CAN Error Frames Injected" : "0 Dropped Packets"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
