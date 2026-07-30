<script setup lang="ts">
import * as THREE from "three";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type {
  FixedLearningAnimationTemplate,
  GeneratedLearningAnimationSpec,
  GeneratedSceneObject,
  LearningAnimationSpec,
} from "../animations/types";

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
let lastFrameAt = 0;
let animationTime = 0;
let autoStepAt = 0;

const stepLabels: Record<FixedLearningAnimationTemplate, string[]> = {
  "pointer-memory": ["对象进入内存", "指针保存地址", "解引用访问对象"],
  "memory-coalescing": ["线程发出请求", "连续地址合并", "跨步访问分散"],
  "thread-grid": ["建立线程网格", "选择一个线程", "映射到数据元素"],
  "warp-divergence": ["Lane 同步前进", "遇到不同条件", "分路径完成后汇合"],
  "collective-ring": ["Rank 组成通信环", "数据分片开始传递", "分片继续沿环流动"],
  "tensor-layout": ["建立逻辑矩阵", "沿行移动", "沿列观察步长"],
  "reduction-tree": ["8 个输入各自就位", "相邻元素两两合并", "局部结果继续合并", "得到最终结果"],
  "matrix-multiply": ["确认 A、B、C 的 Shape", "选中 C[2,3]", "沿 k=0…4 做乘加", "写回 C[2,3]"],
  "pipeline-buffer": ["Tile 0 进入缓冲区", "计算 Tile 0 并加载 Tile 1", "交换两个缓冲区", "流水线稳定推进"],
  "attention-flow": ["准备 Q、K、V", "计算 QKᵀ 分数", "应用 Mask 与 Softmax", "权重乘 V 得到输出"],
  "online-softmax": ["处理第一个分块", "第二块带来更大最大值", "重缩放旧的指数和", "合并得到新状态"],
};

const labels = computed(() =>
  props.spec.template === "generated-scene"
    ? props.spec.steps.map((entry) => entry.label)
    : stepLabels[props.spec.template],
);
const currentLabel = computed(() => labels.value[step.value] ?? labels.value[0]);
const currentNarration = computed(() =>
  props.spec.template === "generated-scene"
    ? props.spec.steps[step.value]?.narration
    : "",
);
const effectiveCode = computed(() =>
  props.spec.template === "generated-scene"
    ? props.spec.code
    : props.exampleCode || "",
);
const effectiveLanguage = computed(() =>
  props.spec.template === "generated-scene"
    ? props.spec.language
    : props.exampleLanguage || "code",
);
const codeLines = computed(() =>
  String(effectiveCode.value)
    .replace(/\r\n?/g, "\n")
    .split("\n"),
);
const hasExample = computed(() => Boolean(effectiveCode.value.trim()));
const axisLabels = computed(() =>
  ["tensor-layout", "matrix-multiply"].includes(props.spec.template)
    ? ["0", "1", "2", "3", "4"]
    : [],
);
const visualLegend = computed(() => {
  if (props.spec.template === "generated-scene") {
    return props.spec.objects
      .map((object) => object.label)
      .filter(Boolean)
      .slice(0, 8);
  }
  const legends: Partial<Record<LearningAnimationSpec["template"], string[]>> = {
    "matrix-multiply": ["A[5×5]", "B[5×5]", "C[5×5]"],
    "collective-ring": ["Rank 0", "Rank 1", "Rank 2", "Rank 3", "Rank 4", "Rank 5"],
    "pipeline-buffer": ["Global", "Buffer 0", "Buffer 1", "Compute"],
    "attention-flow": ["Q", "K", "V", "Scores", "Weights", "Output"],
    "online-softmax": ["Block 0", "Block 1", "running m", "running l"],
  };
  return legends[props.spec.template] ?? [];
});
const isActiveCodeLine = (index: number) => {
  if (props.spec.template === "generated-scene") {
    return props.spec.steps[step.value]?.codeLines.includes(index + 1) ?? false;
  }
  const total = Math.max(1, codeLines.value.length);
  const mappedStep = Math.min(
    labels.value.length - 1,
    Math.floor((index * labels.value.length) / total),
  );
  return mappedStep === step.value;
};
const isRevealedCodeLine = (index: number) =>
  props.spec.template !== "generated-scene" ||
  props.spec.steps
    .slice(0, step.value + 1)
    .some((sceneStep) => sceneStep.codeLines.includes(index + 1));

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

