<script setup lang="ts">
import * as THREE from "three";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { LearningAnimationSpec } from "../animations/types";

const props = defineProps<{
  spec: LearningAnimationSpec;
  compact?: boolean;
  exampleCode?: string;
  exampleLanguage?: string;
}>();

const host = ref<HTMLDivElement | null>(null);
const playing = ref(true);
const step = ref(0);
const speed = ref(0.5);
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let root: THREE.Group | null = null;
let resizeObserver: ResizeObserver | null = null;
let frame = 0;
let startedAt = 0;

const stepLabels: Record<LearningAnimationSpec["template"], string[]> = {
  "pointer-memory": ["对象进入内存", "指针保存地址", "解引用访问对象"],
  "memory-coalescing": ["线程发出请求", "连续地址合并", "跨步访问分散"],
  "thread-grid": ["建立线程网格", "选择一个线程", "映射到数据元素"],
  "warp-divergence": ["Lane 同步前进", "遇到不同条件", "分路径完成后汇合"],
  "collective-ring": ["Rank 组成通信环", "数据分片开始传递", "分片继续沿环流动"],
  "tensor-layout": ["建立逻辑矩阵", "沿行移动", "沿列观察步长"],
};

const labels = computed(() => stepLabels[props.spec.template]);
const currentLabel = computed(() => labels.value[step.value] ?? labels.value[0]);
const codeLines = computed(() =>
  String(props.exampleCode || "")
    .replace(/\r\n?/g, "\n")
    .split("\n"),
);
const hasExample = computed(() => Boolean(props.exampleCode?.trim()));
const isActiveCodeLine = (index: number) => {
  const total = Math.max(1, codeLines.value.length);
  const mappedStep = Math.min(
    labels.value.length - 1,
    Math.floor((index * labels.value.length) / total),
  );
  return mappedStep === step.value;
};

const material = (color: number, opacity = 1) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });

const cube = (
  x: number,
  y: number,
  z: number,
  color: number,
  size = 0.58,
) => {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    material(color),
  );
  mesh.position.set(x, y, z);
  return mesh;
};

const disposeRoot = () => {
  if (!root) return;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((entry) => entry.dispose());
    } else {
      mesh.material?.dispose?.();
    }
  });
  scene?.remove(root);
  root = null;
};

const buildPointerMemory = (group: THREE.Group) => {
  const cells = [-1.7, 0, 1.7].map((x, index) => {
    const item = cube(x, -0.35, 0, index === 1 ? 0x4aa879 : 0xdce7e1, 0.78);
    group.add(item);
    return item;
  });
  const origin = new THREE.Vector3(-2.65, 1.15, 0);
  const arrow = new THREE.ArrowHelper(
    new THREE.Vector3(1, -0.25, 0).normalize(),
    origin,
    2.75,
    0x2694ac,
    0.28,
    0.16,
  );
  group.add(arrow);
  return (time: number, activeStep: number) => {
    arrow.visible = activeStep >= 1;
    cells[1].scale.setScalar(
      activeStep === 2 ? 1.05 + Math.sin(time * 3) * 0.08 : 1,
    );
    cells[1].rotation.y = activeStep === 2 ? time * 0.35 : 0;
  };
};

const buildMemoryCoalescing = (group: THREE.Group) => {
  const lanes: THREE.Mesh[] = [];
  const cells: THREE.Mesh[] = [];
  for (let index = 0; index < 8; index += 1) {
    const x = (index - 3.5) * 0.55;
    const lane = cube(x, 1.05, 0, 0x2694ac, 0.35);
    const cell = cube(x, -0.65, 0, 0xdce7e1, 0.42);
    group.add(lane, cell);
    lanes.push(lane);
    cells.push(cell);
  }
  return (time: number, activeStep: number) => {
    lanes.forEach((lane, index) => {
      const target = activeStep === 2 ? (index * 3) % cells.length : index;
      lane.position.x +=
        (cells[target].position.x - lane.position.x) *
        (activeStep >= 1 ? 0.018 : 0);
      lane.position.y =
        1.05 - (activeStep >= 1 ? (Math.sin(time * 2 + index) + 1) * 0.18 : 0);
      const laneMaterial = lane.material as THREE.MeshBasicMaterial;
      laneMaterial.color.setHex(activeStep === 2 ? 0xd2913d : 0x2694ac);
    });
    cells.forEach((cell, index) => {
      cell.scale.setScalar(
        1 + (activeStep >= 1 ? Math.max(0, Math.sin(time * 3 - index)) * 0.12 : 0),
      );
    });
  };
};

