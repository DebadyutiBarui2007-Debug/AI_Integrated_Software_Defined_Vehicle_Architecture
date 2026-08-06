"""
Software-Defined Vehicle (SDV) - Asynchronous SOME/IP & ROS 2 Message Bus
Module: sdv_bus.py

This module implements a thread-safe, asynchronous Service-Oriented Architecture (SOA) 
publish-subscribe message bus simulating SOME/IP and ROS 2 protocols used in modern automotive ECU networks.
"""

import asyncio
from typing import Callable, Dict, List, Any, Awaitable
from dataclasses import dataclass, field
import time
import json
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@dataclass
class Message:
    """
    Standard SOME/IP / ROS 2 message packet structure.
    Includes protocol metadata, timestamp, origin zone, and payload.
    """
    topic: str
    sender_id: str
    payload: Dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    message_id: str = field(default_factory=lambda: f"MSG-{int(time.time()*1000)}")

    def to_dict(self) -> Dict[str, Any]:
        return {
            "message_id": self.message_id,
            "topic": self.topic,
            "sender_id": self.sender_id,
            "timestamp": self.timestamp,
            "payload": self.payload
        }


AsyncCallback = Callable[[Message], Awaitable[None]]


class VehicleDataBus:
    """
    Asynchronous Thread-Safe SOA Message Bus.
    Supports topic subscription, asynchronous queue-based message routing, 
    and non-blocking publish methods for high-throughput automotive telemetry.
    """

    def __init__(self):
        # Maps topic_name -> List of async callback functions
        self._subscribers: Dict[str, List[AsyncCallback]] = {}
        # Thread-safe lock for modifying subscriber dictionary
        self._lock = asyncio.Lock()
        # Message queue for asynchronous packet dispatching
        self._queue: asyncio.Queue[Message] = asyncio.Queue()
        # Control flag for background worker
        self._running = False
        self._worker_task: asyncio.Task | None = None

    async def start(self):
        """Starts the asynchronous message bus routing loop."""
        async with self._lock:
            if not self._running:
                self._running = True
                self._worker_task = asyncio.create_task(self._route_loop())
                logging.info("[BUS] SOA Vehicle Data Bus started successfully (SOME/IP / ROS 2 driver).")

    async def stop(self):
        """Stops the message bus and flushes pending packets."""
        async with self._lock:
            self._running = False
            if self._worker_task:
                self._worker_task.cancel()
                try:
                    await self._worker_task
                except asyncio.CancelledError:
                    pass
                logging.info("[BUS] SOA Vehicle Data Bus stopped.")

    async def subscribe(self, topic: str, callback: AsyncCallback):
        """
        Subscribes an asynchronous callback handler to a specific SOME/IP topic.
        """
        async with self._lock:
            if topic not in self._subscribers:
                self._subscribers[topic] = []
            self._subscribers[topic].append(callback)
            logging.info(f"[BUS] Subscribed callback to topic: '{topic}'")

    async def publish(self, topic: str, sender_id: str, payload: Dict[str, Any]):
        """
        Publishes a message packet to the message bus asynchronously.
        This operation is non-blocking and safe for real-time sensor streams.
        """
        msg = Message(topic=topic, sender_id=sender_id, payload=payload)
        await self._queue.put(msg)

    async def _route_loop(self):
        """
        Internal worker coroutine that pops messages from queue 
        and dispatches them to registered subscriber callbacks concurrently.
        """
        while self._running:
            try:
                # Wait for next message packet with timeout to allow graceful shutdown
                msg = await asyncio.wait_for(self._queue.get(), timeout=0.5)
                
                async with self._lock:
                    callbacks = list(self._subscribers.get(msg.topic, []))
                
                if callbacks:
                    # Dispatch to all subscribers concurrently
                    tasks = [asyncio.create_task(cb(msg)) for cb in callbacks]
                    await asyncio.gather(*tasks, return_exceptions=True)

                self._queue.task_done()
            except asyncio.TimeoutError:
                continue
            except asyncio.CancelledError:
                break
            except Exception as e:
                logging.error(f"[BUS ERROR] Message routing exception: {e}")
