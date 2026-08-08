import React, { useState } from "react";
import { TrafficMetrics, ArchitectureConfig } from "../../types/indiTraffic";
import { CostSavingsBreakdownModal } from "./CostSavingsBreakdownModal";
import { RegenerativeBrakeSweepAnalysis } from "./RegenerativeBrakeSweepAnalysis";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from "recharts";
import { IndianRupee, TrendingUp, Battery, ShieldCheck, Calculator, Flame, Zap, Sparkles, Scale } from "lucide-react";

interface Props {
  metrics: TrafficMetrics;
  config: ArchitectureConfig;
  onConfigChange?: (updated: Partial<ArchitectureConfig>) => void;
}

export const EconomicCostRoiAnalytics: React.FC<Props> = ({ metrics, config, onConfigChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showIceBaseline, setShowIceBaseline] = useState<boolean>(true);

  const electricityRate = config.electricityCostPerKwhInr;
  const annualKm = config.annualDrivingKm || 18000; // e.g. 18,000 km/yr

  // Calculate annual kWh & INR savings
  const baselineKwhPer100km = metrics.baseline_energy_wh_km / 10; // e.g., 185 Wh/km -> 18.5 kWh/100km
  const optimizedKwhPer100km = metrics.energy_consumption_wh_km / 10; // e.g., 142 Wh/km -> 14.2 kWh/100km
  const kwhSavedPer100km = Math.max(0, baselineKwhPer100km - optimizedKwhPer100km);

  const annualKwhSaved = (kwhSavedPer100km * annualKm) / 100;
  const annualInrSavedPersonal = annualKwhSaved * electricityRate;
  const annualInrSavedFleet = (annualKwhSaved * 2.5) * electricityRate; // Fleet drives 45,000 km/yr

  // Conventional 1.5L Petrol ICE baseline metrics in heavy Indian stop-and-go (8.5 km/L @ ₹102/L)
  const iceCostPerKm = 102 / 8.5; // ~₹12.00 / km
  const iceAnnualPersonalCost = Math.round(annualKm * iceCostPerKm); // ₹2,16,000 / yr
  const iceAnnualFleetCost = Math.round(45000 * iceCostPerKm); // ₹5,40,000 / yr

  const sdvCostPerKm = Number(((metrics.energy_consumption_wh_km / 1000) * electricityRate).toFixed(2));
  const perKmSavingsVsIce = Number((iceCostPerKm - sdvCostPerKm).toFixed(2));
  const annualSavingsVsIce = Math.round(annualKm * perKmSavingsVsIce);

  // Fleet & Personal Comparison Chart Data
  const costComparisonData = [
    {
      category: "Personal (18k km/yr)",
      ...(showIceBaseline ? { "Conventional ICE (Petrol)": iceAnnualPersonalCost } : {}),
      "Legacy EV Baseline": Math.round(((baselineKwhPer100km * annualKm) / 100) * electricityRate),
      "IndiTraffic SDV": Math.round(((optimizedKwhPer100km * annualKm) / 100) * electricityRate)
    },
    {
      category: "Taxi Fleet (45k km/yr)",
      ...(showIceBaseline ? { "Conventional ICE (Petrol)": iceAnnualFleetCost } : {}),
      "Legacy EV Baseline": Math.round(((baselineKwhPer100km * 45000) / 100) * electricityRate),
      "IndiTraffic SDV": Math.round(((optimizedKwhPer100km * 45000) / 100) * electricityRate)
    }
  ];

  // Powertrain & Battery Health SOH Degradation Year-over-Year Data
  const powertrainHealthData = [
    { year: "Year 0", ConventionalICE: 100, LegacyEV: 100, IndiTrafficSDV: 100 },
    { year: "Year 1", ConventionalICE: 82, LegacyEV: 92, IndiTrafficSDV: 97 },
    { year: "Year 2", ConventionalICE: 68, LegacyEV: 84, IndiTrafficSDV: 94 },
    { year: "Year 3", ConventionalICE: 56, LegacyEV: 76, IndiTrafficSDV: 91 },
    { year: "Year 4", ConventionalICE: 45, LegacyEV: 68, IndiTrafficSDV: 88 },
    { year: "Year 5", ConventionalICE: 36, LegacyEV: 61, IndiTrafficSDV: 85 }
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              Indian Market ROI & Baseline Comparison Engine
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                {showIceBaseline ? "ICE + EV Dual Baseline Mode" : "EV vs EV Mode"}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Financial & Thermal Life Savings based on @ ₹{electricityRate}/kWh & {annualKm.toLocaleString()} km/yr
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Baseline Comparison Toggle */}
          <button
            onClick={() => setShowIceBaseline(!showIceBaseline)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border ${
              showIceBaseline
                ? "bg-rose-950/80 text-rose-300 border-rose-700 shadow-sm"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${showIceBaseline ? "text-rose-400 animate-pulse" : "text-slate-500"}`} />
            <span>{showIceBaseline ? "Conventional ICE Baseline ON" : "Overlay ICE Baseline"}</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow"
          >
            <Calculator className="w-4 h-4" />
            Cost Savings Breakdown
          </button>

          <div className="text-right pl-2 border-l border-slate-800">
            <span className="text-xs font-medium text-slate-400 block">Personal Annual Savings</span>
            <span className="text-lg font-mono font-bold text-emerald-400">
              ₹{Math.round(showIceBaseline ? annualSavingsVsIce : annualInrSavedPersonal).toLocaleString("en-IN")} / yr
            </span>
          </div>
        </div>
      </div>

      {/* Real-time Performance Delta Overlay Banner */}
      {showIceBaseline && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-950 to-emerald-950/40 border border-rose-900/40 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                Real-time Performance Delta vs 1.5L Petrol ICE (Urban Crawl 8.5 km/L @ ₹102/L)
              </h4>
              <p className="text-[11px] text-slate-400">
                Running Cost: <strong className="text-rose-400 font-mono">₹{iceCostPerKm.toFixed(2)}/km (ICE)</strong> vs{" "}
                <strong className="text-emerald-400 font-mono">₹{sdvCostPerKm.toFixed(2)}/km (IndiTraffic SDV)</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 block">Per KM Net Delta</span>
              <span className="text-base font-bold text-emerald-400">
                -₹{perKmSavingsVsIce.toFixed(2)} / km
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">Annual Fuel Saved</span>
              <span className="text-base font-bold text-amber-400">
                ₹{annualSavingsVsIce.toLocaleString("en-IN")} / yr
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block">CO2 Avoided</span>
              <span className="text-base font-bold text-sky-400">
                ~3.8 Tons / yr
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs text-slate-400">Energy Consumption</span>
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-white">
            {optimizedKwhPer100km.toFixed(1)} <span className="text-xs text-slate-400">kWh/100km</span>
          </div>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-semibold">
            ↓ {((kwhSavedPer100km / baselineKwhPer100km) * 100).toFixed(1)}% vs Legacy EV
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs text-slate-400">Range Gain Per Charge</span>
            <Battery className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-emerald-400">
            +{(kwhSavedPer100km * 2.8).toFixed(0)} km
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Extra distance recovered in traffic
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs text-slate-400">Fleet Cab Annual Savings</span>
            <IndianRupee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-amber-400">
            ₹{Math.round(showIceBaseline ? 45000 * perKmSavingsVsIce : annualInrSavedFleet).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            BluSmart/Uber Fleet @ 45k km/yr
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs text-slate-400">Battery SOH Extension</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-mono font-bold text-indigo-400">
            +2.4 Years
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deferred thermal degradation
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Comparison Bar Chart */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold">
              Annual Operating Energy/Fuel Cost Comparison (₹ INR)
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {showIceBaseline ? "Overlaying 1.5L Petrol ICE" : "EV Baseline"}
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, "Annual Expense"]}
                />
                <Legend />
                {showIceBaseline && (
                  <Bar dataKey="Conventional ICE (Petrol)" name="Conventional ICE Petrol (₹)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                )}
                <Bar dataKey="Legacy EV Baseline" name="Legacy EV Baseline (₹)" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="IndiTraffic SDV" name="IndiTraffic SDV (₹)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Battery / Powertrain Health SOH Line Chart */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold">
              Hardware Maintenance & Health Index (%) in 42°C Indian Heat
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Year 0 → Year 5
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={powertrainHealthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="year" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[20, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "8px" }}
                  formatter={(val: number) => [`${val}%`, "Health Index"]}
                />
                <Legend />
                {showIceBaseline && (
                  <Line type="monotone" dataKey="ConventionalICE" name="ICE Clutch/Engine Health (%)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="4 4" />
                )}
                <Line type="monotone" dataKey="LegacyEV" name="Legacy EV SOH (%)" stroke="#f59e0b" strokeWidth={2} />
                <Line type="monotone" dataKey="IndiTrafficSDV" name="IndiTraffic SDV SOH (%)" stroke="#38bdf8" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Regenerative Brake Sweep Analysis View */}
      <RegenerativeBrakeSweepAnalysis
        metrics={metrics}
        config={config}
        onConfigChange={onConfigChange}
      />

      <CostSavingsBreakdownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        config={config}
        metrics={metrics}
        onConfigChange={onConfigChange}
      />
    </div>
  );
};

