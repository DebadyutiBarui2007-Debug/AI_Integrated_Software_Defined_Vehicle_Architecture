/**
 * Software-Defined Vehicle (SDV) Edge AI ADAS Controller Simulation
 * Entry Point: App.tsx
 */

import React, { useState, useEffect, useRef } from "react";
import { Navbar } from "./components/Navbar";
import { CockpitHud } from "./components/CockpitHud";
import { MessageBusInspector } from "./components/MessageBusInspector";
import { EdgeAiAnalytics } from "./components/EdgeAiAnalytics";
import { PythonCodeConsole } from "./components/PythonCodeConsole";
import { TelemetryLogVault } from "./components/TelemetryLogVault";
import { GeminiSafetyCopilot } from "./components/GeminiSafetyCopilot";
import { ForensicAnalysisPanel } from "./components/ForensicAnalysisPanel";
import { SensorMetrics, TelemetryEvent, ScenarioType, ForensicSnapshot } from "./types";
import { auth, onAuthStateChanged, User, db, collection, addDoc } from "./lib/firebase";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("hud");
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [activeScenario, setActiveScenario] = useState<ScenarioType>("CRITICAL");
  const [user, setUser] = useState<User | null>(null);

  // Subscribe to Firebase Authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Live Sensor Metrics State
  const [metrics, setMetrics] = useState<SensorMetrics>({
    vehicle_speed_kmh: 45.0,
    obstacle_distance_m: 11.2,
    camera_confidence: 0.92,
    time_to_collision_s: 0.9,
    detected_object_type: "PEDESTRIAN",
    relative_velocity_ms: -12.5,
    power_mode: "BALANCED",
    npu_power_watts: 14.5,
    inference_latency_ms: 16.5,
    power_efficiency_percent: 91.2,
    target_power_efficiency_percent: 90.0,
    v2x_enabled: true,
    road_friction: 0.85,
    traffic_light_state: "GREEN",
    v2x_latency_ms: 4.2,
    v2x_intersection_id: "RSU-802-SEATTLE-MAIN"
  });

  // Telemetry Event Log Store
  const [telemetryLogs, setTelemetryLogs] = useState<TelemetryEvent[]>([]);
  const [selectedCopilotLog, setSelectedCopilotLog] = useState<TelemetryEvent | null>(null);

  // Forensic Snapshot auto-save state & ref
  const lastEmergencySaveTimestampRef = useRef<number>(0);
  const [lastSnapshotInfo, setLastSnapshotInfo] = useState<{
    snapshotId: string;
    timestamp: string;
    count: number;
  } | null>(null);

  // Helper to save 5-minute forensic telemetry buffer to Firestore or localStorage during Emergency Brake
  const saveForensicSnapshotToFirestore = async (
    currentMetrics: SensorMetrics,
    newLogRecord: TelemetryEvent
  ) => {
    const now = Date.now();
    // 15-second debounce window to prevent continuous write spam during sustained braking
    if (now - lastEmergencySaveTimestampRef.current < 15000) return;
    lastEmergencySaveTimestampRef.current = now;

    const fiveMinsAgoUnix = (now - 5 * 60 * 1000) / 1000;
    const windowLogs = [newLogRecord, ...telemetryLogs].filter(
      (log) => log.timestamp_unix >= fiveMinsAgoUnix
    );

    const uid = auth.currentUser?.uid || "LOCAL_ENGINEER_USER";
    const payload: Omit<ForensicSnapshot, "id"> = {
      userId: uid,
      eventId: `EVT-AEB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      triggeredAt: new Date().toISOString(),
      triggerCommand: "EMERGENCY_BRAKE",
      triggerReason: `AUTOMATIC AEB TRIGGER: Obstacle at ${currentMetrics.obstacle_distance_m.toFixed(1)}m, Speed ${currentMetrics.vehicle_speed_kmh.toFixed(1)}km/h, TTC ${currentMetrics.time_to_collision_s.toFixed(2)}s, Surface Friction ${currentMetrics.road_friction ?? 0.85}`,
      eventCount: windowLogs.length,
      timeRangeMinutes: 5,
      telemetryWindow: windowLogs,
      metricsSummary: currentMetrics
    };

    try {
      const docRef = await addDoc(collection(db, "forensicSnapshots"), payload);
      setLastSnapshotInfo({
        snapshotId: docRef.id,
        timestamp: payload.triggeredAt,
        count: windowLogs.length
      });
    } catch (err) {
      console.warn("Firestore write failed, falling back to localStorage for forensic snapshot:", err);
      // Fallback to localStorage
      const localSnapId = `local_${Date.now()}`;
      const localSnapshot: ForensicSnapshot = { id: localSnapId, ...payload };
      try {
        const existingLocal = JSON.parse(localStorage.getItem("sdv_forensic_snapshots") || "[]");
        localStorage.setItem("sdv_forensic_snapshots", JSON.stringify([localSnapshot, ...existingLocal]));
        setLastSnapshotInfo({
          snapshotId: localSnapId,
          timestamp: payload.triggeredAt,
          count: windowLogs.length
        });
      } catch (localErr) {
        console.error("LocalStorage fallback failed:", localErr);
      }
    }
  };

  // Compute Actuation Command based on ISO 26262 ADAS Rules & 5G V2X Infrastructure Signals
  const getActuationCommand = (m: SensorMetrics): "EMERGENCY_BRAKE" | "WARNING" | "MAINTAIN" | "FAILSAFE" => {
    if (m.sensor_fault || m.sensor_status === "INVALID_DATA" || m.camera_confidence === 0) {
      return "FAILSAFE";
    }

    const isV2xActive = m.v2x_enabled ?? true;
    const friction = isV2xActive ? (m.road_friction ?? 0.85) : 0.85;
    const lightState = isV2xActive ? (m.traffic_light_state ?? "GREEN") : "NONE";

    // Dynamic braking distance threshold based on surface friction (e.g. 0.2 mu black ice requires ~3x-4x earlier braking)
    const frictionBrakingThreshold = friction < 0.6 ? 15.0 * (0.85 / Math.max(0.18, friction)) : 15.0;

    // Trigger Emergency Brake for close obstacles under current friction or Red Light violation
    if (
      (m.obstacle_distance_m < Math.min(45.0, frictionBrakingThreshold) && m.vehicle_speed_kmh > 20.0) ||
      (m.obstacle_distance_m < 15.0 && m.vehicle_speed_kmh > 30.0) ||
      (lightState === "RED" && m.obstacle_distance_m < 35.0 && m.vehicle_speed_kmh > 15.0)
    ) {
      return "EMERGENCY_BRAKE";
    }

    if (
      m.obstacle_distance_m < (friction < 0.6 ? 35.0 : 25.0) ||
      m.time_to_collision_s < (friction < 0.6 ? 3.8 : 2.5) ||
      (lightState === "YELLOW" && m.obstacle_distance_m < 40.0)
    ) {
      return "WARNING";
    }

    return "MAINTAIN";
  };

  const currentCommand = getActuationCommand(metrics);

  // Helper to append a structured telemetry record
  const emitTelemetryRecord = (m: SensorMetrics, customLatencyMs?: number) => {
    const cmd = getActuationCommand(m);
    const traceId = `TRC-${Math.random().toString(36).substring(2, 9)}`;
    const isFailsafe = cmd === "FAILSAFE";
    const isCritical = cmd === "EMERGENCY_BRAKE";
    const isWarning = cmd === "WARNING";

    const currentMode = m.power_mode || "BALANCED";

    // Power, Latency, and Efficiency parameters depending on power mode
    let basePower = 14.5;
    let baseInferenceLatency = 16.5;
    let baseEfficiency = 91.2;
    let targetEfficiency = 90.0;

    if (currentMode === "PERFORMANCE") {
      basePower = 30.5;
      baseInferenceLatency = 5.8;
      baseEfficiency = 78.4;
      targetEfficiency = 85.0;
    } else if (currentMode === "ENERGY_SAVING") {
      basePower = 8.8;
      baseInferenceLatency = 32.4;
      baseEfficiency = 97.6;
      targetEfficiency = 95.0;
    }

    if (isFailsafe) {
      basePower += 5.5;
    } else if (isCritical) {
      basePower += 7.2;
    } else if (isWarning) {
      basePower += 3.0;
    }

    const calculatedPowerWatts = parseFloat(Math.max(5.0, basePower + (Math.random() - 0.5) * 1.2).toFixed(1));
    const calculatedInferenceLatency = parseFloat(Math.max(2.0, baseInferenceLatency + (Math.random() - 0.5) * 1.5).toFixed(1));
    const calculatedEfficiency = parseFloat((baseEfficiency + (Math.random() - 0.5) * 1.0).toFixed(1));

    // Simulate variable bus propagation jitter: base latency + network jitter
    const effectiveLatencyMs = customLatencyMs ?? Math.floor(calculatedInferenceLatency + Math.random() * 20);

    const updatedSensorMetrics: SensorMetrics = {
      ...m,
      power_mode: currentMode,
      npu_power_watts: calculatedPowerWatts,
      inference_latency_ms: calculatedInferenceLatency,
      power_efficiency_percent: calculatedEfficiency,
      target_power_efficiency_percent: targetEfficiency
    };

    const newLog: TelemetryEvent = {
      telemetry_spec_version: "1.0.0",
      trace_id: traceId,
      vin: "SDV-PROTOTYPE-VIN-2026",
      timestamp_iso: new Date().toISOString(),
      timestamp_unix: Date.now() / 1000,
      effective_latency_ms: effectiveLatencyMs,
      event: {
        type: isFailsafe ? "SENSOR_FAULT_DEGRADATION" : "SAFETY_EVALUATION",
        priority: isFailsafe ? "P0_CRITICAL" : isCritical ? "P0_CRITICAL" : isWarning ? "P1_HIGH" : "P3_NORMAL",
        actuation_command: cmd,
        description: isFailsafe
          ? `FAILSAFE: Injected INVALID_DATA signal into metrics stream (Camera Confidence: ${(m.camera_confidence * 100).toFixed(0)}%, Status: ${m.sensor_status || "INVALID_DATA"}). Controller forced into ISO 26262 ASIL-D FAILSAFE fallback.`
          : isCritical
          ? `CRITICAL: Obstacle at ${m.obstacle_distance_m.toFixed(1)}m (<15m) with speed ${m.vehicle_speed_kmh.toFixed(1)}km/h (>30km/h). Triggering Maximum AEB Deceleration!`
          : isWarning
          ? `WARNING: Proximity risk at ${m.obstacle_distance_m.toFixed(1)}m, TTC ${m.time_to_collision_s.toFixed(2)}s. Issuing FCW Audio/Visual Alert.`
          : `Nominal trajectory maintained under ${currentMode} NPU power mode (${calculatedPowerWatts}W, ${calculatedInferenceLatency}ms inference).`
      },
      sensor_metrics: updatedSensorMetrics,
      system_state: {
        ecu_status: isFailsafe ? "DEGRADED_FAILSAFE" : "ONLINE",
        bus_protocol: "SOME/IP over Automotive Ethernet (1000BASE-T1)",
        edge_ai_power_watts: calculatedPowerWatts,
        effective_latency_ms: effectiveLatencyMs,
        power_mode: currentMode,
        power_efficiency_percent: calculatedEfficiency,
        target_power_efficiency_percent: targetEfficiency,
        inference_latency_ms: calculatedInferenceLatency
      }
    };

    setTelemetryLogs((prev) => [newLog, ...prev.slice(0, 100)]);

    // Trigger automatic save of last 5 minutes telemetry to Firestore if Emergency Brake activated
    if (isCritical) {
      saveForensicSnapshotToFirestore(updatedSensorMetrics, newLog);
    }
  };

  // Initial Telemetry Seed
  useEffect(() => {
    emitTelemetryRecord(metrics, 12);
  }, []);

  // Global Keyboard Shortcuts Listener ('s' to toggle simulation, '1'-'6' for tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not trigger if modifier keys are pressed (e.g., Ctrl+S, Cmd+1)
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Ignore when user is typing inside input, textarea, select, or editable elements
      const target = e.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        if (
          tagName === "input" ||
          tagName === "textarea" ||
          tagName === "select" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      const key = e.key.toLowerCase();

      // Toggle Simulation ('s' or 'S')
      if (key === "s") {
        e.preventDefault();
        setIsSimulating((prev) => !prev);
        return;
      }

      // Switch Tabs ('1' - '7')
      const tabMap: Record<string, string> = {
        "1": "hud",
        "2": "bus",
        "3": "edge",
        "4": "python",
        "5": "telemetry",
        "6": "forensic",
        "7": "copilot",
      };

      if (tabMap[key]) {
        e.preventDefault();
        setActiveTab(tabMap[key]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Sensor Bus Simulation Loop with Simulated Network Jitter & Variable Transmission Latency
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setMetrics((prev) => {
        let updated = { ...prev };

        if (activeScenario === "SENSOR_FAULT" || prev.sensor_fault) {
          // Continuously inject corrupted INVALID_DATA signals into metrics stream
          updated = {
            ...prev,
            sensor_fault: true,
            sensor_status: "INVALID_DATA",
            camera_confidence: 0.0,
            detected_object_type: "INVALID_DATA",
            obstacle_distance_m: -1.0,
            time_to_collision_s: 0.0
          };
        } else if (activeScenario === "SIMULATED") {
          // Stochastic movement simulation
          const deltaDist = (Math.random() - 0.5) * 2.0;
          const newDist = Math.min(50, Math.max(5, prev.obstacle_distance_m + deltaDist));
          const newSpeed = Math.min(90, Math.max(10, prev.vehicle_speed_kmh + (Math.random() - 0.5) * 3));
          const ttc = newSpeed > 0 ? newDist / (newSpeed / 3.6) : 99;

          updated = {
            ...prev,
            obstacle_distance_m: parseFloat(newDist.toFixed(1)),
            vehicle_speed_kmh: parseFloat(newSpeed.toFixed(1)),
            time_to_collision_s: parseFloat(ttc.toFixed(2))
          };
        } else {
          // Micro variations around fixed scenario
          const newDist = Math.max(4, prev.obstacle_distance_m + (Math.random() - 0.5) * 0.4);
          const ttc = prev.vehicle_speed_kmh > 0 ? newDist / (prev.vehicle_speed_kmh / 3.6) : 99;
          updated = {
            ...prev,
            obstacle_distance_m: parseFloat(newDist.toFixed(1)),
            time_to_collision_s: parseFloat(ttc.toFixed(2))
          };
        }

        // Simulate variable transmission latency (network jitter on SOME/IP vehicle bus: 8ms to 58ms)
        const busJitterLatencyMs = Math.floor(8 + Math.random() * 50);
        
        // Dispatch telemetry record asynchronously after the simulated bus transport delay
        setTimeout(() => {
          emitTelemetryRecord(updated, busJitterLatencyMs);
        }, busJitterLatencyMs);

        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, activeScenario]);

  // Handler to toggle sensor fault state / inject INVALID_DATA signals
  const handleToggleSensorFault = () => {
    setMetrics((prev) => {
      const isCurrentlyFaulty = prev.sensor_fault || prev.sensor_status === "INVALID_DATA";
      if (isCurrentlyFaulty) {
        // Clear Sensor Fault -> Restore Nominal State
        setActiveScenario("SAFE");
        const restored: SensorMetrics = {
          ...prev,
          sensor_fault: false,
          sensor_status: "NORMAL",
          camera_confidence: 0.92,
          detected_object_type: "PEDESTRIAN",
          obstacle_distance_m: 28.5,
          vehicle_speed_kmh: 40.0,
          time_to_collision_s: 2.56
        };
        emitTelemetryRecord(restored, 10);
        return restored;
      } else {
        // Inject Sensor Fault -> Force FAILSAFE Mode
        setActiveScenario("SENSOR_FAULT");
        const faulty: SensorMetrics = {
          ...prev,
          sensor_fault: true,
          sensor_status: "INVALID_DATA",
          camera_confidence: 0.0,
          detected_object_type: "INVALID_DATA",
          obstacle_distance_m: -1.0,
          time_to_collision_s: 0.0
        };
        emitTelemetryRecord(faulty, 8);
        return faulty;
      }
    });
  };

  // Scenario Switcher Handler
  const handleApplyScenario = (scenario: ScenarioType) => {
    if (scenario === "SENSOR_FAULT") {
      handleToggleSensorFault();
      return;
    }

    setActiveScenario(scenario);
    let updated: Partial<SensorMetrics> = {
      sensor_fault: false,
      sensor_status: "NORMAL"
    };

    if (scenario === "CRITICAL") {
      updated = {
        ...updated,
        vehicle_speed_kmh: 45.0,
        obstacle_distance_m: 11.2,
        camera_confidence: 0.92,
        time_to_collision_s: 0.9,
        detected_object_type: "PEDESTRIAN"
      };
    } else if (scenario === "WARNING") {
      updated = {
        ...updated,
        vehicle_speed_kmh: 50.0,
        obstacle_distance_m: 21.0,
        camera_confidence: 0.88,
        time_to_collision_s: 1.5,
        detected_object_type: "VEHICLE"
      };
    } else if (scenario === "SAFE") {
      updated = {
        ...updated,
        vehicle_speed_kmh: 60.0,
        obstacle_distance_m: 42.0,
        camera_confidence: 0.98,
        time_to_collision_s: 2.52,
        detected_object_type: "ROAD_CLEAR"
      };
    }

    setMetrics((prev) => {
      const merged = { ...prev, ...updated };
      const latencyMs = Math.floor(6 + Math.random() * 24);
      emitTelemetryRecord(merged, latencyMs);
      return merged;
    });
  };

  const handleMetricsChange = (changed: Partial<SensorMetrics>) => {
    setActiveScenario("CUSTOM");
    setMetrics((prev) => {
      const merged = { ...prev, ...changed };
      const latencyMs = Math.floor(6 + Math.random() * 24);
      emitTelemetryRecord(merged, latencyMs);
      return merged;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navbar Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating(!isSimulating)}
        lastCommand={currentCommand}
        user={user}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === "hud" && (
          <CockpitHud
            metrics={metrics}
            onMetricsChange={handleMetricsChange}
            lastCommand={currentCommand}
            onApplyScenario={handleApplyScenario}
            activeScenario={activeScenario}
            onToggleSensorFault={handleToggleSensorFault}
            telemetryLogs={telemetryLogs}
            isSimulating={isSimulating}
          />
        )}

        {activeTab === "bus" && (
          <MessageBusInspector metrics={metrics} lastCommand={currentCommand} />
        )}

        {activeTab === "edge" && (
          <EdgeAiAnalytics metrics={metrics} lastCommand={currentCommand} telemetryLogs={telemetryLogs} />
        )}

        {activeTab === "python" && (
          <PythonCodeConsole
            metrics={metrics}
            onTelemetryReceived={(t) => setTelemetryLogs((prev) => [t, ...prev])}
          />
        )}

        {activeTab === "telemetry" && (
          <TelemetryLogVault
            logs={telemetryLogs}
            onClearLogs={() => setTelemetryLogs([])}
            onSelectLogForCopilot={(log) => {
              setSelectedCopilotLog(log);
              setActiveTab("copilot");
            }}
            user={user}
          />
        )}

        {activeTab === "forensic" && (
          <ForensicAnalysisPanel
            telemetryLogs={telemetryLogs}
            metrics={metrics}
            lastSnapshotInfo={lastSnapshotInfo}
          />
        )}

        {activeTab === "copilot" && (
          <GeminiSafetyCopilot
            selectedLog={selectedCopilotLog}
            latestLog={telemetryLogs[0] || null}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-4 text-center text-xs text-slate-500 font-mono">
        <p>Software-Defined Vehicle (SDV) Edge AI ADAS Controller &bull; ISO 26262 ASIL-D System Architecture &bull; SOME/IP &amp; ROS 2</p>
      </footer>
    </div>
  );
}
