import React, { useEffect, useState } from "react";
import {
  db,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  auth
} from "../lib/firebase";
import { ForensicSnapshot, TelemetryEvent, SensorMetrics } from "../types";
import {
  ShieldAlert,
  Save,
  Clock,
  Database,
  Search,
  Trash2,
  FileText,
  Activity,
  ChevronRight,
  Download,
  AlertTriangle,
  Radio,
  Sparkles,
  CheckCircle2,
  ListFilter
} from "lucide-react";

interface ForensicAnalysisPanelProps {
  telemetryLogs: TelemetryEvent[];
  metrics: SensorMetrics;
  lastSnapshotInfo?: {
    snapshotId: string;
    timestamp: string;
    count: number;
  } | null;
}

export const ForensicAnalysisPanel: React.FC<ForensicAnalysisPanelProps> = ({
  telemetryLogs,
  metrics,
  lastSnapshotInfo
}) => {
  const [snapshots, setSnapshots] = useState<ForensicSnapshot[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ForensicSnapshot | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [saveStatus, setSaveStatus] = useState<string>("");

  const fetchSnapshots = async () => {
    try {
      setLoading(true);
      const list: ForensicSnapshot[] = [];

      // Try fetching from Firestore
      try {
        const q = query(
          collection(db, "forensicSnapshots")
        );
        const snapshot = await getDocs(q);
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as ForensicSnapshot);
        });
      } catch (firestoreErr) {
        console.warn("Firestore fetch failed, relying on local storage fallback:", firestoreErr);
      }

      // Merge with localStorage snapshots
      try {
        const localList: ForensicSnapshot[] = JSON.parse(localStorage.getItem("sdv_forensic_snapshots") || "[]");
        const existingIds = new Set(list.map(l => l.id));
        for (const ls of localList) {
          if (!existingIds.has(ls.id)) {
            list.push(ls);
          }
        }
      } catch (localErr) {
        console.error("Failed to read local forensic snapshots:", localErr);
      }

      // Sort newest first
      list.sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
      setSnapshots(list);

      if (list.length > 0 && !selectedSnapshot) {
        setSelectedSnapshot(list[0]);
      }
    } catch (err) {
      console.error("Failed to fetch forensic snapshots:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnapshots();
  }, [lastSnapshotInfo]);

  // Manual Trigger to save current 5-minute buffer to Firestore or localStorage
  const handleManualSaveSnapshot = async () => {
    try {
      setSaveStatus("Capturing 5-min telemetry window...");
      const uid = auth.currentUser?.uid || "LOCAL_ENGINEER_USER";

      const now = Date.now();
      const fiveMinsAgoUnix = (now - 5 * 60 * 1000) / 1000;

      // Filter last 5 minutes of telemetry logs
      const windowLogs = telemetryLogs.filter(
        (log) => log.timestamp_unix >= fiveMinsAgoUnix
      );

      const payload: Omit<ForensicSnapshot, "id"> = {
        userId: uid,
        eventId: `EVT-MANUAL-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        triggeredAt: new Date().toISOString(),
        triggerCommand: "MANUAL_FORENSIC_CAPTURE",
        triggerReason: `Manual 5-minute forensic snapshot triggered by ADAS engineer (${windowLogs.length} events)`,
        eventCount: windowLogs.length > 0 ? windowLogs.length : telemetryLogs.length,
        timeRangeMinutes: 5,
        telemetryWindow: windowLogs.length > 0 ? windowLogs : telemetryLogs.slice(0, 50),
        metricsSummary: metrics
      };

      try {
        const docRef = await addDoc(collection(db, "forensicSnapshots"), payload);
        setSaveStatus(`Saved to Firestore! ID: ${docRef.id.substring(0, 8)}`);
      } catch (firestoreErr) {
        console.warn("Firestore manual write failed, saving to localStorage:", firestoreErr);
        const localSnapId = `local_${Date.now()}`;
        const localSnapshot: ForensicSnapshot = { id: localSnapId, ...payload };
        const existingLocal = JSON.parse(localStorage.getItem("sdv_forensic_snapshots") || "[]");
        localStorage.setItem("sdv_forensic_snapshots", JSON.stringify([localSnapshot, ...existingLocal]));
        setSaveStatus(`Saved locally! ID: ${localSnapId.substring(0, 8)}`);
      }

      setTimeout(() => setSaveStatus(""), 4000);
      fetchSnapshots();
    } catch (err) {
      console.error("Manual save snapshot failed:", err);
      setSaveStatus("Save failed. See console.");
    }
  };

  const handleDeleteSnapshot = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (id.startsWith("local_")) {
        const localList: ForensicSnapshot[] = JSON.parse(localStorage.getItem("sdv_forensic_snapshots") || "[]");
        const filtered = localList.filter(s => s.id !== id);
        localStorage.setItem("sdv_forensic_snapshots", JSON.stringify(filtered));
      } else {
        await deleteDoc(doc(db, "forensicSnapshots", id));
      }
      if (selectedSnapshot?.id === id) {
        setSelectedSnapshot(null);
      }
      fetchSnapshots();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleDownloadSnapshotJson = (snap: ForensicSnapshot) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snap, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `forensic_snapshot_${snap.eventId}_${snap.triggeredAt.substring(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredSnapshots = snapshots.filter((s) => {
    const term = searchTerm.toLowerCase();
    return (
      s.eventId.toLowerCase().includes(term) ||
      s.triggerReason.toLowerCase().includes(term) ||
      s.triggeredAt.toLowerCase().includes(term) ||
      s.triggerCommand.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-rose-950 text-rose-400 rounded-xl border border-rose-800/80 shadow-md">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-slate-100">
                  Firestore Telemetry Forensic Flight Recorder
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  5-Min Pre-Accident Buffer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated ISO 26262 post-event audit log capture storing 5-minute pre/post collision telemetry frames to Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={handleManualSaveSnapshot}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-2 rounded-xl transition-all shadow-lg shadow-rose-950/50 flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Snapshot Current 5-Min Telemetry</span>
            </button>
          </div>
        </div>

        {/* Realtime Trigger Toast / Banner */}
        {lastSnapshotInfo && (
          <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-950 border border-rose-700/80 p-3 rounded-xl flex items-center justify-between font-mono text-xs text-rose-200 shadow-lg">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>
                <strong>EMERGENCY BRAKE EVENT CAPTURED:</strong> Automatically saved {lastSnapshotInfo.count} telemetry events to Firestore.
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              Snapshot ID: {lastSnapshotInfo.snapshotId.substring(0, 10)}...
            </span>
          </div>
        )}

        {saveStatus && (
          <div className="bg-emerald-950/80 border border-emerald-700 p-2.5 rounded-xl font-mono text-xs text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* Main Split Interface: Snapshot Browser & Detailed Event Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Forensic Snapshots List */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-cyan-400" />
              <h4 className="font-bold text-xs text-slate-200">
                Firestore Saved Snapshots ({snapshots.length})
              </h4>
            </div>
            <button
              onClick={fetchSnapshots}
              className="text-[11px] text-cyan-400 hover:underline"
            >
              Refresh
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by event ID, reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 pl-8 pr-3 py-1.5 rounded-xl text-xs focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* List Container */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-slate-500 text-xs">Loading forensic records from Firestore...</div>
            ) : filteredSnapshots.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No forensic snapshots saved yet. Trigger an <strong>Emergency Brake</strong> scenario or click <strong>Snapshot Current 5-Min Telemetry</strong> above.
              </div>
            ) : (
              filteredSnapshots.map((snap) => {
                const isSelected = selectedSnapshot?.id === snap.id;

                return (
                  <div
                    key={snap.id}
                    onClick={() => setSelectedSnapshot(snap)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all space-y-2 relative ${
                      isSelected
                        ? "bg-slate-950 border-rose-500 shadow-lg shadow-rose-950/40"
                        : "bg-slate-950/60 border-slate-800 hover:bg-slate-950 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          snap.triggerCommand === "EMERGENCY_BRAKE"
                            ? "bg-rose-950 text-rose-300 border border-rose-800"
                            : "bg-cyan-950 text-cyan-300 border border-cyan-800"
                        }`}
                      >
                        {snap.triggerCommand}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadSnapshotJson(snap);
                          }}
                          className="text-slate-400 hover:text-cyan-400 p-1"
                          title="Export JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => snap.id && handleDeleteSnapshot(snap.id, e)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="font-bold text-xs text-slate-100 truncate">{snap.eventId}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">{snap.triggerReason}</div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-900">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(snap.triggeredAt).toLocaleTimeString()}</span>
                      </span>
                      <span className="text-cyan-400 font-bold">{snap.eventCount} frames (5m window)</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Forensic Frame Viewer */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5 font-mono">
          {selectedSnapshot ? (
            <div className="space-y-5">
              {/* Snapshot Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-rose-400 font-bold uppercase">Incident File:</span>
                    <h3 className="text-sm font-black text-slate-100">{selectedSnapshot.eventId}</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{selectedSnapshot.triggerReason}</p>
                </div>

                <button
                  onClick={() => handleDownloadSnapshotJson(selectedSnapshot)}
                  className="bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center space-x-1.5 self-start sm:self-auto"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Forensic Payload</span>
                </button>
              </div>

              {/* Metrics Summary Grid at Incident Trigger */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="text-xs font-bold text-slate-300 flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>Snapshot Sensor Telemetry at Trigger Instant</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Vehicle Speed</span>
                    <span className="text-sm font-black text-rose-400">
                      {selectedSnapshot.metricsSummary?.vehicle_speed_kmh?.toFixed(1) ?? "N/A"} km/h
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Obstacle Dist</span>
                    <span className="text-sm font-black text-amber-400">
                      {selectedSnapshot.metricsSummary?.obstacle_distance_m?.toFixed(1) ?? "N/A"} m
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Road Friction ($\mu$)</span>
                    <span className="text-sm font-black text-cyan-400">
                      {selectedSnapshot.metricsSummary?.road_friction?.toFixed(2) ?? "0.85"}
                    </span>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">V2X Traffic Signal</span>
                    <span className="text-sm font-black text-emerald-400">
                      {selectedSnapshot.metricsSummary?.traffic_light_state ?? "NONE"}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5-Minute Telemetry Window Frames List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center space-x-2">
                    <ListFilter className="w-4 h-4 text-cyan-400" />
                    <span>Captured Telemetry Stream ({selectedSnapshot.telemetryWindow?.length || 0} frames)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">5-Minute Rolling Buffer</span>
                </div>

                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {selectedSnapshot.telemetryWindow && selectedSnapshot.telemetryWindow.length > 0 ? (
                    selectedSnapshot.telemetryWindow.map((event, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950 border border-slate-800/90 p-3 rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                event.event?.priority === "P0_CRITICAL"
                                  ? "bg-rose-950 text-rose-300 border border-rose-800"
                                  : event.event?.priority === "P1_HIGH"
                                  ? "bg-amber-950 text-amber-300 border border-amber-800"
                                  : "bg-slate-800 text-slate-300"
                              }`}
                            >
                              {event.event?.actuation_command || "TELEMETRY"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{event.trace_id}</span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {new Date(event.timestamp_iso).toLocaleTimeString()}
                          </span>
                        </div>

                        <p className="text-slate-300 text-[11px] font-sans">{event.event?.description}</p>

                        <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1 border-t border-slate-900 font-mono">
                          <span>Speed: {event.sensor_metrics?.vehicle_speed_kmh?.toFixed(1) ?? "-"} km/h</span>
                          <span>Dist: {event.sensor_metrics?.obstacle_distance_m?.toFixed(1) ?? "-"} m</span>
                          <span>Bus Latency: {event.effective_latency_ms} ms</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No frame logs recorded inside this snapshot payload.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <FileText className="w-10 h-10 text-slate-700 mx-auto" />
              <p className="text-xs">
                Select a forensic snapshot from the left list to analyze the 5-minute pre-accident telemetry frames.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
