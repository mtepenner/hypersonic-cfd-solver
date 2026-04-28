from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from dataclasses import dataclass

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field

from app.core.cuda_interface import CudaInterface
from app.mesh.generator import generate_nosecone_mesh


class ParameterUpdate(BaseModel):
    mach_number: float | None = Field(default=None, ge=3.0, le=18.0)
    angle_of_attack_deg: float | None = Field(default=None, ge=-12.0, le=18.0)


class ProbeRequest(BaseModel):
    x_m: float
    y_m: float


@dataclass(slots=True)
class RuntimeState:
    engine: CudaInterface
    clients: set[WebSocket]
    latest_payload: dict | None
    lock: asyncio.Lock


@asynccontextmanager
async def lifespan(app: FastAPI):
    mesh = generate_nosecone_mesh()
    runtime = RuntimeState(
        engine=CudaInterface(mesh),
        clients=set(),
        latest_payload=None,
        lock=asyncio.Lock(),
    )
    app.state.runtime = runtime
    task = asyncio.create_task(simulation_loop(runtime))
    try:
        yield
    finally:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task


app = FastAPI(title="Hypersonic CFD Simulation API", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str | int]:
    runtime: RuntimeState = app.state.runtime
    return {
        "service": "simulation-api",
        "status": "ok",
        "backend": runtime.engine.backend,
        "clients": len(runtime.clients),
    }


@app.get("/snapshot")
async def snapshot() -> dict:
    runtime: RuntimeState = app.state.runtime
    async with runtime.lock:
        payload = runtime.latest_payload or runtime.engine.advance().to_payload()
        runtime.latest_payload = payload
        return payload


@app.post("/parameters")
async def update_parameters(update: ParameterUpdate) -> dict:
    runtime: RuntimeState = app.state.runtime
    async with runtime.lock:
        runtime.engine.update_parameters(update.mach_number, update.angle_of_attack_deg)
        payload = runtime.engine.advance().to_payload()
        runtime.latest_payload = payload
    await broadcast(runtime, payload)
    return payload


@app.post("/probe")
async def probe(request: ProbeRequest) -> dict:
    runtime: RuntimeState = app.state.runtime
    async with runtime.lock:
        payload = runtime.engine.latest_or_advance().to_payload(probe=runtime.engine.probe(request.x_m, request.y_m))
        runtime.latest_payload = payload
        return payload["probe"]


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    runtime: RuntimeState = app.state.runtime
    await websocket.accept()
    runtime.clients.add(websocket)
    try:
        async with runtime.lock:
            payload = runtime.latest_payload or runtime.engine.advance().to_payload()
            runtime.latest_payload = payload
        await websocket.send_json(payload)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        runtime.clients.discard(websocket)
    finally:
        runtime.clients.discard(websocket)


async def simulation_loop(runtime: RuntimeState) -> None:
    while True:
        async with runtime.lock:
            payload = runtime.engine.advance().to_payload()
            runtime.latest_payload = payload
        await broadcast(runtime, payload)
        await asyncio.sleep(0.35)


async def broadcast(runtime: RuntimeState, payload: dict) -> None:
    stale_clients: list[WebSocket] = []
    for client in list(runtime.clients):
        try:
            await client.send_json(payload)
        except Exception:
            stale_clients.append(client)
    for client in stale_clients:
        runtime.clients.discard(client)


import contextlib  # noqa: E402  # keep near lifespan cleanup for readability
