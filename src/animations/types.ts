export const learningAnimationTemplates = [
  "pointer-memory",
  "memory-coalescing",
  "thread-grid",
  "warp-divergence",
  "collective-ring",
  "tensor-layout",
  "reduction-tree",
  "matrix-multiply",
  "pipeline-buffer",
  "attention-flow",
  "online-softmax",
  "generated-scene",
] as const;

export type LearningAnimationTemplate =
  (typeof learningAnimationTemplates)[number];

export type FixedLearningAnimationTemplate = Exclude<
  LearningAnimationTemplate,
  "generated-scene"
>;

export type FixedLearningAnimationSpec = {
  template: FixedLearningAnimationTemplate;
  title: string;
  caption: string;
};

export type SceneVector = [number, number, number];

export type GeneratedSceneObject = {
  id: string;
  shape: "box" | "sphere" | "matrix" | "arrow";
  label: string;
  position: SceneVector;
  color: string;
  size: SceneVector;
  rows?: number;
  columns?: number;
  values?: string[];
  to?: SceneVector;
};

export type GeneratedSceneAction = {
  target: string;
  position?: SceneVector;
  color?: string;
  scale?: number;
  visible?: boolean;
  pulse?: boolean;
};

export type GeneratedSceneStep = {
  label: string;
  narration: string;
  codeLines: number[];
  actions: GeneratedSceneAction[];
};

export type GeneratedLearningAnimationSpec = {
  template: "generated-scene";
  title: string;
  caption: string;
  code: string;
  language: string;
  objects: GeneratedSceneObject[];
  steps: GeneratedSceneStep[];
};

export type LearningAnimationSpec =
  | FixedLearningAnimationSpec
  | GeneratedLearningAnimationSpec;

const templateSet = new Set<string>(learningAnimationTemplates);
const shapeSet = new Set(["box", "sphere", "matrix", "arrow"]);
const colorPattern = /^#[0-9a-f]{6}$/i;

const clamp = (value: unknown, minimum: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(maximum, Math.max(minimum, parsed))
    : minimum;
};

const vector = (
  value: unknown,
  minimum = -3.2,
  maximum = 3.2,
): SceneVector | undefined => {
  if (!Array.isArray(value) || value.length !== 3) return undefined;
  return value.map((entry) =>
    clamp(entry, minimum, maximum),
  ) as SceneVector;
};

const color = (value: unknown, fallback = "#4aa879") => {
  const parsed = String(value || "").trim();
  return colorPattern.test(parsed) ? parsed.toLowerCase() : fallback;
};

const objectId = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/[^a-z0-9_-]/gi, "")
    .slice(0, 36);

const parseSceneObject = (value: unknown): GeneratedSceneObject | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const id = objectId(candidate.id);
  const shape = String(candidate.shape || "");
  const position = vector(candidate.position);
  if (!id || !shapeSet.has(shape) || !position) return undefined;

  const size =
    vector(candidate.size, 0.12, 1.6) ?? ([0.62, 0.62, 0.62] as SceneVector);
  const rows =
    shape === "matrix" ? Math.round(clamp(candidate.rows, 1, 5)) : undefined;
  const columns =
    shape === "matrix" ? Math.round(clamp(candidate.columns, 1, 5)) : undefined;
  const maximumValues = (rows ?? 0) * (columns ?? 0);
  const values =
    shape === "matrix" && Array.isArray(candidate.values)
      ? candidate.values
          .slice(0, maximumValues)
          .map((entry) => String(entry).slice(0, 8))
      : undefined;
  const to = shape === "arrow" ? vector(candidate.to) : undefined;

  return {
    id,
    shape: shape as GeneratedSceneObject["shape"],
    label: String(candidate.label || id).trim().slice(0, 28),
    position,
    color: color(candidate.color),
    size,
    ...(rows ? { rows } : {}),
    ...(columns ? { columns } : {}),
    ...(values?.length ? { values } : {}),
    ...(to ? { to } : {}),
  };
};

const parseSceneAction = (
  value: unknown,
  objectIds: Set<string>,
): GeneratedSceneAction | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const target = objectId(candidate.target);
  if (!objectIds.has(target)) return undefined;
  const position = vector(candidate.position);
  return {
    target,
    ...(position ? { position } : {}),
    ...(candidate.color ? { color: color(candidate.color) } : {}),
    ...(candidate.scale !== undefined
      ? { scale: clamp(candidate.scale, 0.2, 2.2) }
      : {}),
    ...(typeof candidate.visible === "boolean"
      ? { visible: candidate.visible }
      : {}),
    ...(candidate.pulse === true ? { pulse: true } : {}),
  };
};

const parseGeneratedAnimation = (
  candidate: Record<string, unknown>,
  title: string,
  caption: string,
): GeneratedLearningAnimationSpec | undefined => {
  const objects = (Array.isArray(candidate.objects) ? candidate.objects : [])
    .slice(0, 20)
    .map(parseSceneObject)
    .filter((value): value is GeneratedSceneObject => Boolean(value));
  const uniqueObjects = [
    ...new Map(objects.map((object) => [object.id, object])).values(),
  ];
  if (!uniqueObjects.length) return undefined;
  const objectIds = new Set(uniqueObjects.map((object) => object.id));
  const steps = (Array.isArray(candidate.steps) ? candidate.steps : [])
    .slice(0, 6)
    .flatMap((value) => {
      if (!value || typeof value !== "object") return [];
      const step = value as Record<string, unknown>;
      const label = String(step.label || "").trim().slice(0, 48);
      if (!label) return [];
      const actions = (
        Array.isArray(step.actions) ? step.actions : []
      )
        .slice(0, 48)
        .map((action) => parseSceneAction(action, objectIds))
        .filter((action): action is GeneratedSceneAction => Boolean(action));
      const codeLines = (
        Array.isArray(step.codeLines) ? step.codeLines : []
      )
        .slice(0, 12)
        .map((line) => Math.round(clamp(line, 1, 200)));
      return [
        {
          label,
          narration: String(step.narration || "").trim().slice(0, 260),
          codeLines,
          actions,
        },
      ];
    });
  if (steps.length < 2) return undefined;

  return {
    template: "generated-scene",
    title,
    caption,
    code: String(candidate.code || "").trim().slice(0, 3_000),
    language: String(candidate.language || "text").trim().slice(0, 20),
    objects: uniqueObjects,
    steps,
  };
};

export const parseLearningAnimation = (
  value: unknown,
): LearningAnimationSpec | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Record<string, unknown>;
  const template = String(candidate.template || "");
  if (!templateSet.has(template)) return undefined;

  const title = String(candidate.title || "概念动画").trim().slice(0, 80);
  const caption = String(candidate.caption || "").trim().slice(0, 240);
  if (!title || !caption) return undefined;

  if (template === "generated-scene") {
    return parseGeneratedAnimation(candidate, title, caption);
  }

  return {
    template: template as FixedLearningAnimationTemplate,
    title,
    caption,
  };
};
