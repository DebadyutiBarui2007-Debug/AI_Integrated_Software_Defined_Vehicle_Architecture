// Web Audio API Audio Cues & SpeechSynthesis Text-to-Speech Voice Log Assistant

let audioCtx: AudioContext | null = null;
let isAudioMuted = false;
let voiceLogHistory: { id: string; timestamp: string; text: string; type: "EMERGENCY" | "FAILSAFE" | "WARNING" | "INFO" }[] = [];
let voiceLogListeners: (() => void)[] = [];

export function subscribeVoiceLogs(listener: () => void) {
  voiceLogListeners.push(listener);
  return () => {
    voiceLogListeners = voiceLogListeners.filter((l) => l !== listener);
  };
}

function notifyVoiceLogListeners() {
  voiceLogListeners.forEach((l) => l());
}

export function getVoiceLogHistory() {
  return voiceLogHistory;
}

export function clearVoiceLogHistory() {
  voiceLogHistory = [];
  notifyVoiceLogListeners();
}

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function toggleAudioMute(muted?: boolean): boolean {
  if (muted !== undefined) {
    isAudioMuted = muted;
  } else {
    isAudioMuted = !isAudioMuted;
  }
  if (isAudioMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  return isAudioMuted;
}

export function getIsAudioMuted(): boolean {
  return isAudioMuted;
}

/**
 * Text-to-Speech Voice Log Assistant Announcement
 */
export function speakVoiceLog(
  text: string,
  type: "EMERGENCY" | "FAILSAFE" | "WARNING" | "INFO" = "INFO",
  forceSpoken: boolean = false
) {
  const logItem = {
    id: `vlog-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    text,
    type
  };
  voiceLogHistory = [logItem, ...voiceLogHistory].slice(0, 25);
  notifyVoiceLogListeners();

  if (isAudioMuted && !forceSpoken) return;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

  try {
    if (type === "EMERGENCY" || type === "FAILSAFE" || forceSpoken) {
      window.speechSynthesis.cancel(); // Prioritize high-priority vehicle alert
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = type === "EMERGENCY" ? 1.15 : type === "FAILSAFE" ? 0.95 : 1.0;
    utterance.volume = 0.95;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.lang.startsWith("en") && v.name.includes("Natural")) || v.name.includes("Google") || v.name.includes("Samantha") || v.lang.startsWith("en")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("Speech synthesis failed:", err);
  }
}

/**
 * High Priority Speech Announcement Helpers
 */
export function announceEmergencyBrakeVoiceLog(speedKmh: number, distanceMeters: number) {
  const text = `Emergency Brake Triggered! Vehicle speed ${Math.round(speedKmh)} kilometers per hour. Obstacle at ${distanceMeters.toFixed(1)} meters.`;
  playEmergencyBrakeCue();
  speakVoiceLog(text, "EMERGENCY");
}

export function announceFailsafeVoiceLog() {
  const text = "Warning! ADAS Controller entering Degraded Failsafe Mode. Camera Vision Stream Invalid.";
  playFailsafeCue();
  speakVoiceLog(text, "FAILSAFE");
}

export function announceWarningVoiceLog(distanceMeters: number) {
  const text = `Caution! Collision warning. Obstacle ahead at ${distanceMeters.toFixed(1)} meters.`;
  speakVoiceLog(text, "WARNING");
}

/**
 * Distinct, non-intrusive sound cue for EMERGENCY_BRAKE transition.
 * Rapid dual-tone high priority chime (880 Hz / 1100 Hz).
 */
export function playEmergencyBrakeCue() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.12, now);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  masterGain.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);
  osc1.frequency.exponentialRampToValueAtTime(950, now + 0.15);
  osc1.connect(masterGain);

  osc1.start(now);
  osc1.stop(now + 0.18);

  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1100, now + 0.15);
  osc2.frequency.exponentialRampToValueAtTime(1200, now + 0.35);
  osc2.connect(masterGain);

  osc2.start(now + 0.15);
  osc2.stop(now + 0.42);
}

/**
 * Distinct sound cue for FAILSAFE state transition.
 * System degradation descending triple chime (660 Hz -> 520 Hz -> 390 Hz).
 */
export function playFailsafeCue() {
  if (isAudioMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.14, now);
  masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(1200, now);

  masterGain.connect(filter);
  filter.connect(ctx.destination);

  const osc1 = ctx.createOscillator();
  osc1.type = "triangle";
  osc1.frequency.setValueAtTime(660, now);
  osc1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + 0.16);

  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.setValueAtTime(520, now + 0.16);
  osc2.connect(masterGain);
  osc2.start(now + 0.16);
  osc2.stop(now + 0.32);

  const osc3 = ctx.createOscillator();
  osc3.type = "sawtooth";
  osc3.frequency.setValueAtTime(390, now + 0.32);
  osc3.connect(masterGain);
  osc3.start(now + 0.32);
  osc3.stop(now + 0.55);
}

