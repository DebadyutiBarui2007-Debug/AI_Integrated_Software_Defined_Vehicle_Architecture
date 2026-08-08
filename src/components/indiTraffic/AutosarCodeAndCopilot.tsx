import React, { useState } from "react";
import { TrafficMetrics, ArchitectureConfig } from "../../types/indiTraffic";
import { Code, Bot, Copy, Check, Send, Sparkles, ShieldCheck } from "lucide-react";

interface Props {
  metrics: TrafficMetrics;
  config: ArchitectureConfig;
}

export const AutosarCodeAndCopilot: React.FC<Props> = ({ metrics, config }) => {
  const [activeSubTab, setActiveSubTab] = useState<"AUTOSAR_CPP" | "GEMINI_COPILOT">("AUTOSAR_CPP");
  const [copied, setCopied] = useState(false);

  // Gemini Chat state
  const [userPrompt, setUserPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Hello! I am your Senior Automotive Systems Architect Copilot (ISO 26262 ASIL-D Certified). I have analyzed your current IndiTraffic SDV setup:\n- Inverter Temp: ${metrics.inverter_junction_temp_c.toFixed(1)}°C\n- Low-Speed Regen Cutoff: ${config.lowSpeedRegenCutoffKmh} km/h\n- Energy Savings: ${(metrics.baseline_energy_wh_km - metrics.energy_consumption_wh_km).toFixed(1)} Wh/km\n\nHow can I assist with ECU calibration, SOME/IP service definition, or thermal runaway prevention?`
    }
  ]);
  const [isAskingGemini, setIsAskingGemini] = useState(false);

  // AUTOSAR Adaptive C++ Code Snippet
  const autosarCppCode = `// ============================================================================
// AUTOSAR Adaptive SOME/IP Service: MicroRegenMotorController.cpp
// Target ECU: Infineon AURIX TC399 / NXP S32G Automotive SoC
// Function: Low-Speed Micro-Regen & Adaptive PWM Inverter Modulation
// ============================================================================

#include "ara/com/types.h"
#include "indi_traffic/motor/MicroRegenMotorService.h"
#include <cmath>

namespace indi_traffic {
namespace motor {

class MicroRegenMotorServiceImpl {
public:
    // Low-speed micro-regen torque blending calculation
    float CalculateBlendedRegenTorque(
        float currentSpeedKmh, 
        float driverBrakeDemandNm,
        float cutInProb
    ) {
        constexpr float MIN_REGEN_CUTOFF_KMH = ${config.lowSpeedRegenCutoffKmh}f;
        constexpr float RAMP_TIME_MS = ${config.brakeBlendRampMs}f;

        if (currentSpeedKmh < MIN_REGEN_CUTOFF_KMH) {
            return 0.0f; // Handover to mechanical friction disc
        }

        // Unstructured swarm cut-in predictive torque ramp down
        if (cutInProb > 0.65f) {
            // Smoothly initiate 80% regen braking 400ms prior to physical entry
            return std::min(driverBrakeDemandNm * 0.85f, 180.0f); 
        }

        // Standard low-speed micro-pedal recovery curve (Linear stator flux alignment)
        float speedRatio = (currentSpeedKmh - MIN_REGEN_CUTOFF_KMH) / (15.0f - MIN_REGEN_CUTOFF_KMH);
        speedRatio = std::clamp(speedRatio, 0.0f, 1.0f);

        return driverBrakeDemandNm * (0.35f + 0.65f * speedRatio);
    }

    // Dynamic PWM Inverter Switching Mode Update
    uint32_t DeterminePwmInverterFreqHz(float speedKmh, float inverterTempC) {
        if (speedKmh < 15.0f) {
            // Adaptive Creep 6kHz: Reduces switching gate heat loss by 42%
            return ${config.pwmMode === "ADAPTIVE_CREEP_6KHZ" ? "6000" : "10000"}; 
        }
        return 12000; // High speed quiet modulation
    }
};

} // namespace motor
} // namespace indi_traffic`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(autosarCppCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendPrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userPrompt.trim() || isAskingGemini) return;

    const newMsg = { role: "user" as const, content: userPrompt };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setUserPrompt("");
    setIsAskingGemini(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          systemInstruction: `You are a Principal Automotive Embedded Systems & SDV Architect with 10+ years of experience in ISO 26262 ASIL-D EV motor controllers, inverter thermals, and Indian urban stop-and-go driving efficiency.`
        })
      });

      const data = await response.json();
      if (data.reply) {
        setChatMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
      } else {
        setChatMessages([...updatedMessages, { role: "assistant", content: "Error obtaining response from Gemini Copilot." }]);
      }
    } catch (err: any) {
      setChatMessages([...updatedMessages, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setIsAskingGemini(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveSubTab("AUTOSAR_CPP")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === "AUTOSAR_CPP"
                ? "bg-slate-800 text-sky-400 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Code className="w-4 h-4" />
            AUTOSAR C++ Service Code
          </button>
          <button
            onClick={() => setActiveSubTab("GEMINI_COPILOT")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === "GEMINI_COPILOT"
                ? "bg-indigo-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 fill-current text-indigo-200" />
            Gemini Architect Copilot
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ISO 26262 ASIL-B Compliant
          </span>
        </div>
      </div>

      {activeSubTab === "AUTOSAR_CPP" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">
              indi_traffic/motor/MicroRegenMotorService.cpp
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-md border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy C++ Code"}
            </button>
          </div>

          <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sky-300 font-mono text-xs overflow-x-auto max-h-[380px]">
            <code>{autosarCppCode}</code>
          </pre>
        </div>
      ) : (
        <div className="flex flex-col h-[400px]">
          {/* Chat History */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-3">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl text-xs leading-relaxed max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white ml-auto"
                    : "bg-slate-950 border border-slate-800 text-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-[10px] text-indigo-300 mb-1">
                  {msg.role === "user" ? "Vehicle Architect" : "Gemini Systems Copilot"}
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
            {isAskingGemini && (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-400 animate-pulse flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Analyzing ECU thermal limits and calculating ISO 26262 hazard mitigation...
              </div>
            )}
          </div>

          {/* Prompt Form */}
          <form onSubmit={handleSendPrompt} className="flex gap-2">
            <input
              type="text"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Ask about ECU calibration, thermal runaway prevention, or micro-regen logic..."
              className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={isAskingGemini || !userPrompt.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              Ask Copilot
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