const buildThreadGrid = (group: THREE.Group) => {
  const cells: THREE.Mesh[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const item = cube(
        (column - 1.5) * 0.72,
        (1.5 - row) * 0.72,
        0,
        0xdce7e1,
        0.54,
      );
      group.add(item);
      cells.push(item);
    }
  }
  return (time: number, activeStep: number) => {
    cells.forEach((cell, index) => {
      const selected = activeStep >= 1 && index === 9;
      const mapped = activeStep === 2 && index === 14;
      (cell.material as THREE.MeshBasicMaterial).color.setHex(
        mapped ? 0xd2913d : selected ? 0x2694ac : 0xdce7e1,
      );
      cell.position.z =
        selected || mapped ? 0.22 + Math.sin(time * 3) * 0.05 : 0;
    });
    group.rotation.x = -0.22;
    group.rotation.z = -0.06;
  };
};

const buildWarpDivergence = (group: THREE.Group) => {
  const lanes: THREE.Mesh[] = [];
  for (let index = 0; index < 8; index += 1) {
    const lane = cube((index - 3.5) * 0.58, 0, 0, 0x4aa879, 0.4);
    group.add(lane);
    lanes.push(lane);
  }
  return (time: number, activeStep: number) => {
    lanes.forEach((lane, index) => {
      const direction = index < 4 ? 1 : -1;
      const split = activeStep === 1 ? 0.72 : activeStep === 2 ? 0.12 : 0;
      lane.position.y += (direction * split - lane.position.y) * 0.035;
      lane.position.x += activeStep === 2 ? 0.0025 : 0;
      (lane.material as THREE.MeshBasicMaterial).color.setHex(
        activeStep === 1
          ? index < 4
            ? 0x2694ac
            : 0xd2913d
          : 0x4aa879,
      );
      lane.rotation.y = Math.sin(time * 2 + index) * 0.08;
    });
  };
};

const buildCollectiveRing = (group: THREE.Group) => {
  const nodeCount = 6;
  const radius = 1.55;
  const nodes: THREE.Mesh[] = [];
  const packets: THREE.Mesh[] = [];
  for (let index = 0; index < nodeCount; index += 1) {
    const angle = (index / nodeCount) * Math.PI * 2;
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 18, 18),
      material(0x4aa879),
    );
    node.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    const packet = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 12, 12),
      material(0x2694ac),
    );
    group.add(node, packet);
    nodes.push(node);
    packets.push(packet);
  }
  return (time: number, activeStep: number) => {
    packets.forEach((packet, index) => {
      packet.visible = activeStep >= 1;
      const progress =
        activeStep >= 1
          ? (time * 0.12 + index / nodeCount) % 1
          : index / nodeCount;
      const angle = progress * Math.PI * 2;
      packet.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.08);
    });
    nodes.forEach((node, index) => {
      node.scale.setScalar(
        1 + (activeStep === 2 ? Math.max(0, Math.sin(time * 3 - index)) * 0.18 : 0),
      );
    });
  };
};

const buildTensorLayout = (group: THREE.Group) => {
  const cells: THREE.Mesh[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const item = cube(
        (column - 1.5) * 0.72,
        (1.5 - row) * 0.72,
        0,
        0xdce7e1,
        0.56,
      );
      item.userData = { row, column };
      group.add(item);
      cells.push(item);
    }
  }
  return (time: number, activeStep: number) => {
    cells.forEach((cell) => {
      const active =
        (activeStep === 1 && cell.userData.row === 1) ||
        (activeStep === 2 && cell.userData.column === 2);
      (cell.material as THREE.MeshBasicMaterial).color.setHex(
        active ? (activeStep === 1 ? 0x2694ac : 0xd2913d) : 0xdce7e1,
      );
      cell.scale.z = active ? 1.25 + Math.sin(time * 3) * 0.08 : 1;
    });
    group.rotation.x = -0.28;
  };
};

