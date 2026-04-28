import { useEffect, useMemo, useState } from 'react';

import { ParameterControls } from './components/ParameterControls';
import { ProbeData } from './components/ProbeData';
import { SimulationCanvas } from './components/SimulationCanvas';
import { ProbePoint, SimulationSnapshot } from './types';

const apiBaseUrl = import.meta.env.VITE_SIM_API_URL ?? 'http://127.0.0.1:8000';

export default function App() {
  const [snapshot, setSnapshot] = useState<SimulationSnapshot | null>(null);
  const [probe, setProbe] = useState<ProbePoint | null>(null);
  const [status, setStatus] = useState('Connecting to simulation bridge');
  const [machNumber, setMachNumber] = useState(8.0);
  const [angleOfAttackDeg, setAngleOfAttackDeg] = useState(5.0);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let cancelled = false;

    const loadSnapshot = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/snapshot`);
        const initialSnapshot = (await response.json()) as SimulationSnapshot;
        if (!cancelled) {
          setSnapshot(initialSnapshot);
          setMachNumber(initialSnapshot.parameters.mach_number);
          setAngleOfAttackDeg(initialSnapshot.parameters.angle_of_attack_deg);
        }
      } catch {
        if (!cancelled) {
          setStatus('Waiting for simulation API');
        }
      }
    };

    const connect = () => {
      socket = new WebSocket(`${apiBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://')}/ws`);
      socket.onopen = () => {
        if (!cancelled) {
          setStatus('Streaming CFD frames');
        }
      };
      socket.onmessage = (event) => {
        if (cancelled) {
          return;
        }
        const nextSnapshot = JSON.parse(event.data) as SimulationSnapshot;
        setSnapshot(nextSnapshot);
        setStatus(`Frame ${nextSnapshot.step} at ${new Date(nextSnapshot.timestamp).toLocaleTimeString()}`);
      };
      socket.onclose = () => {
        if (!cancelled) {
          reconnectTimer = window.setTimeout(connect, 1200);
        }
      };
      socket.onerror = () => {
        if (!cancelled) {
          setStatus('Simulation stream interrupted');
        }
      };
    };

    loadSnapshot();
    connect();

    return () => {
      cancelled = true;
      socket?.close();
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
      }
    };
  }, []);

  const headline = useMemo(() => {
    if (!snapshot) {
      return 'Preparing thermal field';
    }
    return `${snapshot.parameters.mach_number.toFixed(1)} Mach / ${snapshot.parameters.angle_of_attack_deg.toFixed(1)} deg AoA`;
  }, [snapshot]);

  const applyParameters = async () => {
    const response = await fetch(`${apiBaseUrl}/parameters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mach_number: machNumber, angle_of_attack_deg: angleOfAttackDeg }),
    });
    const nextSnapshot = (await response.json()) as SimulationSnapshot;
    setSnapshot(nextSnapshot);
    setStatus(`Recomputed frame ${nextSnapshot.step}`);
  };

  const requestProbe = async (xM: number, yM: number) => {
    const response = await fetch(`${apiBaseUrl}/probe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x_m: xM, y_m: yM }),
    });
    setProbe((await response.json()) as ProbePoint);
  };

  return (
    <main className="shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">GPU-Orchestrated Hypersonics</p>
          <h1>Shock-aware CFD console for live thermal and pressure inspection around hypersonic nosecones.</h1>
        </div>
        <div className="hero-meta">
          <span>{headline}</span>
          <span>{status}</span>
        </div>
      </section>

      <section className="dashboard-grid">
        <section className="panel stack-gap wide-panel">
          <div className="section-heading">
            <span>Thermal Field</span>
            <small>{snapshot ? `${snapshot.backend} backend` : 'Initializing solver'}</small>
          </div>
          <SimulationCanvas snapshot={snapshot} probe={probe} onProbe={requestProbe} />
        </section>

        <div className="sidebar-stack">
          <ParameterControls
            machNumber={machNumber}
            angleOfAttackDeg={angleOfAttackDeg}
            onMachChange={setMachNumber}
            onAngleChange={setAngleOfAttackDeg}
            onApply={applyParameters}
          />
          <ProbeData probe={probe} snapshot={snapshot} />
        </div>
      </section>
    </main>
  );
}
