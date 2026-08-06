import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { TrendingDown, AlertTriangle, ShieldCheck, Clock, Navigation } from "lucide-react";
import { SensorMetrics } from "../types";

interface TrajectoryTrendChartProps {
  metrics: SensorMetrics;
  lastCommand: string;
}

interface TrajectoryPoint {
  time: number; // in seconds (0 to 3)
  distance: number; // in meters
  speedKmh: number; // in km/h
  status: "SAFE" | "WARNING" | "CRITICAL" | "FAILSAFE";
}

export const TrajectoryTrendChart: React.FC<TrajectoryTrendChartProps> = ({
  metrics,
  lastCommand
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<TrajectoryPoint | null>(null);

  const isFailsafe =
    lastCommand === "FAILSAFE" ||
    metrics.sensor_fault ||
    metrics.sensor_status === "INVALID_DATA" ||
    metrics.camera_confidence === 0;

  // Calculate 3-second future trajectory data points
  const generateTrajectoryData = (): TrajectoryPoint[] => {
    const points: TrajectoryPoint[] = [];
    const d0 = metrics.obstacle_distance_m < 0 ? 0 : metrics.obstacle_distance_m;
    const v0Kmh = metrics.vehicle_speed_kmh;
    const v0 = v0Kmh / 3.6; // convert to m/s

    // Determine deceleration rate (m/s^2) based on current state & command
    let decel = 0;
    if (isFailsafe) {
      decel = -4.0; // Fail-safe active braking
    } else if (lastCommand === "EMERGENCY_BRAKE" || (d0 < 15.0 && v0Kmh > 30.0)) {
      decel = -8.5; // Max AEB braking deceleration
    } else if (lastCommand === "WARNING" || d0 < 25.0) {
      decel = -2.5; // Mild warning braking / coasting
    } else {
      decel = 0.0; // Cruise / constant speed
    }

    const tStop = decel < 0 ? v0 / Math.abs(decel) : 999;

    for (let i = 0; i <= 30; i++) {
      const t = parseFloat((i * 0.1).toFixed(1));
      let distTraveled = 0;
      let currentV = v0;

      if (t <= tStop) {
        currentV = Math.max(0, v0 + decel * t);
        distTraveled = v0 * t + 0.5 * decel * t * t;
      } else {
        currentV = 0;
        distTraveled = v0 * tStop + 0.5 * decel * tStop * tStop;
      }

      const predictedDist = Math.max(0, d0 - distTraveled);
      const currentKmh = currentV * 3.6;

      let status: "SAFE" | "WARNING" | "CRITICAL" | "FAILSAFE" = "SAFE";
      if (isFailsafe) {
        status = "FAILSAFE";
      } else if (predictedDist < 15.0 && currentKmh > 30.0) {
        status = "CRITICAL";
      } else if (predictedDist < 25.0) {
        status = "WARNING";
      }

      points.push({
        time: t,
        distance: parseFloat(predictedDist.toFixed(2)),
        speedKmh: parseFloat(currentKmh.toFixed(1)),
        status
      });
    }

    return points;
  };

  const trajectoryData = generateTrajectoryData();
  const minPredictedDist = Math.min(...trajectoryData.map((p) => p.distance));
  const distAt3s = trajectoryData[trajectoryData.length - 1].distance;

  // Render D3 Chart
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = 260;
    const margin = { top: 25, right: 30, bottom: 35, left: 45 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    svg.attr("width", width).attr("height", height);

    // Max Y scale
    const maxY = Math.max(50, (metrics.obstacle_distance_m < 0 ? 0 : metrics.obstacle_distance_m) + 5);

    // X and Y Scales
    const xScale = d3
      .scaleLinear()
      .domain([0, 3.0])
      .range([margin.left, width - margin.right]);

    const yScale = d3
      .scaleLinear()
      .domain([0, maxY])
      .range([height - margin.bottom, margin.top]);

    // Define Gradients
    const defs = svg.append("defs");

    // Line Gradient
    const gradient = defs
      .append("linearGradient")
      .attr("id", "trajectory-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    if (isFailsafe) {
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#a855f7");
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#d8b4fe");
    } else {
      gradient.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4"); // cyan
      gradient.append("stop").attr("offset", "50%").attr("stop-color", "#f59e0b"); // amber
      gradient.append("stop").attr("offset", "100%").attr("stop-color", "#f43f5e"); // rose
    }

    // Area Gradient
    const areaGradient = defs
      .append("linearGradient")
      .attr("id", "area-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");

    if (isFailsafe) {
      areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#a855f7").attr("stop-opacity", 0.35);
      areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#a855f7").attr("stop-opacity", 0.0);
    } else {
      areaGradient.append("stop").attr("offset", "0%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.25);
      areaGradient.append("stop").attr("offset", "100%").attr("stop-color", "#06b6d4").attr("stop-opacity", 0.0);
    }

    // Grid lines (Horizontal)
    const yAxisGrid = d3.axisLeft(yScale).tickSize(-width + margin.left + margin.right).ticks(5).tickFormat(() => "");
    svg
      .append("g")
      .attr("class", "grid")
      .attr("transform", `translate(${margin.left},0)`)
      .call(yAxisGrid)
      .selectAll("line")
      .attr("stroke", "#334155")
      .attr("stroke-dasharray", "3,3")
      .attr("stroke-opacity", 0.4);

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat((d) => `+${d}s`);
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `${d}m`);

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

    // Remove domain lines for clean look
    svg.selectAll(".domain").attr("stroke", "#475569").attr("stroke-opacity", 0.6);

    // 15m AEB Critical Line
    if (maxY >= 15) {
      const y15 = yScale(15);
      svg
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y15)
        .attr("y2", y15)
        .attr("stroke", "#f43f5e")
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.7);

      svg
        .append("text")
        .attr("x", width - margin.right - 5)
        .attr("y", y15 - 4)
        .attr("text-anchor", "end")
        .attr("fill", "#f43f5e")
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .text("15m AEB THRESHOLD");
    }

    // 25m FCW Warning Line
    if (maxY >= 25) {
      const y25 = yScale(25);
      svg
        .append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y25)
        .attr("y2", y25)
        .attr("stroke", "#f59e0b")
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 1.2)
        .attr("stroke-opacity", 0.6);

      svg
        .append("text")
        .attr("x", width - margin.right - 5)
        .attr("y", y25 - 4)
        .attr("text-anchor", "end")
        .attr("fill", "#f59e0b")
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .attr("font-weight", "bold")
        .text("25m FCW WARNING");
    }

    // Area Path Generator
    const area = d3
      .area<TrajectoryPoint>()
      .x((d) => xScale(d.time))
      .y0(height - margin.bottom)
      .y1((d) => yScale(d.distance))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(trajectoryData)
      .attr("fill", "url(#area-gradient)")
      .attr("d", area);

    // Line Path Generator
    const line = d3
      .line<TrajectoryPoint>()
      .x((d) => xScale(d.time))
      .y((d) => yScale(d.distance))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(trajectoryData)
      .attr("fill", "none")
      .attr("stroke", "url(#trajectory-gradient)")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Discrete Checkpoint Dots (+0s, +1s, +2s, +3s)
    const keyTimes = [0, 1.0, 2.0, 3.0];
    keyTimes.forEach((kt) => {
      const pt = trajectoryData.find((p) => p.time === kt);
      if (pt) {
        const cx = xScale(pt.time);
        const cy = yScale(pt.distance);

        svg
          .append("circle")
          .attr("cx", cx)
          .attr("cy", cy)
          .attr("r", 5)
          .attr("fill", pt.status === "CRITICAL" ? "#f43f5e" : pt.status === "WARNING" ? "#f59e0b" : "#06b6d4")
          .attr("stroke", "#0f172a")
          .attr("stroke-width", 2);

        svg
          .append("text")
          .attr("x", cx)
          .attr("y", cy - 10)
          .attr("text-anchor", "middle")
          .attr("fill", "#e2e8f0")
          .attr("font-size", "9px")
          .attr("font-family", "monospace")
          .attr("font-weight", "bold")
          .text(`${pt.distance.toFixed(1)}m`);
      }
    });

    // Hover Overlay Listener
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
      const xVal = xScale.invert(mouseX);
      const clampedX = Math.max(0, Math.min(3.0, xVal));

      const idx = Math.round(clampedX * 10);
      const point = trajectoryData[Math.min(trajectoryData.length - 1, Math.max(0, idx))];

      if (point) {
        setHoveredPoint(point);
        const cx = xScale(point.time);
        const cy = yScale(point.distance);

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
  }, [metrics, lastCommand, isFailsafe]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Title & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <TrendingDown className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <span>Predictive Trajectory Trend (+3s Horizon)</span>
            </h3>
            <p className="text-[11px] text-slate-400">
              D3 Kinematic Vector Extrapolation based on velocity &amp; AEB braking models
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-slate-400">Predicted Min Distance:</span>
          <span
            className={`font-black px-2 py-0.5 rounded border ${
              isFailsafe
                ? "bg-purple-950 text-purple-300 border-purple-600 animate-pulse"
                : minPredictedDist < 15
                ? "bg-rose-950 text-rose-300 border-rose-600"
                : minPredictedDist < 25
                ? "bg-amber-950 text-amber-300 border-amber-600"
                : "bg-emerald-950 text-emerald-300 border-emerald-600"
            }`}
          >
            {isFailsafe ? "INVALID_DATA" : `${minPredictedDist.toFixed(1)} m`}
          </span>
        </div>
      </div>

      {/* Main Chart + Side Stats Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center">
        {/* D3 SVG Canvas */}
        <div ref={containerRef} className="lg:col-span-3 relative w-full overflow-hidden">
          <svg ref={svgRef} className="w-full h-auto block" />

          {/* Floating Hover Info Card */}
          {hoveredPoint && (
            <div className="absolute top-2 right-2 bg-slate-950/90 border border-cyan-500/80 rounded-xl p-2.5 text-[11px] font-mono shadow-xl backdrop-blur space-y-1 text-slate-200">
              <div className="flex items-center justify-between space-x-3 border-b border-slate-800 pb-1">
                <span className="text-cyan-400 font-bold">Horizon: +{hoveredPoint.time}s</span>
                <span className="text-slate-400">{hoveredPoint.status}</span>
              </div>
              <div className="flex justify-between space-x-4">
                <span className="text-slate-400">Obstacle Dist:</span>
                <span className="font-bold text-white">{hoveredPoint.distance} m</span>
              </div>
              <div className="flex justify-between space-x-4">
                <span className="text-slate-400">Vehicle Speed:</span>
                <span className="font-bold text-white">{hoveredPoint.speedKmh} km/h</span>
              </div>
            </div>
          )}
        </div>

        {/* Predictive Summary Cards */}
        <div className="space-y-2.5 font-mono text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center space-x-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              <span>Current Distance (+0s)</span>
            </span>
            <div className="text-lg font-black text-white">
              {metrics.obstacle_distance_m < 0 ? "INVALID" : `${metrics.obstacle_distance_m.toFixed(1)} m`}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center space-x-1">
              <Navigation className="w-3 h-3 text-amber-400" />
              <span>Projected Distance (+3s)</span>
            </span>
            <div
              className={`text-lg font-black ${
                isFailsafe
                  ? "text-purple-400"
                  : distAt3s < 15
                  ? "text-rose-400"
                  : distAt3s < 25
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {isFailsafe ? "FAILSAFE" : `${distAt3s.toFixed(1)} m`}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase font-bold flex items-center space-x-1">
              {minPredictedDist < 15 ? (
                <AlertTriangle className="w-3 h-3 text-rose-400" />
              ) : (
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
              )}
              <span>Safety Trajectory Assessment</span>
            </span>
            <div
              className={`text-xs font-bold ${
                isFailsafe
                  ? "text-purple-300"
                  : minPredictedDist < 15
                  ? "text-rose-400"
                  : minPredictedDist < 25
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {isFailsafe
                ? "DEGRADED FALLBACK"
                : minPredictedDist < 15
                ? "HIGH COLLISION RISK (AEB)"
                : minPredictedDist < 25
                ? "PROXIMITY WARNING"
                : "CLEAR TRAJECTORY"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