const builders = {
  "pointer-memory": buildPointerMemory,
  "memory-coalescing": buildMemoryCoalescing,
  "thread-grid": buildThreadGrid,
  "warp-divergence": buildWarpDivergence,
  "collective-ring": buildCollectiveRing,
  "tensor-layout": buildTensorLayout,
};

const rebuild = () => {
  if (!scene) return;
  disposeRoot();
  root = new THREE.Group();
  scene.add(root);
  const update = builders[props.spec.template](root);
  root.userData.update = update;
  step.value = 0;
};

const resize = () => {
  if (!host.value || !renderer || !camera) return;
  const width = Math.max(280, host.value.clientWidth);
  const height = props.compact ? 250 : 330;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
};

const draw = (timestamp: number) => {
  if (!renderer || !scene || !camera) return;
  if (!startedAt) startedAt = timestamp;
  const time = ((timestamp - startedAt) / 1000) * speed.value;
  if (playing.value) {
    root?.userData.update?.(time, step.value);
  }
  renderer.render(scene, camera);
  frame = requestAnimationFrame(draw);
};

const moveStep = (offset: number) => {
  const length = labels.value.length;
  step.value = (step.value + offset + length) % length;
};

const cycleSpeed = () => {
  speed.value = speed.value === 0.5 ? 0.75 : speed.value === 0.75 ? 1 : 0.5;
};

watch(() => props.spec.template, rebuild);

onMounted(() => {
  if (!host.value) return;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 6.7);
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  host.value.appendChild(renderer.domElement);
  playing.value = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  rebuild();
  resize();
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host.value);
  frame = requestAnimationFrame(draw);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  disposeRoot();
  renderer?.dispose();
  renderer?.domElement.remove();
});
</script>

<template>
  <section class="learning-animation" :class="{ compact }">
    <header>
      <div>
        <span>{{ hasExample ? "CODE WALKTHROUGH" : "INTERACTIVE EXPLAINER" }}</span>
        <h3>{{ spec.title }}</h3>
      </div>
      <div class="learning-animation-header-actions">
        <button
          type="button"
          :aria-label="`当前速度 ${speed} 倍，点击切换速度`"
          @click="cycleSpeed"
        >
          {{ speed }}×
        </button>
        <button
          type="button"
          :aria-label="playing ? '暂停动画' : '播放动画'"
          @click="playing = !playing"
        >
          {{ playing ? "暂停" : "播放" }}
        </button>
      </div>
    </header>
    <div class="learning-animation-stage" :class="{ 'with-example': hasExample }">
      <div v-if="hasExample" class="learning-animation-code">
        <div>
          <span>{{ exampleLanguage || "code" }}</span>
          <strong>跟随步骤观察高亮代码</strong>
        </div>
        <pre><code><span
          v-for="(line, index) in codeLines"
          :key="`${index}-${line}`"
          :class="{ active: isActiveCodeLine(index) }"
        ><i>{{ String(index + 1).padStart(2, "0") }}</i>{{ line || " " }}</span></code></pre>
      </div>
      <div
        ref="host"
        class="learning-animation-canvas"
        role="img"
        :aria-label="`${spec.title}：${currentLabel}`"
      />
    </div>
    <div class="learning-animation-controls">
      <button type="button" aria-label="上一步" @click="moveStep(-1)">←</button>
      <strong>{{ step + 1 }} / {{ labels.length }} · {{ currentLabel }}</strong>
      <button type="button" aria-label="下一步" @click="moveStep(1)">→</button>
    </div>
    <p>{{ spec.caption }}</p>
  </section>
</template>
