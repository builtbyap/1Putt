import React, { useMemo } from 'react';
import * as THREE from 'three';

// World units are yards. The ball sits at the origin and the range runs toward -z.
export const FAIRWAY_HALF_WIDTH = 55;
const HILLS_START = 105;
const HILLS_FULL = 170;

function smoothstep(edge0, edge1, x) {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

// Must stay identical to GROUND_HEIGHT_GLSL so trees sit on the rendered hills.
export function groundHeight(x, z) {
  const mask = smoothstep(HILLS_START, HILLS_FULL, Math.abs(x));
  if (mask === 0) return 0;
  const h =
    Math.sin(x * 0.021 + 1.3) * Math.sin(z * 0.017 + 0.4) * 7.0 +
    Math.sin(x * 0.047 + 4.1) * Math.sin(z * 0.039 + 2.2) * 2.5 +
    Math.sin((x + z) * 0.011) * 4.0;
  return (h + 5.0) * mask;
}

const GROUND_HEIGHT_GLSL = `
  float groundHeight(vec2 p) {
    float mask = smoothstep(${HILLS_START.toFixed(1)}, ${HILLS_FULL.toFixed(1)}, abs(p.x));
    float h = sin(p.x * 0.021 + 1.3) * sin(p.y * 0.017 + 0.4) * 7.0
            + sin(p.x * 0.047 + 4.1) * sin(p.y * 0.039 + 2.2) * 2.5
            + sin((p.x + p.y) * 0.011) * 4.0;
    return (h + 5.0) * mask;
  }
`;

const GROUND_ALBEDO_GLSL = `
  uniform vec3 uFairLight;
  uniform vec3 uFairDark;
  uniform vec3 uFirstCut;
  uniform vec3 uRough;
  uniform vec3 uDry;
  uniform vec3 uWorn;
  uniform vec3 uSand;
  varying vec3 vGroundPos;

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
               mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.03;
      a *= 0.5;
    }
    return v;
  }

  vec3 groundAlbedo(vec3 wp, out float surfaceRoughness) {
    vec2 p = wp.xz;
    float ax = abs(p.x);
    float camDist = length(cameraPosition - wp);

    // Mowing stripes: 10-yard bands mowed in alternating directions. Grass bent
    // away from the viewer reflects more light, so the bands swap brightness
    // when the view flips and fade out when looking across them.
    float tri = abs(fract(-p.y / 20.0) - 0.5) * 2.0;
    float mowDir = smoothstep(0.42, 0.58, tri) * 2.0 - 1.0;
    vec3 toCam = normalize(cameraPosition - wp);
    float along = toCam.z / max(length(toCam.xz), 1e-3);
    float sheen = mowDir * clamp(along, -1.0, 1.0);
    vec3 color = mix(uFairDark, uFairLight, 0.5 + 0.5 * sheen);

    // Fairway -> first cut -> rough with a ragged, noisy edge.
    float edgeNoise = (fbm3(p * 0.12) - 0.5) * 6.0;
    float firstCut = smoothstep(${FAIRWAY_HALF_WIDTH.toFixed(1)} - 1.0, ${FAIRWAY_HALF_WIDTH.toFixed(1)} + 3.0, ax + edgeNoise);
    float rough = smoothstep(${FAIRWAY_HALF_WIDTH.toFixed(1)} + 7.0, ${FAIRWAY_HALF_WIDTH.toFixed(1)} + 17.0, ax + edgeNoise * 1.5);
    color = mix(color, uFirstCut, firstCut);
    color = mix(color, uRough * (0.8 + 0.4 * fbm3(p * 0.2)), rough);

    // Color patches and dry spots.
    color *= 0.9 + 0.2 * fbm3(p * 0.06);
    float dry = smoothstep(0.55, 0.8, fbm3(p * 0.015 + 7.0));
    color = mix(color, uDry, dry * 0.3);

    // Fine grain close to the camera only, so it never shimmers in the distance.
    float grainFade = 1.0 - smoothstep(12.0, 55.0, camDist);
    color *= 1.0 + (vnoise(p * 5.0) - 0.5) * 0.22 * grainFade;
    color *= 1.0 + (vnoise(p * 19.0) - 0.5) * 0.18 * (1.0 - smoothstep(4.0, 18.0, camDist));

    // Worn, divoted patch around the hitting area.
    float wearMask = 1.0 - smoothstep(2.5, 9.0, length(p - vec2(0.0, -0.5)));
    float wear = wearMask * smoothstep(0.3, 0.65, fbm3(p * 0.7) + 0.15);
    color = mix(color, uWorn, wear * 0.55);

    // 50-yard distance lines on the fairway, 50 through 500.
    float gz = -p.y / 50.0;
    float g = abs(fract(gz - 0.5) - 0.5) / fwidth(gz);
    float line = (1.0 - min(g, 1.0)) * (1.0 - firstCut) * step(0.5, gz) * step(gz, 10.5);
    color = mix(color, vec3(0.75), line * 0.35);

    // Sand bunkers out in the rough.
    float bunkerZone = smoothstep(85.0, 115.0, ax);
    float bunkerNoise = fbm3(p * 0.03 + 11.0);
    float isBunker = smoothstep(0.62, 0.65, bunkerNoise) * bunkerZone;
    float lip = (smoothstep(0.58, 0.62, bunkerNoise) - smoothstep(0.62, 0.65, bunkerNoise)) * bunkerZone;
    color = mix(color, color * 0.6, lip * 0.6);
    color = mix(color, uSand * (0.92 + 0.16 * vnoise(p * 3.0)), isBunker);

    surfaceRoughness = mix(mix(0.78, 0.92, rough), 1.0, isBunker);
    return color;
  }
`;

function createGroundMaterial() {
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  const uniforms = {
    uFairLight: { value: new THREE.Color('#6fa64a') },
    uFairDark: { value: new THREE.Color('#4a7d2e') },
    uFirstCut: { value: new THREE.Color('#528733') },
    uRough: { value: new THREE.Color('#355e27') },
    uDry: { value: new THREE.Color('#9a9a55') },
    uWorn: { value: new THREE.Color('#7d7a4c') },
    uSand: { value: new THREE.Color('#d9ceb0') },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = `varying vec3 vGroundPos;\n${GROUND_HEIGHT_GLSL}\n${shader.vertexShader}`
      .replace(
        '#include <beginnormal_vertex>',
        `
        vec2 groundXZ = (modelMatrix * vec4(position, 1.0)).xz;
        float gEps = 0.75;
        float gdx = (groundHeight(groundXZ + vec2(gEps, 0.0)) - groundHeight(groundXZ - vec2(gEps, 0.0))) / (2.0 * gEps);
        float gdz = (groundHeight(groundXZ + vec2(0.0, gEps)) - groundHeight(groundXZ - vec2(0.0, gEps))) / (2.0 * gEps);
        vec3 objectNormal = normalize(vec3(-gdx, 1.0, -gdz));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif
        `
      )
      .replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = vec3(position.x, position.y + groundHeight(groundXZ), position.z);
        vGroundPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `
      );

    shader.fragmentShader = `${GROUND_ALBEDO_GLSL}\n${shader.fragmentShader}`
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float groundRoughness;
        diffuseColor.rgb = groundAlbedo(vGroundPos, groundRoughness);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = groundRoughness;`
      );
  };

  return material;
}

// Lit fairway, first cut, rough, bunkers and rolling hills as one surface.
export default function RangeGround() {
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(1400, 1600, 224, 224);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, -300);
    return { geometry, material: createGroundMaterial() };
  }, []);

  return <mesh geometry={geometry} material={material} receiveShadow />;
}
