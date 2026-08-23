import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TrafficMetrics, ArchitectureConfig, IndianTrafficScenario, WeatherCondition } from "./types/indiTraffic";
import { TrafficTwinCanvas } from "./components/indiTraffic/TrafficTwinCanvas";
import { ArchitecturalControlsPanel } from "./components/indiTraffic/ArchitecturalControlsPanel";
import { ThermalAndEfficiencyGauges } from "./components/indiTraffic/ThermalAndEfficiencyGauges";
import { EconomicCostRoiAnalytics } from "./components/indiTraffic/EconomicCostRoiAnalytics";
import { AutosarCodeAndCopilot } from "./components/indiTraffic/AutosarCodeAndCopilot";
import { CanBusAndFirebaseVault } from "./components/indiTraffic/CanBusAndFirebaseVault";
import { TrafficDensityHeatmap } from "./components/indiTraffic/TrafficDensityHeatmap";
import { AiMultimodalStudio } from "./components/indiTraffic/AiMultimodalStudio";
import { UserTutorialModal } from "./components/indiTraffic/UserTutorialModal";
import { AppLoader } from "./components/indiTraffic/AppLoader";
import { FPSMeter } from "./components/indiTraffic/FPSMeter";
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
  HelpCircle,
  Thermometer,
  CloudRain,
  Flame,
  CloudFog,
  Sun,
  Snowflake
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"TWIN" | "WORKBENCH" | "ROI" | "AUTOSAR" | "CAN_VAULT" | "AI_STUDIO">("TWIN");
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [isTutorialOpen, setIsTutorialOpen] = useState<boolean>(false);
  const [isAppLoading, setIsAppLoading] = useState<boolean>(true);
  const [isThermalOptActive, setIsThermalOptActive] = useState<boolean>(false);

  // Auto-open tutorial on first visit if not explicitly opted out, but wait for loader
  useEffect(() => {
    if (isAppLoading) return;
    const isCompleted = localStorage.getItem("inditraffic_tutorial_completed");
    if (!isCompleted) {
      setIsTutorialOpen(true);
    }
  }, [isAppLoading]);

  // Architecture Configuration State
  const [config, setConfig] = useState<ArchitectureConfig>({
    archType: "INDITRAFFIC_SDV_EDGE",
    scenario: "SILK_BOARD_CRAWL",
    weatherCondition: "HEATWAVE_DELHI",
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
    ambient_temp_c: 48.0,
    battery_pack_temp_c: 37.8,
    inverter_junction_temp_c: 74.2,
    stator_winding_loss_w: 120,
    hvac_power_kw: 1.5,
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

  // Thermal Optimization Hook
  useEffect(() => {
    if (metrics.battery_pack_temp_c > 50) {
      if (config.hvacCompressorSpilloverPercent > 20) {
        setConfig((prev) => ({ ...prev, hvacCompressorSpilloverPercent: 20 }));
        setIsThermalOptActive(true);
      }
    } else if (metrics.battery_pack_temp_c < 48 && isThermalOptActive) {
      setIsThermalOptActive(false);
    }
  }, [metrics.battery_pack_temp_c, config.hvacCompressorSpilloverPercent, isThermalOptActive]);

  // Simulation Loop Engine
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setMetrics((prev) => {
        const isBaseline = config.archType === "LEGACY_CONVENTIONAL_EV";

        // Weather condition simulation parameters
        let targetAmbient = 48.0;
        let baseHvacKw = 3.8;
        let weatherExtraWh = 35;
        let targetInverterTempBase = 94.5;
        let targetInverterTempOpt = 74.2;
        let targetBatteryTempBase = 56.5; // Triggers thermal alert (>55C) on legacy EV during heatwave
        let targetBatteryTempOpt = 38.2;
        let weatherBrakeWearMult = 1.0;

        switch (config.weatherCondition) {
          case "HEATWAVE_DELHI":
            targetAmbient = 48.0 + (Math.random() - 0.5) * 0.8;
            baseHvacKw = 3.8;
            weatherExtraWh = 35; // Severe AC cooling load in 48C
            targetInverterTempBase = 94.5;
            targetInverterTempOpt = 74.2;
            targetBatteryTempBase = 56.5;
            targetBatteryTempOpt = 51.2; // Adjusted >50C so Thermal Optimization mode auto-triggers
            break;
          case "MONSOON_MUMBAI":
            targetAmbient = 26.5 + (Math.random() - 0.5) * 0.6;
            baseHvacKw = 2.0; // AC defoggers + wipers + auxiliary water pump load
            weatherExtraWh = 28; // Road water-logging hydrodynamic drag
            weatherBrakeWearMult = 1.45; // Wet friction slip
            targetInverterTempBase = 79.0;
            targetInverterTempOpt = 64.5;
            targetBatteryTempBase = 38.5;
            targetBatteryTempOpt = 31.2;
            break;
          case "WINTER_FOG_NORTH":
            targetAmbient = 8.5 + (Math.random() - 0.5) * 0.6;
            baseHvacKw = 2.5; // PTC cabin heater + battery thermal preconditioning
            weatherExtraWh = 22; // Battery cold degradation & cabin heating
            targetInverterTempBase = 68.0;
            targetInverterTempOpt = 58.0;
            targetBatteryTempBase = 26.0;
            targetBatteryTempOpt = 22.5;
            break;
          case "CLEAR_MODERATE":
            targetAmbient = 25.0 + (Math.random() - 0.5) * 0.4;
            baseHvacKw = 0.8;
            weatherExtraWh = 0;
            targetInverterTempBase = 72.0;
            targetInverterTempOpt = 60.0;
            targetBatteryTempBase = 34.0;
            targetBatteryTempOpt = 28.0;
            break;
        }

        // Speed fluctuation simulation (Indian traffic stop-and-go)
        const speedDelta = (Math.random() - 0.5) * 3;
        const newSpeed = Math.max(0, Math.min(28, prev.vehicle_speed_kmh + speedDelta));

        // Cut-in probability spike
        const cutInProb = Math.random() < 0.25 ? Math.random() * 0.8 + 0.2 : Math.random() * 0.3;

        // Inverter and Battery thermal models
        const targetInverterTemp = isBaseline ? targetInverterTempBase + Math.random() * 3 : targetInverterTempOpt + Math.random() * 2;
        const targetBatteryTemp = isBaseline ? targetBatteryTempBase + Math.random() * 1.5 : targetBatteryTempOpt + Math.random() * 1.0;

        // Micro-regen energy recovery model
        const cutoff = config.lowSpeedRegenCutoffKmh;
        let regenNm = 0;
        let frictionNm = 0;
        let regenPercent = 0;

        if (newSpeed < cutoff) {
          frictionNm = (120 + Math.random() * 40) * weatherBrakeWearMult;
          regenNm = 0;
          regenPercent = 5.0;
        } else {
          regenNm = isBaseline ? 45 : 160 + Math.random() * 20;
          frictionNm = (isBaseline ? 95 : 15) * weatherBrakeWearMult;
          regenPercent = isBaseline ? 12.0 : 38.0 + Math.random() * 4;
        }

        // Active HVAC & Auxiliary Power (kW)
        const activeHvacPowerKw = isBaseline
          ? baseHvacKw
          : (baseHvacKw * config.hvacCompressorSpilloverPercent) / 100;

        // Energy consumption (Wh/km) model incorporating climate load
        const baselineWh = 150 + weatherExtraWh + (baseHvacKw * 11.5);
        const hvacSavedWh = (baseHvacKw - activeHvacPowerKw) * 11.5;
        const optimizedWh = baselineWh - (regenPercent * 0.95) - hvacSavedWh;

        const energyWh = isBaseline ? baselineWh : Math.max(115, optimizedWh);

        return {
          ...prev,
          vehicle_speed_kmh: newSpeed,
          creep_distance_m: Math.max(1.2, 3.5 + (Math.random() - 0.5) * 2),
          ambient_temp_c: targetAmbient,
          inverter_junction_temp_c: targetInverterTemp,
          battery_pack_temp_c: targetBatteryTemp,
          inverter_switching_loss_w: isBaseline ? 280 : (config.pwmMode === "FIXED_10KHZ" ? 240 : 115),
          hvac_power_kw: activeHvacPowerKw,
          regen_torque_nm: regenNm,
          friction_brake_torque_nm: frictionNm,
          kinetic_energy_recovered_percent: regenPercent,
          cut_in_probability: cutInProb,
          npu_latency_ms: isBaseline ? 18.5 : 3.8 + Math.random() * 0.4,
          energy_consumption_wh_km: energyWh,
          baseline_energy_wh_km: baselineWh,
          cost_per_km_inr: (energyWh / 1000) * config.electricityCostPerKwhInr,
          baseline_cost_per_km_inr: (baselineWh / 1000) * config.electricityCostPerKwhInr,
          brake_pad_wear_index: isBaseline ? 1.0 * weatherBrakeWearMult : 0.35 * weatherBrakeWearMult,
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
      <AppLoader isLoading={isAppLoading} onComplete={() => setIsAppLoading(false)} />

      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-xl shadow-lg shadow-sky-500/20 text-white relative overflow-hidden group">
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite_ease-in-out]" />
              <Car className="w-6 h-6 relative z-10" />
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

          <div className="flex flex-wrap items-center gap-3">
            {/* Extreme Weather Climate Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800 text-xs shadow-inner">
              <span className="text-slate-400 font-medium hidden lg:flex items-center gap-1">
                {config.weatherCondition === "HEATWAVE_DELHI" && <Flame className="w-3.5 h-3.5 text-rose-400" />}
                {config.weatherCondition === "MONSOON_MUMBAI" && <CloudRain className="w-3.5 h-3.5 text-cyan-400" />}
                {config.weatherCondition === "WINTER_FOG_NORTH" && <CloudFog className="w-3.5 h-3.5 text-indigo-400" />}
                {config.weatherCondition === "CLEAR_MODERATE" && <Sun className="w-3.5 h-3.5 text-emerald-400" />}
                Climate:
              </span>
              <select
                value={config.weatherCondition}
                onChange={(e) => setConfig((prev) => ({ ...prev, weatherCondition: e.target.value as WeatherCondition }))}
                className="bg-slate-900 text-slate-100 text-xs font-semibold rounded px-2 py-1 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer transition-colors"
              >
                <option value="HEATWAVE_DELHI">🔥 Extreme Heatwave (48°C)</option>
                <option value="MONSOON_MUMBAI">🌧️ Monsoon Downpour (26°C)</option>
                <option value="WINTER_FOG_NORTH">🌫️ Winter Fog & Smog (8°C)</option>
                <option value="CLEAR_MODERATE">☀️ Clear / Moderate (25°C)</option>
              </select>
              <div className="flex items-center gap-1 font-mono font-bold text-amber-400 ml-0.5 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                <Thermometer className="w-3 h-3" />
                {metrics.ambient_temp_c.toFixed(1)}°C
              </div>
            </div>

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
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow active:scale-95"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Inject Cut-In Event
            </button>

            <button
              onClick={() => setIsTutorialOpen(true)}
              className="px-3.5 py-1.5 bg-sky-950/80 hover:bg-sky-900 text-sky-300 border border-sky-700/60 hover:border-sky-500 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow active:scale-95"
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
        <div className="flex overflow-x-auto bg-slate-900 p-1.5 rounded-xl border border-slate-800 gap-1 scrollbar-none relative">
          {[
            { id: "TWIN", label: "Live Traffic Twin & Telemetry", icon: Car },
            { id: "WORKBENCH", label: "SDV Architecture Workbench", icon: Sliders },
            { id: "ROI", label: "Indian Market ROI & Cost Analytics", icon: TrendingUp },
            { id: "AUTOSAR", label: "AUTOSAR Code & Gemini Copilot", icon: Code },
            { id: "CAN_VAULT", label: "CAN Bus Stream & Cloud Vault", icon: Radio },
            { id: "AI_STUDIO", label: "Gemini Multimodal Studio", icon: Sparkles, gradient: true }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap z-10 ${
                  isActive
                    ? tab.gradient ? "text-white" : "text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab"
                    className={`absolute inset-0 rounded-lg -z-10 ${
                      tab.gradient 
                        ? "bg-gradient-to-r from-sky-600 to-purple-600 shadow-lg shadow-purple-600/30" 
                        : "bg-sky-600 shadow-lg shadow-sky-600/30"
                    }`}
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <Icon className={`w-4 h-4 ${tab.gradient && !isActive ? "text-purple-400" : ""}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Global Live Gauges Bar (Always visible for instant feedback) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Thermal Optimization Alert Banner */}
          <AnimatePresence>
            {isThermalOptActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 flex items-center gap-3 overflow-hidden"
              >
                <div className="bg-amber-500/20 p-1.5 rounded-full flex-shrink-0 animate-pulse">
                  <Flame className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-amber-400 font-mono">THERMAL OPTIMIZATION ENGAGED</h4>
                  <p className="text-[10px] text-amber-500/80">Battery temp {metrics.battery_pack_temp_c.toFixed(1)}°C {">"} 50°C. Automatically redirecting HVAC capacity (spillover 20%) to prioritize powertrain cooling.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <ThermalAndEfficiencyGauges metrics={metrics} config={config} />
        </motion.div>

        {/* Tab Content Display */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full"
          >
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
          </motion.div>
        </AnimatePresence>
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
        onTriggerHeatwave={() => {
          setConfig((prev) => ({ ...prev, weatherCondition: "HEATWAVE_DELHI" }));
        }}
      />

      {/* Global Performance Monitoring */}
      <FPSMeter />
    </div>
  );
}
