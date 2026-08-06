import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Sparkles,
  Search,
  MapPin,
  Brain,
  Zap,
  Cpu,
  RotateCcw,
  Volume2,
  CheckCircle,
  ExternalLink,
  Shield,
  HelpCircle,
  Layers
} from "lucide-react";
import { SensorMetrics } from "../types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  modelUsed?: string;
  groundingMetadata?: any;
}

interface GeminiAdasChatbotProps {
  metrics?: SensorMetrics;
  lastCommand?: string;
}

export const GeminiAdasChatbot: React.FC<GeminiAdasChatbotProps> = ({
  metrics,
  lastCommand
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init-1",
      role: "assistant",
      content:
        "Greetings Engineer! I am your AI ADAS Architecture Assistant. I can evaluate ISO 26262 ASIL-D functional safety hazards, research UNECE regulations via Google Search, check road curvature data via Google Maps, or analyze real-time telemetry logs. How can I assist your vehicle calibration today?",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Model & Feature Toggles
  const [selectedModel, setSelectedModel] = useState<string>("gemini-3.5-flash"); // "gemini-3.5-flash", "gemini-3.1-pro-preview", "gemini-3.1-flash-lite"
  const [enableThinking, setEnableThinking] = useState<boolean>(false);
  const [enableSearch, setEnableSearch] = useState<boolean>(false);
  const [enableMaps, setEnableMaps] = useState<boolean>(false);

  // Microphone Audio Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [transcribingAudio, setTranscribingAudio] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString()
    };

    const newThread = [...messages, userMsg];
    setMessages(newThread);
    if (!textToSend) setInput("");
    setIsLoading(true);

    try {
      // Prepare payload for backend endpoint
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newThread.map((m) => ({ role: m.role, content: m.content })),
          model: enableThinking ? "gemini-3.1-pro-preview" : selectedModel,
          enableThinking,
          enableSearch,
          enableMaps,
          systemInstruction:
            "You are a Senior ADAS & SDV Software Systems Architect (ISO 26262 ASIL-D certified). Provide concise, technical, professional advice regarding vehicle active safety, sensor fusion, AEB triggers, and CAN/Ethernet bus timing."
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to query Gemini Chat API");
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date().toLocaleTimeString(),
        modelUsed: enableThinking ? "gemini-3.1-pro-preview (Thinking HIGH)" : selectedModel,
        groundingMetadata: data.groundingMetadata
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error("Chat Error:", err);
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ API Error: ${err.message || "Failed to contact Gemini endpoint."}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Start Audio Recording
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(",")[1];
          await processTranscribeAudio(base64Data);
        };

        // stop tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or unsupported:", err);
      alert("Microphone permission required for voice command transcription.");
    }
  };

  // Stop Audio Recording
  const stopAudioRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setTranscribingAudio(true);
    }
  };

  // Process Base64 Audio via Gemini Transcribe
  const processTranscribeAudio = async (base64Audio: string) => {
    try {
      setTranscribingAudio(true);
      const res = await fetch("/api/gemini/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Audio, mimeType: "audio/webm" })
      });
      const data = await res.json();
      if (data.transcription) {
        setInput(data.transcription.trim());
      }
    } catch (err) {
      console.error("Transcription failed:", err);
    } finally {
      setTranscribingAudio(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4 font-sans flex flex-col h-[680px]">
      {/* Header & Model/Feature Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-800 pb-3 gap-3">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-extrabold text-sm text-slate-200 flex items-center space-x-2">
              <span>Gemini ADAS Assistant &amp; Voice Copilot</span>
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Multi-model reasoning, voice transcription, and Google Search &amp; Maps Grounding
            </p>
          </div>
        </div>

        {/* Controls: Model Switcher & Feature Toggles */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Model Selector */}
          <select
            value={enableThinking ? "gemini-3.1-pro-preview" : selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              if (e.target.value !== "gemini-3.1-pro-preview") {
                setEnableThinking(false);
              }
            }}
            className="bg-slate-950 border border-slate-700 text-cyan-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none"
          >
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (General / Fast)</option>
            <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Complex Systems)</option>
            <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Low Latency)</option>
          </select>

          {/* High Thinking Toggle */}
          <button
            onClick={() => {
              setEnableThinking(!enableThinking);
              if (!enableThinking) setSelectedModel("gemini-3.1-pro-preview");
            }}
            className={`px-2.5 py-1 rounded-lg border font-bold flex items-center space-x-1 transition-all ${
              enableThinking
                ? "bg-purple-950 text-purple-300 border-purple-500 shadow-md shadow-purple-950/50"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
            title="Enable High Thinking Level on Gemini 3.1 Pro"
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>High Thinking</span>
          </button>

          {/* Search Grounding Toggle */}
          <button
            onClick={() => setEnableSearch(!enableSearch)}
            className={`px-2.5 py-1 rounded-lg border font-bold flex items-center space-x-1 transition-all ${
              enableSearch
                ? "bg-blue-950 text-blue-300 border-blue-500 shadow-md shadow-blue-950/50"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
            title="Search Grounding (ISO standards & UNECE active rules)"
          >
            <Search className="w-3.5 h-3.5 text-blue-400" />
            <span>Google Search</span>
          </button>

          {/* Maps Grounding Toggle */}
          <button
            onClick={() => setEnableMaps(!enableMaps)}
            className={`px-2.5 py-1 rounded-lg border font-bold flex items-center space-x-1 transition-all ${
              enableMaps
                ? "bg-emerald-950 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-950/50"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
            }`}
            title="Maps Grounding (Road Curvature & Geolocation)"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google Maps</span>
          </button>
        </div>
      </div>

      {/* Message Thread Area */}
      <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col space-y-1 ${
              m.role === "user" ? "items-end" : "items-start"
            }`}
          >
            <div className="flex items-center space-x-2 text-[10px] text-slate-500 px-1">
              {m.role === "assistant" ? (
                <span className="flex items-center space-x-1 text-cyan-400 font-bold">
                  <Bot className="w-3 h-3" />
                  <span>ADAS Gemini Copilot</span>
                  {m.modelUsed && <span className="text-slate-500">({m.modelUsed})</span>}
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-slate-400 font-bold">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>System Engineer</span>
                </span>
              )}
              <span>&bull; {m.timestamp}</span>
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-slate-200 leading-relaxed whitespace-pre-wrap border ${
                m.role === "user"
                  ? "bg-cyan-950/80 border-cyan-800 text-cyan-100 rounded-tr-none"
                  : "bg-slate-900 border-slate-800 text-slate-200 rounded-tl-none"
              }`}
            >
              {m.content}

              {/* Render Grounding Sources / Citations if present */}
              {m.groundingMetadata?.webSearchQueries && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-blue-300">
                  <span className="font-bold flex items-center space-x-1">
                    <Search className="w-3 h-3" />
                    <span>Search Grounding Queries Used:</span>
                  </span>
                  <ul className="list-disc list-inside mt-0.5 text-slate-400">
                    {m.groundingMetadata.webSearchQueries.map((q: string, idx: number) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 text-cyan-400 font-mono text-xs p-2">
            <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
            <span>Gemini AI is analyzing functional safety &amp; calculating response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input & Voice Bar */}
      <div className="space-y-2">
        {transcribingAudio && (
          <div className="text-[11px] font-mono text-amber-400 flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-amber-800">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>Transcribing microphone voice command via Gemini 3.5 Flash...</span>
          </div>
        )}

        <div className="flex items-center space-x-2">
          {/* Microphone Audio Record Button */}
          <button
            onClick={isRecording ? stopAudioRecording : startAudioRecording}
            className={`p-3 rounded-xl border transition-all font-mono text-xs flex items-center justify-center ${
              isRecording
                ? "bg-rose-950 text-rose-300 border-rose-500 animate-pulse shadow-lg shadow-rose-950"
                : "bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700"
            }`}
            title={isRecording ? "Click to stop recording" : "Transcribe microphone voice command"}
          >
            {isRecording ? <MicOff className="w-4 h-4 text-rose-400" /> : <Mic className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Text Input */}
          <input
            type="text"
            placeholder={
              isRecording
                ? "Listening to voice input..."
                : "Ask Gemini about ASIL safety, UNECE regulations, or vehicle telemetry..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 px-4 py-2.5 rounded-xl font-mono text-xs focus:border-cyan-500 focus:outline-none"
          />

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-black p-3 rounded-xl transition-all shadow-md shadow-cyan-600/20"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