const textSprite = (
  text: string,
  color = "#1f2933",
  width = 1.35,
) => {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "600 34px ui-monospace, SFMono-Regular, monospace";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = color;
    context.fillText(text.slice(0, 28), canvas.width / 2, canvas.height / 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    }),
  );
  sprite.scale.set(width, width / 4, 1);
  sprite.userData.generatedLabel = true;
  return sprite;
};

const tintObject = (object: THREE.Object3D, color: THREE.Color) => {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (
      mesh.userData.generatedLabel ||
      !mesh.material ||
      Array.isArray(mesh.material)
    ) {
      return;
    }
    const meshMaterial = mesh.material as THREE.MeshBasicMaterial;
    meshMaterial.color?.lerp(color, 0.08);
  });
};

const generatedObject = (spec: GeneratedSceneObject) => {
  const container = new THREE.Group();
  container.position.fromArray(spec.position);

  if (spec.shape === "matrix") {
    const rows = spec.rows ?? 3;
    const columns = spec.columns ?? 3;
    const spacingX = spec.size[0];
    const spacingY = spec.size[1];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const cell = cube(
          (column - (columns - 1) / 2) * spacingX,
          ((rows - 1) / 2 - row) * spacingY,
          0,
          Number(`0x${spec.color.slice(1)}`),
          Math.min(spacingX, spacingY) * 0.72,
        );
        container.add(cell);
        const value = spec.values?.[row * columns + column];
        if (value !== undefined) {
          const valueLabel = textSprite(value, "#17212b", spacingX * 0.72);
          valueLabel.position.copy(cell.position);
          valueLabel.position.z = 0.34;
          container.add(valueLabel);
        }
      }
    }
    for (let column = 0; column < columns; column += 1) {
      const label = textSprite(String(column), "#315f4a", spacingX * 0.5);
      label.position.set(
        (column - (columns - 1) / 2) * spacingX,
        ((rows - 1) / 2 + 0.75) * spacingY,
        0.25,
      );
      container.add(label);
    }
    for (let row = 0; row < rows; row += 1) {
      const label = textSprite(String(row), "#315f4a", spacingY * 0.5);
      label.position.set(
        (-(columns - 1) / 2 - 0.75) * spacingX,
        ((rows - 1) / 2 - row) * spacingY,
        0.25,
      );
      container.add(label);
    }
  } else if (spec.shape === "arrow") {
    const end = new THREE.Vector3().fromArray(
      spec.to ?? [spec.position[0] + 1, spec.position[1], spec.position[2]],
    );
    const start = new THREE.Vector3().fromArray(spec.position);
    const direction = end.clone().sub(start);
    const arrow = new THREE.ArrowHelper(
      direction.clone().normalize(),
      new THREE.Vector3(0, 0, 0),
      Math.max(0.2, direction.length()),
      Number(`0x${spec.color.slice(1)}`),
      0.22,
      0.12,
    );
    container.add(arrow);
  } else {
    const geometry =
      spec.shape === "sphere"
        ? new THREE.SphereGeometry(0.5, 20, 20)
        : new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(
      geometry,
      material(Number(`0x${spec.color.slice(1)}`)),
    );
    mesh.scale.fromArray(spec.size);
    container.add(mesh);
  }

  if (spec.label) {
    const label = textSprite(spec.label, "#21372c", 1.45);
    label.position.set(0, spec.shape === "matrix" ? -1.65 : -0.9, 0.45);
    container.add(label);
  }
  container.userData.basePosition = container.position.clone();
  container.userData.baseScale = container.scale.clone();
  container.userData.baseColor = new THREE.Color(spec.color);
  return container;
};

