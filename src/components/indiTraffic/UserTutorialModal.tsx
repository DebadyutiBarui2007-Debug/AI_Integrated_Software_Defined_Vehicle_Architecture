import React, { useState, useEffect } from "react";
import {
  Car,
  Sliders,
  TrendingUp,
  Code,
  Radio,
  Sparkles,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Play,
  Zap,
  ShieldAlert,
  Thermometer,
  Cpu,
  BookOpen,
  RotateCcw,
  Compass,
  Lightbulb,
  Award,
  Layers,
  Activity
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "TWIN" | "WORKBENCH" | "ROI" | "AUTOSAR" | "CAN_VAULT" | "AI_STUDIO";
  setActiveTab: (tab: "TWIN" | "WORKBENCH" | "ROI" | "AUTOSAR" | "CAN_VAULT" | "AI_STUDIO") => void;
  onTriggerCutInEvent?: () => void;
  onToggleSimulation?: () => void;
  isSimulating?: boolean;
}

interface TourStep {
  id: string;
  title: string;
  category: string;
  targetTab: "TWIN" | "WORKBENCH" | "ROI" | "AUTOSAR" | "CAN_VAULT" | "AI_STUDIO";
  icon: React.ReactNode;
  badge: string;
  badgeColor: string;
  summary: string;
  keyFeatures: string[];
  proTip: string;
  interactiveActionLabel?: string;
  onAction?: () => void;
}

