<script setup lang="ts">
import * as THREE from "three";
import { onBeforeUnmount, onMounted, ref } from "vue";

const canvas = ref<HTMLCanvasElement | null>(null);
let cleanup: (() => void) | undefined;

onMounted(() => {
  if (!canvas.value) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 100);
  camera.position.set(0, 0, 5.4);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas.value,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const group = new THREE.Group();
  scene.add(group);

  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.45, 2),
    new THREE.MeshBasicMaterial({
      color: 0x3fb56f,
      wireframe: true,
      transparent: true,
      opacity: 0.42,
    }),
  );
  group.add(core);

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.88, 1),
    new THREE.MeshBasicMaterial({
      color: 0x8bcf73,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    }),
  );
  inner.rotation.set(0.4, -0.35, 0.1);
  group.add(inner);

  const particlesGeometry = new THREE.BufferGeometry();
  const particleCount = 220;
  const positions = new Float32Array(particleCount * 3);
  for (let index = 0; index < particleCount; index += 1) {
    const radius = 1.8 + Math.random() * 1.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[index * 3 + 2] = radius * Math.cos(phi);
  }
  particlesGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3),
  );
  const particles = new THREE.Points(
    particlesGeometry,
    new THREE.PointsMaterial({
      color: 0x8fa3b8,
      size: 0.025,
      transparent: true,
      opacity: 0.72,
    }),
  );
  group.add(particles);

  const orbit = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 96 }, (_, index) => {
        const angle = (index / 96) * Math.PI * 2;
        return new THREE.Vector3(Math.cos(angle) * 2.15, 0, Math.sin(angle) * 2.15);
      }),
    ),
    new THREE.LineBasicMaterial({
      color: 0x5c8f78,
      transparent: true,
      opacity: 0.22,
    }),
  );
  orbit.rotation.x = Math.PI * 0.34;
  orbit.rotation.z = Math.PI * 0.08;
  group.add(orbit);

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  let pointerX = 0;
  let pointerY = 0;
  let animationFrame = 0;

  const resize = () => {
    if (!canvas.value) return;
    const { clientWidth, clientHeight } = canvas.value;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / Math.max(clientHeight, 1);
    camera.updateProjectionMatrix();
  };

  const onPointerMove = (event: PointerEvent) => {
    const rect = canvas.value?.getBoundingClientRect();
    if (!rect) return;
    pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.32;
    pointerY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.2;
  };

  const clock = new THREE.Clock();
  const render = () => {
    const elapsed = clock.getElapsedTime();
    if (!reducedMotion) {
      group.rotation.y += (elapsed * 0.06 + pointerX - group.rotation.y) * 0.035;
      group.rotation.x += (pointerY - group.rotation.x) * 0.03;
      inner.rotation.y = -elapsed * 0.13;
      particles.rotation.y = elapsed * 0.025;
    }
    renderer.render(scene, camera);
    animationFrame = window.requestAnimationFrame(render);
  };

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.value);
  canvas.value.addEventListener("pointermove", onPointerMove);
  resize();
  render();

  cleanup = () => {
    window.cancelAnimationFrame(animationFrame);
    observer.disconnect();
    canvas.value?.removeEventListener("pointermove", onPointerMove);
    particlesGeometry.dispose();
    (particles.material as THREE.Material).dispose();
    core.geometry.dispose();
    (core.material as THREE.Material).dispose();
    inner.geometry.dispose();
    (inner.material as THREE.Material).dispose();
    orbit.geometry.dispose();
    (orbit.material as THREE.Material).dispose();
    renderer.dispose();
  };
});

onBeforeUnmount(() => cleanup?.());
</script>

<template>
  <canvas
    ref="canvas"
    class="three-hero"
    aria-label="抽象 GPU 并行计算网络"
    role="img"
  />
</template>