const disposeRoot = () => {
  if (!root) return;
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose?.();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((entry) => {
        (entry as THREE.SpriteMaterial).map?.dispose?.();
        entry.dispose();
      });
    } else {
      (mesh.material as THREE.SpriteMaterial | undefined)?.map?.dispose?.();
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
  for (let row = 0; row < 5; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const item = cube(
        (column - 2) * 0.62,
        (2 - row) * 0.62,
        0,
        0xdce7e1,
        0.47,
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

const buildReductionTree = (group: THREE.Group) => {
  const values = Array.from({ length: 8 }, (_, index) => {
    const item = cube((index - 3.5) * 0.58, -1.25, 0, 0xdce7e1, 0.4);
    item.userData.baseX = item.position.x;
    group.add(item);
    return item;
  });
  return (time: number, activeStep: number) => {
    values.forEach((item, index) => {
      const stride = 2 ** activeStep;
      const groupStart = Math.floor(index / stride) * stride;
      const active = index % stride === 0;
      const targetX =
        activeStep === 0
          ? item.userData.baseX
          : (groupStart + (stride - 1) / 2 - 3.5) * 0.58;
      const targetY = -1.25 + activeStep * 0.72;
      item.position.x += (targetX - item.position.x) * 0.06;
      item.position.y +=
        ((active ? targetY : targetY - 0.2) - item.position.y) * 0.06;
      item.visible = activeStep === 0 || active;
      (item.material as THREE.MeshBasicMaterial).color.setHex(
        activeStep === 3 && index === 0
          ? 0xd2913d
          : active
            ? 0x2694ac
            : 0xdce7e1,
      );
      item.scale.setScalar(
        active ? 1 + Math.max(0, Math.sin(time * 2.2 - index)) * 0.08 : 0.75,
      );
    });
  };
};

const buildMatrixMultiply = (group: THREE.Group) => {
  const matrices: THREE.Mesh[][] = [[], [], []];
  const origins = [-2.05, 0, 2.05];
  origins.forEach((origin, matrixIndex) => {
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const item = cube(
          origin + (column - 2) * 0.25,
          (2 - row) * 0.25,
          0,
          0xdce7e1,
          0.19,
        );
        item.userData = { matrixIndex, row, column };
        group.add(item);
        matrices[matrixIndex].push(item);
      }
    }
  });
  return (time: number, activeStep: number) => {
    const k = Math.floor(time * 0.65) % 5;
    matrices.flat().forEach((item) => {
      const { matrixIndex, row, column } = item.userData;
      const selectedOutput = matrixIndex === 2 && row === 2 && column === 3;
      const selectedA =
        matrixIndex === 0 && row === 2 && (activeStep === 1 || column === k);
      const selectedB =
        matrixIndex === 1 && column === 3 && (activeStep === 1 || row === k);
      const active =
        (activeStep === 1 && (selectedA || selectedB || selectedOutput)) ||
        (activeStep === 2 && (selectedA || selectedB || selectedOutput)) ||
        (activeStep === 3 && selectedOutput);
      (item.material as THREE.MeshBasicMaterial).color.setHex(
        selectedOutput && active
          ? 0xd2913d
          : selectedA && active
            ? 0x2694ac
            : selectedB && active
              ? 0x4aa879
              : 0xdce7e1,
      );
      item.position.z =
        active ? 0.18 + Math.max(0, Math.sin(time * 2.4)) * 0.05 : 0;
    });
  };
};

const buildPipelineBuffer = (group: THREE.Group) => {
  const globalTiles = [0, 1, 2].map((index) => {
    const item = cube(-2 + index * 0.55, 1.2, 0, 0xdce7e1, 0.42);
    group.add(item);
    return item;
  });
  const buffers = [
    cube(-0.72, -0.2, 0, 0x2694ac, 0.72),
    cube(0.72, -0.2, 0, 0x4aa879, 0.72),
  ];
  const computeUnit = cube(2.1, -0.2, 0, 0xd2913d, 0.86);
  group.add(...buffers, computeUnit);
  return (time: number, activeStep: number) => {
    const phase = activeStep < 2 ? 0 : 1;
    buffers.forEach((buffer, index) => {
      buffer.position.y = -0.2 + (index === phase ? 0.1 : 0);
      buffer.rotation.y = index === phase ? Math.sin(time) * 0.08 : 0;
      buffer.scale.setScalar(index === phase ? 1.08 : 0.9);
    });
    globalTiles.forEach((tile, index) => {
      const loading = activeStep >= 1 && index === Math.min(2, activeStep);
      tile.position.y = loading
        ? 1.2 - ((Math.sin(time * 1.4) + 1) / 2) * 0.75
        : 1.2;
    });
    computeUnit.scale.setScalar(
      activeStep >= 1 ? 1 + Math.max(0, Math.sin(time * 2)) * 0.08 : 1,
    );
  };
};

const buildAttentionFlow = (group: THREE.Group) => {
  const q = cube(-2.2, 1, 0, 0x2694ac, 0.62);
  const k = cube(-2.2, 0, 0, 0x4aa879, 0.62);
  const v = cube(-2.2, -1, 0, 0xd2913d, 0.62);
  const scores = cube(-0.45, 0.7, 0, 0xdce7e1, 0.82);
  const weights = cube(0.85, 0.1, 0, 0xdce7e1, 0.82);
  const output = cube(2.2, -0.45, 0, 0xdce7e1, 0.82);
  const nodes = [q, k, v, scores, weights, output];
  group.add(...nodes);
  return (time: number, activeStep: number) => {
    nodes.forEach((node, index) => {
      const available =
        index <= 2 ||
        (index === 3 && activeStep >= 1) ||
        (index === 4 && activeStep >= 2) ||
        (index === 5 && activeStep >= 3);
      node.visible = available;
      node.scale.setScalar(
        available && index === activeStep + 2
          ? 1.05 + Math.max(0, Math.sin(time * 2.2)) * 0.08
          : 1,
      );
      if (index >= 3) {
        (node.material as THREE.MeshBasicMaterial).color.setHex(
          index === 3
            ? 0x2694ac
            : index === 4
              ? 0x4aa879
              : 0xd2913d,
        );
      }
    });
  };
};

const buildOnlineSoftmax = (group: THREE.Group) => {
  const firstBlock = [-1.6, -1.15, -0.7].map((x) => {
    const item = cube(x, 0.95, 0, 0x2694ac, 0.35);
    group.add(item);
    return item;
  });
  const secondBlock = [0.7, 1.15, 1.6].map((x, index) => {
    const item = cube(x, 0.95, 0, index === 1 ? 0xd2913d : 0x4aa879, 0.35);
    group.add(item);
    return item;
  });
  const runningMax = cube(-0.7, -0.65, 0, 0x2694ac, 0.66);
  const runningSum = cube(0.7, -0.65, 0, 0x4aa879, 0.66);
  group.add(runningMax, runningSum);
  return (time: number, activeStep: number) => {
    secondBlock.forEach((item) => {
      item.visible = activeStep >= 1;
    });
    runningMax.scale.setScalar(activeStep >= 1 ? 1.18 : 1);
    runningSum.scale.setScalar(
      activeStep >= 2 ? 1 + Math.max(0, Math.sin(time * 2)) * 0.14 : 1,
    );
    firstBlock.forEach((item) => {
      item.scale.setScalar(activeStep === 2 ? 0.78 : 1);
    });
    if (activeStep === 3) {
      runningMax.position.x += (0 - runningMax.position.x) * 0.025;
      runningSum.position.x += (0 - runningSum.position.x) * 0.025;
    } else {
      runningMax.position.x += (-0.7 - runningMax.position.x) * 0.04;
      runningSum.position.x += (0.7 - runningSum.position.x) * 0.04;
    }
  };
};

const buildGeneratedScene = (
  group: THREE.Group,
  spec: GeneratedLearningAnimationSpec,
) => {
  const objects = new Map<string, THREE.Group>();
  spec.objects.forEach((objectSpec) => {
    const object = generatedObject(objectSpec);
    object.visible = false;
    group.add(object);
    objects.set(objectSpec.id, object);
  });

  return (time: number, activeStep: number) => {
    const state = new Map<
      string,
      {
        position: THREE.Vector3;
        color: THREE.Color;
        scale: number;
        visible: boolean;
        pulse: boolean;
      }
    >();
    spec.objects.forEach((objectSpec) => {
      state.set(objectSpec.id, {
        position: new THREE.Vector3().fromArray(objectSpec.position),
        color: new THREE.Color(objectSpec.color),
        scale: 1,
        visible: true,
        pulse: false,
      });
    });
    spec.steps.slice(0, activeStep + 1).forEach((sceneStep) => {
      sceneStep.actions.forEach((action) => {
        const target = state.get(action.target);
        if (!target) return;
        if (action.position) target.position.fromArray(action.position);
        if (action.color) target.color.set(action.color);
        if (action.scale !== undefined) target.scale = action.scale;
        if (action.visible !== undefined) target.visible = action.visible;
        if (action.pulse !== undefined) target.pulse = action.pulse;
      });
    });
    state.forEach((target, id) => {
      const object = objects.get(id);
      if (!object) return;
      object.visible = target.visible;
      object.position.lerp(target.position, 0.07);
      const pulse =
        target.pulse && playing.value
          ? 1 + Math.max(0, Math.sin(time * 2.2)) * 0.12
          : 1;
      const scale = target.scale * pulse;
      object.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.08);
      tintObject(object, target.color);
    });
  };
};

