"""
Software-Defined Vehicle (SDV) - Sensor Streaming Modules
Module: sdv_sensors.py

Simulates multi-modal Edge AI sensors (Camera, Radar, Telematics) running in Zone Controllers.
Publishes asynchronous data streams to the SOA Vehicle Data Bus.
"""

import asyncio
import random
import time
from typing import Dict, Any, Optional
from sdv_bus import VehicleDataBus


class CameraSensorModule:
    """
    Simulates high-resolution front-facing camera stream from Zone Controller Front.
    Outputs object detection, bounding box coordinates, and visual classification confidence.
    """

    def __init__(self, bus: VehicleDataBus, publish_interval: float = 1.0):
        self.bus = bus
        self.interval = publish_interval
        self.zone_id = "ZONE_FRONT_ECU"
        self.topic = "/sensor/camera"
        self._running = False
        self._custom_scenario: Optional[Dict[str, Any]] = None

    def inject_scenario(self, distance: float, speed: float, confidence: float, object_type: str = "PEDESTRIAN"):
        """Injects a deterministic scenario override into the sensor stream."""
        self._custom_scenario = {
            "distance_m": distance,
            "confidence": confidence,
            "object_type": object_type
        }

    def clear_scenario(self):
        self._custom_scenario = None

    async def run(self):
        self._running = True
        while self._running:
            if self._custom_scenario:
                distance = self._custom_scenario["distance_m"]
                confidence = self._custom_scenario["confidence"]
                object_type = self._custom_scenario["object_type"]
            else:
                # Stochastic simulation: randomly approaching obstacles or clear road
                distance = round(random.uniform(8.0, 45.0), 2)
                confidence = round(random.uniform(0.78, 0.99), 2)
                object_type = random.choice(["PEDESTRIAN", "VEHICLE", "CYCLIST", "DEBRIS"])

            payload = {
                "sensor_type": "CAMERA_VISION_FRONT",
                "frame_id": int(time.time() * 1000),
                "detected_object": object_type,
                "camera_confidence": confidence,
                "visual_distance_estimate_m": distance,
                "bounding_box": {
                    "x": random.randint(100, 400),
                    "y": random.randint(150, 350),
                    "w": random.randint(50, 120),
                    "h": random.randint(100, 220)
                },
                "status": "HEALTHY"
            }

            await self.bus.publish(self.topic, self.zone_id, payload)
            await asyncio.sleep(self.interval)

    def stop(self):
        self._running = False


class RadarSensorModule:
    """
    Simulates long-range millimeter wave radar from Zone Controller Front.
    Provides precise distance and relative velocity measurements.
    """

    def __init__(self, bus: VehicleDataBus, publish_interval: float = 1.0):
        self.bus = bus
        self.interval = publish_interval
        self.zone_id = "ZONE_FRONT_RADAR_ECU"
        self.topic = "/sensor/radar"
        self._running = False
        self._custom_scenario: Optional[Dict[str, Any]] = None

    def inject_scenario(self, distance: float, relative_velocity: float = -12.0):
        self._custom_scenario = {
            "distance_m": distance,
            "relative_velocity_ms": relative_velocity
        }

    def clear_scenario(self):
        self._custom_scenario = None

    async def run(self):
        self._running = True
        while self._running:
            if self._custom_scenario:
                distance = self._custom_scenario["distance_m"]
                rel_vel = self._custom_scenario["relative_velocity_ms"]
            else:
                distance = round(random.uniform(6.0, 50.0), 2)
                rel_vel = round(random.uniform(-25.0, 5.0), 2)

            payload = {
                "sensor_type": "RADAR_77GHZ_FRONT",
                "timestamp_us": int(time.time() * 1e6),
                "object_distance_m": distance,
                "relative_velocity_ms": rel_vel,
                "target_rcs_dbms": round(random.uniform(10.0, 25.0), 1),
                "radar_snr_db": 24.5,
                "status": "OK"
            }

            await self.bus.publish(self.topic, self.zone_id, payload)
            await asyncio.sleep(self.interval)

    def stop(self):
        self._running = False


class VehicleTelematicsModule:
    """
    Simulates Powertrain & Body Controller telemetry (speed, brake pedal pressure, steering angle).
    """

    def __init__(self, bus: VehicleDataBus, publish_interval: float = 1.0):
        self.bus = bus
        self.interval = publish_interval
        self.zone_id = "ZONE_POWERTRAIN_ECU"
        self.topic = "/sensor/telematics"
        self._running = False
        self._speed_override: Optional[float] = None

    def inject_speed(self, speed_kmh: float):
        self._speed_override = speed_kmh

    def clear_speed(self):
        self._speed_override = None

    async def run(self):
        self._running = True
        while self._running:
            if self._speed_override is not None:
                speed_kmh = self._speed_override
            else:
                # Stochastic speed profile around 20-70 km/h
                speed_kmh = round(random.uniform(22.0, 68.0), 1)

            payload = {
                "sensor_type": "VEHICLE_SPEED_CAN",
                "vehicle_speed_kmh": speed_kmh,
                "wheel_speed_fl": round(speed_kmh * 0.99, 1),
                "wheel_speed_fr": round(speed_kmh * 1.01, 1),
                "steering_angle_deg": round(random.uniform(-3.5, 3.5), 2),
                "yaw_rate_degs": round(random.uniform(-0.8, 0.8), 2),
                "brake_pedal_pct": 0.0,
                "throttle_pct": 35.0
            }

            await self.bus.publish(self.topic, self.zone_id, payload)
            await asyncio.sleep(self.interval)

    def stop(self):
        self._running = False
