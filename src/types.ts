export type ScenarioType = "CRITICAL" | "WARNING" | "SAFE" | "CUSTOM" | "SIMULATED" | "SENSOR_FAULT";

export type DrivePowerMode = "PERFORMANCE" | "BALANCED" | "ENERGY_SAVING";

export interface SensorMetrics {
  vehicle_speed_kmh: number;
  obstacle_distance_m: number;
  camera_confidence: number;
  time_to_collision_s: number;
  detected_object_type?: string;
  relative_velocity_ms?: number;
  sensor_fault?: boolean;
  sensor_status?: "NORMAL" | "INVALID_DATA" | "FAULT";
  power_mode?: DrivePowerMode;
  npu_power_watts?: number;
  inference_latency_ms?: number;
  power_efficiency_percent?: number;
  target_power_efficiency_percent?: number;
  v2x_enabled?: boolean;
  road_friction?: number;
  traffic_light_state?: "RED" | "YELLOW" | "GREEN" | "NONE";
  v2x_latency_ms?: number;
  v2x_intersection_id?: string;
  v2x_warning_active?: boolean;
}

export interface TelemetryEvent {
  telemetry_spec_version: string;
  trace_id: string;
  vin: string;
  timestamp_iso: string;
  timestamp_unix: number;
  effective_latency_ms: number;
  event: {
    type: string;
    priority: "P0_CRITICAL" | "P1_HIGH" | "P2_MODERATE" | "P3_NORMAL";
    actuation_command: "EMERGENCY_BRAKE" | "WARNING" | "MAINTAIN" | "FAILSAFE";
    description: string;
  };
  sensor_metrics: SensorMetrics;
  system_state: {
    ecu_status: string;
    bus_protocol: string;
    edge_ai_power_watts: number;
    effective_latency_ms?: number;
    power_mode?: DrivePowerMode;
    power_efficiency_percent?: number;
    target_power_efficiency_percent?: number;
    inference_latency_ms?: number;
  };
}

export interface BusMessage {
  message_id: string;
  topic: string;
  sender_id: string;
  timestamp: number;
  payload: Record<string, any>;
}

export interface PythonSourceFiles {
  [fileName: string]: string;
}

export interface ForensicSnapshot {
  id?: string;
  userId: string;
  eventId: string;
  triggeredAt: string;
  triggerCommand: string;
  triggerReason: string;
  eventCount: number;
  timeRangeMinutes: number;
  telemetryWindow: TelemetryEvent[];
  metricsSummary: SensorMetrics;
}

