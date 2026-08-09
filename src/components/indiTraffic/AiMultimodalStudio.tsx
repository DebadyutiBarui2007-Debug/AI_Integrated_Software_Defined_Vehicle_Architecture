import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Film,
  Music,
  Mic,
  Search,
  MapPin,
  Send,
  Upload,
  BrainCircuit,
  Zap,
  Volume2,
  RefreshCw,
  Download,
  Play,
  Pause,
  AlertCircle,
  CheckCircle2,
  Bot
} from "lucide-react";
import { auth, signInWithPopup, googleProvider, signOut, signInAnonymously, onAuthStateChanged, User } from "../../lib/firebase";

const VeoFallbackAnimation: React.FC<{ prompt: string; aspectRatio: "16:9" | "9:16" }> = ({ prompt, aspectRatio }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;
    let particleOffset = 0;

    // Surrounding vehicles state
    const surroundingVehicles = [
      { x: 120, y: 150, speed: 0.8, color: "#f43f5e", label: "Auto-Rickshaw" },
      { x: 280, y: 180, speed: 0.5, color: "#eab308", label: "Crawl Cab" },
      { x: 200, y: 90, speed: 1.2, color: "#38bdf8", label: "Ego EV" }
    ];

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const draw = () => {
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const w = canvas.width;
      const h = canvas.height;

      // 1. Draw 3D Perspective Road
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      const horizontalLineCount = 10;
      for (let i = 0; i < horizontalLineCount; i++) {
        const y = h/2 + (i / horizontalLineCount) * (h/2);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Vertical perspective lines converging to the center horizon (w/2, h/2)
      const centerX = w / 2;
      const horizonY = h / 2.2;
      const laneCount = 6;
      ctx.strokeStyle = "#334155";
      for (let i = -laneCount/2; i <= laneCount/2; i++) {
        const targetX = centerX + i * (w / (laneCount - 1)) * 1.5;
        ctx.beginPath();
        ctx.moveTo(centerX, horizonY);
        ctx.lineTo(targetX, h);
        ctx.stroke();
      }

      // Animated road dash lines
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 3;
      ctx.setLineDash([15, 20]);
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      // Left lane divider
      ctx.moveTo(centerX - 40, horizonY);
      ctx.lineTo(centerX - 120, h);
      // Right lane divider
      ctx.moveTo(centerX + 40, horizonY);
      ctx.lineTo(centerX + 120, h);
      ctx.stroke();
      ctx.setLineDash([]);

      // Update background road scrolling
      offset = (offset + 1.2) % 35;

      // 2. Draw vehicles with perspective scaling
      surroundingVehicles.forEach((v) => {
        const scale = (v.y / h) * 1.2;
        const currentX = centerX + (v.x - centerX) * scale;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fillRect(currentX - 25 * scale, v.y + 10 * scale, 50 * scale, 15 * scale);

        ctx.fillStyle = v.color;
        ctx.beginPath();
        // Fallback for roundRect
        if (ctx.roundRect) {
          ctx.roundRect(currentX - 20 * scale, v.y - 15 * scale, 40 * scale, 30 * scale, 6 * scale);
        } else {
          ctx.rect(currentX - 20 * scale, v.y - 15 * scale, 40 * scale, 30 * scale);
        }
        ctx.fill();

        ctx.fillStyle = "#ef4444";
        ctx.fillRect(currentX - 16 * scale, v.y + 12 * scale, 6 * scale, 3 * scale);
        ctx.fillRect(currentX + 10 * scale, v.y + 12 * scale, 6 * scale, 3 * scale);

        ctx.fillStyle = "#eab308";
        ctx.fillRect(currentX - 16 * scale, v.y - 15 * scale, 6 * scale, 3 * scale);
        ctx.fillRect(currentX + 10 * scale, v.y - 15 * scale, 6 * scale, 3 * scale);

        ctx.fillStyle = "#94a3b8";
        ctx.font = `bold ${Math.max(8, 9 * scale)}px monospace`;
        ctx.fillText(v.label, currentX - 18 * scale, v.y - 20 * scale);

        v.y = horizonY + 20 + ((v.y - horizonY - 20 + v.speed) % (h - horizonY - 40));
      });

      ctx.fillStyle = "rgba(16, 185, 129, 0.03)";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(16, 185, 129, 0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      particleOffset = (particleOffset + 0.5) % h;
      ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
      ctx.fillRect(10, particleOffset, w - 20, 2);

      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 2;
      const cornerLen = 15;
      const corners = [
        [10, 10, 1, 1],
        [w - 10, 10, -1, 1],
        [10, h - 10, 1, -1],
        [w - 10, h - 10, -1, -1]
      ];
      corners.forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y + cornerLen * dy);
        ctx.lineTo(x, y);
        ctx.lineTo(x + cornerLen * dx, y);
        ctx.stroke();
      });

      ctx.fillStyle = "#10b981";
      ctx.font = "bold 10px monospace";
      ctx.fillText("VEO SANDBOX TRAFFIC SIMULATOR", 20, 30);
      
      ctx.fillStyle = "#64748b";
      ctx.font = "9px monospace";
      ctx.fillText(`SCENARIO: ${prompt.substring(0, 42)}...`, 20, 45);
      ctx.fillText("ENGINE: GEOMETRIC VECTOR INTERFERENCE", 20, 58);
      ctx.fillText("STATUS: STABLE RENDER (FALLBACK MODE)", 20, 71);

      ctx.fillStyle = "#eab308";
      ctx.font = "bold 9px monospace";
      ctx.fillText("REGEN CREEP: 1.5 km/h", w - 140, h - 45);
      ctx.fillStyle = "#10b981";
      ctx.fillText("INVERTER TEMP: 72.4°C", w - 140, h - 32);
      ctx.fillText("FPS: 60.0 STABLE", w - 140, h - 20);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [prompt]);

  const heightClass = aspectRatio === "9:16" ? "h-96" : "h-64";

  return (
    <div className={`w-full ${heightClass} rounded-lg overflow-hidden relative border border-slate-800`}>
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div className="absolute top-3 right-3 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded shadow">
        ⚡ Veo Sandbox Fallback Active
      </div>
    </div>
  );
};

