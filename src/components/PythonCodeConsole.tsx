import React, { useState, useEffect } from "react";
import { Code2, Play, Download, Copy, Check, Terminal, FileCode, RefreshCw } from "lucide-react";
import { PythonSourceFiles, SensorMetrics, ScenarioType } from "../types";

interface PythonCodeConsoleProps {
  metrics: SensorMetrics;
  onTelemetryReceived: (telemetry: any) => void;
}

export const PythonCodeConsole: React.FC<PythonCodeConsoleProps> = ({
  metrics,
  onTelemetryReceived
}) => {
  const [sourceFiles, setSourceFiles] = useState<PythonSourceFiles>({});
  const [activeFileName, setActiveFileName] = useState<string>("main.py");
  const [copied, setCopied] = useState(false);
  const [isLoadingCode, setIsLoadingCode] = useState(true);

  // Execution State
  const [isRunningScript, setIsRunningScript] = useState(false);
  const [simDuration, setSimDuration] = useState<number>(5);
  const [simScenario, setSimScenario] = useState<ScenarioType>("CRITICAL");
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Fetch python source code files from Express backend
  useEffect(() => {
    fetch("/api/python/source")
      .then((res) => res.json())
      .then((data) => {
        if (data.files) {
          setSourceFiles(data.files);
        }
      })
      .catch((err) => console.error("Failed to fetch python code:", err))
      .finally(() => setIsLoadingCode(false));
  }, []);

  // Copy code handler
  const handleCopyCode = () => {
    if (sourceFiles[activeFileName]) {
      navigator.clipboard.writeText(sourceFiles[activeFileName]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download all python files as zip or text download
  const handleDownloadFiles = () => {
    const code = sourceFiles[activeFileName] || "";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Run Python script using Server-Sent Events (SSE) or REST execution endpoint
  const handleRunPythonScript = async () => {
    setIsRunningScript(true);
    setConsoleLogs([
      `[SHELL] Executing: python3 main.py --duration ${simDuration} --speed ${metrics.vehicle_speed_kmh} --distance ${metrics.obstacle_distance_m} --scenario ${simScenario}`
    ]);

    try {
      const response = await fetch("/api/python/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: simDuration,
          speed: metrics.vehicle_speed_kmh,
          distance: metrics.obstacle_distance_m,
          confidence: metrics.camera_confidence,
          scenario: simScenario
        })
      });

      const data = await response.json();

      if (data.rawStdout) {
        setConsoleLogs((prev) => [...prev, ...data.rawStdout.split("\n")]);
      }

      if (data.telemetryEvents && data.telemetryEvents.length > 0) {
        data.telemetryEvents.forEach((t: any) => onTelemetryReceived(t));
      }
    } catch (err: any) {
      setConsoleLogs((prev) => [...prev, `[ERROR] Python execution error: ${err.message}`]);
    } finally {
      setIsRunningScript(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Live Python Script Runner Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-800/60">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Live Python SDV Simulation Runner</h3>
              <p className="text-xs text-slate-400">Executes the modular Python 3.10 engine directly on backend Cloud Run environment</p>
            </div>
          </div>

          <button
            onClick={handleRunPythonScript}
            disabled={isRunningScript}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 shadow-lg transition-all ${
              isRunningScript
                ? "bg-slate-800 text-slate-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
            }`}
          >
            {isRunningScript ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Running main.py...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current text-white" />
                <span>Execute Python Simulation (python3 main.py)</span>
              </>
            )}
          </button>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
          <div>
            <label className="text-slate-400 block mb-1 font-sans">Scenario Preset:</label>
            <select
              value={simScenario}
              onChange={(e) => setSimScenario(e.target.value as ScenarioType)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="CRITICAL">🚨 CRITICAL (&lt;15m, &gt;30km/h)</option>
              <option value="WARNING">⚠️ WARNING (&lt;25m)</option>
              <option value="SAFE">🟢 SAFE (Clear Road)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-sans">Duration (seconds):</label>
            <input
              type="number"
              min="2"
              max="20"
              value={simDuration}
              onChange={(e) => setSimDuration(parseInt(e.target.value) || 5)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1 font-sans">Speed / Distance Context:</label>
            <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-slate-300 font-bold flex justify-between items-center">
              <span>{metrics.vehicle_speed_kmh.toFixed(1)} km/h</span>
              <span className="text-cyan-400">{metrics.obstacle_distance_m.toFixed(1)} m</span>
            </div>
          </div>
        </div>

        {/* Execution Terminal Output Window */}
        {consoleLogs.length > 0 && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs max-h-60 overflow-y-auto space-y-1">
            <div className="text-slate-500 text-[10px] uppercase font-bold border-b border-slate-900 pb-1 mb-2">
              Stdout Output Log Stream:
            </div>
            {consoleLogs.map((log, i) => (
              <div
                key={i}
                className={
                  log.includes("[TELEMETRY_JSON]")
                    ? "text-cyan-300 font-semibold"
                    : log.includes("CRITICAL")
                    ? "text-rose-400 font-bold"
                    : log.includes("WARNING")
                    ? "text-amber-400 font-bold"
                    : "text-slate-300"
                }
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Python Source Code File Viewer & Editor */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <Code2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-sm text-white">Modular SDV Python Architecture Source Code</h3>
              <p className="text-xs text-slate-400">Clean, asynchronous, thread-safe Python codebase for automotive ADAS</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Code"}</span>
            </button>

            <button
              onClick={handleDownloadFiles}
              className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activeFileName}</span>
            </button>
          </div>
        </div>

        {/* File Tabs */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar border-b border-slate-800/80 pb-2">
          {Object.keys(sourceFiles).map((fileName) => (
            <button
              key={fileName}
              onClick={() => setActiveFileName(fileName)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center space-x-2 transition-all ${
                activeFileName === fileName
                  ? "bg-slate-800 text-cyan-300 border border-cyan-500/50 shadow-sm"
                  : "bg-slate-950 text-slate-400 hover:bg-slate-800/50"
              }`}
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>{fileName}</span>
            </button>
          ))}
        </div>

        {/* Code View Area */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-x-auto text-slate-200 max-h-[500px]">
          {isLoadingCode ? (
            <div className="p-8 text-center text-slate-500">Loading python codebase...</div>
          ) : (
            <pre className="leading-relaxed">{sourceFiles[activeFileName] || "# Select a Python file above"}</pre>
          )}
        </div>
      </div>
    </div>
  );
};
