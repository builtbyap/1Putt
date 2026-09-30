import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Unit-height blade; position.y doubles as the 0..1 height used for wind bend.
function createBladeGeometry() {
  const w = 0.012;
  const positions = [
    -w / 2, 0, 0,
    w / 2, 0, 0,
    -w * 0.35, 0.55, 0,
    w * 0.35, 0.55, 0,
    0, 1, 0,
  ];
  const colors = [
    0.10, 0.19, 0.05,
    0.10, 0.19, 0.05,
    0.17, 0.31, 0.09,
    0.17, 0.31, 0.09,
    0.26, 0.43, 0.13,
  ];
  // Upward normals so blades are lit like the turf they stand on.
  const normals = new Array(15).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  return geometry;
}

// A few thousand swaying blades around the hitting area only.
export default function TeeGrass({ count = 14000 }) {
  const ref = useRef();
  const time = useMemo(() => ({ value: 0 }), []);

  const { geometry, material } = useMemo(() => {
    const geometry = createBladeGeometry();
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 bladeRoot = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float bend = position.y * position.y;
        float sway = sin(uTime * 1.8 + bladeRoot.x * 1.7 + bladeRoot.z * 1.3) * 0.22
                   + sin(uTime * 3.1 + bladeRoot.z * 4.0) * 0.07;
        transformed.x += sway * bend;
        transformed.z += sway * 0.4 * bend;`
      );
    };
    return { geometry, material };
  }, [time]);

  useEffect(() => {
    const mesh = ref.current;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    let placed = 0;
    let attempts = 0;

    while (placed < count && attempts < count * 6) {
      attempts++;
      const x = (Math.random() * 2 - 1) * 7;
      const z = 3 - Math.random() * 19;
      // Dense around the ball, thinning out so there's no hard edge.
      const r = Math.hypot(x / 7, (z + 6.5) / 9.5);
      if (Math.random() < THREE.MathUtils.smoothstep(r, 0.45, 1.0)) continue;

      const height = 0.06 + Math.random() * 0.07;
      dummy.position.set(x, 0, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.5);
      dummy.scale.set(0.8 + Math.random() * 0.6, height, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);

      const worn = 1.0 - THREE.MathUtils.smoothstep(Math.hypot(x, z + 0.5), 2.5, 9.0);
      color.setRGB(1, 1, 1).lerp(new THREE.Color(1.25, 1.1, 0.7), worn * Math.random() * 0.6);
      color.multiplyScalar(0.8 + Math.random() * 0.4);
      mesh.setColorAt(placed, color);
      placed++;
    }

    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count]);

  useFrame(({ clock }) => {
    time.value = clock.elapsedTime;
  });

  return <instancedMesh ref={ref} args={[geometry, material, count]} frustumCulled={false} receiveShadow />;
}
