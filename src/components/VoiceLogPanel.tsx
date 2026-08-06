import React, { useEffect, useState } from "react";
import {
  Volume2,
  VolumeX,
  Radio,
  Play,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  Info,
  ShieldCheck,
  Megaphone
} from "lucide-react";
import {
  getVoiceLogHistory,
  subscribeVoiceLogs,
  toggleAudioMute,
  getIsAudioMuted,
  speakVoiceLog,
  clearVoiceLogHistory
} from "../utils/audioCues";

export const VoiceLogPanel: React.FC = () => {
  const [logs, setLogs] = useState(getVoiceLogHistory());
  const [isMuted, setIsMuted] = useState(getIsAudioMuted());

  useEffect(() => {
    const unsubscribe = subscribeVoiceLogs(() => {
      setLogs([...getVoiceLogHistory()]);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleMute = () => {
    const newMutedState = toggleAudioMute();
    setIsMuted(newMutedState);
  };

  const handleReplayLog = (text: string, type: "EMERGENCY" | "FAILSAFE" | "WARNING" | "INFO") => {
    speakVoiceLog(text, type, true);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 font-mono text-xs">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl text-slate-950 font-bold shadow-md">
            <Megaphone className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-200 flex items-center space-x-2">
              <span>Voice Log Assistant (Text-to-Speech)</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-sans">
              Audible voice announcements for ASIL-D safety events &amp; simulation state transitions
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleMute}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5 transition-all text-xs ${
              isMuted
                ? "bg-rose-950 text-rose-300 border border-rose-800"
                : "bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-md shadow-emerald-950/50"
            }`}
            title={isMuted ? "Unmute Voice Log Speech" : "Mute Voice Log Speech"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isMuted ? "Voice Speech OFF" : "Voice Speech LIVE"}</span>
          </button>

          {logs.length > 0 && (
            <button
              onClick={clearVoiceLogHistory}
              className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl transition-all"
              title="Clear voice log history"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Voice Log Feed Stream */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 max-h-52 overflow-y-auto space-y-2">
        {logs.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs italic flex flex-col items-center justify-center space-y-1">
            <Radio className="w-6 h-6 text-slate-700 animate-pulse" />
            <span>No voice logs generated yet. Trigger Emergency Brake or Failsafe to hear audible speech.</span>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`p-2.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                log.type === "EMERGENCY"
                  ? "bg-rose-950/40 border-rose-800/80 text-rose-200"
                  : log.type === "FAILSAFE"
                  ? "bg-purple-950/40 border-purple-800/80 text-purple-200"
                  : log.type === "WARNING"
                  ? "bg-amber-950/40 border-amber-800/80 text-amber-200"
                  : "bg-slate-900 border-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-start space-x-2">
                <div className="mt-0.5 shrink-0">
                  {log.type === "EMERGENCY" ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                  ) : log.type === "FAILSAFE" ? (
                    <AlertOctagon className="w-4 h-4 text-purple-400" />
                  ) : log.type === "WARNING" ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Info className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 text-[10px]">
                    <span className="font-extrabold px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800">
                      {log.type}
                    </span>
                    <span className="text-slate-400">{log.timestamp}</span>
                  </div>
                  <p className="text-xs font-sans font-medium">{log.text}</p>
                </div>
              </div>

              <button
                onClick={() => handleReplayLog(log.text, log.type)}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 text-cyan-400 border border-slate-800 rounded-lg shrink-0 transition-all"
                title="Replay Voice Speech"
              >
                <Play className="w-3.5 h-3.5 fill-cyan-400" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
