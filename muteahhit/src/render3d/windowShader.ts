import * as THREE from 'three';

/** Binaların yan yüzlerine dünya konumuna göre pencere ızgarası ve akşam ışığı ekler. `glow.value` 0–1. */
export function applyWindows(m: THREE.MeshStandardMaterial, glow: { value: number }) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uGlow = glow;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWp; varying vec3 vNo;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vec4 wp4 = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wp4 = instanceMatrix * wp4;
        #endif
        vWp = (modelMatrix * wp4).xyz; vNo = normal;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
        varying vec3 vWp; varying vec3 vNo; uniform float uGlow;
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float side = 1.0 - step(0.5, abs(vNo.y));
        float ax = step(0.5, abs(vNo.x));
        float u = mix(vWp.x, vWp.z, ax);
        vec2 cell = vec2(floor(u / 1.7), floor(vWp.y / 1.6));
        vec2 f = vec2(fract(u / 1.7), fract(vWp.y / 1.6));
        float win = step(0.18, f.x) * step(f.x, 0.78) * step(0.22, f.y) * step(f.y, 0.72);
        float lit = step(0.5, h21(cell + floor(vWp.xz * 0.37) * 1.7));
        totalEmissiveRadiance += side * win * lit * vec3(1.0, 0.72, 0.38) * 1.5 * uGlow;
        diffuseColor.rgb *= 1.0 - side * win * 0.3;`);
  };
}
