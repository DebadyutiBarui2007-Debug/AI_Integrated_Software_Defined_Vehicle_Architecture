import React, { useState } from "react";
import { Radio, Server, Cpu, Activity, RefreshCw, Send, CheckCircle2, ArrowRight } from "lucide-react";
import { BusMessage, SensorMetrics } from "../types";

interface MessageBusInspectorProps {
  metrics: SensorMetrics;
  lastCommand: string;
}

export const MessageBusInspector: React.FC<MessageBusInspectorProps> = ({
  metrics,
  lastCommand
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string>("ALL");

  const nowMs = Date.now();

  // Simulated live message packets based on current metrics
  const busTopics = [
    {
      topic: "/sensor/camera",
      sender: "ZONE_FRONT_ECU",
      protocol: "SOME/IP (Ethernet 1000BASE-T1)",
      rate: "1 Hz",
      payload: {
        sensor_type: "CAMERA_VISION_FRONT",
        camera_confidence: metrics.camera_confidence,
        visual_distance_m: metrics.obstacle_distance_m,
        detected_object: metrics.detected_object_type || "PEDESTRIAN",
        bounding_box: { x: 240, y: 180, w: 90, h: 160 }
      }
    },
    {
      topic: "/sensor/radar",
      sender: "ZONE_FRONT_RADAR_ECU",
      protocol: "SOME/IP (Ethernet 1000BASE-T1)",
      rate: "1 Hz",
      payload: {
        sensor_type: "RADAR_77GHZ_FRONT",
        object_distance_m: metrics.obstacle_distance_m,
        relative_velocity_ms: metrics.relative_velocity_ms || -12.5,
        target_rcs_dbms: 18.4,
        status: "OK"
      }
    },
    {
      topic: "/sensor/telematics",
      sender: "ZONE_POWERTRAIN_ECU",
      protocol: "CAN-FD / SOME/IP Gateway",
      rate: "1 Hz",
      payload: {
        sensor_type: "VEHICLE_SPEED_CAN",
        vehicle_speed_kmh: metrics.vehicle_speed_kmh,
        steering_angle_deg: 0.5,
        yaw_rate_degs: 0.1
      }
    },
    {
      topic: "/adas/inference",
      sender: "EDGE_AI_ADAS_DOMAIN_CONTROLLER",
      protocol: "ROS 2 DDS Topic",
      rate: "On-demand (3ms latency)",
      payload: {
        model_version: "YOLO-v8-Auto-Edge-v2.1",
        fused_obstacle_distance_m: metrics.obstacle_distance_m,
        time_to_collision_s: metrics.time_to_collision_s,
        camera_confidence: metrics.camera_confidence,
        risk_level:
          metrics.obstacle_distance_m < 15 && metrics.vehicle_speed_kmh > 30
            ? "CRITICAL"
            : metrics.obstacle_distance_m < 25
            ? "HIGH"
            : "LOW"
      }
    },
    {
      topic: "/vehicle/actuation",
      sender: "SAFETY_DECISION_ACTUATOR_ECU",
      protocol: "SOME/IP ASIL-D Priority Queue",
      rate: "Event-Driven",
      payload: {
        command: lastCommand || "MAINTAIN",
        priority: lastCommand === "EMERGENCY_BRAKE" ? "P0_CRITICAL" : lastCommand === "WARNING" ? "P1_HIGH" : "P3_NORMAL",
        target_brake_pressure_pct: lastCommand === "EMERGENCY_BRAKE" ? 100.0 : lastCommand === "WARNING" ? 25.0 : 0.0
      }
    }
  ];

  const filteredTopics = selectedTopic === "ALL" ? busTopics : busTopics.filter((t) => t.topic === selectedTopic);

  return (
    <div className="space-y-6">
      {/* Top Topology Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800/60">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">SOA Zone &amp; Domain Controller Topology</h3>
              <p className="text-xs text-slate-400">
                Service-Oriented Architecture (SOA) over SOME/IP &amp; ROS 2 DDS
              </p>
            </div>
          </div>
          <span className="text-xs font-mono bg-emerald-950 text-emerald-300 px-3 py-1 rounded-full border border-emerald-800">
            BUS STATUS: 1000BASE-T1 ACTIVE
          </span>
        </div>

        {/* Zone Architecture Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Zone Front */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2 relative">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-400">
              <span>ZONE FRONT ECU</span>
              <Server className="w-4 h-4 text-cyan-400" />
            </div>
            <p className="text-[11px] text-slate-400">Camera Vision (1080p) &amp; 77GHz Radar</p>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-900 p-1.5 rounded">
              Publishes: <span className="text-cyan-300">/sensor/camera, /sensor/radar</span>
            </div>
          </div>

          {/* Powertrain ECU */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-amber-400">
              <span>POWERTRAIN ECU</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400">Wheel Speed, CAN Gateway, Throttle</p>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-900 p-1.5 rounded">
              Publishes: <span className="text-amber-300">/sensor/telematics</span>
            </div>
          </div>

          {/* ADAS Domain Controller */}
          <div className="bg-slate-950 border border-cyan-500/50 rounded-xl p-4 space-y-2 shadow-lg shadow-cyan-950/40">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-cyan-300">
              <span>ADAS DOMAIN CONTROLLER</span>
              <Cpu className="w-4 h-4 text-cyan-300" />
            </div>
            <p className="text-[11px] text-slate-300 font-medium">Onboard Edge AI NPU Inference Engine</p>
            <div className="text-[10px] text-slate-400 font-mono bg-slate-900 p-1.5 rounded">
              Publishes: <span className="text-cyan-300 font-bold">/adas/inference</span>
            </div>
          </div>

          {/* Safety Actuator */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-400">
              <span>ACTUATION ECU</span>
              <Send className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-[11px] text-slate-400">ASIL-D Electronic Braking System</p>
            <div className="text-[10px] text-slate-500 font-mono bg-slate-900 p-1.5 rounded">
              Subscribes: <span className="text-rose-300 font-bold">/vehicle/actuation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Message Bus Topic Stream Inspector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-white">SOME/IP &amp; ROS 2 Topic Stream Inspector</h3>
            <p className="text-xs text-slate-400">Inspect real-time asynchronous SOME/IP messages published across the vehicle network</p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 text-xs font-mono">
            {["ALL", "/sensor/camera", "/sensor/radar", "/sensor/telematics", "/adas/inference", "/vehicle/actuation"].map((tp) => (
              <button
                key={tp}
                onClick={() => setSelectedTopic(tp)}
                className={`px-2.5 py-1 rounded-lg border transition-all ${
                  selectedTopic === tp
                    ? "bg-cyan-600 text-white border-cyan-500 shadow-sm"
                    : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800"
                }`}
              >
                {tp}
              </button>
            ))}
          </div>
        </div>

        {/* Message Packet Feed */}
        <div className="space-y-3">
          {filteredTopics.map((topicItem, idx) => (
            <div
              key={idx}
              className="bg-slate-950 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all font-mono"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="font-bold text-cyan-300 text-sm">{topicItem.topic}</span>
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
                    {topicItem.protocol}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                  <span>Sender: <strong className="text-slate-200">{topicItem.sender}</strong></span>
                  <span>Rate: <strong className="text-slate-200">{topicItem.rate}</strong></span>
                </div>
              </div>

              {/* JSON Payload Inspector */}
              <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800/60 text-xs overflow-x-auto text-slate-300">
                <pre>{JSON.stringify(topicItem.payload, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
