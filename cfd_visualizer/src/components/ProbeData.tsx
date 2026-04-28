import { ProbePoint, SimulationSnapshot } from '../types';

type Props = {
  probe: ProbePoint | null;
  snapshot: SimulationSnapshot | null;
};

export function ProbeData({ probe, snapshot }: Props) {
  return (
    <section className="panel stack-gap">
      <div className="section-heading">
        <span>Probe Data</span>
        <small>{snapshot ? `Frame ${snapshot.step}` : 'Awaiting stream'}</small>
      </div>

      {probe ? (
        <>
          <div className="metric-row"><span>Position</span><strong>{probe.x_m.toFixed(2)}, {probe.y_m.toFixed(2)} m</strong></div>
          <div className="metric-row"><span>Pressure</span><strong>{probe.pressure.toFixed(2)}</strong></div>
          <div className="metric-row"><span>Temperature</span><strong>{probe.temperature_k.toFixed(1)} K</strong></div>
          <div className="metric-row"><span>Density</span><strong>{probe.density.toFixed(2)}</strong></div>
        </>
      ) : (
        <div className="empty-state">Click the heatmap to inspect local flow properties.</div>
      )}

      {snapshot ? (
        <>
          <div className="metric-row"><span>Mass delta</span><strong>{snapshot.conservation.mass_delta_pct.toFixed(2)}%</strong></div>
          <div className="metric-row"><span>Energy delta</span><strong>{snapshot.conservation.energy_delta_pct.toFixed(2)}%</strong></div>
          <div className="metric-row"><span>Max temperature</span><strong>{snapshot.extrema.max_temperature_k.toFixed(1)} K</strong></div>
        </>
      ) : null}
    </section>
  );
}
