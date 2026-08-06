"""
Software-Defined Vehicle (SDV) - Low-Latency Edge AI Inference Module
Module: sdv_inference.py

Implements low-latency sensor fusion and onboard collision risk inference algorithm.
Processes camera, radar, and vehicle speed metrics concurrently in real-time.
"""

import asyncio
import time
import math
import logging
from typing import Dict, Any, Optional
from sdv_bus import VehicleDataBus, Message


class EdgeAIInferenceEngine:
    """
    Simulates onboard Edge AI NPU / Tensor Core inference processing.
    Fuses vision detection + millimeter-wave radar data with telematics speed 
    to calculate real-time Time-To-Collision (TTC) and threat level.
    """

    def __init__(self, bus: VehicleDataBus):
        self.bus = bus
        self.domain_id = "EDGE_AI_ADAS_DOMAIN_CONTROLLER"
        
        # Latest cached sensor states for multi-modal fusion
        self._latest_camera: Optional[Dict[str, Any]] = None
        self._latest_radar: Optional[Dict[str, Any]] = None
        self._latest_telematics: Optional[Dict[str, Any]] = None
        
        self._lock = asyncio.Lock()

    async def initialize(self):
        """Registers subscribers to raw sensor topics on the SOA message bus."""
        await self.bus.subscribe("/sensor/camera", self._on_camera_frame)
        await self.bus.subscribe("/sensor/radar", self._on_radar_frame)
        await self.bus.subscribe("/sensor/telematics", self._on_telematics_frame)
        logging.info("[EDGE AI] Edge AI NPU Inference Engine initialized and listening on sensor bus.")

    async def _on_camera_frame(self, msg: Message):
        async with self._lock:
            self._latest_camera = msg.payload
        await self._trigger_inference()

    async def _on_radar_frame(self, msg: Message):
        async with self._lock:
            self._latest_radar = msg.payload
        await self._trigger_inference()

    async def _on_telematics_frame(self, msg: Message):
        async with self._lock:
            self._latest_telematics = msg.payload
        await self._trigger_inference()

    async def _trigger_inference(self):
        """
        Executes sensor fusion and neural collision risk model.
        Simulates low latency (~2ms to 6ms inference on automotive NPU).
        """
        start_time = time.perf_counter()

        async with self._lock:
            cam = self._latest_camera
            rad = self._latest_radar
            telem = self._latest_telematics

        if not telem:
            return  # Need telematics speed context

        vehicle_speed_kmh = telem.get("vehicle_speed_kmh", 0.0)
        vehicle_speed_ms = vehicle_speed_kmh / 3.6

        # Fused distance logic: radar takes precedence if present, else camera vision
        if rad and rad.get("status") == "OK":
            fused_distance = rad.get("object_distance_m", 99.0)
            rel_velocity_ms = rad.get("relative_velocity_ms", -vehicle_speed_ms)
        elif cam:
            fused_distance = cam.get("visual_distance_estimate_m", 99.0)
            rel_velocity_ms = -vehicle_speed_ms
        else:
            fused_distance = 99.0
            rel_velocity_ms = -vehicle_speed_ms

        # Camera vision parameters
        cam_confidence = cam.get("camera_confidence", 0.90) if cam else 0.85
        detected_object = cam.get("detected_object", "UNKNOWN_OBSTACLE") if cam else "OBSTACLE"

        # Calculate Time-To-Collision (TTC)
        closing_speed_ms = max(0.1, abs(rel_velocity_ms) if rel_velocity_ms < 0 else vehicle_speed_ms)
        ttc_seconds = fused_distance / closing_speed_ms if closing_speed_ms > 0 else 999.0

        # Simulate hardware NPU latency
        await asyncio.sleep(0.003)  # 3ms inference latency simulation
        inference_latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Risk level determination
        if fused_distance < 15.0 and vehicle_speed_kmh > 30.0:
            risk_level = "CRITICAL"
        elif fused_distance < 25.0 or ttc_seconds < 2.5:
            risk_level = "HIGH"
        elif fused_distance < 40.0 or ttc_seconds < 4.0:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        inference_result = {
            "model_version": "YOLO-v8-Auto-Edge-v2.1",
            "inference_latency_ms": inference_latency_ms,
            "vehicle_speed_kmh": vehicle_speed_kmh,
            "fused_obstacle_distance_m": round(fused_distance, 2),
            "time_to_collision_s": round(ttc_seconds, 2),
            "camera_confidence": round(cam_confidence, 2),
            "detected_object_type": detected_object,
            "risk_level": risk_level,
            "timestamp": time.time()
        }

        # Publish inference result to SOA topic
        await self.bus.publish("/adas/inference", self.domain_id, inference_result)
