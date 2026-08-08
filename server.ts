import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { GoogleGenAI, ThinkingLevel, GenerateVideosOperation } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { WebSocketServer } from "ws";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "20mb" }));

  // Helper to instantiate GenAI
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  };

  // 1. Health API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 2. Python Code Source File Viewer & Exporter
  app.get("/api/python/source", (req, res) => {
    const engineDir = path.join(process.cwd(), "python_sdv_engine");
    try {
      if (!fs.existsSync(engineDir)) {
        return res.status(404).json({ error: "Python engine directory not found." });
      }

      const fileNames = fs.readdirSync(engineDir).filter((f) => f.endsWith(".py"));
      const files: Record<string, string> = {};

      for (const fileName of fileNames) {
        files[fileName] = fs.readFileSync(path.join(engineDir, fileName), "utf-8");
      }

      res.json({ files });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Synchronous Python Engine Execution API
  app.post("/api/python/run", (req, res) => {
    const { duration = 5, speed, distance, confidence, scenario = "SIMULATED" } = req.body;

    const scriptPath = path.join(process.cwd(), "python_sdv_engine", "main.py");
    const args: string[] = ["--duration", String(duration), "--scenario", scenario];

    if (speed !== undefined && speed !== null) {
      args.push("--speed", String(speed));
    }
    if (distance !== undefined && distance !== null) {
      args.push("--distance", String(distance));
    }
    if (confidence !== undefined && confidence !== null) {
      args.push("--confidence", String(confidence));
    }

    const pyProcess = spawn("python3", [scriptPath, ...args]);

    let stdoutBuffer = "";
    let stderrBuffer = "";

    pyProcess.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
    });

    pyProcess.stderr.on("data", (data) => {
      stderrBuffer += data.toString();
    });

    pyProcess.on("close", (code) => {
      const lines = stdoutBuffer.split("\n");
      const telemetryEvents: any[] = [];

      for (const line of lines) {
        if (line.includes("[TELEMETRY_JSON]")) {
          const jsonStr = line.replace("[TELEMETRY_JSON]", "").trim();
          try {
            telemetryEvents.push(JSON.parse(jsonStr));
          } catch {
            // ignore malformed lines
          }
        }
      }

      res.json({
        exitCode: code,
        rawStdout: stdoutBuffer,
        rawStderr: stderrBuffer,
        telemetryEvents
      });
    });
  });

  // 4. Server-Sent Events (SSE) Realtime Python Streaming
  app.get("/api/python/stream", (req, res) => {
    const duration = req.query.duration ? String(req.query.duration) : "10";
    const speed = req.query.speed ? String(req.query.speed) : "";
    const distance = req.query.distance ? String(req.query.distance) : "";
    const scenario = req.query.scenario ? String(req.query.scenario) : "SIMULATED";

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const scriptPath = path.join(process.cwd(), "python_sdv_engine", "main.py");
    const args: string[] = ["--duration", duration, "--scenario", scenario];

    if (speed) args.push("--speed", speed);
    if (distance) args.push("--distance", distance);

    const pyProcess = spawn("python3", [scriptPath, ...args]);

    const sendSSE = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    pyProcess.stdout.on("data", (data) => {
      const text = data.toString();
      const lines = text.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.includes("[TELEMETRY_JSON]")) {
          const jsonStr = line.replace("[TELEMETRY_JSON]", "").trim();
          try {
            const telemetryObj = JSON.parse(jsonStr);
            sendSSE("telemetry", telemetryObj);
          } catch {
            sendSSE("log", { message: line });
          }
        } else {
          sendSSE("log", { message: line });
        }
      }
    });

    pyProcess.stderr.on("data", (data) => {
      sendSSE("stderr", { message: data.toString() });
    });

    pyProcess.on("close", (code) => {
      sendSSE("end", { code });
      res.end();
    });

    req.on("close", () => {
      pyProcess.kill();
    });
  });

  // 5. Server-side Gemini AI Diagnostics Route
  app.post("/api/gemini/diagnose", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GEMINI_API_KEY is not configured in server environment." });
      }

      const { telemetryLog, context } = req.body;
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const prompt = `You are a Principal Automotive Safety Systems & SDV Software Architect (ISO 26262 ASIL-D certified).
Analyze the following SDV ADAS telemetry log and collision risk metric:

Telemetry Log JSON:
${JSON.stringify(telemetryLog, null, 2)}

Context/Scenario Note:
${context || "Automotive Edge AI ADAS evaluation."}

Please provide a concise, structured safety audit with:
1. Root Cause & Threat Level Assessment (CRITICAL, WARNING, NOMINAL)
2. ISO 26262 Functional Safety / ASIL Hazard Analysis
3. Sensor Fusion & Edge AI Performance Audit (Confidence, Latency, TTC)
4. Recommended Actuation / Calibration Action (Brake torque, speed limiters, sensor fusion weights)`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt
      });

      res.json({ analysis: response.text });
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      res.status(500).json({ error: err.message || "Failed to query Gemini API." });
    }
  });

  // 6. Gemini Multi-Turn Chat Endpoint (with Thinking, Grounding, & Model Selection)
  app.post("/api/gemini/chat", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY environment variable is not set." });
      }

      const {
        messages = [],
        model = "gemini-3.5-flash",
        enableThinking = false,
        enableSearch = false,
        enableMaps = false,
        systemInstruction = "You are a Principal ADAS & Automotive Edge AI Systems Architect (ISO 26262 ASIL-D certified)."
      } = req.body;

      // Build contents array for Gemini
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }));

      // Select model
      let selectedModel = model;
      if (model === "pro" || model === "gemini-3.1-pro-preview") {
        selectedModel = "gemini-3.1-pro-preview";
      } else if (model === "lite" || model === "gemini-3.1-flash-lite") {
        selectedModel = "gemini-3.1-flash-lite";
      } else {
        selectedModel = "gemini-3.5-flash";
      }

      // Configure tools and thinking mode
      const config: any = {
        systemInstruction
      };

      if (enableThinking && selectedModel === "gemini-3.1-pro-preview") {
        config.thinkingConfig = {
          thinkingLevel: ThinkingLevel.HIGH
        };
      }

      const tools: any[] = [];
      if (enableSearch) {
        tools.push({ googleSearch: {} });
      }
      if (enableMaps) {
        tools.push({ googleMaps: {} });
      }
      if (tools.length > 0) {
        config.tools = tools;
      }

      const result = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config
      });

      const candidate = result.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;

      res.json({
        reply: result.text || candidate?.content?.parts?.[0]?.text || "No response generated.",
        groundingMetadata
      });
    } catch (err: any) {
      console.error("Gemini Chat API Error:", err);
      res.status(500).json({ error: err.message || "Failed to complete chat generation." });
    }
  });

  // 7. Gemini Audio Transcription Route
  app.post("/api/gemini/transcribe", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY environment variable is not set." });
      }

      const { base64Audio, mimeType = "audio/webm" } = req.body;
      if (!base64Audio) {
        return res.status(400).json({ error: "Missing base64Audio payload." });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64Audio
            }
          },
          {
            text: "Transcribe the spoken vehicle/driver audio verbatim. Extract any direct ADAS vehicle HUD commands (e.g. 'Inject failsafe', 'Enable ACC at 90 km/h', 'Set obstacle distance 10 meters', 'Run emergency brake scenario')."
          }
        ]
      });

      res.json({ transcription: response.text });
    } catch (err: any) {
      console.error("Audio Transcription Error:", err);
      res.status(500).json({ error: err.message || "Failed to transcribe audio." });
    }
  });

  // 8. Gemini Grounding Search / Maps Route
  app.post("/api/gemini/grounding", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) {
        return res.status(400).json({ error: "GEMINI_API_KEY environment variable is not set." });
      }

      const { query, type = "search" } = req.body;

      const tools: any[] = [];
      if (type === "maps") {
        tools.push({ googleMaps: {} });
      } else {
        tools.push({ googleSearch: {} });
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: query,
        config: {
          tools
        }
      });

      const candidate = response.candidates?.[0];
      res.json({
        result: response.text,
        groundingMetadata: candidate?.groundingMetadata
      });
    } catch (err: any) {
      console.error("Grounding Search Error:", err);
      res.status(500).json({ error: err.message || "Failed to complete grounding search." });
    }
  });

  // 9. Gemini Image Generation & Editing Route
  app.post("/api/gemini/generate-image", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) return res.status(400).json({ error: "GEMINI_API_KEY environment variable is not set." });
      const { prompt, inputImageBase64, mimeType = "image/png", aspectRatio = "16:9", imageSize = "1K" } = req.body;

      const parts: any[] = [];
      if (inputImageBase64) {
        parts.push({ inlineData: { data: inputImageBase64, mimeType } });
      }
      parts.push({ text: prompt || "Generate a futuristic EV high-resolution digital cockpit HUD blueprint display." });

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize
          }
        }
      });

      const candidate = response.candidates?.[0];
      let imageUrl: string | null = null;
      let descriptionText = "";

      if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          } else if (part.text) {
            descriptionText += part.text + " ";
          }
        }
      }

      res.json({ imageUrl, description: descriptionText.trim() });
    } catch (err: any) {
      console.error("Image Generation Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate image." });
    }
  });

  // 10. Veo Video Generation Routes
  app.post("/api/veo/generate", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) return res.status(400).json({ error: "GEMINI_API_KEY is not set." });
      const { prompt, startingImageBase64, mimeType = "image/png", aspectRatio = "16:9", resolution = "720p" } = req.body;

      const payload: any = {
        model: "veo-3.1-lite-generate-preview",
        prompt: prompt || "3D animation of an EV navigating a dense Indian urban traffic junction with stop-and-go creep.",
        config: {
          numberOfVideos: 1,
          resolution,
          aspectRatio
        }
      };

      if (startingImageBase64) {
        payload.image = {
          imageBytes: startingImageBase64,
          mimeType
        };
      }

      const operation = await ai.models.generateVideos(payload);
      res.json({ operationName: operation.name });
    } catch (err: any) {
      console.error("Veo Generate Error:", err);
      res.status(500).json({ error: err.message || "Failed to start Veo video generation." });
    }
  });

  app.post("/api/veo/status", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) return res.status(400).json({ error: "GEMINI_API_KEY is not set." });
      const { operationName } = req.body;
      if (!operationName) return res.status(400).json({ error: "Missing operationName." });

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      res.json({ done: updated.done, response: updated.done ? updated.response : null });
    } catch (err: any) {
      console.error("Veo Status Error:", err);
      res.status(500).json({ error: err.message || "Failed to check Veo status." });
    }
  });

  app.post("/api/veo/download", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) return res.status(400).json({ error: "GEMINI_API_KEY is not set." });
      const { operationName } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });
      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) return res.status(404).json({ error: "Video URI not found." });

      const videoRes = await fetch(uri, {
        headers: { "x-goog-api-key": apiKey! }
      });

      res.setHeader("Content-Type", "video/mp4");
      if (videoRes.body) {
        const reader = videoRes.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      }
      res.end();
    } catch (err: any) {
      console.error("Veo Download Error:", err);
      res.status(500).json({ error: err.message || "Failed to download video." });
    }
  });

