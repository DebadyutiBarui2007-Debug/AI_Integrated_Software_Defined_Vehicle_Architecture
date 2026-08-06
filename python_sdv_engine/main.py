"""
Software-Defined Vehicle (SDV) - ADAS Edge AI Controller Simulation Entry Point
File: main.py

Asynchronous SOA Simulation orchestrating SOME/IP Message Bus, Sensor Streaming, 
Low-Latency Edge AI Inference, ISO 26262 Decision Actuation, and Structured Telemetry.

Usage:
    python3 main.py [--duration SECONDS] [--speed KMH] [--distance METERS] [--scenario TYPE]
"""

import asyncio
import argparse
import logging
import sys
import os

# Ensure local imports work cleanly
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sdv_bus import VehicleDataBus
from sdv_sensors import CameraSensorModule, RadarSensorModule, VehicleTelematicsModule
from sdv_inference import EdgeAIInferenceEngine
from sdv_controller import SafetyDecisionController
from sdv_telemetry import TelemetryLogger


async def main():
    parser = argparse.ArgumentParser(description="SDV Edge AI ADAS Simulator")
    parser.add_argument("--duration", type=int, default=10, help="Simulation duration in seconds")
    parser.add_argument("--speed", type=float, default=None, help="Fixed vehicle speed override (km/h)")
    parser.add_argument("--distance", type=float, default=None, help="Fixed obstacle distance override (m)")
    parser.add_argument("--confidence", type=float, default=0.92, help="Camera confidence override (0.0 - 1.0)")
    parser.add_argument("--scenario", type=str, default="SIMULATED", help="Scenario preset: CRITICAL, WARNING, SAFE, STOCHASTIC")
    args = parser.parse_args()

    print("=========================================================================")
    print("      SOFTWARE-DEFINED VEHICLE (SDV) EDGE AI ADAS SIMULATION STARTED     ")
    print("=========================================================================")
    print(" [Architecture]: Service-Oriented Architecture (SOA) over SOME/IP & ROS 2")
    print(" [Safety Rules]: EMERGENCY_BRAKE triggered when Distance < 15m AND Speed > 30km/h")
    print(f" [Simulation Config]: Duration={args.duration}s | Scenario={args.scenario}")
    print("=========================================================================\n", flush=True)

    # 1. Initialize SOA Message Bus
    bus = VehicleDataBus()
    await bus.start()

    # 2. Initialize Telemetry Logger
    telemetry = TelemetryLogger(vehicle_vin="SDV-PROTOTYPE-VIN-2026")

    # 3. Initialize Sensor Modules (Streaming every 1 second)
    camera_sensor = CameraSensorModule(bus, publish_interval=1.0)
    radar_sensor = RadarSensorModule(bus, publish_interval=1.0)
    telematics_sensor = VehicleTelematicsModule(bus, publish_interval=1.0)

    # Apply Scenario Overrides if requested via CLI
    if args.scenario in ["SENSOR_FAULT", "FAILSAFE"]:
        speed = args.speed if args.speed is not None else 40.0
        camera_sensor.inject_scenario(distance=-1.0, speed=speed, confidence=0.0, object_type="INVALID_DATA")
        radar_sensor.inject_scenario(distance=-1.0, relative_velocity=0.0)
        telematics_sensor.inject_speed(speed_kmh=speed)
        print(f"[SCENARIO INJECTED]: SENSOR FAULT / INVALID_DATA -> Forcing ISO 26262 ASIL-D FAILSAFE Mode\n", flush=True)
    elif args.scenario == "CRITICAL" or (args.distance is not None and args.distance < 15.0 and args.speed is not None and args.speed > 30.0):
        speed = args.speed if args.speed is not None else 45.0
        distance = args.distance if args.distance is not None else 11.2
        camera_sensor.inject_scenario(distance=distance, speed=speed, confidence=args.confidence, object_type="PEDESTRIAN")
        radar_sensor.inject_scenario(distance=distance, relative_velocity=-12.5)
        telematics_sensor.inject_speed(speed_kmh=speed)
        print(f"[SCENARIO INJECTED]: CRITICAL HAZARD -> Speed={speed} km/h, Distance={distance} m (<15m & >30km/h)\n", flush=True)
    elif args.scenario == "WARNING" or (args.distance is not None and args.distance < 25.0):
        speed = args.speed if args.speed is not None else 50.0
        distance = args.distance if args.distance is not None else 21.0
        camera_sensor.inject_scenario(distance=distance, speed=speed, confidence=args.confidence, object_type="VEHICLE")
        radar_sensor.inject_scenario(distance=distance, relative_velocity=-5.0)
        telematics_sensor.inject_speed(speed_kmh=speed)
        print(f"[SCENARIO INJECTED]: PROXIMITY WARNING -> Speed={speed} km/h, Distance={distance} m\n", flush=True)
    elif args.scenario == "SAFE":
        speed = args.speed if args.speed is not None else 60.0
        distance = args.distance if args.distance is not None else 42.0
        camera_sensor.inject_scenario(distance=distance, speed=speed, confidence=0.98, object_type="ROAD_CLEAR")
        radar_sensor.inject_scenario(distance=distance, relative_velocity=0.0)
        telematics_sensor.inject_speed(speed_kmh=speed)
        print(f"[SCENARIO INJECTED]: NOMINAL CLEAR ROAD -> Speed={speed} km/h, Distance={distance} m\n", flush=True)
    elif args.speed is not None or args.distance is not None:
        speed = args.speed if args.speed is not None else 35.0
        distance = args.distance if args.distance is not None else 18.0
        camera_sensor.inject_scenario(distance=distance, speed=speed, confidence=args.confidence, object_type="OBSTACLE")
        radar_sensor.inject_scenario(distance=distance, relative_velocity=-8.0)
        telematics_sensor.inject_speed(speed_kmh=speed)

    # 4. Initialize Edge AI Inference Engine
    inference_engine = EdgeAIInferenceEngine(bus)
    await inference_engine.initialize()

    # 5. Initialize Decision & Actuation Controller
    controller = SafetyDecisionController(bus, telemetry)
    await controller.initialize()

    # 6. Launch Concurrent Async Sensor Tasks
    sensor_tasks = [
        asyncio.create_task(camera_sensor.run()),
        asyncio.create_task(radar_sensor.run()),
        asyncio.create_task(telematics_sensor.run())
    ]

    print("[SYSTEM READY] Concurrent sensor streaming and safety actuation running...\n", flush=True)

    try:
        # Run simulation for specified duration
        await asyncio.sleep(args.duration)
    except KeyboardInterrupt:
        print("\n[SIMULATION INTERRUPTED BY USER]")
    finally:
        print("\n[TEARDOWN] Stopping sensor tasks and flushing message bus...", flush=True)
        camera_sensor.stop()
        radar_sensor.stop()
        telematics_sensor.stop()

        for t in sensor_tasks:
            t.cancel()

        await bus.stop()
        print("=========================================================================")
        print("                 SDV SIMULATION COMPLETED SUCCESSFULLY                   ")
        print("=========================================================================", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