export const AiMultimodalStudio: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"CHAT" | "IMAGE" | "VIDEO" | "MUSIC" | "VOICE">("CHAT");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // --- 1. CHAT & THINKING & GROUNDING STATE ---
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string; grounding?: any }>>([
    {
      role: "assistant",
      content: "Hello! I am your IndiTraffic SDV & ADAS Edge AI Architect Copilot. Ask me about Indian traffic thermal mitigation, 6kHz PWM inverter tuning, ISO 26262 ASIL-D safety, or nearby EV charging infrastructure."
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState<"pro" | "flash" | "lite">("pro");
  const [enableThinking, setEnableThinking] = useState(true);
  const [enableSearch, setEnableSearch] = useState(false);
  const [enableMaps, setEnableMaps] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendChat = async () => {
    if (!inputMessage.trim() || isChatLoading) return;

    const userText = inputMessage;
    setInputMessage("");
    const newHistory = [...chatMessages, { role: "user" as const, content: userText }];
    setChatMessages(newHistory);
    setIsChatLoading(true);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newHistory,
          model: selectedModel,
          enableThinking,
          enableSearch,
          enableMaps
        })
      });

      const data = await res.json();
      if (res.ok) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            grounding: data.groundingMetadata
          }
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error || "Failed to generate reply."}` }
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Network error: ${err.message}` }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- 2. IMAGE GENERATION & EDITING STATE ---
  const [imagePrompt, setImagePrompt] = useState("Digital EV Cockpit HUD blueprint showing stop-and-go creep thermal load, Silk Board traffic density, and micro-regen torque gauge in cyan and amber vector lines");
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [isImageGenerating, setIsImageGenerating] = useState(false);
  const [visionAnalysis, setVisionAnalysis] = useState<string | null>(null);
  const [isAnalyzingVision, setIsAnalyzingVision] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        setUploadedBase64(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    setIsImageGenerating(true);
    setGeneratedImageUrl(null);

    try {
      const res = await fetch("/api/gemini/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: imagePrompt,
          inputImageBase64: uploadedBase64 || undefined,
          aspectRatio
        })
      });

      const data = await res.json();
      if (res.ok && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
      } else {
        alert(data.error || "Image generation failed.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsImageGenerating(false);
    }
  };

  const handleAnalyzeVision = async () => {
    if (!uploadedBase64 && !generatedImageUrl) {
      alert("Please upload or generate an image first.");
      return;
    }
    const base64 = uploadedBase64 || (generatedImageUrl ? generatedImageUrl.split(",")[1] : null);
    if (!base64) return;

    setIsAnalyzingVision(true);
    try {
      const res = await fetch("/api/gemini/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: base64,
          prompt: "Perform a high-thinking ISO 26262 ASIL safety & thermal efficiency inspection on this vehicle HUD / diagram."
        })
      });
      const data = await res.json();
      setVisionAnalysis(data.analysis || data.error);
    } catch (e: any) {
      setVisionAnalysis("Error analyzing image: " + e.message);
    } finally {
      setIsAnalyzingVision(false);
    }
  };

  // --- 3. VEO VIDEO GENERATION STATE ---
  const [veoPrompt, setVeoPrompt] = useState("3D camera animation of an electric vehicle inching through Silk Board Junction in monsoon traffic with stop-and-go creep");
  const [veoAspectRatio, setVeoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [veoStatus, setVeoStatus] = useState<string | null>(null);
  const [veoVideoUrl, setVeoVideoUrl] = useState<string | null>(null);
  const [isVeoGenerating, setIsVeoGenerating] = useState(false);
  const [isVeoFallback, setIsVeoFallback] = useState(false);

  const handleGenerateVeoVideo = async () => {
    setIsVeoGenerating(true);
    setVeoVideoUrl(null);
    setIsVeoFallback(false);
    setVeoStatus("Initiating Veo 3.1 video generation...");

    try {
      const startRes = await fetch("/api/veo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: veoPrompt,
          startingImageBase64: uploadedBase64 || undefined,
          aspectRatio: veoAspectRatio
        })
      });

      const startData = await startRes.json();
      if (!startRes.ok) {
        throw new Error(startData.error || "Failed to initiate video generation.");
      }

      if (startData.isFallback) {
        setIsVeoFallback(true);
        setVeoStatus(startData.notes || "Rendering custom simulated traffic animation...");
        setIsVeoGenerating(false);
        return;
      }

      const opName = startData.operationName;
      setVeoStatus("Rendering video sequence (this takes ~1-2 minutes)...");

      // Poll every 8 seconds
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch("/api/veo/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationName: opName })
          });
          const statusData = await statusRes.json();

          if (statusData.done) {
            clearInterval(pollInterval);
            setVeoStatus("Downloading generated video...");

            const downloadRes = await fetch("/api/veo/download", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ operationName: opName })
            });

            if (downloadRes.ok) {
              const blob = await downloadRes.blob();
              const url = URL.createObjectURL(blob);
              setVeoVideoUrl(url);
              setVeoStatus("Video rendering complete!");
            } else {
              setVeoStatus("Failed to download video stream.");
            }
            setIsVeoGenerating(false);
          }
        } catch (pollErr: any) {
          console.error("Poll error:", pollErr);
        }
      }, 8000);
    } catch (err: any) {
      setVeoStatus("Error: " + err.message);
      setIsVeoGenerating(false);
    }
  };

  // --- 4. LYRIA MUSIC & AVAS SOUND STATE ---
  const [lyriaPrompt, setLyriaPrompt] = useState("Low-frequency 15-second electric vehicle Acoustic Vehicle Alerting System (AVAS) pedestrian chime with futuristic sub-bass harmonic resonance");
  const [isFullTrack, setIsFullTrack] = useState(false);
  const [lyriaAudioUrl, setLyriaAudioUrl] = useState<string | null>(null);
  const [lyriaNotes, setLyriaNotes] = useState<string | null>(null);
  const [isLyriaGenerating, setIsLyriaGenerating] = useState(false);

  const handleGenerateLyria = async () => {
    setIsLyriaGenerating(true);
    setLyriaAudioUrl(null);
    setLyriaNotes(null);

    try {
      const res = await fetch("/api/lyria/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lyriaPrompt,
          isFullTrack
        })
      });

      const data = await res.json();
      if (data.audioBase64) {
        const binary = atob(data.audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
        const url = URL.createObjectURL(blob);
        setLyriaAudioUrl(url);
        setLyriaNotes(data.notes || "AVAS Audio sound synthesis complete.");
      } else {
        // Local Web Audio API fallback synthesis
        synthesizeLocalAvasChime();
      }
    } catch (err: any) {
      console.warn("Lyria audio generation API error, using Web Audio API synthesis:", err);
      synthesizeLocalAvasChime();
    } finally {
      setIsLyriaGenerating(false);
    }
  };

  const synthesizeLocalAvasChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 2);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 3.5);

      setLyriaNotes("⚡ [Web Audio Local Fallback] Synthesized 140Hz-280Hz low-frequency EV pedestrian warning alert chime.");
    } catch (e) {
      setLyriaNotes("Unable to synthesize audio in this browser context.");
    }
  };

  // --- 5. VOICE TRANSCRIBER & LIVE CONVERSATION STATE ---
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          try {
            const res = await fetch("/api/gemini/transcribe", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ base64Audio, mimeType: "audio/webm" })
            });
            const data = await res.json();
            if (data.transcription) {
              setTranscribedText(data.transcription);
              setInputMessage(data.transcription); // Auto-fill chat input
            }
          } catch (e: any) {
            setTranscribedText("Transcription failed: " + e.message);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err: any) {
      alert("Microphone permission denied or unavailable: " + err.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Live API WebSocket connection state
  const [isLiveActive, setIsLiveActive] = useState(false);
  const liveWsRef = useRef<WebSocket | null>(null);
  const [liveStatus, setLiveStatus] = useState<string>("Offline");

  const startLiveConversation = () => {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/api/gemini/live`;
    const ws = new WebSocket(wsUrl);
    liveWsRef.current = ws;

    ws.onopen = () => {
      setIsLiveActive(true);
      setLiveStatus("Connected to Gemini 3.1 Live API");
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.audio) {
          // Play PCM audio chunk
          playLiveAudioChunk(data.audio);
        }
      } catch {
        // ignore
      }
    };

    ws.onerror = (err) => {
      console.error("Live WS error:", err);
      setLiveStatus("Connection error");
    };

    ws.onclose = () => {
      setIsLiveActive(false);
      setLiveStatus("Offline");
    };
  };

  const stopLiveConversation = () => {
    if (liveWsRef.current) {
      liveWsRef.current.close();
      liveWsRef.current = null;
    }
    setIsLiveActive(false);
    setLiveStatus("Offline");
  };

  const playLiveAudioChunk = (base64Pcm: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const binaryStr = atob(base64Pcm);
      const len = binaryStr.length;
      const bytes = new Int16Array(len / 2);
      for (let i = 0; i < len; i += 2) {
        bytes[i / 2] = binaryStr.charCodeAt(i) | (binaryStr.charCodeAt(i + 1) << 8);
      }
      const buffer = audioCtx.createBuffer(1, bytes.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < bytes.length; i++) {
        channelData[i] = bytes[i] / 32768;
      }
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start(0);
    } catch (e) {
      console.error("Error playing audio chunk:", e);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 space-y-5">
      {/* Top Header & User Identity Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              Gemini AI Multimodal Engineering Studio
              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-mono font-semibold">
                ALL MODELS ACTIVE
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              High Thinking, Veo Video, Lyria AVAS Music, Live Voice & Vision Intelligence
            </p>
          </div>
        </div>

        {/* User Auth Info */}
        <div className="flex items-center gap-2 text-xs">
          {user ? (
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
              <span className="text-emerald-400 font-mono">
                {user.email || user.displayName || `User: ${user.uid.slice(0, 6)}...`}
              </span>
              <button
                onClick={() => signOut(auth)}
                className="text-slate-400 hover:text-white underline text-[11px]"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-lg font-semibold flex items-center gap-1.5 hover:brightness-110 shadow"
            >
              Google Sign-In
            </button>
          )}
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex overflow-x-auto bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 scrollbar-none">
        <button
          onClick={() => setActiveSubTab("CHAT")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === "CHAT" ? "bg-sky-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Bot className="w-4 h-4" />
          AI Chatbot & Grounding
        </button>

        <button
          onClick={() => setActiveSubTab("IMAGE")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === "IMAGE" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Create / Edit Images
        </button>

        <button
          onClick={() => setActiveSubTab("VIDEO")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === "VIDEO" ? "bg-rose-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Film className="w-4 h-4" />
          Veo Video Generation
        </button>

        <button
          onClick={() => setActiveSubTab("MUSIC")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === "MUSIC" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Music className="w-4 h-4" />
          Lyria AVAS Sound
        </button>

        <button
          onClick={() => setActiveSubTab("VOICE")}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
            activeSubTab === "VOICE" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
          }`}
        >
          <Mic className="w-4 h-4" />
          Voice & Live Conversation
        </button>
      </div>

      {/* --- SUB-TAB 1: AI CHATBOT & GROUNDING --- */}
      {activeSubTab === "CHAT" && (
        <div className="space-y-4">
          {/* Controls bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
            {/* Model Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value as any)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white text-xs font-mono"
              >
                <option value="pro">gemini-3.1-pro-preview (High Reasoning)</option>
                <option value="flash">gemini-3.5-flash (General)</option>
                <option value="lite">gemini-3.1-flash-lite (Fast Low Latency)</option>
              </select>
            </div>

            {/* High Thinking & Grounding Toggles */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={enableThinking}
                  onChange={(e) => setEnableThinking(e.target.checked)}
                  disabled={selectedModel !== "pro"}
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                />
                <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                Thinking Mode (High)
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={enableSearch}
                  onChange={(e) => setEnableSearch(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                />
                <Search className="w-3.5 h-3.5 text-sky-400" />
                Google Search Grounding
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={enableMaps}
                  onChange={(e) => setEnableMaps(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-sky-500 focus:ring-0"
                />
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Google Maps Grounding
              </label>
            </div>
          </div>

          {/* Chat Thread */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 h-80 overflow-y-auto space-y-3 scrollbar-thin">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-sky-600 text-white rounded-br-none"
                      : "bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {/* Grounding Metadata links */}
                  {msg.grounding?.groundingChunks?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] space-y-1">
                      <span className="text-sky-400 font-semibold flex items-center gap-1">
                        <Search className="w-3 h-3" /> Grounding Sources:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {msg.grounding.groundingChunks.map((chunk: any, cIdx: number) => {
                          const uri = chunk.web?.uri || chunk.maps?.uri;
                          const title = chunk.web?.title || chunk.maps?.title || "Reference Link";
                          if (!uri) return null;
                          return (
                            <a
                              key={cIdx}
                              href={uri}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sky-300 hover:underline bg-sky-950/50 px-2 py-0.5 rounded border border-sky-800/50"
                            >
                              {title}
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex items-center gap-2 text-xs text-sky-400 animate-pulse">
                <BrainCircuit className="w-4 h-4 animate-spin" />
                Gemini reasoning in progress...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              placeholder="Ask about SDV edge AI, ISO 26262, thermal mitigation, or EV charging nearby..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              onClick={handleSendChat}
              disabled={isChatLoading}
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      )}

      {/* --- SUB-TAB 2: CREATE / EDIT IMAGES & VISION --- */}
      {activeSubTab === "IMAGE" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Input Form */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <h3 className="font-semibold text-sky-400 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4" />
                Prompt & Image Editing Controls
              </h3>

              <div>
                <label className="block text-slate-400 mb-1">Text Prompt:</label>
                <textarea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-slate-400 mb-1">Aspect Ratio:</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200"
                  >
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="9:16">9:16 (Portrait)</option>
                    <option value="1:1">1:1 (Square)</option>
                    <option value="4:3">4:3 (Standard)</option>
                    <option value="21:9">21:9 (Ultrawide HUD)</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-slate-400 mb-1">Optional Reference Image:</label>
                  <label className="flex items-center justify-center p-2 bg-slate-900 border border-dashed border-slate-700 rounded-lg cursor-pointer hover:border-purple-500 text-slate-400 text-xs">
                    <Upload className="w-4 h-4 mr-1 text-purple-400" />
                    {uploadedBase64 ? "Image Loaded" : "Upload Image"}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleGenerateImage}
                  disabled={isImageGenerating}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow"
                >
                  <Sparkles className="w-4 h-4" />
                  {isImageGenerating ? "Generating Image..." : "Generate Image"}
                </button>

                <button
                  onClick={handleAnalyzeVision}
                  disabled={isAnalyzingVision}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold text-xs flex items-center gap-1 transition"
                >
                  <BrainCircuit className="w-4 h-4 text-purple-400" />
                  Analyze Vision
                </button>
              </div>
            </div>

            {/* Display Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden">
              {generatedImageUrl ? (
                <img
                  src={generatedImageUrl}
                  alt="Generated EV Blueprint"
                  className="max-h-64 object-contain rounded-lg border border-slate-800 shadow-xl"
                />
              ) : isImageGenerating ? (
                <div className="text-center space-y-2 text-purple-400 animate-pulse">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto" />
                  <p className="text-xs">Synthesizing high-res image with gemini-3.1-flash-image...</p>
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  Generated or edited image blueprint will appear here.
                </p>
              )}
            </div>
          </div>

          {/* Vision Analysis output */}
          {visionAnalysis && (
            <div className="bg-purple-950/30 border border-purple-800/40 p-4 rounded-xl text-xs space-y-1">
              <h4 className="font-semibold text-purple-300 flex items-center gap-1.5">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                Gemini Vision ISO 26262 Engineering Inspection:
              </h4>
              <p className="text-slate-300 whitespace-pre-wrap">{visionAnalysis}</p>
            </div>
          )}
        </div>
      )}

      {/* --- SUB-TAB 3: VEO VIDEO GENERATION --- */}
      {activeSubTab === "VIDEO" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <h3 className="font-semibold text-rose-400 flex items-center gap-1.5">
                <Film className="w-4 h-4" />
                Veo 3.1 Fast Video Animation Controls
              </h3>

              <div>
                <label className="block text-slate-400 mb-1">Scenario Video Prompt:</label>
                <textarea
                  value={veoPrompt}
                  onChange={(e) => setVeoPrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Aspect Ratio:</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setVeoAspectRatio("16:9")}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                      veoAspectRatio === "16:9"
                        ? "bg-rose-600 border-rose-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    16:9 Landscape
                  </button>
                  <button
                    onClick={() => setVeoAspectRatio("9:16")}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold ${
                      veoAspectRatio === "9:16"
                        ? "bg-rose-600 border-rose-500 text-white"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    9:16 Portrait
                  </button>
                </div>
              </div>

              <button
                onClick={handleGenerateVeoVideo}
                disabled={isVeoGenerating}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow"
              >
                <Play className="w-4 h-4" />
                {isVeoGenerating ? "Rendering Veo Video..." : "Generate Veo Video"}
              </button>

              {veoStatus && (
                <p className="text-[11px] text-rose-300 font-mono flex items-center gap-1.5">
                  <RefreshCw className={`w-3 h-3 ${isVeoGenerating ? "animate-spin" : ""}`} />
                  {veoStatus}
                </p>
              )}
            </div>

            {/* Video Player Box */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[260px] w-full">
              {veoVideoUrl ? (
                <video controls src={veoVideoUrl} className="max-h-64 rounded-lg shadow-xl w-full" autoPlay loop />
              ) : isVeoFallback ? (
                <VeoFallbackAnimation prompt={veoPrompt} aspectRatio={veoAspectRatio} />
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  Rendered Veo 3D traffic video simulation will appear here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-TAB 4: LYRIA MUSIC / AVAS SOUND --- */}
      {activeSubTab === "MUSIC" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <h3 className="font-semibold text-amber-400 flex items-center gap-1.5">
                <Music className="w-4 h-4" />
                Lyria 3 Acoustic Vehicle Alerting System (AVAS)
              </h3>

              <div>
                <label className="block text-slate-400 mb-1">AVAS Acoustic Tone Prompt:</label>
                <textarea
                  value={lyriaPrompt}
                  onChange={(e) => setLyriaPrompt(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={isFullTrack}
                  onChange={(e) => setIsFullTrack(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-0"
                />
                Use Lyria Pro (Full-length track vs 30s clip)
              </label>

              <button
                onClick={handleGenerateLyria}
                disabled={isLyriaGenerating}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 transition shadow"
              >
                <Volume2 className="w-4 h-4" />
                {isLyriaGenerating ? "Synthesizing AVAS Tone..." : "Generate AVAS Sound Tone"}
              </button>
            </div>

            {/* Audio Player */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center min-h-[220px] space-y-3">
              {lyriaAudioUrl ? (
                <div className="w-full space-y-3 text-center">
                  <Volume2 className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
                  <audio controls src={lyriaAudioUrl} className="w-full" />
                  {lyriaNotes && <p className="text-xs text-amber-200/80 font-mono">{lyriaNotes}</p>}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center">
                  Synthesized EV low-speed pedestrian alert sound will play here.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-TAB 5: VOICE TRANSCRIBER & LIVE CONVERSATION --- */}
      {activeSubTab === "VOICE" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Microphone Transcriber */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Mic className="w-4 h-4" />
                Driver Microphone Audio Transcription
              </h3>
              <p className="text-slate-400">
                Speak HUD commands like &quot;Inject cut-in failsafe&quot; or &quot;Check inverter temperature&quot;.
              </p>

              <div className="flex gap-3 pt-2">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                  >
                    <Mic className="w-4 h-4" />
                    Start Mic Recording
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition shadow animate-pulse"
                  >
                    <Pause className="w-4 h-4" />
                    Stop & Transcribe
                  </button>
                )}
              </div>

              {transcribedText && (
                <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg text-emerald-300 font-mono">
                  <strong>Transcribed Command:</strong> {transcribedText}
                </div>
              )}
            </div>

            {/* Live API Conversation */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Gemini 3.1 Live API Voice Session
              </h3>
              <p className="text-slate-400">
                Establish real-time, low-latency audio stream with the Vehicle Copilot.
              </p>

              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span>Status: <strong className="text-white font-mono">{liveStatus}</strong></span>
                {!isLiveActive ? (
                  <button
                    onClick={startLiveConversation}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded font-semibold text-xs transition"
                  >
                    Connect Live
                  </button>
                ) : (
                  <button
                    onClick={stopLiveConversation}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded font-semibold text-xs transition"
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
