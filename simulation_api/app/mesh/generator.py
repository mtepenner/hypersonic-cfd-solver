from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(slots=True)
class StructuredMesh:
    x: np.ndarray
    y: np.ndarray
    surface_mask: np.ndarray
    nose_length_m: float
    nose_radius_m: float
    dx: float
    dy: float


def generate_nosecone_mesh(width: int = 160, height: int = 96, nose_length_m: float = 2.4, nose_radius_m: float = 0.55) -> StructuredMesh:
    x_values = np.linspace(-0.6, 3.4, width)
    y_values = np.linspace(-1.2, 1.2, height)
    x_grid, y_grid = np.meshgrid(x_values, y_values)

    normalized = np.clip((x_grid + 0.05) / nose_length_m, 0.0, 1.0)
    cone_profile = nose_radius_m * np.sqrt(np.clip(1.0 - normalized, 0.0, 1.0))
    surface_mask = (x_grid >= 0.0) & (x_grid <= nose_length_m) & (np.abs(y_grid) <= cone_profile)

    return StructuredMesh(
        x=x_grid,
        y=y_grid,
        surface_mask=surface_mask,
        nose_length_m=nose_length_m,
        nose_radius_m=nose_radius_m,
        dx=float(x_values[1] - x_values[0]),
        dy=float(y_values[1] - y_values[0]),
    )
