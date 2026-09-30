import React, { Component, Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Sky, PerspectiveCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import pineUrl from './assets/pine.glb?url';
import RangeGround, { groundHeight } from './RangeGround';
import TeeGrass from './TeeGrass';
import { hasRecordedFlight, sendBack } from './pitraxBridge';

// -------------------------------------------------------------
// 1. PHOTOREALISTIC TRACER RIBBON (TrackMan Style)
// -------------------------------------------------------------
const TRACER_SEGMENTS = 100;
const TRACER_RADIAL = 8;
const FLIGHT_SECONDS = 2.5;

function TrackmanTracer({ carryYds = 250, apexYds = 35, offlineYds = 0 }) {
  const ballRef = useRef();
  const progress = useRef(0);

  const { points, tubeGeo, curtainGeo } = useMemo(() => {
    const points = [];
    for (let i = 0; i <= TRACER_SEGMENTS; i++) {
      const t = i / TRACER_SEGMENTS;
      const z = -t * carryYds;
      const y = Math.sin(t * Math.PI) * apexYds;
      const x = Math.pow(t, 1.4) * offlineYds;
      points.push(new THREE.Vector3(x, Math.max(0, y), z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, TRACER_SEGMENTS, 0.1, TRACER_RADIAL, false);

    const curtain = [];
    for (let i = 0; i < TRACER_SEGMENTS; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      curtain.push(p1.x, p1.y, p1.z, p1.x, 0.05, p1.z, p2.x, p2.y, p2.z);
      curtain.push(p1.x, 0.05, p1.z, p2.x, 0.05, p2.z, p2.x, p2.y, p2.z);
    }
    const curtainGeo = new THREE.BufferGeometry();
    curtainGeo.setAttribute('position', new THREE.Float32BufferAttribute(curtain, 3));

    tubeGeo.setDrawRange(0, 0);
    curtainGeo.setDrawRange(0, 0);
    return { points, tubeGeo, curtainGeo };
  }, [carryYds, apexYds, offlineYds]);

  useEffect(() => () => {
    tubeGeo.dispose();
    curtainGeo.dispose();
  }, [tubeGeo, curtainGeo]);

  useFrame((_, delta) => {
    if (progress.current >= 1) return;
    progress.current = Math.min(1, progress.current + delta / FLIGHT_SECONDS);
    const drawn = Math.floor(progress.current * TRACER_SEGMENTS);
    tubeGeo.setDrawRange(0, drawn * TRACER_RADIAL * 6);
    curtainGeo.setDrawRange(0, drawn * 6);
    if (ballRef.current) ballRef.current.position.copy(points[drawn]);
  });

  const landing = points[points.length - 1];

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.9} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh geometry={curtainGeo}>
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh ref={ballRef} position={points[0]}>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[landing.x, 0.1, landing.z]}>
        <ringGeometry args={[1.0, 1.8, 32]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.8} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

// -------------------------------------------------------------
// 2. TREES (ground and tee grass live in RangeGround.jsx / TeeGrass.jsx)
// -------------------------------------------------------------
// Quaternius pine (~7 units tall), one InstancedMesh per part (bark, needles).
function PineForest({ treeCount = 600 }) {
  const { scene } = useGLTF(pineUrl);
  const maxAnisotropy = useThree((state) => state.gl.capabilities.getMaxAnisotropy());

  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const found = [];
    scene.traverse((child) => {
      if (!child.isMesh) return;
      const material = child.material.clone();
      material.metalness = 0;
      [material.map, material.normalMap].forEach((texture) => {
        if (!texture) return;
        texture.anisotropy = maxAnisotropy;
        texture.needsUpdate = true;
      });
      if (material.transparent) {
        // Blended needles don't sort across hundreds of instances; cut them out instead.
        material.transparent = false;
        material.alphaTest = 0.5;
        material.depthWrite = true;
        material.side = THREE.DoubleSide;
      }
      found.push({ geometry: child.geometry, material, local: child.matrixWorld.clone() });
    });
    return found;
  }, [scene, maxAnisotropy]);

  const transforms = useMemo(() => {
    const dummy = new THREE.Object3D();
    const list = [];
    for (let i = 0; i < treeCount; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      const x = (120 + Math.random() * 200) * side;
      const z = 50 - Math.random() * 900;
      const scale = 1.6 + Math.random() * 1.8;
      dummy.position.set(x, groundHeight(x, z) - 0.3, z);
      dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
      dummy.scale.set(scale, scale * (0.9 + Math.random() * 0.25), scale);
      dummy.updateMatrix();
      list.push({
        matrix: dummy.matrix.clone(),
        tint: new THREE.Color().setHSL(0.28 + Math.random() * 0.06, 0.25, 0.8 + Math.random() * 0.2),
      });
    }
    return list;
  }, [treeCount]);

  return (
    <group>
      {parts.map((part, index) => (
        <PineInstances key={index} part={part} transforms={transforms} />
      ))}
    </group>
  );
}