export const UserTutorialModal: React.FC<Props & { onTriggerHeatwave?: () => void }> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onTriggerCutInEvent,
  onToggleSimulation,
  isSimulating,
  onTriggerHeatwave
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"GUIDED_TOUR" | "FEATURE_INDEX">("GUIDED_TOUR");
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (dontShowAgain) {
      localStorage.setItem("inditraffic_tutorial_completed", "true");
    } else {
      localStorage.removeItem("inditraffic_tutorial_completed");
    }
  }, [dontShowAgain]);

  if (!isOpen) return null;

  const tourSteps: TourStep[] = [
    {
      id: "intro",
      title: "Welcome to IndiTraffic SDV Edge Architect",
      category: "Overview & Mission",
      targetTab: "TWIN",
      icon: <Compass className="w-6 h-6 text-sky-400" />,
      badge: "Platform Guide",
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      summary:
        "IndiTraffic is a Software-Defined Vehicle (SDV) Edge AI architectural simulator tailored specifically for Indian urban traffic conditions (e.g. Silk Board Bangalore, Old Delhi swarm, Mumbai Western Express).",
      keyFeatures: [
        "Simulates thermal inverter stress, micro-regen energy recovery, and adaptive 6kHz PWM switching.",
        "Demonstrates 1.5 km/h creep-mode regenerative braking vs legacy 12 km/h friction cutoffs.",
        "Calculates annual fuel/electricity cost savings (₹) and battery SOH lifespan extension.",
        "Generates production-ready AUTOSAR C/C++ Adaptive code via Gemini AI Copilot."
      ],
      proTip: "Use the top header navigation tabs or this tutorial at any time to explore module capabilities."
    },
    {
      id: "twin",
      title: "1. Live Traffic Twin & Predictive Analyzer",
      category: "Core Simulation Engine",
      targetTab: "TWIN",
      icon: <Car className="w-6 h-6 text-emerald-400" />,
      badge: "Canvas & Hazard Map",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      summary:
        "The Live Traffic Twin renders real-time 2D road dynamics with ego-vehicle physics, auto-rickshaw swarm cut-ins, and a 5-minute predictive traffic jam analyzer.",
      keyFeatures: [
        "Real-Time 2D Canvas: Animated vehicle movement, cut-in trajectories, and speed telemetry.",
        "5-Min Predictive Jam Analyzer: Edge NPU trajectory model forecasting tailback queue meters and bottleneck delays.",
        "Hazard Overlay: Visual red/amber danger corridor warning on the road canvas during gridlock.",
        "Traffic Density Heatmap: Spatial density map showing stop frequency and micro-crawl zones."
      ],
      proTip: "Click 'Inject Cut-In Event' in the header to observe how the Edge NPU immediately adjusts torque and pre-cools the inverter.",
      interactiveActionLabel: "Simulate Auto-Rickshaw Cut-In",
      onAction: () => {
        if (onTriggerCutInEvent) onTriggerCutInEvent();
      }
    },
    {
      id: "gauges",
      title: "2. Thermal Stress & Efficiency Gauges",
      category: "Real-Time Telemetry",
      targetTab: "TWIN",
      icon: <Thermometer className="w-6 h-6 text-amber-400" />,
      badge: "Hardware Telemetry",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      summary:
        "The sticky Telemetry Gauge bar monitors critical powertrain metrics in real-time, highlighting the contrast between conventional EV baselines and SDV Edge optimization.",
      keyFeatures: [
        "Inverter Junction Temp: SiC MOSFET thermal stress monitoring (72°C optimized vs 88°C baseline).",
        "Kinetic Energy Recovery Rate: Real-time % of deceleration energy captured during creep speeds.",
        "HVAC Compressor Spillover: Smart HVAC power modulation during heavy stop-and-go acceleration.",
        "NPU Processing Latency: Edge AI inferencing delay (~3.8ms on Qualcomm Snapdragon Ride)."
      ],
      proTip: "Watch the inverter junction temperature drop when switching from 10kHz fixed PWM to 6kHz Adaptive PWM."
    },
    {
      id: "weather_thermal",
      title: "3. Extreme Weather & Auto Thermal Optimization",
      category: "Climate Resilience Simulation",
      targetTab: "WORKBENCH",
      icon: <Thermometer className="w-6 h-6 text-rose-400" />,
      badge: "Hands-on Feature",
      badgeColor: "bg-rose-500/20 text-rose-300 border-rose-500/30",
      summary:
        "India experiences brutal weather conditions. This new feature allows you to simulate Extreme Heatwaves (48°C), Monsoon Rain, and Winter Fog, observing direct impacts on powertrain efficiency.",
      keyFeatures: [
        "Climate Dropdown: Select 'HEATWAVE_DELHI' in the top header or Workbench.",
        "Thermal Auto-Optimization: When battery temp exceeds 50°C, the system automatically intervenes.",
        "HVAC Load Shedding: The SDV Edge immediately redirects HVAC compressor spillover to 20% to prioritize core powertrain cooling.",
        "Visual Canvas Weather: Observe dynamic heat shimmer, rain streaks, and fog layers on the digital twin canvas."
      ],
      proTip: "Try setting the climate to 'Extreme Heatwave'. Watch the battery temperature climb past 50°C, triggering the 'THERMAL OPTIMIZATION ENGAGED' banner.",
      interactiveActionLabel: "Trigger Thermal Heatwave",
      onAction: () => {
        if (onTriggerHeatwave) onTriggerHeatwave();
      }
    },
    {
      id: "workbench",
      title: "4. SDV Architecture Workbench",
      category: "Architectural Tuning",
      targetTab: "WORKBENCH",
      icon: <Sliders className="w-6 h-6 text-purple-400" />,
      badge: "Parameter Controls",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      summary:
        "Fine-tune the vehicle's embedded software architecture parameters and test against challenging Indian urban traffic scenarios.",
      keyFeatures: [
        "Architecture Type: Toggle between IndiTraffic SDV Edge AI and Legacy Conventional EV.",
        "Traffic Scenarios: Select Silk Board Crawl, Old Delhi Swarm, Highway Cruise, or Monsoon Heavy Creep.",
        "Micro-Regen Cutoff: Adjust low-speed regen down to 1.5 km/h vs legacy 12 km/h friction limits.",
        "PWM Switching Strategy: Switch between 6kHz Adaptive Creep, 10kHz Fixed, or 16kHz High-Speed."
      ],
      proTip: "Notice how setting lowSpeedRegenCutoffKmh to 1.5 km/h drastically reduces brake pad wear index.",
      interactiveActionLabel: "Open Workbench Tab",
      onAction: () => setActiveTab("WORKBENCH")
    },
    {
      id: "roi",
      title: "4. Market ROI & Regenerative Brake Sweep",
      category: "Economic Analytics",
      targetTab: "ROI",
      icon: <TrendingUp className="w-6 h-6 text-sky-400" />,
      badge: "Financial Return",
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
      summary:
        "Calculate annual cost savings in Indian Rupees (₹) and analyze the parametric trade-off curve between battery life extension and energy recovery.",
      keyFeatures: [
        "Cost Savings Breakdown: Itemized annual financial benefits (₹/yr) from power & brake pad wear reduction.",
        "Regenerative Brake Sweep: Interactive chart sweeping brakeBlendRampMs (20ms to 200ms) against battery SOH lifespan.",
        "Energy Efficiency Rate: Compare Wh/km metrics directly against conventional EV baselines.",
        "Interactive Preset Tuner: Instant single-click Pareto-optimal calibration for Indian driving."
      ],
      proTip: "Click 'View Cost Breakdown Modal' in the ROI tab to customize annual driving kilometers and electricity tariffs.",
      interactiveActionLabel: "View ROI & Cost Analytics",
      onAction: () => setActiveTab("ROI")
    },
    {
      id: "autosar",
      title: "5. AUTOSAR Code & Gemini Copilot",
      category: "Embedded Software",
      targetTab: "AUTOSAR",
      icon: <Code className="w-6 h-6 text-indigo-400" />,
      badge: "Code Generation",
      badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
      summary:
        "Inspect production-ready C/C++ AUTOSAR Adaptive Software Components (SWC) and consult the built-in Gemini Automotive Architect Copilot.",
      keyFeatures: [
        "AUTOSAR C/C++ Code Output: Compliant SWC runnable headers with real-time parameter bindings.",
        "Arxml Data Dictionary: AUTOSAR system description metadata generator for ECU flashing.",
        "Gemini AI Copilot: Ask complex engineering questions about vectoring, ISO 26262 functional safety, and CAN bus frames."
      ],
      proTip: "Ask Gemini Copilot 'How does 6kHz PWM reduce inverter switching losses during 5 km/h urban crawl?'",
      interactiveActionLabel: "Open AUTOSAR Copilot",
      onAction: () => setActiveTab("AUTOSAR")
    },
    {
      id: "can_vault",
      title: "6. CAN Bus Stream & Cloud Vault",
      category: "Networking & Cloud",
      targetTab: "CAN_VAULT",
      icon: <Radio className="w-6 h-6 text-emerald-400" />,
      badge: "CAN J1939 & Firebase",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      summary:
        "Monitor raw CAN High-Speed (HS1) 500kbps frames in hex format and sync telemetry snapshots directly to Google Cloud Firestore.",
      keyFeatures: [
        "Real-time CAN Hex Log: Displays CAN ID 0x18F, 0x2C4, and 0x3E1 J1939 frame payloads.",
        "CAN DBC Parser: Inspect signal mappings for Inverter Temp, Regen Torque, and Pedestrian Warnings.",
        "Cloud Firestore Vault: Save telemetry snapshots and review historical architecture logs securely."
      ],
      proTip: "Click 'Save Telemetry Snapshot' to persist live vehicle metrics to the Firebase database.",
      interactiveActionLabel: "Open CAN & Cloud Vault",
      onAction: () => setActiveTab("CAN_VAULT")
    },
    {
      id: "ai_studio",
      title: "7. Gemini Multimodal Studio & AVAS",
      category: "AI Multimodal Features",
      targetTab: "AI_STUDIO",
      icon: <Sparkles className="w-6 h-6 text-purple-400" />,
      badge: "Vision, Voice & Audio",
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      summary:
        "Leverage Gemini 2.5 Flash Vision for thermal inspection, live voice command transcription, and Lyria/WebAudio AVAS acoustic pedestrian warning tone synthesis.",
      keyFeatures: [
        "Thermal Vision Inspector: Analyze thermal camera images for motor stator hot spots.",
        "Voice Command Transcriber: Hands-free driver voice command input with AI intent recognition.",
        "AVAS Pedestrian Sound Generator: Synthesizes low-frequency 140Hz-280Hz EV pedestrian warning alert chimes."
      ],
      proTip: "Click 'Synthesize AVAS Sound' in the Multimodal Studio tab to hear the generated EV pedestrian warning tone.",
      interactiveActionLabel: "Open Multimodal Studio",
      onAction: () => setActiveTab("AI_STUDIO")
    }
  ];

  const currentStep = tourSteps[currentStepIndex];

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      setActiveTab(tourSteps[nextIdx].targetTab);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      setActiveTab(tourSteps[prevIdx].targetTab);
    }
  };

  const handleSelectStep = (index: number) => {
    setCurrentStepIndex(index);
    setActiveTab(tourSteps[index].targetTab);
    setViewMode("GUIDED_TOUR");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl text-slate-100">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-xl shadow-lg shadow-sky-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                IndiTraffic SDV Interactive Guided Tour
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  User Onboarding
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Complete walkthrough of architecture simulation, telemetry, ROI analytics, and Gemini AI studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-mono flex items-center gap-1">
              <button
                onClick={() => setViewMode("GUIDED_TOUR")}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMode === "GUIDED_TOUR"
                    ? "bg-sky-600 text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Guided Tour
              </button>
              <button
                onClick={() => setViewMode("FEATURE_INDEX")}
                className={`px-2.5 py-1 rounded-md transition ${
                  viewMode === "FEATURE_INDEX"
                    ? "bg-sky-600 text-white font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Feature Index
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Tutorial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {viewMode === "GUIDED_TOUR" ? (
            <>
              {/* Progress Bar & Indicators */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>
                    Step {currentStepIndex + 1} of {tourSteps.length}:{" "}
                    <strong className="text-sky-400">{currentStep.category}</strong>
                  </span>
                  <span>{Math.round(((currentStepIndex + 1) / tourSteps.length) * 100)}% Complete</span>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full transition-all duration-300"
                    style={{ width: `${((currentStepIndex + 1) / tourSteps.length) * 100}%` }}
                  />
                </div>

                {/* Step Dots */}
                <div className="flex items-center justify-between pt-1">
                  {tourSteps.map((step, idx) => (
                    <button
                      key={step.id}
                      onClick={() => handleSelectStep(idx)}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentStepIndex
                          ? "w-8 bg-sky-400"
                          : idx < currentStepIndex
                          ? "w-2 bg-emerald-400"
                          : "w-2 bg-slate-700 hover:bg-slate-600"
                      }`}
                      title={step.title}
                    />
                  ))}
                </div>
              </div>

              {/* Main Step Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl">
                      {currentStep.icon}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        {currentStep.title}
                      </h3>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${currentStep.badgeColor}`}>
                        {currentStep.badge}
                      </span>
                    </div>
                  </div>

                  {currentStep.interactiveActionLabel && currentStep.onAction && (
                    <button
                      onClick={currentStep.onAction}
                      className="px-3 py-1.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      {currentStep.interactiveActionLabel}
                    </button>
                  )}
                </div>

                {/* Summary Text */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {currentStep.summary}
                </p>

                {/* Key Functional Highlights */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Key Capabilities & Controls
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {currentStep.keyFeatures.map((feat, i) => (
                      <div
                        key={i}
                        className="bg-slate-900/80 border border-slate-800/80 p-2.5 rounded-lg text-slate-300 leading-snug flex items-start gap-2"
                      >
                        <span className="text-sky-400 font-bold font-mono text-[11px] mt-0.5">•</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pro Tip Box */}
                <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-xl flex items-start gap-2.5 text-xs text-sky-200">
                  <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300">Architect Pro Tip: </strong>
                    <span>{currentStep.proTip}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* FEATURE INDEX DIRECTORY MODE */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Module to Jump Directly
                </h3>
                <span className="text-xs font-mono text-sky-400">
                  {tourSteps.length} Modules Available
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tourSteps.map((step, idx) => (
                  <button
                    key={step.id}
                    onClick={() => handleSelectStep(idx)}
                    className="p-3.5 bg-slate-950 border border-slate-800 hover:border-sky-500/50 rounded-xl text-left transition space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg group-hover:border-sky-500/30">
                          {step.icon}
                        </div>
                        <span className="text-xs font-bold text-white group-hover:text-sky-400 transition">
                          {step.title}
                        </span>
                      </div>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${step.badgeColor}`}>
                        {step.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {step.summary}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Navigation Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500"
            />
            <span>Don't auto-open tutorial on launch</span>
          </label>

          <div className="flex items-center gap-2">
            {viewMode === "GUIDED_TOUR" && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentStepIndex === 0}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                    currentStepIndex === 0
                      ? "bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <button
                  onClick={handleNext}
                  className="px-4 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-lg shadow-sky-600/20 transition"
                >
                  <span>
                    {currentStepIndex === tourSteps.length - 1 ? "Finish Tutorial" : "Next Module"}
                  </span>
                  {currentStepIndex === tourSteps.length - 1 ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              </>
            )}

            {viewMode === "FEATURE_INDEX" && (
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
              >
                Close Index
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