const builders = {
  "pointer-memory": buildPointerMemory,
  "memory-coalescing": buildMemoryCoalescing,
  "thread-grid": buildThreadGrid,
  "warp-divergence": buildWarpDivergence,
  "collective-ring": buildCollectiveRing,
  "tensor-layout": buildTensorLayout,
  "reduction-tree": buildReductionTree,
  "matrix-multiply": buildMatrixMultiply,
  "pipeline-buffer": buildPipelineBuffer,
  "attention-flow": buildAttentionFlow,
  "online-softmax": buildOnlineSoftmax,
};

const rebuild = () => {
  if (!scene) return;
  disposeRoot();
  root = new THREE.Group();
  scene.add(root);
  const update =
    props.spec.template === "generated-scene"
      ? buildGeneratedScene(root, props.spec)
      : builders[props.spec.template](root);
  root.userData.update = update;
  step.value = 0;
  animationTime = 0;
  autoStepAt = 0;
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
  if (!lastFrameAt) lastFrameAt = timestamp;
  if (playing.value) {
    animationTime +=
      Math.min(64, timestamp - lastFrameAt) * 0.001 * speed.value;
  }
  lastFrameAt = timestamp;
  root?.userData.update?.(animationTime, step.value);
  if (
    playing.value &&
    labels.value.length > 1 &&
    animationTime - autoStepAt >= 6
  ) {
    step.value = (step.value + 1) % labels.value.length;
    autoStepAt = animationTime;
  }
  renderer.render(scene, camera);
  frame = requestAnimationFrame(draw);
};