function PineInstances({ part, transforms }) {
  const ref = useRef();
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const matrix = new THREE.Matrix4();
    transforms.forEach((t, i) => {
      matrix.multiplyMatrices(t.matrix, part.local);
      ref.current.setMatrixAt(i, matrix);
      ref.current.setColorAt(i, t.tint);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
    ref.current.computeBoundingSphere();
    gl.shadowMap.needsUpdate = true;
  }, [part, transforms, gl]);

  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, transforms.length]}
      castShadow
    />
  );
}

// Renders nothing if a loaded asset fails (e.g. the CDN HDRI while offline).
class OptionalBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// -------------------------------------------------------------
// 3. UI OVERLAYS (live data)
// -------------------------------------------------------------
const METRICS = [
  { key: 'carry', label: 'CARRY', unit: 'yds' },
  { key: 'total', label: 'TOTAL', unit: 'yds' },
  { key: 'curve', label: 'CURVE', unit: '' },
  { key: 'clubSpeed', label: 'CLUB SPEED', unit: 'mph' },
  { key: 'ballSpeed', label: 'BALL SPEED', unit: 'mph' },
  { key: 'smash', label: 'SMASH', unit: '' },
  { key: 'spin', label: 'SPIN RATE', unit: 'rpm' },
  { key: 'attack', label: 'ATTACK', unit: 'deg' },
  { key: 'path', label: 'CLUB PATH', unit: 'deg' },
  { key: 'faceToPath', label: 'FACE/PATH', unit: 'deg' },
];

function TopBar({ shots, shot, onSelectShot, onReplay }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-center gap-3 bg-black/70 backdrop-blur-md border-b border-white/10 h-11 pr-[max(env(safe-area-inset-right),0.75rem)] pl-[max(env(safe-area-inset-left),0.75rem)] text-xs">
      <button onClick={sendBack} className="flex items-center gap-1.5 font-bold tracking-wider text-white active:opacity-60 shrink-0">
        <span className="text-gray-400 text-sm">‹‹</span>
        BACK
      </button>
      <div className="h-4 w-px bg-white/20 shrink-0" />
      <span className="font-bold tracking-widest text-gray-300 shrink-0">SHOT ANALYSIS</span>

      <div className="flex-1 flex items-center gap-1.5 overflow-x-auto min-w-0 no-scrollbar">
        {shots.map((s) => {
          const selected = shot && s.id === shot.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelectShot(s.id)}
              className={`shrink-0 px-2 py-1 rounded border font-mono ${selected ? 'bg-cyan-400/20 border-cyan-400/80 text-cyan-200' : 'bg-white/5 border-white/10 text-gray-300'}`}
            >
              #{s.id} <span className="font-bold">{s.carry}</span>
            </button>
          );
        })}
      </div>

      {shot && hasRecordedFlight(shot) && (
        <button onClick={onReplay} className="shrink-0 px-2.5 py-1 rounded bg-white/10 border border-white/10 text-cyan-300 font-semibold active:opacity-60">
          ▶ Replay
        </button>
      )}
      <span className="shrink-0 flex items-center gap-1 text-orange-500 font-bold tracking-widest">
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5z" /></svg>
        TRACKMAN
      </span>
    </div>
  );
}

