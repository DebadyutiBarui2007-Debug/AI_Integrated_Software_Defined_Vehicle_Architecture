import React, { useState } from "react";
import { Sparkles, Send, Bot, ShieldCheck, AlertCircle, RefreshCw, MessageSquare, Search, MapPin, Mic, Brain } from "lucide-react";
import { TelemetryEvent } from "../types";
import { GeminiAdasChatbot } from "./GeminiAdasChatbot";

interface GeminiSafetyCopilotProps {
  selectedLog: TelemetryEvent | null;
  latestLog: TelemetryEvent | null;
}

export const GeminiSafetyCopilot: React.FC<GeminiSafetyCopilotProps> = ({
  selectedLog,
  latestLog
}) => {
  const activeLog = selectedLog || latestLog;
  const [subTab, setSubTab] = useState<"chatbot" | "audit">("chatbot");
  const [contextNote, setContextNote] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleRunAudit = async () => {
    if (!activeLog) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch("/api/gemini/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telemetryLog: activeLog,
          context: contextNote || "Evaluate ISO 26262 ASIL-D functional safety and AEB actuation."
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze telemetry log.");
      }

      setAnalysis(data.analysis);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during AI analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation Tabs */}
      <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-fit font-mono text-xs">
        <button
          onClick={() => setSubTab("chatbot")}
          className={`px-4 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all ${
            subTab === "chatbot"
              ? "bg-cyan-600 text-slate-950 shadow-md shadow-cyan-600/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Gemini Chatbot &amp; Voice Copilot</span>
        </button>

        <button
          onClick={() => setSubTab("audit")}
          className={`px-4 py-2 rounded-lg font-bold flex items-center space-x-2 transition-all ${
            subTab === "audit"
              ? "bg-cyan-600 text-slate-950 shadow-md shadow-cyan-600/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>ISO 26262 Telemetry Diagnostic Audit</span>
        </button>
      </div>

      {subTab === "chatbot" && (
        <GeminiAdasChatbot
          metrics={activeLog?.sensor_metrics}
          lastCommand={activeLog?.event?.actuation_command}
        />
      )}

      {subTab === "audit" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          {/* Copilot Header */}
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-800">
            <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20 text-white">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Gemini AI Automotive Safety Copilot</h3>
              <p className="text-xs text-slate-400">
                Powered by Gemini API &bull; ISO 26262 ASIL-D Threat Analysis &amp; Sensor Fusion Auditor
              </p>
            </div>
          </div>

          {/* Target Telemetry Payload Context */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400 font-bold border-b border-slate-900 pb-2">
                  <span>Target Telemetry Event</span>
                  <span className="text-cyan-400">{activeLog ? activeLog.trace_id : "NO_LOG_SELECTED"}</span>
                </div>

                {activeLog ? (
                  <div className="space-y-1.5 text-slate-300">
                    <div>
                      Priority:{" "}
                      <strong
                        className={
                          activeLog.event.priority === "P0_CRITICAL" ? "text-rose-400" : "text-amber-400"
                        }
                      >
                        {activeLog.event.priority}
                      </strong>
                    </div>
                    <div>Actuation: <strong className="text-white">{activeLog.event.actuation_command}</strong></div>
                    <div>
                      Speed: {activeLog.sensor_metrics.vehicle_speed_kmh} km/h | Dist: {activeLog.sensor_metrics.obstacle_distance_m} m
                    </div>
                    <div>TTC: {activeLog.sensor_metrics.time_to_collision_s}s | Camera Conf: {(activeLog.sensor_metrics.camera_confidence * 100).toFixed(0)}%</div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-xs italic">Select a log from the Vault or run simulation to populate.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Custom Scenario Notes / Environmental Context:
                </label>
                <textarea
                  rows={3}
                  value={contextNote}
                  onChange={(e) => setContextNote(e.target.value)}
                  placeholder="e.g. Wet asphalt during heavy night rain with camera lens glare, sudden pedestrian sprint from behind parked truck..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                onClick={handleRunAudit}
                disabled={isAnalyzing || !activeLog}
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-all ${
                  isAnalyzing || !activeLog
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                    <span>Gemini ISO 26262 Analysis in Progress...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4" />
                    <span>Run Gemini Safety &amp; Risk Diagnostic Audit</span>
                  </>
                )}
              </button>

              {errorMsg && (
                <div className="p-3 bg-rose-950/80 border border-rose-700 rounded-xl text-rose-300 text-xs flex items-center space-x-2 font-mono">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>

            {/* Audit Report Result Box */}
            <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-xl p-5 min-h-[350px] flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 pb-3 border-b border-slate-900 mb-3 text-xs font-bold text-cyan-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>ISO 26262 ASIL-D Audit &amp; Threat Analysis Report</span>
                </div>

                {analysis ? (
                  <div className="text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {analysis}
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs font-mono space-y-2">
                    <Bot className="w-10 h-10 text-slate-700 animate-pulse" />
                    <p>Click &quot;Run Gemini Safety &amp; Risk Diagnostic Audit&quot; to generate an architectural report on the active telemetry trace.</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-900 text-[10px] text-slate-500 font-mono flex items-center justify-between">
                <span>Model: Gemini 3.5 Flash</span>
                <span>Safety Framework: ISO 26262 / MISRA-C Compliance</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
