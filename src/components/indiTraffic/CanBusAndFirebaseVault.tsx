import React, { useState, useEffect } from "react";
import { TrafficMetrics, ArchitectureConfig, CanMessagePacket } from "../../types/indiTraffic";
import { db, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, auth, signInAnonymously } from "../../lib/firebase";
import { Radio, Database, CloudUpload, Trash2, ShieldAlert } from "lucide-react";

interface Props {
  metrics: TrafficMetrics;
  config: ArchitectureConfig;
}

export const CanBusAndFirebaseVault: React.FC<Props> = ({ metrics, config }) => {
  const [canMessages, setCanMessages] = useState<CanMessagePacket[]>([]);
  const [savedSnapshots, setSavedSnapshots] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Sign in anonymously on mount if needed
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        console.warn("Anonymous Auth note:", err?.message);
      });
    }
  }, []);

  // Generate live CAN / LIN / SOME-IP messages
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().toLocaleTimeString();
      const packets: CanMessagePacket[] = [
        {
          id: Math.random().toString(),
          canId: "0x180",
          bus: "CAN_HS1_POWERTRAIN",
          topic: "INV_MOTOR_TORQUE_COMMAND",
          signals: {
            regen_nm: Math.round(metrics.regen_torque_nm),
            friction_nm: Math.round(metrics.friction_brake_torque_nm),
            pwm_freq_hz: config.pwmMode === "ADAPTIVE_CREEP_6KHZ" ? 6000 : 10000
          },
          timestamp: now
        },
        {
          id: Math.random().toString(),
          canId: "0x220",
          bus: "CAN_HS1_POWERTRAIN",
          topic: "BATTERY_INVERTER_THERMAL",
          signals: {
            inv_temp_c: metrics.inverter_junction_temp_c.toFixed(1),
            bat_temp_c: metrics.battery_pack_temp_c.toFixed(1),
            stator_loss_w: Math.round(metrics.stator_winding_loss_w)
          },
          timestamp: now
        },
        {
          id: Math.random().toString(),
          canId: "0x310",
          bus: "SOME_IP_SWARM_AI",
          topic: "UNSTRUCTURED_CUT_IN_PREDICTION",
          signals: {
            cut_in_prob: (metrics.cut_in_probability * 100).toFixed(0) + "%",
            horizon_ms: config.edgeAiPredictionHorizonMs,
            npu_latency_ms: metrics.npu_latency_ms.toFixed(1)
          },
          timestamp: now
        },
        {
          id: Math.random().toString(),
          canId: "0x400",
          bus: "LIN_HVAC_AUX",
          topic: "HVAC_COMPRESSOR_MODULATION",
          signals: {
            hvac_power_kw: metrics.hvac_power_kw.toFixed(2),
            spillover_percent: config.hvacCompressorSpilloverPercent + "%"
          },
          timestamp: now
        }
      ];

      setCanMessages((prev) => [...packets, ...prev].slice(0, 8));
    }, 1500);

    return () => clearInterval(interval);
  }, [metrics, config]);

  // Load Firestore Saved Benchmarks
  const loadSnapshots = async () => {
    try {
      const q = query(collection(db, "indiTrafficSnapshots"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setSavedSnapshots(items);
    } catch (err) {
      console.error("Firestore Load Error:", err);
    }
  };

  useEffect(() => {
    loadSnapshots();
  }, []);

  const handleSaveSnapshot = async () => {
    setIsSaving(true);
    setSaveStatus("Saving snapshot to Firestore...");
    try {
      const payload = {
        scenarioName: config.scenario,
        archType: config.archType,
        createdAt: new Date().toISOString(),
        config,
        metricsSummary: {
          inverterTempC: metrics.inverter_junction_temp_c,
          energyWhKm: metrics.energy_consumption_wh_km,
          baselineEnergyWhKm: metrics.baseline_energy_wh_km,
          annualInrSaved: Math.round(((metrics.baseline_energy_wh_km - metrics.energy_consumption_wh_km) / 1000 * config.annualDrivingKm) * config.electricityCostPerKwhInr)
        }
      };

      await addDoc(collection(db, "indiTrafficSnapshots"), payload);
      setSaveStatus("Saved to Cloud Firestore successfully!");
      await loadSnapshots();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setSaveStatus(`Save Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSnapshot = async (id: string) => {
    try {
      await deleteDoc(doc(db, "indiTrafficSnapshots", id));
      await loadSnapshots();
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* CAN / LIN / SOME-IP Packet Stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Live Vehicle Bus Message Stream</h3>
                <p className="text-xs text-slate-400">CAN HS1 / LIN / SOME-IP Packets</p>
              </div>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              500 kbps Active
            </span>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1">
            {canMessages.map((msg) => (
              <div key={msg.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono">
                <div className="flex justify-between text-slate-400 mb-1">
                  <span className="text-sky-400 font-bold">{msg.canId} [{msg.bus}]</span>
                  <span className="text-slate-500 text-[10px]">{msg.timestamp}</span>
                </div>
                <div className="text-slate-200 font-semibold mb-1">{msg.topic}</div>
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                  {Object.entries(msg.signals).map(([k, v]) => (
                    <span key={k} className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {k}: <strong className="text-emerald-400">{String(v)}</strong>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cloud Persistence Vault (Firebase Firestore) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Cloud Firestore Benchmark Vault</h3>
                <p className="text-xs text-slate-400">Save & Share Architecture Configurations</p>
              </div>
            </div>

            <button
              onClick={handleSaveSnapshot}
              disabled={isSaving}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition shadow"
            >
              <CloudUpload className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save Benchmark"}
            </button>
          </div>

          {saveStatus && (
            <div className="p-2 mb-3 bg-purple-950/60 border border-purple-800 text-purple-300 text-xs rounded-lg">
              {saveStatus}
            </div>
          )}

          <div className="space-y-2.5 overflow-y-auto max-h-[300px] pr-1">
            {savedSnapshots.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No saved benchmarks found in Cloud Firestore. Click "Save Benchmark" to store current telemetry run.
              </div>
            ) : (
              savedSnapshots.map((item) => (
                <div key={item.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white">{item.scenarioName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-900/60 text-sky-300 border border-sky-700">
                        {item.archType === "INDITRAFFIC_SDV_EDGE" ? "IndiTraffic SDV" : "Legacy Baseline"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Saved: {new Date(item.createdAt).toLocaleDateString()} | Inverter: {item.metricsSummary?.inverterTempC?.toFixed(1)}°C | Saved: ₹{item.metricsSummary?.annualInrSaved?.toLocaleString("en-IN")}/yr
                    </p>
                  </div>

                  <button
                    onClick={() => handleDeleteSnapshot(item.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                    title="Delete snapshot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
