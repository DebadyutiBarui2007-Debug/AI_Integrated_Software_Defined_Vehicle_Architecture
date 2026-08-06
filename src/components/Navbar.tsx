import React from "react";
import { Cpu, ShieldAlert, Radio, Code2, Database, Sparkles, Activity, Lock, LogIn, LogOut, UserCheck } from "lucide-react";
import { User, signInWithPopup, googleProvider, signInAnonymously, signOut, auth } from "../lib/firebase";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  lastCommand: string;
  user: User | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isSimulating,
  onToggleSimulation,
  lastCommand,
  user
}) => {
  const navItems = [
    { id: "hud", label: "Cockpit & Radar HUD", icon: ShieldAlert, shortcut: "1" },
    { id: "bus", label: "SOA Message Bus", icon: Radio, shortcut: "2" },
    { id: "edge", label: "Edge AI & Inference", icon: Cpu, shortcut: "3" },
    { id: "python", label: "Python Engine & Code", icon: Code2, shortcut: "4" },
    { id: "telemetry", label: "JSON Telemetry Vault", icon: Database, shortcut: "5" },
    { id: "forensic", label: "5-Min Forensic Recorder", icon: Lock, shortcut: "6" },
    { id: "copilot", label: "Gemini Safety Copilot", icon: Sparkles, shortcut: "7" },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* App Branding */}
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <Activity className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-cyan-300 bg-clip-text text-transparent">
                  SDV Edge AI ADAS
                </h1>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                  SOA Architecture
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                SOME/IP Message Bus &bull; ISO 26262 ASIL-D AEB Controller
              </p>
            </div>
          </div>

          {/* Status Badge & Engine Trigger */}
          <div className="flex items-center space-x-3">
            {/* Actuation Command Pill */}
            <div
              className={`hidden md:flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono font-semibold border ${
                lastCommand === "FAILSAFE"
                  ? "bg-purple-950/90 text-purple-300 border-purple-500 animate-pulse shadow-lg shadow-purple-950/50"
                  : lastCommand === "EMERGENCY_BRAKE"
                  ? "bg-rose-950/80 text-rose-300 border-rose-600/80 animate-pulse shadow-lg shadow-rose-950/50"
                  : lastCommand === "WARNING"
                  ? "bg-amber-950/80 text-amber-300 border-amber-600/80"
                  : "bg-emerald-950/80 text-emerald-300 border-emerald-600/80"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current animate-ping" />
              <span>ACTUATION: {lastCommand || "MAINTAIN"}</span>
            </div>

            {/* Firebase Auth Chip */}
            {user ? (
              <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-emerald-800/60 font-mono text-xs">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold max-w-[120px] truncate">
                  {user.displayName || user.email || `Eng (${user.uid.substring(0, 5)})`}
                </span>
                <button
                  onClick={() => signOut(auth)}
                  className="text-slate-400 hover:text-rose-400 transition-colors ml-1"
                  title="Sign Out of Firebase"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithPopup(auth, googleProvider)}
                className="bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center space-x-1 transition-all"
                title="Sign in with Google to access Telemetry Vault & CSV Export"
              >
                <LogIn className="w-3.5 h-3.5 text-cyan-400" />
                <span>Auth Sign-In</span>
              </button>
            )}

            {/* Run / Stop Simulation Button */}
            <button
              onClick={onToggleSimulation}
              title="Press 'S' key to toggle simulation state"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-all duration-200 shadow-sm ${
                isSimulating
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
                  : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-cyan-600/30"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isSimulating ? "bg-white animate-pulse" : "bg-cyan-200"}`} />
              <span>{isSimulating ? "Pause Bus Engine" : "Start Live Simulation"}</span>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/20 text-white/90 border border-white/20">
                S
              </kbd>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar pb-2 pt-1 border-t border-slate-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={`Press '${item.shortcut}' key to switch to ${item.label}`}
                className={`flex items-center space-x-2 px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-slate-800 text-cyan-400 border border-slate-700/80 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
                <kbd
                  className={`px-1 py-0.2 rounded text-[9px] font-mono border ${
                    isActive
                      ? "bg-cyan-950 text-cyan-300 border-cyan-800/80"
                      : "bg-slate-900 text-slate-500 border-slate-800"
                  }`}
                >
                  {item.shortcut}
                </kbd>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
