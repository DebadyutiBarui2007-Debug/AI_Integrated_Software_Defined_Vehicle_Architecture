import React from "react";
import { ArchitectureConfig, IndianTrafficScenario, InverterPwmMode, MicroRegenMode, VehicleArchType } from "../../types/indiTraffic";
import { Sliders, Cpu, Activity, Zap, Shield, IndianRupee } from "lucide-react";

interface Props {
  config: ArchitectureConfig;
  onChange: (newConfig: ArchitectureConfig) => void;
}

export const ArchitecturalControlsPanel: React.FC<Props> = ({ config, onChange }) => {
  const handleArchType = (archType: VehicleArchType) => {
    if (archType === "LEGACY_CONVENTIONAL_EV") {
      onChange({
        ...config,
        archType,
        pwmMode: "FIXED_10KHZ",
        microRegenMode: "FRICTION_ONLY_BELOW_12KMH",
        lowSpeedRegenCutoffKmh: 12.0,
        hvacCompressorSpilloverPercent: 100,
        edgeAiPredictionHorizonMs: 200,
        brakeBlendRampMs: 150
      });
    } else {
      onChange({
        ...config,
        archType,
        pwmMode: "ADAPTIVE_CREEP_6KHZ",
        microRegenMode: "INDITRAFFIC_MICRO_PEDAL_1.5KMH",
        lowSpeedRegenCutoffKmh: 1.5,
        hvacCompressorSpilloverPercent: 40,
        edgeAiPredictionHorizonMs: 650,
        brakeBlendRampMs: 45
      });
    }
  };

  const handleScenarioChange = (scenario: IndianTrafficScenario) => {
    onChange({ ...config, scenario });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">SDV Architecture Workbench</h3>
            <p className="text-xs text-slate-400">Configure ECU Motor Inverter, Micro-Regen, & Thermal Parameters</p>
          </div>
        </div>

        {/* Architecture Mode Selector */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => handleArchType("LEGACY_CONVENTIONAL_EV")}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              config.archType === "LEGACY_CONVENTIONAL_EV"
                ? "bg-slate-800 text-amber-400 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Legacy EV Baseline
          </button>
          <button
            onClick={() => handleArchType("INDITRAFFIC_SDV_EDGE")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              config.archType === "INDITRAFFIC_SDV_EDGE"
                ? "bg-sky-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            IndiTraffic Edge SDV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Scenario Selector */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Indian Urban Drive Scenario
          </label>
          <select
            value={config.scenario}
            onChange={(e) => handleScenarioChange(e.target.value as IndianTrafficScenario)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="SILK_BOARD_CRAWL">Bengaluru Silk Board Crawl (Avg 6 km/h, 180 stops/hr)</option>
            <option value="OLD_DELHI_SWARM">Old Delhi Chaotic Swarm (Auto-rickshaws, 42°C)</option>
            <option value="MONSOON_MUMBAI">Monsoon Mumbai Water-Logging & Drag</option>
            <option value="CYBER_HUB_HEAT_TRANSITION">Gurugram Highway to Jam Heat Transition</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Simulates chaotic stop-and-go thermal cycles and micro-friction dissipation.
          </p>
        </div>

        {/* Inverter PWM Switching Mode */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
            <Cpu className="w-4 h-4 text-sky-400" />
            Inverter PWM Frequency Strategy
          </label>
          <select
            value={config.pwmMode}
            onChange={(e) => onChange({ ...config, pwmMode: e.target.value as InverterPwmMode })}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="FIXED_10KHZ">Fixed 10kHz (Legacy High Thermal Loss)</option>
            <option value="ADAPTIVE_CREEP_6KHZ">Adaptive Creep 6kHz (Saves 42% Inverter Heat)</option>
            <option value="PHASE_SHEDDING_4KHZ">Phase Shedding 4kHz (Ultra-Low Crawl Drain)</option>
          </select>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Lowers switching hysteresis when vehicle is crawling under 15 km/h.
          </p>
        </div>

        {/* Micro-Regen Cutoff Threshold */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Low-Speed Regen Cutoff
            </label>
            <span className="text-xs font-mono font-bold text-sky-400">
              {config.lowSpeedRegenCutoffKmh} km/h
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="15.0"
            step="0.5"
            value={config.lowSpeedRegenCutoffKmh}
            onChange={(e) => onChange({ ...config, lowSpeedRegenCutoffKmh: parseFloat(e.target.value) })}
            className="w-full accent-sky-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>1.0 km/h (Micro-Pedal)</span>
            <span>15.0 km/h (Legacy Cutoff)</span>
          </div>
        </div>

        {/* Auxiliary HVAC Variable Compressor Spillover */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-cyan-400" />
              HVAC Micro-Stop Modulator
            </label>
            <span className="text-xs font-mono font-bold text-cyan-400">
              {config.hvacCompressorSpilloverPercent}%
            </span>
          </div>
          <input
            type="range"
            min="20"
            max="100"
            step="5"
            value={config.hvacCompressorSpilloverPercent}
            onChange={(e) => onChange({ ...config, hvacCompressorSpilloverPercent: parseInt(e.target.value) })}
            className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Dampens AC displacement during 10s stop events to protect battery thermal limits.
          </p>
        </div>

        {/* Edge AI Prediction Horizon */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              Swarm Cut-in Horizon
            </label>
            <span className="text-xs font-mono font-bold text-purple-400">
              {config.edgeAiPredictionHorizonMs} ms
            </span>
          </div>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={config.edgeAiPredictionHorizonMs}
            onChange={(e) => onChange({ ...config, edgeAiPredictionHorizonMs: parseInt(e.target.value) })}
            className="w-full accent-purple-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            NPU trajectory lookahead to start regen braking before physical cut-in.
          </p>
        </div>

        {/* Commercial Electricity Rate Parameter */}
        <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800">
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              Electricity Tariff Rate
            </label>
            <span className="text-xs font-mono font-bold text-emerald-400">
              ₹{config.electricityCostPerKwhInr}/kWh
            </span>
          </div>
          <input
            type="range"
            min="4.0"
            max="15.0"
            step="0.5"
            value={config.electricityCostPerKwhInr}
            onChange={(e) => onChange({ ...config, electricityCostPerKwhInr: parseFloat(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            Calculates financial savings for personal cars & fleet operators (BluSmart/Uber).
          </p>
        </div>
      </div>
    </div>
  );
};
