import React, { useEffect, useState, useRef } from "react";
import { TrafficMetrics, ArchitectureConfig } from "../../types/indiTraffic";
import { Thermometer, BatteryCharging, Zap, Disc, Gauge, Flame, AlertTriangle, Volume2, VolumeX, ShieldAlert, BellRing } from "lucide-react";

interface Props {
  metrics: TrafficMetrics;
  config: ArchitectureConfig;
}

export const ThermalAndEfficiencyGauges: React.FC<Props> = ({ metrics, config }) => {
  const isBaseline = config.archType === "LEGACY_CONVENTIONAL_EV";
  const isCriticalThermal = metrics.battery_pack_temp_c > 55;

  const [isMuted, setIsMuted] = useState(false);
  const [dismissedAlert, setDismissedAlert] = useState(false);
  const lastSpokenTimeRef = useRef<number>(0);

  // Reset dismissal if temperature drops back to safe levels then spikes again
  useEffect(() => {
    if (metrics.battery_pack_temp_c <= 52) {
      setDismissedAlert(false);
    }
  }, [metrics.battery_pack_temp_c]);

  // Voice Alert via Web Speech API
  useEffect(() => {
    if (isCriticalThermal && !isMuted && !dismissedAlert) {
      const now = Date.now();
      // Throttle speech to once every 12 seconds to prevent audio loop overlap
      if (now - lastSpokenTimeRef.current > 12000) {
        lastSpokenTimeRef.current = now;
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel(); // Stop ongoing speech
          const text = `Warning! Critical battery thermal alert. Pack temperature is ${metrics.battery_pack_temp_c.toFixed(1)} degrees Celsius. Risk of thermal run-away in urban traffic.`;
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.rate = 1.05;
          utterance.pitch = 1.1;
          utterance.volume = 1.0;
          window.speechSynthesis.speak(utterance);
        }
      }
    }
  }, [isCriticalThermal, metrics.battery_pack_temp_c, isMuted, dismissedAlert]);

  return (
    <div className="space-y-3">
      {/* Critical Thermal Alert Banner */}
      {isCriticalThermal && !dismissedAlert && (
        <div className="bg-rose-950/90 border-2 border-rose-500 text-white rounded-xl p-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-lg shadow-lg">
              <ShieldAlert className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold tracking-wide uppercase flex items-center gap-2 text-rose-200">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Critical Thermal Management Failure Alert ({metrics.battery_pack_temp_c.toFixed(1)}°C &gt; 55°C)
              </h4>
              <p className="text-xs text-rose-300">
                Battery pack thermal threshold exceeded under severe Indian traffic heat soak! Active cooling required.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (window.speechSynthesis) window.speechSynthesis.cancel();
              }}
              className="px-3 py-1.5 bg-slate-900/80 hover:bg-slate-900 text-rose-200 border border-rose-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              title={isMuted ? "Unmute Voice Alert" : "Mute Voice Alert"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-rose-300 animate-pulse" />}
              {isMuted ? "Voice Muted" : "Mute Voice"}
            </button>

            <button
              onClick={() => {
                setDismissedAlert(true);
                if (window.speechSynthesis) window.speechSynthesis.cancel();
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs transition shadow"
            >
              Acknowledge Alert
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Inverter Junction Temperature */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-300">Inverter Temp</span>
            <Thermometer className={`w-4 h-4 ${metrics.inverter_junction_temp_c > 85 ? "text-rose-400 animate-pulse" : "text-amber-400"}`} />
          </div>
          <div className="my-1">
            <div className="text-xl font-mono font-bold text-white">
              {metrics.inverter_junction_temp_c.toFixed(1)}°C
            </div>
            <p className="text-[10px] text-slate-400">
              {isBaseline ? "10kHz PWM Heat Soak" : "6kHz Adaptive PWM"}
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                metrics.inverter_junction_temp_c > 85 ? "bg-rose-500" : "bg-amber-400"
              }`}
              style={{ width: `${Math.min(100, (metrics.inverter_junction_temp_c / 110) * 100)}%` }}
            />
          </div>
        </div>

        {/* 2. Battery Pack Thermal State */}
        <div className={`bg-slate-900 border rounded-xl p-3.5 shadow-lg flex flex-col justify-between transition-colors ${
          isCriticalThermal ? "border-rose-500 bg-rose-950/20" : "border-slate-800"
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              Battery Temp
              {isCriticalThermal && <BellRing className="w-3 h-3 text-rose-400 animate-bounce" />}
            </span>
            <Flame className={`w-4 h-4 ${isCriticalThermal ? "text-rose-500 animate-bounce" : metrics.battery_pack_temp_c > 42 ? "text-rose-400" : "text-orange-400"}`} />
          </div>
          <div className="my-1">
            <div className={`text-xl font-mono font-bold ${isCriticalThermal ? "text-rose-400 animate-pulse" : "text-white"}`}>
              {metrics.battery_pack_temp_c.toFixed(1)}°C
            </div>
            <p className="text-[10px] text-slate-400">
              Amb: {metrics.ambient_temp_c}°C ({isCriticalThermal ? "CRITICAL FAILURE" : isBaseline ? "High Derate" : "Safe Chill"})
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isCriticalThermal ? "bg-rose-500" : "bg-orange-400"}`}
              style={{ width: `${Math.min(100, (metrics.battery_pack_temp_c / 60) * 100)}%` }}
            />
          </div>
        </div>

        {/* 3. Kinetic Energy Recaptured */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-300">Micro-Regen</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-1">
            <div className="text-xl font-mono font-bold text-emerald-400">
              {metrics.kinetic_energy_recovered_percent.toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-400">
              {isBaseline ? "Friction wasted <12km/h" : "Recaptured down to 1.5km/h"}
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, metrics.kinetic_energy_recovered_percent)}%` }}
            />
          </div>
        </div>

        {/* 4. Inverter Switching Loss */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-300">Switching Loss</span>
            <Zap className="w-4 h-4 text-sky-400" />
          </div>
          <div className="my-1">
            <div className="text-xl font-mono font-bold text-sky-400">
              {metrics.inverter_switching_loss_w.toFixed(0)} W
            </div>
            <p className="text-[10px] text-slate-400">
              {isBaseline ? "High Gate Friction" : "-42% Heat Reduction"}
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (metrics.inverter_switching_loss_w / 450) * 100)}%` }}
            />
          </div>
        </div>

        {/* 5. Auxiliary HVAC Power */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-300">HVAC Aux</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-1">
            <div className="text-xl font-mono font-bold text-cyan-400">
              {metrics.hvac_power_kw.toFixed(2)} kW
            </div>
            <p className="text-[10px] text-slate-400">
              {isBaseline ? "Full Drain @ Stop" : "Modulated Spillover"}
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-300"
              style={{ width: `${Math.min(100, (metrics.hvac_power_kw / 3.5) * 100)}%` }}
            />
          </div>
        </div>

        {/* 6. Brake Pad Wear Index */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold text-slate-300">Brake Wear</span>
            <Disc className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-1">
            <div className="text-xl font-mono font-bold text-slate-200">
              {metrics.brake_pad_wear_index.toFixed(1)} <span className="text-xs text-slate-500">x</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {isBaseline ? "Heavy Disc Dust" : "-64% Pad Friction"}
            </p>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${isBaseline ? "bg-rose-500" : "bg-emerald-400"}`}
              style={{ width: `${Math.min(100, metrics.brake_pad_wear_index * 25)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

