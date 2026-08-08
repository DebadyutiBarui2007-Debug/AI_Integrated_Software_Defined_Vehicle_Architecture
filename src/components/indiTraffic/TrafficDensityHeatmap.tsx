import React, { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import { TrafficMetrics, ArchitectureConfig } from "../../types/indiTraffic";
import { Flame, Layers, Zap, Info } from "lucide-react";

interface Props {
  metrics: TrafficMetrics;
  config: ArchitectureConfig;
}

interface HeatmapCell {
  speedBand: string; // e.g. "0-3 km/h (Creep)", "3-8 km/h (Crawl)", "8-15 km/h (Micro-stop)", "15-30 km/h (Suburban)"
  segmentZone: string; // e.g. "Silk Board Junction", "Old Delhi Choke", "Outer Ring Flyover", "Cyber City Arterial"
  energyWhKm: number;
  thermalLoadC: number;
  stopFrequency: number;
  regenEfficiencyPct: number;
}

export const TrafficDensityHeatmap: React.FC<Props> = ({ metrics, config }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    data: HeatmapCell;
  } | null>(null);

  const [metricMode, setMetricMode] = useState<"ENERGY_WH_KM" | "THERMAL_LOAD" | "REGEN_EFF">("ENERGY_WH_KM");

  // Generate matrix data responsive to current vehicle configuration & metrics
  const speedBands = ["0-3 km/h (Creep)", "3-8 km/h (Crawl)", "8-15 km/h (Dense)", "15-30 km/h (Flow)"];
  const segmentZones = ["Silk Board Junction", "Old Delhi Choke", "Monsoon Waterway", "Cyber Hub Arterial"];

  const isBaseline = config.archType === "LEGACY_CONVENTIONAL_EV";

  // Compute heatmap grid dynamically based on current configuration
  const heatmapData: HeatmapCell[] = [];

  segmentZones.forEach((zone, zIdx) => {
    speedBands.forEach((band, bIdx) => {
      // Base intensity factors
      const zoneSeverity = [1.8, 1.6, 1.4, 1.1][zIdx];
      const speedSeverity = [2.2, 1.7, 1.3, 0.9][bIdx];

      let baseWh = 110 * zoneSeverity * speedSeverity;
      if (isBaseline) {
        baseWh *= 1.35; // Baseline high switching loss
      } else {
        // IndiTraffic SDV micro-regen & 6kHz PWM optimization
        baseWh *= 0.76;
      }

      let thermalC = 65 + zoneSeverity * 12 + speedSeverity * 8;
      if (isBaseline) thermalC += 15;

      let regenEff = [5, 22, 38, 48][bIdx];
      if (!isBaseline && bIdx < 2) {
        regenEff += 28; // Micro-pedal recovery bonus in creep/crawl
      }

      heatmapData.push({
        speedBand: band,
        segmentZone: zone,
        energyWhKm: Math.round(baseWh),
        thermalLoadC: Math.round(thermalC),
        stopFrequency: Math.round(180 * zoneSeverity * (1 / (bIdx + 1))),
        regenEfficiencyPct: Math.min(65, Math.round(regenEff))
      });
    });
  });

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous drawing

    const margin = { top: 40, right: 30, bottom: 60, left: 140 };
    const width = 680 - margin.left - margin.right;
    const height = 280 - margin.top - margin.bottom;

    const g = svg
      .attr("viewBox", `0 0 680 280`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // X Scale (Speed Bands)
    const xScale = d3
      .scaleBand()
      .domain(speedBands)
      .range([0, width])
      .padding(0.08);

    // Y Scale (Urban Segment Zones)
    const yScale = d3
      .scaleBand()
      .domain(segmentZones)
      .range([0, height])
      .padding(0.08);

    // Color Scales
    let colorScale: d3.ScaleSequential<string, never>;
    if (metricMode === "ENERGY_WH_KM") {
      colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([80, 260]);
    } else if (metricMode === "THERMAL_LOAD") {
      colorScale = d3.scaleSequential(d3.interpolateInferno).domain([60, 110]);
    } else {
      colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, 65]);
    }

    // Render X Axis
    g.append("g")
      .attr("transform", `translate(0, ${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("fill", "#94a3b8")
      .style("font-size", "10px")
      .style("font-family", "monospace");

    // Render Y Axis
    g.append("g")
      .call(d3.axisLeft(yScale))
      .selectAll("text")
      .style("fill", "#cbd5e1")
      .style("font-size", "11px")
      .style("font-weight", "500");

    // Remove domain axis lines for clean aesthetic
    g.selectAll(".domain, .tick line").style("stroke", "#334155");

    // Render Heatmap Rectangles
    g.selectAll("rect")
      .data(heatmapData)
      .enter()
      .append("rect")
      .attr("x", (d) => xScale(d.speedBand) || 0)
      .attr("y", (d) => yScale(d.segmentZone) || 0)
      .attr("width", xScale.bandwidth())
      .attr("height", yScale.bandwidth())
      .attr("rx", 6)
      .attr("ry", 6)
      .style("fill", (d) => {
        const val =
          metricMode === "ENERGY_WH_KM"
            ? d.energyWhKm
            : metricMode === "THERMAL_LOAD"
            ? d.thermalLoadC
            : d.regenEfficiencyPct;
        return colorScale(val);
      })
      .style("stroke", "#0f172a")
      .style("stroke-width", "2px")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const [x, y] = d3.pointer(event, svgRef.current);
        setTooltip({ x, y, data: d });
      })
      .on("mouseout", () => {
        setTooltip(null);
      });

    // Render Text Labels inside Cells
    g.selectAll(".cell-text")
      .data(heatmapData)
      .enter()
      .append("text")
      .attr("x", (d) => (xScale(d.speedBand) || 0) + xScale.bandwidth() / 2)
      .attr("y", (d) => (yScale(d.segmentZone) || 0) + yScale.bandwidth() / 2 + 4)
      .attr("text-anchor", "middle")
      .style("fill", (d) => {
        const val =
          metricMode === "ENERGY_WH_KM"
            ? d.energyWhKm
            : metricMode === "THERMAL_LOAD"
            ? d.thermalLoadC
            : d.regenEfficiencyPct;
        return val > 160 || (metricMode === "THERMAL_LOAD" && val > 85) ? "#ffffff" : "#0f172a";
      })
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("font-family", "monospace")
      .style("pointer-events", "none")
      .text((d) => {
        if (metricMode === "ENERGY_WH_KM") return `${d.energyWhKm} Wh`;
        if (metricMode === "THERMAL_LOAD") return `${d.thermalLoadC}°C`;
        return `${d.regenEfficiencyPct}%`;
      });
  }, [heatmapData, metricMode]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl text-slate-100 relative">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">
              Urban Traffic Energy Consumption Heatmap (D3.js)
            </h3>
            <p className="text-xs text-slate-400">
              Spatial Hotspot Density across Indian Driving Segments & Speed Bands
            </p>
          </div>
        </div>

        {/* Heatmap Metric Selector */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setMetricMode("ENERGY_WH_KM")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              metricMode === "ENERGY_WH_KM"
                ? "bg-rose-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Energy (Wh/km)
          </button>
          <button
            onClick={() => setMetricMode("THERMAL_LOAD")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              metricMode === "THERMAL_LOAD"
                ? "bg-amber-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            Inverter Temp (°C)
          </button>
          <button
            onClick={() => setMetricMode("REGEN_EFF")}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              metricMode === "REGEN_EFF"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Regen Recapture (%)
          </button>
        </div>
      </div>

      {/* D3 Heatmap SVG Container */}
      <div className="relative bg-slate-950 border border-slate-800 rounded-xl p-2 overflow-x-auto">
        <svg ref={svgRef} className="w-full h-auto min-w-[620px]" />

        {/* Floating Hover Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 bg-slate-900/95 backdrop-blur border border-slate-700 text-slate-100 p-3 rounded-lg shadow-2xl text-xs pointer-events-none w-56"
            style={{
              left: `${Math.min(420, tooltip.x + 10)}px`,
              top: `${Math.max(10, tooltip.y - 10)}px`
            }}
          >
            <div className="font-bold text-sky-400 mb-1 border-b border-slate-800 pb-1 flex items-center justify-between">
              <span>{tooltip.data.segmentZone}</span>
              <Info className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="space-y-1 text-[11px] text-slate-300">
              <p>Speed Band: <strong className="text-white">{tooltip.data.speedBand}</strong></p>
              <p>Energy Draw: <strong className="text-rose-400">{tooltip.data.energyWhKm} Wh/km</strong></p>
              <p>Inverter Temp: <strong className="text-amber-400">{tooltip.data.thermalLoadC}°C</strong></p>
              <p>Regen Recovered: <strong className="text-emerald-400">{tooltip.data.regenEfficiencyPct}%</strong></p>
              <p>Micro-Stops: <strong className="text-purple-400">{tooltip.data.stopFrequency} stops/hr</strong></p>
            </div>
          </div>
        )}
      </div>

      {/* Legend & Key Takeaway */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-500">Color Scale Density:</span>
          <div className="flex items-center gap-1 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-amber-200 text-slate-900 font-bold">Low Drain</span>
            <span>→</span>
            <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-bold">Hotspot Peak</span>
          </div>
        </div>

        <div className="text-slate-300">
          {config.archType === "INDITRAFFIC_SDV_EDGE" ? (
            <span className="text-emerald-400 font-semibold">
              ✓ IndiTraffic SDV micro-pedal active: 0-3 km/h creep energy reduced by 34%
            </span>
          ) : (
            <span className="text-amber-400 font-semibold">
              ⚠️ Legacy EV baseline: High friction disc losses in 0-8 km/h creep zones
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