const moveStep = (offset: number) => {
  const length = labels.value.length;
  step.value = (step.value + offset + length) % length;
  autoStepAt = animationTime;
};

const cycleSpeed = () => {
  speed.value = speed.value === 0.5 ? 0.75 : speed.value === 0.75 ? 1 : 0.5;
};

watch(() => props.spec, rebuild, { deep: true });

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
    <div class="learning-animation-stage">
      <div
        class="learning-animation-board"
        :class="{ 'has-example': hasExample }"
      >
        <div v-if="hasExample" class="learning-animation-code">
          <div>
            <span>{{ effectiveLanguage }}</span>
            <strong>代码与场景同步</strong>
          </div>
          <pre><code><span
            v-for="(line, index) in codeLines"
            :key="`${index}-${line}`"
            :class="{
              active: isActiveCodeLine(index),
              revealed: isRevealedCodeLine(index),
            }"
          ><i>{{ String(index + 1).padStart(2, "0") }}</i>{{ line || " " }}</span></code></pre>
        </div>
        <div
          class="learning-animation-visual"
          :class="`scene-${spec.template}`"
        >
          <div
            ref="host"
            class="learning-animation-canvas"
            role="img"
            :aria-label="`${spec.title}：${currentLabel}`"
          />
        <div v-if="axisLabels.length" class="matrix-axis matrix-axis-columns">
          <span v-for="label in axisLabels" :key="`column-${label}`">
            {{ label }}
          </span>
        </div>
        <div v-if="axisLabels.length" class="matrix-axis matrix-axis-rows">
          <span v-for="label in axisLabels" :key="`row-${label}`">
            {{ label }}
          </span>
        </div>
        <div v-if="visualLegend.length" class="learning-animation-legend">
          <span v-for="label in visualLegend" :key="label">{{ label }}</span>
        </div>
        </div>
      </div>
    </div>
    <div class="learning-animation-controls">
      <button type="button" aria-label="上一步" @click="moveStep(-1)">←</button>
      <strong>{{ step + 1 }} / {{ labels.length }} · {{ currentLabel }}</strong>
      <button type="button" aria-label="下一步" @click="moveStep(1)">→</button>
    </div>
    <p v-if="currentNarration" class="learning-animation-narration">
      {{ currentNarration }}
    </p>
    <p>{{ spec.caption }}</p>
  </section>
</template>
