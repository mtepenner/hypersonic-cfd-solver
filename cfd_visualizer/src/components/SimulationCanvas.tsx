import { useEffect, useRef } from 'react';
import {
  DataTexture,
  FloatType,
  LinearFilter,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  RedFormat,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from 'three';

import fragmentShader from '../shaders/heatmap.frag?raw';
import { ProbePoint, SimulationSnapshot } from '../types';

const WIDTH = 160;
const HEIGHT = 96;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

type Props = {
  snapshot: SimulationSnapshot | null;
  probe: ProbePoint | null;
  onProbe: (xM: number, yM: number) => void;
};

export function SimulationCanvas({ snapshot, probe, onProbe }: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const scalarRef = useRef<DataTexture | null>(null);
  const maskRef = useRef<DataTexture | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<OrthographicCamera | null>(null);
  const scalarBufferRef = useRef<Float32Array>(new Float32Array(WIDTH * HEIGHT));
  const maskBufferRef = useRef<Float32Array>(new Float32Array(WIDTH * HEIGHT));

  useEffect(() => {
    if (!mountRef.current) {
      return;
    }

    const mount = mountRef.current;
    const renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scalarTexture = new DataTexture(scalarBufferRef.current, WIDTH, HEIGHT, RedFormat, FloatType);
    scalarTexture.minFilter = LinearFilter;
    scalarTexture.magFilter = LinearFilter;
    scalarTexture.needsUpdate = true;

    const maskTexture = new DataTexture(maskBufferRef.current, WIDTH, HEIGHT, RedFormat, FloatType);
    maskTexture.minFilter = LinearFilter;
    maskTexture.magFilter = LinearFilter;
    maskTexture.needsUpdate = true;

    const material = new ShaderMaterial({
      fragmentShader,
      vertexShader,
      uniforms: {
        uScalar: { value: scalarTexture },
        uBodyMask: { value: maskTexture },
      },
    });

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;
    scene.add(new Mesh(new PlaneGeometry(2, 2), material));
    renderer.render(scene, camera);

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
        return;
      }
      rendererRef.current.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };

    const handleClick = (event: MouseEvent) => {
      if (!snapshot) {
        return;
      }
      const rect = renderer.domElement.getBoundingClientRect();
      const u = (event.clientX - rect.left) / rect.width;
      const v = (event.clientY - rect.top) / rect.height;
      const xM = snapshot.mesh_extent.x_min + u * (snapshot.mesh_extent.x_max - snapshot.mesh_extent.x_min);
      const yM = snapshot.mesh_extent.y_max - v * (snapshot.mesh_extent.y_max - snapshot.mesh_extent.y_min);
      onProbe(xM, yM);
    };

    renderer.domElement.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    scalarRef.current = scalarTexture;
    maskRef.current = maskTexture;
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    return () => {
      renderer.domElement.removeEventListener('click', handleClick);
      window.removeEventListener('resize', handleResize);
      material.dispose();
      scalarTexture.dispose();
      maskTexture.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [onProbe, snapshot]);

  useEffect(() => {
    if (!snapshot || !scalarRef.current || !maskRef.current || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }

    writeGrid(snapshot.temperature, scalarBufferRef.current, 250, snapshot.extrema.max_temperature_k);
    writeGrid(snapshot.body_mask, maskBufferRef.current, 0, 1);

    scalarRef.current.needsUpdate = true;
    maskRef.current.needsUpdate = true;
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  }, [snapshot]);

  return (
    <div className="canvas-shell">
      <div className="canvas-stage" ref={mountRef} />
      {probe ? (
        <div className="probe-overlay">
          <strong>Probe</strong>
          <span>{probe.x_m.toFixed(2)} m, {probe.y_m.toFixed(2)} m</span>
        </div>
      ) : null}
    </div>
  );
}

function writeGrid(values: number[][], buffer: Float32Array, minValue: number, maxValue: number) {
  const height = Math.min(values.length, HEIGHT);
  const width = Math.min(values[0]?.length ?? 0, WIDTH);
  const range = Math.max(maxValue - minValue, 1e-6);

  for (let row = 0; row < HEIGHT; row += 1) {
    for (let column = 0; column < WIDTH; column += 1) {
      const sourceRow = Math.min(height - 1, row);
      const sourceColumn = Math.min(width - 1, column);
      const value = values[sourceRow]?.[sourceColumn] ?? minValue;
      buffer[row * WIDTH + column] = Math.max(0, Math.min(1, (value - minValue) / range));
    }
  }
}