// Helper function to synthesize a playable 4-second WAV audio for EV AVAS pedestrian alert fallback
function generateFallbackAvasWavBase64(): string {
  const sampleRate = 22050;
  const durationSec = 4;
  const numSamples = sampleRate * durationSec;
  const dataSize = numSamples * 2;
  const headerSize = 44;
  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM
  buffer.writeUInt16LE(1, 20);  // Uncompressed PCM
  buffer.writeUInt16LE(1, 22);  // Mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
  buffer.writeUInt16LE(2, 32);  // BlockAlign
  buffer.writeUInt16LE(16, 34); // BitsPerSample

  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Synthesize a futuristic 140Hz -> 280Hz dual-sine AVAS tone
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin((Math.PI * t) / durationSec) * Math.min(1, t * 4);
    const freq = 140 + Math.sin(t * 3) * 40;
    const sample = (Math.sin(2 * Math.PI * freq * t) * 0.6 + Math.sin(2 * Math.PI * freq * 1.5 * t) * 0.3) * envelope;
    const intSample = Math.max(-32768, Math.min(32767, Math.floor(sample * 28000)));
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer.toString("base64");
}

  // 11. Lyria Music / AVAS Generator Route
  app.post("/api/lyria/generate", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) return res.status(400).json({ error: "GEMINI_API_KEY is not set." });
      const { prompt = "A 15-second low-frequency EV Acoustic Vehicle Alerting System (AVAS) sound chime with ambient synth chord.", isFullTrack = false } = req.body;

      const model = isFullTrack ? "lyria-3-pro-preview" : "lyria-3-clip-preview";

      const response = await ai.models.generateContentStream({
        model,
        contents: prompt
      });

      let audioBase64 = "";
      let notes = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !notes) {
            notes = part.text;
          }
        }
      }

      if (!audioBase64) {
        // If stream finished without binary audio output, generate fallback WAV
        audioBase64 = generateFallbackAvasWavBase64();
        mimeType = "audio/wav";
        notes = "⚡ [AVAS Synthesizer Active] Generated low-frequency EV acoustic warning chime tone.";
      }

      res.json({ audioBase64, mimeType, notes });
    } catch (err: any) {
      console.info("Lyria API Rate Limit / Quota Reached — Serving Fallback AVAS Sound:", err.message || err);

      // Gracefully fall back to local PCM synthesized WAV on rate limit (429) or quota exhaustion
      const fallbackBase64 = generateFallbackAvasWavBase64();
      res.json({
        audioBase64: fallbackBase64,
        mimeType: "audio/wav",
        notes: "⚡ [AVAS Quota Fallback] Synthesized dual-tone 140Hz-280Hz EV pedestrian warning alert chime (Lyria API Rate Limit Active).",
        isFallback: true
      });
    }
  });

  // 12. Vision / Image Analysis Route
  app.post("/api/gemini/analyze-image", async (req, res) => {
    try {
      const ai = getGenAI();
      if (!ai) return res.status(400).json({ error: "GEMINI_API_KEY is not set." });
      const { imageBase64, mimeType = "image/png", prompt = "Analyze this EV engineering telemetry or component diagram for efficiency, heat, or safety anomalies." } = req.body;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            inlineData: {
              data: imageBase64,
              mimeType
            }
          },
          { text: prompt }
        ]
      });

      res.json({ analysis: response.text });
    } catch (err: any) {
      console.error("Vision Analysis Error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze image." });
    }
  });

  // Vite Middleware setup for dev vs production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`SDV ADAS Controller Server listening on http://0.0.0.0:${PORT}`);
  });

  // Gemini Live API WebSocket Server Attachment
  const wss = new WebSocketServer({ server, path: "/api/gemini/live" });

  wss.on("connection", async (ws) => {
    console.log("Gemini Live WebSocket Client Connected");
    const ai = getGenAI();
    if (!ai) {
      ws.send(JSON.stringify({ error: "GEMINI_API_KEY not configured." }));
      ws.close();
      return;
    }

    try {
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: ["AUDIO" as any],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } }
          },
          systemInstruction: "You are an onboard Vehicle Edge AI Copilot for Indian Urban Traffic SDVs. Keep spoken responses short, technical, and direct."
        },
        callbacks: {
          onmessage: (message) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio) {
              ws.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted) {
              ws.send(JSON.stringify({ interrupted: true }));
            }
          }
        }
      });

      ws.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" }
            });
          }
        } catch (e) {
          console.error("Error parsing WS message:", e);
        }
      });

      ws.on("close", () => {
        session.close();
      });
    } catch (err: any) {
      console.error("Live session connection error:", err);
      ws.send(JSON.stringify({ error: err.message }));
    }
  });
}

startServer();
