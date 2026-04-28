from __future__ import annotations

import unittest

from app.core.cuda_interface import CudaInterface
from app.mesh.generator import generate_nosecone_mesh


class ConservationTests(unittest.TestCase):
    def test_conservation_stays_bounded_for_small_parameter_change(self) -> None:
        engine = CudaInterface(generate_nosecone_mesh())
        baseline = engine.advance()
        engine.update_parameters(mach_number=baseline.parameters["mach_number"] + 0.8, angle_of_attack_deg=7.0)
        next_snapshot = engine.advance()

        self.assertLess(abs(next_snapshot.conservation["mass_delta_pct"]), 15.0)
        self.assertLess(abs(next_snapshot.conservation["energy_delta_pct"]), 30.0)

    def test_probe_returns_scalar_values(self) -> None:
        engine = CudaInterface(generate_nosecone_mesh())
        engine.advance()
        probe = engine.probe(0.8, 0.1)

        self.assertIn("pressure", probe)
        self.assertGreater(probe["temperature_k"], 250.0)


if __name__ == "__main__":
    unittest.main()
