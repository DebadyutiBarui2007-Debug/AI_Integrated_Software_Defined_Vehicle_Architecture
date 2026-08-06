import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import {
  Zap,
  Cpu,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Battery,
  Activity,
  Award,
  Sparkles,
  Info
} from "lucide-react";
import { TelemetryEvent, SensorMetrics } from "../types";

interface EdgePowerConsumptionChartProps {
  telemetryLogs?: TelemetryEvent[];
  metrics: SensorMetrics;
  lastCommand: string;
}

interface PowerDataPoint {
  index: number;
  timeStr: string;
  unixTime: number;
  powerWatts: number;
  command: "EMERGENCY_BRAKE" | "WARNING" | "MAINTAIN" | "FAILSAFE" | string;
  priority: string;
  distance: number;
  latencyMs: number;
}

export const EdgePowerConsumptionChart: React.FC<EdgePowerConsumptionChartProps> = ({
  telemetryLogs = [],
  metrics,
  lastCommand
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<PowerDataPoint | null>(null);

  // Extract up to 30 recent telemetry data points ordered chronologically (oldest -> newest)
  const powerData: PowerDataPoint[] = React.useMemo(() => {
    const sorted = [...telemetryLogs]
      .slice(0, 35)
      .reverse();

    if (sorted.length === 0) {
      // Fallback baseline data if no logs yet
      const now = Date.now() / 1000;
      return Array.from({ length: 15 }, (_, i) => ({
        index: i,
        timeStr: new Date((now - (15 - i) * 1) * 1000).toLocaleTimeString(),
        unixTime: now - (15 - i) * 1,
        powerWatts: 13.5 + Math.random() * 1.5,
        command: "MAINTAIN",
        priority: "P3_NORMAL",
        distance: metrics.obstacle_distance_m,
        latencyMs: 12
      }));
    }

    return sorted.map((log, idx) => ({
      index: idx,
      timeStr: new Date(log.timestamp_unix * 1000).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),
      unixTime: log.timestamp_unix,
      powerWatts: log.system_state?.edge_ai_power_watts ?? 14.2,
      command: log.event?.actuation_command ?? "MAINTAIN",
      priority: log.event?.priority ?? "P3_NORMAL",
      distance: log.sensor_metrics?.obstacle_distance_m ?? 0,
      latencyMs: log.effective_latency_ms ?? 12
    }));
  }, [telemetryLogs, metrics]);

  // Aggregate stats
  const currentWatts = powerData.length > 0 ? powerData[powerData.length - 1].powerWatts : 14.2;
  const avgWatts = parseFloat(
    (powerData.reduce((acc, p) => acc + p.powerWatts, 0) / (powerData.length || 1)).toFixed(1)
  );
  const peakWatts = Math.max(...powerData.map((p) => p.powerWatts), currentWatts);
  const baselineWatts = 13.5;

  const spikeRatioPct = Math.round(((peakWatts - baselineWatts) / baselineWatts) * 100);

  // D3 Chart Rendering
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || powerData.length < 2) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = 260;
    const margin = { top: 25, right: 30, bottom: 35, left: 45 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("width", width).attr("height", height);

    // X Scale: index based
    const xScale = d3
      .scaleLinear()
      .domain([0, powerData.length - 1])
      .range([margin.left, width - margin.right]);

    // Y Scale: Watts (0 to max(35, peakWatts + 3))
    const maxY = Math.max(32, peakWatts + 4);
    const yScale = d3
      .scaleLinear()
      .domain([0, maxY])
      .range([height - margin.bottom, margin.top]);

    // Gradients
    const defs = svg.append("defs");

    // Line Gradient
    const lineGradient = defs
      .append("linearGradient")
      .attr("id", "power-line-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    lineGradient.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4"); // cyan
    lineGradient.append("stop").attr("offset", "50%").attr("stop-color", "#f59e0b"); // amber
    lineGradient.append("stop").attr("offset", "100%").attr("stop-color", "#f43f5e"); // rose

    // Area Gradient
    const areaGradient = defs
      .append("linearGradient")
      .attr("id", "power-area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#f43f5e").attr("stop-opacity", 0.35);
    areaGradient.append("stop").attr("offset", "50%").attr("stop-color", "#f59e0b").attr("stop-opacity", 0.15);
    areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.0);

    // Grid lines (Horizontal)
    const yAxisGrid = d3.axisLeft(yScale).tickSize(-width + margin.left + margin.right).ticks(6).tickFormat(() => "");
    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxisGrid)
      .selectAll("line")
      .attr("stroke", "#334155")
      .attr("stroke-dasharray", "3,3")
      .attr("stroke-opacity", 0.35);

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(Math.min(8, powerData.length))
      .tickFormat((d) => {
        const pt = powerData[Math.round(Number(d))];
        return pt ? pt.timeStr.split(" ")[0] : "";
      });

    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}W`);

    svg
      .append("g")
      .attr("transform", `translate(0, ${height - margin.bottom})`)
      .call(xAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-family", "monospace")
      .attr("font-size", "10px");

    svg
      .append("g")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(yAxis)
      .selectAll("text")
      .attr("fill", "#94a3b8")
      .attr("font-family", "monospace")
      .attr("font-size", "10px");

    svg.selectAll(".domain").attr("stroke", "#475569").attr("stroke-opacity", 0.6);

    // 25W Thermal Enclosure Threshold Line
    const y25 = yScale(25);
    svg
      .append("line")
      .attr("x1", margin.left)
      .attr("x2", width - margin.right)
      .attr("y1", y25)
      .attr("y2", y25)
      .attr("stroke", "#f59e0b")
      .attr("stroke-dasharray", "4,4")
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.8);

    svg
      .append("text")
      .attr("x", width - margin.right - 5)
      .attr("y", y25 - 5)
      .attr("text-anchor", "end")
      .attr("fill", "#f59e0b")
      .attr("font-size", "9px")
      .attr("font-family", "monospace")
      .attr("font-weight", "bold")
      .text("25W THERMAL TDP TARGET");

    // Area Generator
    const area = d3
      .area<PowerDataPoint>()
      .x((d) => xScale(d.index))
      .y0(height - margin.bottom)
      .y1((d) => yScale(d.powerWatts))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(powerData)
      .attr("fill", "url(#power-area-gradient)")
      .attr("d", area);

    // Line Generator
    const line = d3
      .line<PowerDataPoint>()
      .x((d) => xScale(d.index))
      .y((d) => yScale(d.powerWatts))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(powerData)
      .attr("fill", "none")
      .attr("stroke", "url(#power-line-gradient)")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Data Point Dots with Color Coding for Safety Triggers
    powerData.forEach((pt) => {
      const cx = xScale(pt.index);
      const cy = yScale(pt.powerWatts);

      let color = "#06b6d4"; // Cyan for MAINTAIN
      let radius = 4;

      if (pt.command === "EMERGENCY_BRAKE") {
        color = "#f43f5e"; // Rose
        radius = 7;
      } else if (pt.command === "FAILSAFE") {
        color = "#a855f7"; // Purple
        radius = 6;
      } else if (pt.command === "WARNING") {
        color = "#f59e0b"; // Amber
        radius = 5.5;
      }

      svg
        .append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", radius)
        .attr("fill", color)
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 2);

      // Event Icon / Label above major spikes
      if (pt.command === "EMERGENCY_BRAKE" || pt.command === "FAILSAFE") {
        svg
          .append("text")
          .attr("x", cx)
          .attr("y", cy - 10)
          .attr("text-anchor", "middle")
          .attr("fill", color)
          .attr("font-size", "9px")
          .attr("font-family", "monospace")
          .attr("font-weight", "black")
          .text(pt.command === "EMERGENCY_BRAKE" ? "AEB SPIKE" : "FAILSAFE");
      }
    });

    // Hover Crosshair Overlay
    const overlay = svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom)
      .attr("fill", "transparent")
      .style("cursor", "crosshair");

    const focusLine = svg
      .append("line")
      .attr("stroke", "#38bdf8")
      .attr("stroke-dasharray", "2,2")
      .attr("stroke-width", 1.5)
      .style("opacity", 0);

    const focusCircle = svg
      .append("circle")
      .attr("r", 6)
      .attr("fill", "#38bdf8")
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .style("opacity", 0);

    overlay.on("mousemove", (event) => {
      const [mouseX] = d3.pointer(event);
      const indexVal = Math.round(xScale.invert(mouseX));
      const clampedIdx = Math.max(0, Math.min(powerData.length - 1, indexVal));
      const point = powerData[clampedIdx];

      if (point) {
        setHoveredPoint(point);
        const cx = xScale(point.index);
        const cy = yScale(point.powerWatts);

        focusLine
          .attr("x1", cx)
          .attr("x2", cx)
          .attr("y1", margin.top)
          .attr("y2", height - margin.bottom)
          .style("opacity", 1);

        focusCircle.attr("cx", cx).attr("cy", cy).style("opacity", 1);
      }
    });

    overlay.on("mouseleave", () => {
      setHoveredPoint(null);
      focusLine.style("opacity", 0);
      focusCircle.style("opacity", 0);
    });
  }, [powerData, peakWatts]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <span>NPU Edge AI Power Draw vs Safety Event Correlation</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Correlating power spikes (Watts) with AEB / FCW trigger commands for architectural energy tuning
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400">Current Power:</span>
          <span
            className={`font-black px-2.5 py-0.5 rounded border ${
              currentWatts > 25
                ? "bg-rose-950 text-rose-300 border-rose-600 animate-pulse"
                : currentWatts > 18
                ? "bg-amber-950 text-amber-300 border-amber-600"
                : "bg-emerald-950 text-emerald-300 border-emerald-600"
            }`}
          >
            {currentWatts.toFixed(1)} W
          </span>
        </div>
      </div>

      {/* Main Chart + Energy Efficiency Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        {/* D3 Line Chart Canvas */}
        <div ref={containerRef} className="lg:col-span-3 relative w-full overflow-hidden">
          <svg ref={svgRef} className="w-full h-auto block" />

          {/* Floating Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 right-2 bg-slate-950/90 border border-amber-500/80 rounded-xl p-3 text-[11px] font-mono shadow-xl backdrop-blur space-y-1.5 text-slate-200 min-w-[200px]">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                <span className="text-amber-400 font-bold">{hoveredPoint.timeStr}</span>
                <span
                  className={`font-extrabold px-1.5 py-0.5 rounded text-[10px] ${
                    hoveredPoint.command === "EMERGENCY_BRAKE"
                      ? "bg-rose-950 text-rose-300"
                      : hoveredPoint.command === "FAILSAFE"
                      ? "bg-purple-950 text-purple-300"
                      : hoveredPoint.command === "WARNING"
                      ? "bg-amber-950 text-amber-300"
                      : "bg-emerald-950 text-emerald-300"
                  }`}
                >
                  {hoveredPoint.command}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NPU Power Draw:</span>
                <span className="font-bold text-amber-300">{hoveredPoint.powerWatts.toFixed(1)} W</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Event Priority:</span>
                <span className="font-bold text-white">{hoveredPoint.priority}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Obstacle Distance:</span>
                <span className="font-bold text-white">{hoveredPoint.distance.toFixed(1)} m</span>
              </div>
            </div>
          )}
        </div>

        {/* Energy Optimization & Spike Analysis Side Cards */}
        <div className="space-y-2.5 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center space-x-1">
              <Battery className="w-3 h-3 text-cyan-400" />
              <span>Average Power Load</span>
            </span>
            <div className="text-lg font-black text-white">{avgWatts} W</div>
            <div className="text-[10px] text-slate-400">Baseline Target: 13.5W</div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-rose-400" />
              <span>Safety Event Spike Burst</span>
            </span>
            <div className="text-lg font-black text-rose-400">{peakWatts.toFixed(1)} W</div>
            <div className="text-[10px] text-slate-400">
              Spike Ratio: <span className="text-amber-300 font-bold">+{spikeRatioPct}%</span> vs cruise
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Architect Energy Tuning Tip</span>
            </span>
            <p className="text-[10px] text-slate-300 leading-snug">
              Safety triggers cause <strong>+{spikeRatioPct}%</strong> power bursts due to 60fps tracking. Enable DVFS clock gating during nominal cruise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
