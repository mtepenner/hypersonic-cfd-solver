export type SimulationSnapshot = {
  timestamp: string;
  step: number;
  backend: string;
  parameters: {
    mach_number: number;
    angle_of_attack_deg: number;
  };
  mesh_extent: {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
  };
  pressure: number[][];
  temperature: number[][];
  density: number[][];
  body_mask: number[][];
  conservation: {
    mass_delta_pct: number;
    energy_delta_pct: number;
  };
  extrema: {
    max_pressure: number;
    max_temperature_k: number;
    min_density: number;
  };
};

export type ProbePoint = {
  x_m: number;
  y_m: number;
  pressure: number;
  temperature_k: number;
  density: number;
};
