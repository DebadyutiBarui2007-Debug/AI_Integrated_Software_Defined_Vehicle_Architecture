import express from "express";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { createServer as createViteServer } from "vite";

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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SDV ADAS Controller Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
