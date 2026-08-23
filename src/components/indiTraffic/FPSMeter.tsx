import React, { useEffect, useState, useRef } from "react";
import { Activity } from "lucide-react";

export const FPSMeter: React.FC = () => {
  const [fps, setFps] = useState(60);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);

  const updateFPS = (time: number) => {
    frameCountRef.current++;
    const delta = time - lastTimeRef.current;
    
    // Update FPS calculation every 500ms for stability
    if (delta >= 500) {
      setFps(Math.round((frameCountRef.current * 1000) / delta));
      lastTimeRef.current = time;
      frameCountRef.current = 0;
    }
    
    requestRef.current = requestAnimationFrame(updateFPS);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(updateFPS);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1.5 rounded-md border border-slate-700/50 shadow-lg text-[10px] font-mono font-bold">
      <Activity className={`w-3 h-3 ${fps >= 55 ? "text-emerald-400" : fps >= 30 ? "text-amber-400" : "text-rose-400"}`} />
      <span className={fps >= 55 ? "text-emerald-400" : fps >= 30 ? "text-amber-400" : "text-rose-400"}>
        {fps} FPS
      </span>
      <span className="text-slate-500 ml-1">RENDER</span>
    </div>
  );
};
