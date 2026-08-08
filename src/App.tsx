import React, { useState, useEffect } from "react";
import { TrafficMetrics, ArchitectureConfig, IndianTrafficScenario } from "./types/indiTraffic";
import { TrafficTwinCanvas } from "./components/indiTraffic/TrafficTwinCanvas";
import { ArchitecturalControlsPanel } from "./components/indiTraffic/ArchitecturalControlsPanel";
import { ThermalAndEfficiencyGauges } from "./components/indiTraffic/ThermalAndEfficiencyGauges";
import { EconomicCostRoiAnalytics } from "./components/indiTraffic/EconomicCostRoiAnalytics";
import { AutosarCodeAndCopilot } from "./components/indiTraffic/AutosarCodeAndCopilot";
import { CanBusAndFirebaseVault } from "./components/indiTraffic/CanBusAndFirebaseVault";
import { TrafficDensityHeatmap } from "./components/indiTraffic/TrafficDensityHeatmap";
import { AiMultimodalStudio } from "./components/indiTraffic/AiMultimodalStudio";
import { UserTutorialModal } from "./components/indiTraffic/UserTutorialModal";
import {
  Zap,
  Sliders,
  TrendingUp,
  Code,
  Radio,
  Play,
  Pause,
  RotateCcw,
  ShieldAlert,
  Car,
  Activity,
  Award,
  Sparkles,
  HelpCircle
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"TWIN" | "WORKBENCH" | "ROI" | "AUTOSAR" | "CAN_VAULT" | "AI_STUDIO">("TWIN");
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);

  // Auto-open tutorial on first visit if not explicitly opted out
  useEffect(() => {
    const isCompleted = localStorage.getItem("inditraffic_tutorial_completed");
    if (!isCompleted) {
      setIsTutorialOpen(true);
    }
  }, []);

  // Architecture Configuration State
  const [config, setConfig] = useState<ArchitectureConfig>({
    archType: "INDITRAFFIC_SDV_EDGE",
    scenario: "SILK_BOARD_CRAWL",
    pwmMode: "ADAPTIVE_CREEP_6KHZ",
    microRegenMode: "INDITRAFFIC_MICRO_PEDAL_1.5KMH",
    lowSpeedRegenCutoffKmh: 1.5,
    hvacCompressorSpilloverPercent: 40,
    edgeAiPredictionHorizonMs: 650,
    brakeBlendRampMs: 45,
    electricityCostPerKwhInr: 8.5,
    annualDrivingKm: 18000
  });

  // Live Telemetry Engine State
  const [metrics, setMetrics] = useState<TrafficMetrics>({
    vehicle_speed_kmh: 8.5,
    creep_distance_m: 4.2,
    ambient_temp_c: 42.0,
    battery_pack_temp_c: 37.8,
    inverter_junction_temp_c: 74.2,
    stator_winding_loss_w: 120,
    hvac_power_kw: 1.4,
    inverter_switching_loss_w: 110,
    regen_torque_nm: 145,
    friction_brake_torque_nm: 12,
    kinetic_energy_recovered_percent: 38.6,
    micro_stop_count_per_hr: 142,
    cut_in_probability: 0.2,
    predicted_stop_duration_s: 8.5,
    npu_latency_ms: 3.8,
    edge_ai_power_w: 4.2,
    energy_consumption_wh_km: 138,
    baseline_energy_wh_km: 188,
    cost_per_km_inr: 1.17,
    baseline_cost_per_km_inr: 1.60,
    battery_soh_degradation_rate: 0.4,
    brake_pad_wear_index: 0.35,
    timestamp: Date.now()
  });

  // Simulation Loop Engine
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setMetrics((prev) => {
        const isBaseline = config.archType === "LEGACY_CONVENTIONAL_EV";

        // Speed fluctuation simulation (Indian traffic stop-and-go)
        const speedDelta = (Math.random() - 0.5) * 3;
        const newSpeed = Math.max(0, Math.min(28, prev.vehicle_speed_kmh + speedDelta));

        // Cut-in probability spike
        const cutInProb = Math.random() < 0.25 ? Math.random() * 0.8 + 0.2 : Math.random() * 0.3;

        // Inverter temp model
        const pwmLossFactor = config.pwmMode === "FIXED_10KHZ" ? 1.8 : 1.0;
        const targetInverterTemp = isBaseline ? 88.5 + Math.random() * 4 : 72.0 + Math.random() * 3;

        // Micro-regen energy recovery model
        const cutoff = config.lowSpeedRegenCutoffKmh;
        let regenNm = 0;
        let frictionNm = 0;
        let regenPercent = 0;

        if (newSpeed < cutoff) {
          frictionNm = 120 + Math.random() * 40;
          regenNm = 0;
          regenPercent = 5.0;
        } else {
          regenNm = isBaseline ? 45 : 160 + Math.random() * 20;
          frictionNm = isBaseline ? 95 : 15;
          regenPercent = isBaseline ? 12.0 : 38.0 + Math.random() * 4;
        }

        // Energy consumption (Wh/km)
        const baselineWh = 185 + (42.0 - 25.0) * 0.8; // HVAC heat load
        const hvacSavedWh = (100 - config.hvacCompressorSpilloverPercent) * 0.35;
        const optimizedWh = baselineWh - (regenPercent * 0.9) - hvacSavedWh;

        const energyWh = isBaseline ? baselineWh : Math.max(120, optimizedWh);

        return {
          ...prev,
          vehicle_speed_kmh: newSpeed,
          creep_distance_m: Math.max(1.2, 3.5 + (Math.random() - 0.5) * 2),
          ambient_temp_c: config.scenario === "OLD_DELHI_SWARM" ? 44.0 : 42.0,
          inverter_junction_temp_c: targetInverterTemp,
          battery_pack_temp_c: isBaseline ? 44.2 : 37.5,
          inverter_switching_loss_w: isBaseline ? 280 : 120,
          hvac_power_kw: isBaseline ? 3.2 : (3.2 * config.hvacCompressorSpilloverPercent) / 100,
          regen_torque_nm: regenNm,
          friction_brake_torque_nm: frictionNm,
          kinetic_energy_recovered_percent: regenPercent,
          cut_in_probability: cutInProb,
          npu_latency_ms: isBaseline ? 18.5 : 3.8 + Math.random() * 0.4,
          energy_consumption_wh_km: energyWh,
          baseline_energy_wh_km: baselineWh,
          cost_per_km_inr: (energyWh / 1000) * config.electricityCostPerKwhInr,
          baseline_cost_per_km_inr: (baselineWh / 1000) * config.electricityCostPerKwhInr,
          brake_pad_wear_index: isBaseline ? 1.0 : 0.36,
          timestamp: Date.now()
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, config]);

  const handleTriggerCutInEvent = () => {
    setMetrics((prev) => ({
      ...prev,
      cut_in_probability: 0.92,
      creep_distance_m: 1.5,
      vehicle_speed_kmh: 4.2
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-sky-500 selection:text-white pb-12">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/20 text-white">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  IndiTraffic SDV Edge Architect
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                  v2.4 EV OPTIMIZER
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Stop-and-Go Thermal, Micro-Regen, & Cost Efficiency Architecture for Indian Urban Traffic
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-slate-400">CAN HS1:</span>
              <strong className="text-emerald-400 font-mono">ONLINE (500k)</strong>
            </div>

            <button
              onClick={() => setIsSimulating(!isSimulating)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow ${
                isSimulating
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30"
                  : "bg-emerald-600 text-white hover:bg-emerald-500"
              }`}
            >
              {isSimulating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isSimulating ? "Pause Twin" : "Run Twin"}
            </button>

            <button
              onClick={handleTriggerCutInEvent}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Inject Cut-In Event
            </button>

            <button
              onClick={() => setIsTutorialOpen(true)}
              className="px-3.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/60 hover:border-sky-500 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow"
            >
              <HelpCircle className="w-4 h-4 text-sky-400" />
              <span>Interactive Guide</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto bg-slate-900 p-1.5 rounded-xl border border-slate-800 gap-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("TWIN")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === "TWIN"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Car className="w-4 h-4" />
            Live Traffic Twin & Telemetry
          </button>

          <button
            onClick={() => setActiveTab("WORKBENCH")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === "WORKBENCH"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Sliders className="w-4 h-4" />
            SDV Architecture Workbench
          </button>

          <button
            onClick={() => setActiveTab("ROI")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === "ROI"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Indian Market ROI & Cost Analytics
          </button>

          <button
            onClick={() => setActiveTab("AUTOSAR")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === "AUTOSAR"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Code className="w-4 h-4" />
            AUTOSAR Code & Gemini Copilot
          </button>

          <button
            onClick={() => setActiveTab("CAN_VAULT")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === "CAN_VAULT"
                ? "bg-sky-600 text-white shadow-lg shadow-sky-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Radio className="w-4 h-4" />
            CAN Bus Stream & Cloud Vault
          </button>

          <button
            onClick={() => setActiveTab("AI_STUDIO")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition whitespace-nowrap ${
              activeTab === "AI_STUDIO"
                ? "bg-gradient-to-r from-sky-600 to-purple-600 text-white shadow-lg shadow-purple-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            Gemini Multimodal Studio
          </button>
        </div>

        {/* Global Live Gauges Bar (Always visible for instant feedback) */}
        <ThermalAndEfficiencyGauges metrics={metrics} config={config} />

        {/* Tab Content Display */}
        {activeTab === "TWIN" && (
          <div className="space-y-6">
            <TrafficTwinCanvas metrics={metrics} config={config} isSimulating={isSimulating} />
            <TrafficDensityHeatmap metrics={metrics} config={config} />
            <EconomicCostRoiAnalytics
              metrics={metrics}
              config={config}
              onConfigChange={(updated) => setConfig((prev) => ({ ...prev, ...updated }))}
            />
          </div>
        )}

        {activeTab === "WORKBENCH" && (
          <div className="space-y-6">
            <ArchitecturalControlsPanel config={config} onChange={setConfig} />
            <TrafficTwinCanvas metrics={metrics} config={config} isSimulating={isSimulating} />
          </div>
        )}

        {activeTab === "ROI" && (
          <EconomicCostRoiAnalytics
            metrics={metrics}
            config={config}
            onConfigChange={(updated) => setConfig((prev) => ({ ...prev, ...updated }))}
          />
        )}

        {activeTab === "AUTOSAR" && (
          <AutosarCodeAndCopilot metrics={metrics} config={config} />
        )}

        {activeTab === "CAN_VAULT" && (
          <CanBusAndFirebaseVault metrics={metrics} config={config} />
        )}

        {activeTab === "AI_STUDIO" && (
          <AiMultimodalStudio />
        )}
      </main>

      {/* User Onboarding Interactive Tutorial Modal */}
      <UserTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onTriggerCutInEvent={handleTriggerCutInEvent}
        onToggleSimulation={() => setIsSimulating(!isSimulating)}
        isSimulating={isSimulating}
      />
    </div>
  );
}
