export type IndianTrafficScenario =
  | "SILK_BOARD_CRAWL"
  | "OLD_DELHI_SWARM"
  | "MONSOON_MUMBAI"
  | "CYBER_HUB_HEAT_TRANSITION";

export type VehicleArchType = "LEGACY_CONVENTIONAL_EV" | "INDITRAFFIC_SDV_EDGE";

export type InverterPwmMode = "FIXED_10KHZ" | "ADAPTIVE_CREEP_6KHZ" | "PHASE_SHEDDING_4KHZ";

export type MicroRegenMode = "FRICTION_ONLY_BELOW_12KMH" | "INDITRAFFIC_MICRO_PEDAL_1.5KMH";

export interface TrafficMetrics {
  vehicle_speed_kmh: number;
  creep_distance_m: number;
  ambient_temp_c: number;
  battery_pack_temp_c: number;
  inverter_junction_temp_c: number;
  stator_winding_loss_w: number;
  hvac_power_kw: number;
  inverter_switching_loss_w: number;
  
  // Braking & Regen
  regen_torque_nm: number;
  friction_brake_torque_nm: number;
  kinetic_energy_recovered_percent: number;
  micro_stop_count_per_hr: number;
  
  // Swarm AI
  cut_in_probability: number;
  predicted_stop_duration_s: number;
  npu_latency_ms: number;
  edge_ai_power_w: number;
  
  // Cost & Efficiency
  energy_consumption_wh_km: number; // Baseline vs Optimized
  baseline_energy_wh_km: number;
  cost_per_km_inr: number;
  baseline_cost_per_km_inr: number;
  battery_soh_degradation_rate: number; // Lower is better
  brake_pad_wear_index: number; // Lower is better
  
  timestamp: number;
}

export interface ArchitectureConfig {
  archType: VehicleArchType;
  scenario: IndianTrafficScenario;
  pwmMode: InverterPwmMode;
  microRegenMode: MicroRegenMode;
  lowSpeedRegenCutoffKmh: number; // 1.5 to 15.0 km/h
  hvacCompressorSpilloverPercent: number; // 10% to 100%
  edgeAiPredictionHorizonMs: number; // 100 to 1000 ms
  brakeBlendRampMs: number; // 20 to 200 ms
  electricityCostPerKwhInr: number; // e.g. 8.5 INR
  annualDrivingKm: number; // e.g. 18000 km
}

export interface CanMessagePacket {
  id: string;
  canId: string;
  bus: "CAN_HS1_POWERTRAIN" | "LIN_HVAC_AUX" | "SOME_IP_SWARM_AI";
  topic: string;
  signals: Record<string, number | string | boolean>;
  timestamp: string;
}

export interface SavedArchSnapshot {
  id?: string;
  userId: string;
  scenarioName: string;
  savedAt: string;
  config: ArchitectureConfig;
  metricsSummary: {
    energySavedPercent: number;
    annualInrSaved: number;
    batteryTempReductionC: number;
    brakeLifeExtensionMonths: number;
  };
}
