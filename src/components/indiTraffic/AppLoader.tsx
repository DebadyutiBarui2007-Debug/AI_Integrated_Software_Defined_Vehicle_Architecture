import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Car, Cpu, BatteryCharging, Zap } from "lucide-react";

interface AppLoaderProps {
  isLoading: boolean;
  onComplete?: () => void;
}

export const AppLoader: React.FC<AppLoaderProps> = ({ isLoading, onComplete }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isLoading) return;
    
    // Target duration ~3.5 seconds to reach 100%, plus exit animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          if (onComplete) setTimeout(onComplete, 400); // 400ms hold before exit
          return 100;
        }
        // Advance by approx 2.5 to 3.5% every 100ms -> ~3 to 4 seconds total
        return Math.min(100, prev + Math.random() * 3 + 1.5);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, onComplete]);

  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20, filter: "blur(10px)" }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Animated background gradient */}
          <motion.div 
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                "radial-gradient(circle at 50% 50%, rgba(14,165,233,0.1) 0%, transparent 50%)",
                "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 60%)",
                "radial-gradient(circle at 50% 50%, rgba(14,165,233,0.1) 0%, transparent 50%)"
              ]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          />

          <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="relative"
            >
              <div className="absolute inset-0 bg-sky-500/30 blur-2xl rounded-full" />
              <div className="p-4 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl shadow-2xl shadow-sky-500/20 text-white relative z-10 border border-white/10">
                <Car className="w-12 h-12" />
              </div>
            </motion.div>

            <motion.h1 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 text-2xl font-bold text-white tracking-tight text-center"
            >
              IndiTraffic SDV
            </motion.h1>
            
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-slate-400 text-sm mt-2 text-center"
            >
              Initializing Edge AI Architecture...
            </motion.p>

            {/* Progress Bar Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="w-full mt-10 space-y-2"
            >
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-sky-400">SYS_BOOT</span>
                <span className="text-slate-300">{Math.floor(progress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 relative"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.2 }}
                >
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_1s_infinite_linear] bg-[length:20px_100%]" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)' }} />
                </motion.div>
              </div>
            </motion.div>

            {/* Diagnostic icons loading */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex items-center justify-center gap-6 mt-8"
            >
              <div className={`flex flex-col items-center gap-1.5 transition-opacity duration-300 ${progress > 20 ? 'opacity-100' : 'opacity-30'}`}>
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-mono text-slate-500">NPU</span>
              </div>
              <div className={`flex flex-col items-center gap-1.5 transition-opacity duration-300 ${progress > 50 ? 'opacity-100' : 'opacity-30'}`}>
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-mono text-slate-500">INV</span>
              </div>
              <div className={`flex flex-col items-center gap-1.5 transition-opacity duration-300 ${progress > 80 ? 'opacity-100' : 'opacity-30'}`}>
                <BatteryCharging className="w-4 h-4 text-sky-400" />
                <span className="text-[10px] font-mono text-slate-500">BMS</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
