from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import math
from typing import Any

import numpy as np

from app.mesh.generator import StructuredMesh

try:
    import cupy as cp  # type: ignore
except Exception:  # pragma: no cover - optional GPU path
    cp = None


@dataclass(slots=True)
class FlowParameters:
    mach_number: float = 8.0
    angle_of_attack_deg: float = 5.0


@dataclass(slots=True)
class SimulationSnapshot:
    timestamp: str
    step: int
    backend: str
    parameters: dict[str, float]
    mesh_extent: dict[str, float]
    pressure: np.ndarray
    temperature: np.ndarray
    density: np.ndarray
    body_mask: np.ndarray
    conservation: dict[str, float]
    extrema: dict[str, float]

    def to_payload(self, probe: dict[str, float] | None = None) -> dict[str, Any]:
        payload: dict[str, Any] = {
            "timestamp": self.timestamp,
            "step": self.step,
            "backend": self.backend,
            "parameters": self.parameters,
            "mesh_extent": self.mesh_extent,
            "pressure": self.pressure.tolist(),
            "temperature": self.temperature.tolist(),
            "density": self.density.tolist(),
            "body_mask": self.body_mask.astype(int).tolist(),
            "conservation": self.conservation,
            "extrema": self.extrema,
        }
        if probe is not None:
            payload["probe"] = probe
        return payload


class CudaInterface:
    def __init__(self, mesh: StructuredMesh) -> None:
        self._mesh = mesh
        self._params = FlowParameters()
        self._step = 0
        self._baseline_mass: float | None = None
        self._baseline_energy: float | None = None
        self._latest_snapshot: SimulationSnapshot | None = None
        self._backend = "cupy" if cp is not None else "numpy"

    @property
    def backend(self) -> str:
        return self._backend

    @property
    def parameters(self) -> FlowParameters:
        return self._params

    def update_parameters(self, mach_number: float | None = None, angle_of_attack_deg: float | None = None) -> None:
        if mach_number is not None:
            self._params.mach_number = float(np.clip(mach_number, 3.0, 18.0))
        if angle_of_attack_deg is not None:
            self._params.angle_of_attack_deg = float(np.clip(angle_of_attack_deg, -12.0, 18.0))

    def advance(self) -> SimulationSnapshot:
        self._step += 1
        snapshot = self._compute_snapshot()
        self._latest_snapshot = snapshot
        return snapshot

    def latest_or_advance(self) -> SimulationSnapshot:
        return self._latest_snapshot or self.advance()

    def probe(self, x_m: float, y_m: float) -> dict[str, float]:
        snapshot = self.latest_or_advance()
        ix = int(np.argmin(np.abs(self._mesh.x[0] - x_m)))
        iy = int(np.argmin(np.abs(self._mesh.y[:, 0] - y_m)))
        return {
            "x_m": float(self._mesh.x[iy, ix]),
            "y_m": float(self._mesh.y[iy, ix]),
            "pressure": float(snapshot.pressure[iy, ix]),
            "temperature_k": float(snapshot.temperature[iy, ix]),
            "density": float(snapshot.density[iy, ix]),
        }

    def _compute_snapshot(self) -> SimulationSnapshot:
        x = self._mesh.x
        y = self._mesh.y
        mach = self._params.mach_number
        alpha_rad = math.radians(self._params.angle_of_attack_deg)

        standoff = 0.05 + 0.012 * mach
        shock_slope = 0.32 + 0.015 * mach
        bow_center = 0.25 + 0.04 * math.sin(self._step / 8)
        body_offset = np.tan(alpha_rad) * (x + 0.4)
        body_profile = self._mesh.nose_radius_m * np.sqrt(np.clip(1.0 - np.clip((x + 0.05) / self._mesh.nose_length_m, 0.0, 1.0), 0.0, 1.0))
        shock_profile = body_profile + standoff + shock_slope * np.maximum(x - bow_center, 0.0)

        distance_to_shock = np.abs(y - body_offset) - shock_profile
        bow_shock = np.exp(-((x - bow_center) ** 2) / (0.06 + 0.01 * mach) - ((y - body_offset) ** 2) / (0.02 + 0.002 * mach))
        shear_layer = np.exp(-(distance_to_shock ** 2) / (0.02 + 0.0025 * mach))
        wake = np.exp(-((x - 1.8) ** 2) / 0.9 - ((y + 0.08 * math.sin(alpha_rad)) ** 2) / 0.16)

        pressure = 1.0 + 0.18 * mach * shear_layer + 0.55 * bow_shock - 0.12 * wake
        temperature = 290.0 + 28.0 * mach * shear_layer + 210.0 * bow_shock + 8.0 * abs(self._params.angle_of_attack_deg) * (x + 0.8)
        density = 1.0 + 0.08 * mach * shear_layer + 0.22 * bow_shock - 0.05 * wake

        pressure = np.where(self._mesh.surface_mask, pressure + 0.75 * mach, pressure)
        temperature = np.where(self._mesh.surface_mask, temperature + 120.0 * mach, temperature)
        density = np.where(self._mesh.surface_mask, density + 0.4 * mach, density)

        pressure = np.clip(pressure, 0.82, None)
        temperature = np.clip(temperature, 250.0, None)
        density = np.clip(density, 0.72, None)

        cell_area = self._mesh.dx * self._mesh.dy
        total_mass = float(np.sum(density) * cell_area)
        kinetic = 0.5 * density * ((mach * 343.0 * math.cos(alpha_rad)) ** 2 + (mach * 343.0 * math.sin(alpha_rad)) ** 2)
        total_energy = float(np.sum(pressure / 0.4 + kinetic) * cell_area)

        if self._baseline_mass is None:
            self._baseline_mass = total_mass
            self._baseline_energy = total_energy

        conservation = {
            "mass_delta_pct": (total_mass - self._baseline_mass) / self._baseline_mass * 100.0,
            "energy_delta_pct": (total_energy - self._baseline_energy) / self._baseline_energy * 100.0,
        }
        extrema = {
            "max_pressure": float(np.max(pressure)),
            "max_temperature_k": float(np.max(temperature)),
            "min_density": float(np.min(density)),
        }

        return SimulationSnapshot(
            timestamp=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            step=self._step,
            backend=self._backend,
            parameters={
                "mach_number": self._params.mach_number,
                "angle_of_attack_deg": self._params.angle_of_attack_deg,
            },
            mesh_extent={
                "x_min": float(np.min(x)),
                "x_max": float(np.max(x)),
                "y_min": float(np.min(y)),
                "y_max": float(np.max(y)),
            },
            pressure=pressure.astype(np.float32),
            temperature=temperature.astype(np.float32),
            density=density.astype(np.float32),
            body_mask=self._mesh.surface_mask,
            conservation=conservation,
            extrema=extrema,
        )