function StatsBanner({ shot }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-md text-white border-t border-white/10 grid grid-cols-10 divide-x divide-white/10 py-2 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pb-[max(env(safe-area-inset-bottom),0.5rem)]">
      {METRICS.map((m) => (
        <div key={m.key} className="flex flex-col items-center justify-center min-w-0 px-0.5 text-center">
          <div className="text-[8px] sm:text-[10px] text-gray-400 uppercase tracking-wider font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
            {m.label}
          </div>
          <div className="text-base sm:text-xl lg:text-3xl font-extrabold text-white leading-tight whitespace-nowrap">
            {shot ? shot[m.key] ?? '—' : '—'}
          </div>
          {m.unit && <div className="text-[9px] sm:text-[10px] text-gray-400 leading-none">{m.unit}</div>}
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------
// 4. MAIN 3D CANVAS WITH ENVIRONMENT LIGHTING & REALISM
// -------------------------------------------------------------
export default function DrivingRangeCanvas({ shots = [], shot = null, onSelectShot, replayKey = 0, onReplay }) {
  const showFlight = hasRecordedFlight(shot);

  return (
    <div className="w-full h-screen bg-black relative">
      <Canvas
        dpr={[1, 2]}
        shadows
        gl={{ 
          antialias: true, 
          toneMapping: THREE.ACESFilmicToneMapping, // Photorealistic color processing
          toneMappingExposure: 1.1 
        }}
        onCreated={({ gl }) => {
          // Everything that casts a shadow is static; re-render the map only when trees change.
          gl.shadowMap.autoUpdate = false;
          gl.shadowMap.needsUpdate = true;
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 2.2, 6]} fov={50} far={3000} />
        <OrbitControls target={[0, 1.5, -30]} maxPolarAngle={Math.PI / 2 - 0.01} maxDistance={400} />

        {/* Photorealistic Atmospheric Sky & Lighting */}
        <Sky sunPosition={[100, 20, 100]} turbidity={0.1} rayleigh={0.5} mieCoefficient={0.005} />
        <fogExp2 attach="fog" args={['#9cc1dd', 0.0016]} />
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[300, 600, 300]}
          intensity={1.5}
          castShadow
          shadow-mapSize={[4096, 4096]}
          shadow-camera-left={-900}
          shadow-camera-right={900}
          shadow-camera-top={900}
          shadow-camera-bottom={-900}
          shadow-camera-near={1}
          shadow-camera-far={2000}
          shadow-bias={-0.0004}
          shadow-normalBias={0.3}
        />

        {/* Real HDRI Environmental Reflection map */}
        <OptionalBoundary>
          <Suspense fallback={null}>
            <Environment preset="park" background={false} />
          </Suspense>
        </OptionalBoundary>

        {/* Range Terrain & Ball Path */}
        <RangeGround />
        <TeeGrass />
        <OptionalBoundary>
          <Suspense fallback={null}>
            <PineForest />
          </Suspense>
        </OptionalBoundary>
        {showFlight && (
          <TrackmanTracer
            key={`${shot.id}-${shot.carry}-${replayKey}`}
            carryYds={parseFloat(shot.carry)}
            apexYds={Number(shot.apexYds) || 25}
            offlineYds={(Number(shot.offlineFt) || 0) / 3}
          />
        )}
      </Canvas>

      <TopBar shots={shots} shot={shot} onSelectShot={onSelectShot} onReplay={onReplay} />

      {!showFlight && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 text-xs text-gray-300 tracking-wide">
          Waiting for shot…
        </div>
      )}

      {/* TrackMan UI Banner Overlay */}
      <StatsBanner shot={shot} />
    </div>
  );
}
