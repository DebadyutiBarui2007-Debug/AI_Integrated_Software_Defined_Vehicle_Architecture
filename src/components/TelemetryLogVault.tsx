import React, { useState } from "react";
import { Database, Search, Download, Copy, Check, Filter, Trash2, ArrowUpRight, Lock, ShieldCheck, LogIn, UserCheck, AlertTriangle } from "lucide-react";
import { TelemetryEvent } from "../types";
import { User, signInWithPopup, googleProvider, signInAnonymously, auth } from "../lib/firebase";

interface TelemetryLogVaultProps {
  logs: TelemetryEvent[];
  onClearLogs: () => void;
  onSelectLogForCopilot?: (log: TelemetryEvent) => void;
  user?: User | null;
}

export const TelemetryLogVault: React.FC<TelemetryLogVaultProps> = ({
  logs,
  onClearLogs,
  onSelectLogForCopilot,
  user
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const isAuthenticated = Boolean(user);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate with Google.");
    }
  };

  const handleAnonLogin = async () => {
    try {
      setAuthError(null);
      await signInAnonymously(auth);
    } catch (err: any) {
      setAuthError(err.message || "Failed to start anonymous session.");
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.trace_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event.actuation_command.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.event.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = priorityFilter === "ALL" || log.event.priority === priorityFilter;

    return matchesSearch && matchesPriority;
  });

  const handleCopyJson = (log: TelemetryEvent) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedId(log.trace_id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sdv_telemetry_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    const headers = [
      "Trace ID",
      "Timestamp (ISO)",
      "Priority",
      "Actuation Command",
      "Event Type",
      "Description",
      "Vehicle Speed (km/h)",
      "Obstacle Distance (m)",
      "Time to Collision (s)",
      "Camera Confidence (%)",
      "Detected Object",
      "Effective Latency (ms)",
      "VIN",
      "ECU Status",
      "Bus Protocol"
    ];

    const escapeCsvCell = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = logs.map((log) => [
      escapeCsvCell(log.trace_id),
      escapeCsvCell(log.timestamp_iso),
      escapeCsvCell(log.event.priority),
      escapeCsvCell(log.event.actuation_command),
      escapeCsvCell(log.event.type),
      escapeCsvCell(log.event.description),
      escapeCsvCell(log.sensor_metrics.vehicle_speed_kmh),
      escapeCsvCell(log.sensor_metrics.obstacle_distance_m),
      escapeCsvCell(log.sensor_metrics.time_to_collision_s),
      escapeCsvCell(log.sensor_metrics.camera_confidence),
      escapeCsvCell(log.sensor_metrics.detected_object_type ?? ""),
      escapeCsvCell(log.effective_latency_ms ?? log.system_state.effective_latency_ms ?? ""),
      escapeCsvCell(log.vin),
      escapeCsvCell(log.system_state.ecu_status),
      escapeCsvCell(log.system_state.bus_protocol)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sdv_telemetry_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl max-w-2xl mx-auto my-8 space-y-6 text-center font-sans">
        <div className="mx-auto w-16 h-16 bg-rose-950/80 border border-rose-600/60 text-rose-400 rounded-2xl flex items-center justify-center shadow-lg shadow-rose-950/50">
          <Lock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-slate-100 flex items-center justify-center space-x-2">
            <span>🔒 Telemetry Dashboard Access Restricted</span>
          </h2>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Vehicle telemetry data contains sensitive ISO 26262 ASIL-D safety audit records, NPU power metrics, and VIN specifications. Firebase Authentication is required to access the telemetry vault and export vehicle data as CSV.
          </p>
        </div>

        {authError && (
          <div className="p-3 bg-rose-950 border border-rose-800 text-rose-300 rounded-xl text-xs font-mono flex items-center justify-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{authError}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleGoogleLogin}
            className="w-full sm:w-auto px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold rounded-xl text-xs transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-600/20"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In with Google</span>
          </button>

          <button
            onClick={handleAnonLogin}
            className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center space-x-2"
          >
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Start Anonymous Session</span>
          </button>
        </div>

        <div className="pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 flex items-center justify-between">
          <span>Security Layer: Firebase Auth (Identity Platform)</span>
          <span>Access Level: ASIL-D Certified Engineer</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-cyan-950 text-cyan-400 rounded-xl border border-cyan-800/60">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base text-white">Structured JSON Telemetry Log Vault</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center space-x-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Auth Verified ({user?.displayName || user?.email || `User ${user?.uid.substring(0, 5)}`})</span>
              </span>
            </div>
            <p className="text-xs text-slate-400">OpenTelemetry ISO 26262 compliant safety audit log store</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            className="px-3.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Export sensitive vehicle telemetry logs to a structured CSV spreadsheet"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            disabled={logs.length === 0}
            className="px-3.5 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search trace ID, command, or log description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-slate-200 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="sm:col-span-4 flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="P0_CRITICAL">P0_CRITICAL</option>
            <option value="P1_HIGH">P1_HIGH</option>
            <option value="P3_NORMAL">P3_NORMAL</option>
          </select>
        </div>
      </div>

      {/* Log Entries Table / List */}
      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 font-mono text-xs border border-dashed border-slate-800 rounded-xl">
            No telemetry records found. Start live simulation or inject scenarios to generate logs.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isCritical = log.event.priority === "P0_CRITICAL";
            const isWarning = log.event.priority === "P1_HIGH";

            return (
              <div
                key={log.trace_id + log.timestamp_unix}
                className={`p-4 rounded-xl border transition-all font-mono text-xs ${
                  isCritical
                    ? "bg-rose-950/20 border-rose-800/80 hover:border-rose-600"
                    : isWarning
                    ? "bg-amber-950/20 border-amber-800/80 hover:border-amber-600"
                    : "bg-slate-950 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isCritical
                          ? "bg-rose-900 text-rose-200 border border-rose-700"
                          : isWarning
                          ? "bg-amber-900 text-amber-200 border border-amber-700"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      {log.event.priority}
                    </span>
                    <span className="font-bold text-slate-200">{log.trace_id}</span>
                    <span className="text-slate-500 text-[10px]">{log.timestamp_iso}</span>
                    {log.effective_latency_ms !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 text-[10px] font-mono">
                        ⚡ {log.effective_latency_ms} ms latency
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {onSelectLogForCopilot && (
                      <button
                        onClick={() => onSelectLogForCopilot(log)}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] flex items-center space-x-1"
                      >
                        <span>Analyze in Copilot</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleCopyJson(log)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center space-x-1"
                    >
                      {copiedId === log.trace_id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedId === log.trace_id ? "Copied" : "JSON"}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300 my-2">
                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Actuation Command</div>
                    <div
                      className={`font-bold text-sm ${
                        isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {log.event.actuation_command}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Sensor Metrics Summary</div>
                    <div className="text-slate-300 text-[11px]">
                      Speed: {log.sensor_metrics.vehicle_speed_kmh} km/h &bull; Distance: {log.sensor_metrics.obstacle_distance_m} m &bull; TTC: {log.sensor_metrics.time_to_collision_s}s
                    </div>
                  </div>
                </div>

                <div className="text-slate-400 text-[11px] bg-slate-900/80 p-2 rounded border border-slate-800/60 mt-2">
                  {log.event.description}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
