"""
Software-Defined Vehicle (SDV) - Decision & Actuation Controller
Module: sdv_controller.py

Evaluates collision risks from Edge AI inference and issues prioritized safety actuation commands.
Enforces ASIL-D functional safety rules (e.g. ISO 26262 AEB trigger parameters).
"""

import asyncio
import logging
import time
from typing import Dict, Any, Callable, Awaitable
from sdv_bus import VehicleDataBus, Message
from sdv_telemetry import TelemetryLogger


class SafetyDecisionController:
    """
    Primary ADAS Actuation Controller.
    Subscribes to '/adas/inference' and outputs prioritized vehicle actuation commands 
    on topic '/vehicle/actuation'.
    """

    def __init__(self, bus: VehicleDataBus, telemetry: TelemetryLogger):
        self.bus = bus
        self.telemetry = telemetry
        self.controller_id = "SAFETY_DECISION_ACTUATOR_ECU"
        self.actuation_topic = "/vehicle/actuation"

    async def initialize(self):
        """Subscribes to AI inference stream."""
        await self.bus.subscribe("/adas/inference", self._evaluate_safety_rules)
        logging.info("[CONTROLLER] Safety Decision & Actuation Controller initialized.")

    async def _evaluate_safety_rules(self, msg: Message):
        """
        Safety evaluation logic enforcing ISO 26262 compliance:
        - RULE 1 (EMERGENCY_BRAKE): Distance < 15.0 meters AND Vehicle Speed > 30.0 km/h.
        - RULE 2 (WARNING): Distance < 25.0 meters OR Time-To-Collision < 2.5s.
        - RULE 3 (MAINTAIN): Safe operational state.
        """
        data = msg.payload
        speed_kmh = data.get("vehicle_speed_kmh", 0.0)
        distance_m = data.get("fused_obstacle_distance_m", 99.0)
        ttc_s = data.get("time_to_collision_s", 99.0)
        confidence = data.get("camera_confidence", 0.0)

        timestamp = time.time()

        # Primary ADAS Safety Trigger Logic
        sensor_status = data.get("sensor_status", "NORMAL")
        sensor_fault = data.get("sensor_fault", False)

        if sensor_fault or sensor_status == "INVALID_DATA" or confidence == 0.0:
            command = "FAILSAFE"
            priority = "P0_CRITICAL"
            brake_force_pct = 0.0
            hmi_alert = "FAILSAFE_SENSOR_FAULT_DEGRADED"
            action_description = f"FAILSAFE: Injected INVALID_DATA signal into metrics stream (Camera Confidence: {confidence*100:.0f}%, Status: {sensor_status}). Controller forced into ISO 26262 ASIL-D FAILSAFE fallback."
        elif distance_m < 15.0 and speed_kmh > 30.0:
            command = "EMERGENCY_BRAKE"
            priority = "P0_CRITICAL"
            brake_force_pct = 100.0
            hmi_alert = "CRITICAL_COLLISION_ALERT_BRAKE_NOW"
            action_description = f"CRITICAL: Obstacle at {distance_m}m (<15m) with speed {speed_kmh}km/h (>30km/h). Triggering Maximum AEB Deceleration!"
        elif distance_m < 25.0 or ttc_s < 2.5:
            command = "WARNING"
            priority = "P1_HIGH"
            brake_force_pct = 25.0
            hmi_alert = "FORWARD_COLLISION_WARNING_AUDIBLE"
            action_description = f"WARNING: Proximity risk at {distance_m}m, TTC {ttc_s}s. Issuing FCW Audio/Visual Alert."
        else:
            command = "MAINTAIN"
            priority = "P3_NORMAL"
            brake_force_pct = 0.0
            hmi_alert = "NONE"
            action_description = "Nominal trajectory maintained. Speed and distance within safety threshold."

        actuation_payload = {
            "command": command,
            "priority": priority,
            "target_brake_pressure_pct": brake_force_pct,
            "hmi_alert_state": hmi_alert,
            "eval_metrics": {
                "vehicle_speed_kmh": speed_kmh,
                "obstacle_distance_m": distance_m,
                "time_to_collision_s": ttc_s,
                "camera_confidence": confidence
            },
            "timestamp": timestamp,
            "action_summary": action_description
        }

        # Publish command to vehicle actuation bus
        await self.bus.publish(self.actuation_topic, self.controller_id, actuation_payload)

        # Log structured JSON telemetry event
        self.telemetry.log_event(
            event_type="SAFETY_EVALUATION",
            speed_kmh=speed_kmh,
            distance_m=distance_m,
            confidence=confidence,
            ttc_s=ttc_s,
            command=command,
            priority=priority,
            description=action_description
        )
