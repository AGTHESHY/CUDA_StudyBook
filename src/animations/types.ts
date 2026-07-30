export const learningAnimationTemplates = [
  "pointer-memory",
  "memory-coalescing",
  "thread-grid",
  "warp-divergence",
  "collective-ring",
  "tensor-layout",
] as const;

export type LearningAnimationTemplate =
  (typeof learningAnimationTemplates)[number];

export type LearningAnimationSpec = {
  template: LearningAnimationTemplate;
  title: string;
  caption: string;
};

const templateSet = new Set<string>(learningAnimationTemplates);

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

  return {
    template: template as LearningAnimationTemplate,
    title,
    caption,
  };
};

export const animationForLesson = (
  title: string,
  context: string,
): LearningAnimationSpec | undefined => {
  const focus = `${title}\n${context}`;
  if (/指针|地址|对象生命周期|RAII/i.test(focus)) {
    return {
      template: "pointer-memory",
      title: "指针保存的是地址",
      caption:
        "逐步观察对象进入内存、指针保存对象地址，以及解引用如何沿地址访问对象。",
    };
  }
  if (/合并访存|coalesc|内存事务|stride|bank conflict|共享内存/i.test(focus)) {
    return {
      template: "memory-coalescing",
      title: "线程访问如何变成内存事务",
      caption:
        "比较相邻线程连续访问与跨步访问，观察有效数据如何分散到更多内存块。",
    };
  }
  if (/threadIdx|blockIdx|线程映射|Grid|Block|二维索引/i.test(focus)) {
    return {
      template: "thread-grid",
      title: "线程坐标映射到数据坐标",
      caption:
        "高亮线程在线程块中的位置，并沿网格观察它对应的数据元素。",
    };
  }
  if (/Warp|SIMT|分支发散|divergence/i.test(focus)) {
    return {
      template: "warp-divergence",
      title: "一个 Warp 遇到两条分支",
      caption:
        "观察同一 Warp 的 Lane 分成两组路径，以及未执行路径上的 Lane 如何暂时失活。",
    };
  }
  if (/NCCL|AllReduce|ReduceScatter|AllGather|Ring|通信/i.test(focus)) {
    return {
      template: "collective-ring",
      title: "数据沿通信环流动",
      caption:
        "观察多个 Rank 之间的数据分片如何沿环传递；具体数据量与算法选择仍以官方文档和实测为准。",
    };
  }
  if (/Shape|Stride|Tensor|布局|Tile|矩阵/i.test(focus)) {
    return {
      template: "tensor-layout",
      title: "Shape 与 Stride 描述同一块数据",
      caption:
        "按行与按列移动观察地址步长，理解逻辑坐标和底层存储顺序并不是同一件事。",
    };
  }
  return undefined;
};
