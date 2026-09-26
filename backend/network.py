"""One bounded, latest-state writer per connection; never block the world tick."""
import asyncio
import contextlib
from collections import deque
from starlette.websockets import WebSocketDisconnect
from websockets.exceptions import ConnectionClosed


class ClientChannel:
    def __init__(self, ws):
        self.ws = ws
        self.pending = None
        self.events = deque(maxlen=256)
        self.controls = deque(maxlen=8)
        self.wake = asyncio.Event()
        self.task = None
        self.closed = False
        self.coalesced = 0

    def start(self):
        self.task = asyncio.create_task(self.run())

    def offer(self, state):
        if self.closed:
            return
        if self.pending is not None:
            self.coalesced += 1
        self.events.extend(state.get('events', []))
        self.pending = state
        self.wake.set()

    def control(self, message):
        if not self.closed:
            self.controls.append(message)
            self.wake.set()

    async def run(self):
        try:
            while True:
                await self.wake.wait()
                # Heartbeats take priority over the next (not an in-flight) state.
                if self.controls:
                    message = self.controls.popleft()
                elif self.pending is not None:
                    message, self.pending = self.pending, None
                    message = {**message, 'events': list(self.events)}
                    self.events.clear()
                else:
                    self.wake.clear()
                    continue
                await asyncio.wait_for(self.ws.send_json(message), .5)
        except (TimeoutError, OSError, RuntimeError, WebSocketDisconnect, ConnectionClosed):
            pass
        except asyncio.CancelledError:
            raise
        finally:
            self.closed = True
            with contextlib.suppress(Exception):
                await asyncio.wait_for(self.ws.close(), .3)

    async def stop(self):
        self.closed = True
        if self.task:
            self.task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.task
        self.pending = None
        self.events.clear()
        self.controls.clear()