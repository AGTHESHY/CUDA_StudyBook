import type {
  ContentBlock,
  CourseSection,
  TutorialLesson,
  TutorialModule,
  TutorialReference,
} from "../types";

const p = (text: string): ContentBlock => ({ type: "paragraph", text });
const code = (text: string, language = "cpp"): ContentBlock => ({
  type: "code",
  text,
  language,
});
const list = (...items: string[]): ContentBlock => ({
  type: "list",
  items,
  ordered: false,
});
const quote = (text: string): ContentBlock => ({ type: "quote", text });

type LessonSpec = {
  id: string;
  title: string;
  summary: string;
  duration: string;
  level?: "基础" | "进阶";
  objectives: string[];
  explanation: string;
  example?: string;
  language?: string;
  exampleNote?: string;
  checkpoints: string[];
  extraSections?: CourseSection[];
  exercise: {
    prompt: string;
    hint: string;
    answer: string;
  };
  quiz: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  };
  references: TutorialReference[];
  verification: string;
};

const clarificationForLesson = (id: string) => {
  const notes: Record<string, string> = {
    "w02-fp16-bf16":
      "可以把指数位理解成“尺子能量多远”，把尾数位理解成“刻度有多细”。BF16 的尺子更远但刻度更粗，FP16 的刻度更细但更容易够不到很大或很小的数。",
    "w02-stable-softmax":
      "减去最大值不会改变 Softmax 的结果，因为分子和分母同时乘上了同一个缩放因子；它只是把最大的指数项移到 1，避免先算出无穷大。",
    "w02-attention-shapes":
      "把每个注意力头看成一张独立的小表：Q 决定“拿什么去问”，K 决定“和谁匹配”，V 决定“匹配后取回什么内容”。",
    "w04-shape-stride":
      "Shape 回答“每一维有多少元素”，Stride 回答“这一维前进一步，底层地址要跨过多少个元素”。二者共同决定逻辑坐标如何落到内存。",
    "w05-warp-simt":
      "一个 Warp 像一组同时听同一条指令的执行单元：数据可以不同，但若走向不同分支，硬件需要分批完成各条路径。",
    "w06-coalescing":
      "线程请求的是若干地址，硬件真正搬运的是对齐的内存块。请求越集中在少数内存块里，有效数据占比通常越高。",
    "w06-bank-conflict":
      "共享内存可以想成多列并行服务窗口；同一 Warp 的线程若挤到同一窗口访问不同地址，请求就需要排队。",
    "w08-events":
      "Stream 是操作队列，Event 是插入队列里的里程碑。另一个 Stream 等待该里程碑，就能建立依赖而不必让整个设备停下来。",
  };
  return notes[id];
};

const makeLesson = (spec: LessonSpec): TutorialLesson => ({
  id: spec.id,
  title: spec.title,
  summary: spec.summary,
  duration: spec.duration,
  level: spec.level ?? "基础",
  objectives: spec.objectives,
  sections: [
    {
      id: `${spec.id}-explain`,
      title: "概念",
      blocks: [
        p(spec.explanation),
        ...(clarificationForLesson(spec.id)
          ? [quote(`理解提示：${clarificationForLesson(spec.id)}`)]
          : []),
      ],
    },
    ...(spec.example
      ? [
          {
            id: `${spec.id}-example`,
            title: "示例",
            blocks: [
              code(spec.example, spec.language),
              ...(spec.exampleNote ? [p(spec.exampleNote)] : []),
            ],
          } satisfies CourseSection,
        ]
      : []),
    ...(spec.extraSections ?? []),
    {
      id: `${spec.id}-checks`,
      title: "检查点与常见误区",
      blocks: [list(...spec.checkpoints)],
    },
  ],
  exercises: [
    {
      id: `${spec.id}-exercise`,
      ...spec.exercise,
    },
  ],
  quiz: [
    {
      id: `${spec.id}-quiz`,
      ...spec.quiz,
    },
  ],
  references: spec.references,
  verification: spec.verification,
});

const mixedPrecisionReferences: TutorialReference[] = [
  {
    label: "Train With Mixed Precision",
    url: "https://docs.nvidia.com/deeplearning/performance/mixed-precision-training/index.html",
    source: "NVIDIA",
  },
  {
    label: "PyTorch Numerical Accuracy",
    url: "https://docs.pytorch.org/docs/stable/notes/numerical_accuracy.html",
    source: "PyTorch",
  },
];

const bfloatReferences: TutorialReference[] = [
  {
    label: "__nv_bfloat16 数据格式",
    url: "https://docs.nvidia.com/cuda/cuda-math-api/cuda_math_api/struct____nv__bfloat16.html",
    source: "NVIDIA CUDA Math API",
  },
  ...mixedPrecisionReferences,
];

const fp8References: TutorialReference[] = [
  {
    label: "FP8 Primer",
    url: "https://docs.nvidia.com/deeplearning/transformer-engine/user-guide/examples/fp8_primer.html",
    source: "NVIDIA Transformer Engine",
  },
  {
    label: "Transformer Engine Overview",
    url: "https://docs.nvidia.com/deeplearning/transformer-engine/",
    source: "NVIDIA",
  },
];

const attentionReferences: TutorialReference[] = [
  {
    label: "scaled_dot_product_attention",
    url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html",
    source: "PyTorch",
  },
  {
    label: "Transformer Reference Layer",
    url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.Transformer.html",
    source: "PyTorch",
  },
];

const programmingGuideReferences: TutorialReference[] = [
  {
    label: "CUDA Programming Model",
    url: "https://docs.nvidia.com/cuda/cuda-programming-guide/01-introduction/programming-model.html",
    source: "NVIDIA",
  },
  {
    label: "Writing SIMT Kernels",
    url: "https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/writing-cuda-kernels.html",
    source: "NVIDIA",
  },
];

const bestPracticesReferences: TutorialReference[] = [
  {
    label: "CUDA C++ Best Practices Guide",
    url: "https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html",
    source: "NVIDIA",
  },
  {
    label: "Writing SIMT Kernels",
    url: "https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/writing-cuda-kernels.html",
    source: "NVIDIA",
  },
];

const profilerReferences: TutorialReference[] = [
  {
    label: "Nsight Compute User Guide",
    url: "https://docs.nvidia.com/nsight-compute/NsightCompute/index.html",
    source: "NVIDIA",
  },
  {
    label: "Nsight Compute Profiling Guide",
    url: "https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html",
    source: "NVIDIA",
  },
];

const asyncReferences: TutorialReference[] = [
  {
    label: "CUDA Asynchronous Execution",
    url: "https://docs.nvidia.com/cuda/cuda-programming-guide/02-basics/asynchronous-execution.html",
    source: "NVIDIA",
  },
  {
    label: "CUDA C++ Best Practices Guide",
    url: "https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/index.html",
    source: "NVIDIA",
  },
];

const weekTwo: TutorialModule = {
  week: 2,
  eyebrow: "NUMERICS & TRANSFORMER · 人工精编",
  introduction:
    "先用可运行的 PyTorch 小实验理解浮点范围、稳定 Softmax、Attention Shape 和显存量，再进入 CUDA 性能模型。",
  lessons: [
    makeLesson({
      id: "w02-fp16-bf16",
      title: "FP32、FP16 与 BF16：范围和精度怎么取舍",
      summary: "看懂指数位与尾数位分别控制什么，并用实际张量观察舍入和溢出。",
      duration: "35 分钟",
      objectives: [
        "区分数值范围与有效精度",
        "解释 FP16 与 BF16 的主要取舍",
        "用 torch.finfo 查询当前框架给出的数据类型属性",
      ],
      explanation:
        "浮点数把有限位数分给符号、指数和有效数字。指数位主要决定能表示多大或多小的数量级，尾数位主要决定相邻可表示数有多密。NVIDIA 的混合精度指南给出 FP16 为 1 位符号、5 位指数和 10 位小数部分；CUDA Math API 给出 BF16 为 1 位符号、8 位指数和 7 位有效数字存储。直观地说，BF16 保留了更接近 FP32 的数量级范围，但精细刻度更粗；FP16 刻度更细一些，但更容易在大值处溢出、在很小的值处下溢。",
      example: `import torch

for dtype in (torch.float32, torch.float16, torch.bfloat16):
    info = torch.finfo(dtype)
    print(dtype)
    print("  min:", info.min)
    print("  max:", info.max)
    print("  eps:", info.eps)

x = torch.tensor([1.0, 1.001, 1e5], dtype=torch.float32)
print("fp16 :", x.to(torch.float16))
print("bf16 :", x.to(torch.bfloat16))`,
      language: "python",
      exampleNote:
        "`eps` 表示 1 附近能够分辨的间隔尺度；输出会随数据类型不同而发生舍入。不要背一张孤立的范围表，先学会用框架查询，再结合目标硬件和算子验证。",
      checkpoints: [
        "低精度不是“数值一定不准”，而是可表示集合更稀疏，需要针对具体计算验证误差。",
        "不要把存储类型和累加类型混为一谈；矩阵乘法常使用低精度输入和更高精度累加。",
        "PyTorch 官方明确提醒：数学上相同的批处理与逐切片计算不保证逐位相同。",
      ],
      exercise: {
        prompt:
          "分别把 `[1.0, 1.001, 65504.0, 70000.0]` 转为 FP16 与 BF16，记录结果，并解释差异来自范围还是精度。",
        hint: "关注 1.001 附近的舍入，以及 70000 是否超出可表示范围。",
        answer:
          "应通过实际 PyTorch 输出作答。分析时把两类现象分开：1.001 的变化主要体现有效精度；大值是否变为 inf 主要体现数值范围。报告中需注明 PyTorch 和设备版本。",
      },
      quiz: {
        question: "为什么 BF16 通常比 FP16 更不容易在大数值处溢出？",
        options: [
          "BF16 使用更多总位数",
          "BF16 为指数保留的位数更多",
          "BF16 总是用 FP64 累加",
          "BF16 不会发生舍入",
        ],
        answer: 1,
        explanation:
          "两者都是 16 位格式，但 BF16 将更多位分给指数，因此覆盖的数量级范围更大；代价是有效精度较低。",
      },
      references: bfloatReferences,
      verification:
        "格式位数依据 NVIDIA Mixed Precision Guide 与 CUDA Math API；具体转换结果由当前 PyTorch 环境实测。",
    }),
    makeLesson({
      id: "w02-tf32-fp8",
      title: "TF32 与 FP8：它们不是“更小的 FP32”",
      summary: "理解计算格式、存储格式和缩放策略之间的区别。",
      duration: "30 分钟",
      level: "进阶",
      objectives: [
        "说明 TF32 主要用于 Tensor Core 计算路径",
        "区分 FP8 E4M3 与 E5M2 的范围和精度取舍",
        "解释为什么 FP8 需要缩放与 amax 记录",
      ],
      explanation:
        "TF32 是 NVIDIA Ampere 及后续架构上面向 Tensor Core 的计算模式，框架可以让 FP32 矩阵运算使用这条路径；它不等同于把模型权重永久改存成一种 19 位张量。FP8 则是实际的 8 位低精度格式。Transformer Engine 官方文档区分 E4M3 和 E5M2：E4M3 有更多有效数字，E5M2 有更大的范围。因为 8 位能覆盖的值有限，库需要依据张量的最大绝对值维护缩放因子，且不是所有操作都适合 FP8。",
      example: `import torch

# 新版 PyTorch 使用精度策略控制 CUDA FP32 matmul 的计算路径。
torch.backends.cuda.matmul.fp32_precision = "tf32"

a = torch.randn(2048, 2048, device="cuda", dtype=torch.float32)
b = torch.randn(2048, 2048, device="cuda", dtype=torch.float32)
c = a @ b
print(c.dtype)  # 结果张量仍是 torch.float32`,
      language: "python",
      exampleNote:
        "这个示例只说明“存储 dtype 与内部计算路径不是同一件事”。是否实际采用 TF32、性能是否提升，要结合 GPU 架构、PyTorch 版本和 Profiler 结果确认。",
      checkpoints: [
        "不要把 TF32 写成普通模型存储 dtype；它是特定硬件上的计算路径。",
        "Transformer Engine 明确指出并非所有操作都安全地使用 FP8。",
        "FP8 的格式、缩放 recipe 和 Shape 约束会随硬件与库版本变化，必须查当前官方文档。",
      ],
      exercise: {
        prompt:
          "用 FP32 基线分别比较关闭和启用 TF32 的矩阵乘法：记录 dtype、最大绝对误差、平均延迟与 GPU 型号。",
        hint: "先预热；计时要同步或使用 CUDA Event；不要只比较一次运行。",
        answer:
          "答案应包含实验环境、控制 TF32 的当前 PyTorch API、至少一次预热和多次重复统计。结论必须来自目标设备，不预设一定加速或固定误差。",
      },
      quiz: {
        question: "下列哪句话符合官方文档描述？",
        options: [
          "启用 TF32 后结果张量一定变为 torch.float16",
          "FP8 的所有操作都无需缩放即可安全运行",
          "E4M3 与 E5M2 在范围和有效精度之间取舍不同",
          "FP8 只用于 CPU",
        ],
        answer: 2,
        explanation:
          "Transformer Engine 将 E4M3 与 E5M2用于不同范围/精度需求，并通过 recipe 管理缩放。",
      },
      references: [...fp8References, ...mixedPrecisionReferences],
      verification:
        "TF32 使用方式以 PyTorch Numerical Accuracy 当前文档为准；FP8 结构与缩放依据 NVIDIA Transformer Engine 2.16 文档。",
    }),
    makeLesson({
      id: "w02-stable-softmax",
      title: "稳定 Softmax：为什么先减最大值",
      summary: "从数学等价变换理解上溢防护，并写出可检查的参考实现。",
      duration: "35 分钟",
      objectives: [
        "推导减最大值不改变 Softmax 结果",
        "识别指数上溢与低精度归约风险",
        "写出稳定的 PyTorch 参考实现",
      ],
      explanation:
        "Softmax 对一行分数取指数后再除以指数和。指数增长很快，直接对大正数调用 exp 可能得到 inf。给所有输入同时减去同一个常数，分子分母都会乘上相同因子，比例不变；选择这一行的最大值后，最大的指数变为 exp(0)=1，其余指数不超过 1。NVIDIA 混合精度指南还建议让 Softmax 这类大归约保留 FP32 计算。",
      example: `import torch

def stable_softmax(x, dim=-1):
    x32 = x.float()
    shifted = x32 - x32.amax(dim=dim, keepdim=True)
    exp = shifted.exp()
    return exp / exp.sum(dim=dim, keepdim=True)

x = torch.tensor([[1000.0, 1001.0, 1002.0]], device="cuda")
print(stable_softmax(x))
print(torch.softmax(x, dim=-1))`,
      language: "python",
      exampleNote:
        "参考实现显式转为 FP32 是为了把数值策略写清楚。生产环境优先使用框架提供的 Softmax 或融合实现，并以误差与性能数据验证。",
      checkpoints: [
        "减最大值解决的是上溢风险，不代表所有低精度误差都消失。",
        "必须沿正确维度求最大值和求和；维度错了，结果仍可能看似“每个数在 0 到 1 之间”。",
        "测试应覆盖极大正数、极大负数、相同值和不同序列长度。",
      ],
      exercise: {
        prompt:
          "证明 `softmax(x) = softmax(x-c)`，并用 `[10000, 10001, 9999]` 比较直接实现和稳定实现。",
        hint: "把 `exp(x_i-c)` 写成 `exp(x_i)/exp(c)`。",
        answer:
          "分子和分母都含有相同的 `1/exp(c)` 因子，因此会约掉。实验答案需展示直接实现是否产生 inf/NaN，以及稳定实现和 `torch.softmax` 的误差。",
      },
      quiz: {
        question: "稳定 Softmax 选择减去行最大值，最直接的作用是什么？",
        options: [
          "让结果不再需要归一化",
          "让指数输入都不大于 0，降低上溢风险",
          "把算法复杂度降为 O(1)",
          "保证 FP16 与 FP64 逐位相同",
        ],
        answer: 1,
        explanation: "平移后最大输入为 0，其余不大于 0，指数值不超过 1。",
      },
      references: [
        {
          label: "torch.nn.Softmax",
          url: "https://docs.pytorch.org/docs/stable/generated/torch.nn.Softmax.html",
          source: "PyTorch",
        },
        ...mixedPrecisionReferences,
      ],
      verification:
        "数值策略依据 NVIDIA Mixed Precision Guide；框架行为以 PyTorch Softmax 文档和实际测试为准。",
    }),
    makeLesson({
      id: "w02-matmul-shapes",
      title: "矩阵乘法 Shape、FLOPs 与内存量",
      summary: "不依赖代码提示，独立写出 M、N、K 和数据流量估算。",
      duration: "40 分钟",
      objectives: [
        "从输入 Shape 识别 M、N、K",
        "估算矩阵乘法的乘加数量",
        "区分理论最少流量与实现实际流量",
      ],
      explanation:
        "对 A[M,K] 与 B[K,N]，输出 C 的 Shape 是 [M,N]。每个输出元素需要 K 次乘法和 K 次累加，工程上常按约 2×M×N×K FLOPs 估算。只看 FLOPs 还不够：至少需要读取 A、B 并写出 C，但低效实现可能重复读取同一数据；缓存、Tile 和融合会改变实际流量。",
      example: `def gemm_model(m, n, k, bytes_per_value=2):
    flops = 2 * m * n * k
    min_bytes = (m * k + k * n + m * n) * bytes_per_value
    intensity = flops / min_bytes
    return flops, min_bytes, intensity

print(gemm_model(4096, 4096, 4096))`,
      language: "python",
      exampleNote:
        "这里的字节数只是“读一次 A、读一次 B、写一次 C”的下界模型，不包含缓存未命中、临时张量、读改写或其他实现开销。",
      checkpoints: [
        "转置标记会改变逻辑索引方式，但要依据实际布局判断物理访问。",
        "FMA 按 2 FLOPs 计是常用性能约定，报告里应说明采用的口径。",
        "算术强度是 FLOPs/Bytes；Bytes 必须写明是理论值还是测量/工具报告值。",
      ],
      exercise: {
        prompt:
          "对 `X[B,S,H] @ W[H,4H]` 写出展平后的 M、N、K、输出 Shape 与约 FLOPs。",
        hint: "把 B 和 S 合并为矩阵的行数。",
        answer:
          "M=B×S，N=4H，K=H；输出可还原为 [B,S,4H]；约 FLOPs 为 `2×B×S×4H×H`。若计算字节量，还需说明 dtype 和是否计入输出写入。",
      },
      quiz: {
        question: "A[M,K] 与 B[K,N] 相乘时，K 表示什么？",
        options: [
          "输出行数",
          "输出列数",
          "每个输出元素参与点积的长度",
          "Batch 数",
        ],
        answer: 2,
        explanation: "C[i,j] 是 A 第 i 行与 B 第 j 列的长度 K 点积。",
      },
      references: mixedPrecisionReferences,
      verification:
        "FLOPs 与最少字节数是明确写出口径的性能模型；实际执行路径和流量必须在目标硬件上测量。",
    }),
    makeLesson({
      id: "w02-attention-shapes",
      title: "Attention Shape：QKᵀ、Mask、Softmax 与 PV",
      summary: "沿着一次缩放点积注意力逐步检查张量形状。",
      duration: "45 分钟",
      objectives: [
        "写出 Q、K、V 和分数矩阵 Shape",
        "解释缩放因子与 Mask 的位置",
        "区分 MHA 与 GQA 的 KV 头数",
      ],
      explanation:
        "PyTorch 官方的 scaled dot product attention 形式是：Q 与 K 转置相乘，乘以默认的 `1/sqrt(E)` 缩放，加入因果或自定义 Mask，做 Softmax 与 Dropout，最后再乘 V。若 Q 为 [B,Hq,L,D]，K/V 为 [B,Hkv,S,D]，普通 MHA 常有 Hq=Hkv；GQA 则让多组查询头共享较少的 KV 头。分数矩阵的逻辑 Shape 是 [B,Hq,L,S]。",
      example: `import torch
import torch.nn.functional as F

B, Hq, Hkv, L, S, D = 2, 8, 2, 128, 128, 64
q = torch.randn(B, Hq, L, D, device="cuda")
k = torch.randn(B, Hkv, S, D, device="cuda")
v = torch.randn(B, Hkv, S, D, device="cuda")

out = F.scaled_dot_product_attention(
    q, k, v, is_causal=True, enable_gqa=True
)
print(out.shape)  # [2, 8, 128, 64]`,
      language: "python",
      exampleNote:
        "GQA 是否可用以及后端选择有版本和设备约束，应查看当前 PyTorch API。布尔 Mask 在不同 Attention API 中语义可能相反，官方文档对此有明确警告。",
      checkpoints: [
        "Q 的序列长度 L 与 K/V 的序列长度 S 可以不同。",
        "缩放使用每个头的维度 D，而不是总隐藏维度 Hq×D。",
        "不要假设调用 SDPA 就一定使用某个融合后端；后端由输入和运行环境共同决定。",
      ],
      exercise: {
        prompt:
          "给定 B=4、Hq=32、Hkv=8、L=S=2048、D=128，写出 Q、K、V、分数和输出 Shape。",
        hint: "GQA 只减少 K/V 的头数，输出仍跟随查询头。",
        answer:
          "Q=[4,32,2048,128]；K/V=[4,8,2048,128]；逻辑分数=[4,32,2048,2048]；输出=[4,32,2048,128]。",
      },
      quiz: {
        question: "缩放点积注意力默认为什么除以 sqrt(D)？",
        options: [
          "改变输出 Shape",
          "控制点积随头维度增大而增长的尺度",
          "把所有分数变成整数",
          "减少 KV 头数量",
        ],
        answer: 1,
        explanation:
          "PyTorch 官方公式使用 `1/sqrt(E)` 缩放点积，其中 E 是查询/键的嵌入维度。",
      },
      references: attentionReferences,
      verification:
        "公式、参数和 Mask 注意事项依据 PyTorch scaled_dot_product_attention 当前官方文档。",
    }),
    makeLesson({
      id: "w02-kv-cache",
      title: "KV Cache：显存到底花在哪里",
      summary: "用层数、KV 头数、头维度和序列长度估算推理缓存。",
      duration: "35 分钟",
      objectives: [
        "写出单层 K/V 缓存 Shape",
        "估算整模型 KV Cache 字节数",
        "解释 GQA/MQA 为什么能减少缓存",
      ],
      explanation:
        "自回归推理会复用过去 Token 的 K 和 V，避免每一步重新计算。若每层 K、V 都按 [B,Hkv,S,D] 保存，则元素数为 `2×B×Hkv×S×D`，再乘层数和每元素字节数得到整模型缓存下界。MHA 的 Hkv 通常等于查询头数；GQA/MQA 通过减少 Hkv 直接减少 KV Cache。",
      example: `def kv_cache_bytes(batch, layers, kv_heads, seq, head_dim, bytes_per_value):
    return 2 * batch * layers * kv_heads * seq * head_dim * bytes_per_value

size = kv_cache_bytes(
    batch=1, layers=32, kv_heads=8,
    seq=4096, head_dim=128, bytes_per_value=2
)
print(size, "bytes")
print(size / 1024**3, "GiB")`,
      language: "python",
      exampleNote:
        "这是按紧凑连续存储计算的基础模型。实际系统可能有分页、对齐、元数据、预分配和量化，不能把公式结果冒充运行时显存峰值。",
      checkpoints: [
        "K 和 V 两份缓存带来公式中的系数 2。",
        "必须区分 GB（10³）与 GiB（2¹⁰），报告里写清单位。",
        "运行时显存还包含权重、激活、工作区、分配器保留内存和框架开销。",
      ],
      exercise: {
        prompt:
          "比较 Hkv=32 与 Hkv=8 时，同一模型其他参数不变，KV Cache 理论大小相差多少倍？",
        hint: "缓存大小与 KV 头数线性相关。",
        answer:
          "理论缓存元素数相差 4 倍，Hkv=8 的基础 KV Cache 是 Hkv=32 的四分之一；实际峰值还要用运行时测量确认。",
      },
      quiz: {
        question: "在其他参数相同的条件下，哪项会线性增加 KV Cache 大小？",
        options: [
          "序列长度",
          "Softmax 是否减最大值",
          "Block size",
          "编译优化等级",
        ],
        answer: 0,
        explanation: "每个新增 Token 都要为每层保存对应 K/V，因此缓存随序列长度线性增长。",
      },
      references: attentionReferences,
      verification:
        "Shape 语义依据 PyTorch Attention API；公式是按 Shape 推导的基础存储量，实际系统开销必须实测。",
    }),
    makeLesson({
      id: "w02-arithmetic-intensity",
      title: "算术强度：先判断更像算力问题还是带宽问题",
      summary: "用 FLOPs/Bytes 建立第一版性能判断，不把模型当成最终结论。",
      duration: "40 分钟",
      level: "进阶",
      objectives: [
        "计算一个简化算子的算术强度",
        "解释计算受限与带宽受限的含义",
        "知道模型结论必须用测量校正",
      ],
      explanation:
        "NVIDIA 性能指南把算术强度定义为计算工作量相对于输入字节的比例。直观地说，同一份数据搬进来后做的计算越多，越可能接近算力上限；每搬几个字节只做很少运算，越可能受内存带宽限制。判断边界还需要目标 GPU 的峰值计算吞吐与带宽比值，因此不能脱离具体硬件下结论。",
      example: `def vector_add_intensity(n, bytes_per_value=4):
    flops = n                 # 每个元素一次加法
    bytes_moved = 3 * n * bytes_per_value  # 读 A/B，写 C
    return flops / bytes_moved

print(vector_add_intensity(1_000_000), "FLOPs/byte")`,
      language: "python",
      exampleNote:
        "这个模型忽略缓存与其他开销，但能解释为什么 Vector Add 通常很难仅靠增加计算单元数量加速。最终应结合有效带宽和 Nsight 指标。",
      checkpoints: [
        "算术强度低不等于实现一定已经跑满带宽。",
        "理论字节数和实际内存事务可能不同，特别是访问不合并或重复加载时。",
        "Roofline 给出上界模型，不替代正确性测试、计时和瓶颈指标。",
      ],
      exercise: {
        prompt:
          "估算 FP32 ReLU 的最少流量与算术强度：每个元素读取一次、比较/选择一次、写出一次。",
        hint: "FP32 每元素 4 字节；最少读写共 8 字节。",
        answer:
          "若按每元素约 1 次比较/选择操作计，最少流量 8 字节，算术强度约 1/8 ops/byte。报告中需说明 FLOPs/ops 的计数口径。",
      },
      quiz: {
        question: "算术强度的分母应表示什么？",
        options: [
          "线程总数",
          "数据移动字节数",
          "寄存器数量",
          "Kernel 数量",
        ],
        answer: 1,
        explanation: "算术强度用计算量除以数据移动量，常写成 FLOPs/byte。",
      },
      references: [
        {
          label: "Deep Learning Performance",
          url: "https://docs.nvidia.com/deeplearning/performance/index.html",
          source: "NVIDIA",
        },
        ...bestPracticesReferences,
      ],
      verification:
        "定义与分析原则依据 NVIDIA Deep Learning Performance 与 CUDA Best Practices；具体瓶颈需在目标 GPU 上测量。",
    }),
    makeLesson({
      id: "w02-model-analyzer",
      title: "阶段实践：Transformer 配置分析器",
      summary: "把 Shape、参数量、KV Cache 和主要 GEMM 汇总成可复查报告。",
      duration: "75 分钟",
      level: "进阶",
      objectives: [
        "从配置推导每头维度与 QKV Shape",
        "计算权重和 KV Cache 的基础存储量",
        "把所有公式与单位打印出来",
      ],
      explanation:
        "分析器的价值不是输出一个看似精确的大数字，而是把假设显式化。输入至少包括 batch、序列长度、隐藏维度、层数、查询头数、KV 头数和 dtype；输出应标注 Shape、元素数、字节数与单位，并区分参数存储、KV Cache 和临时张量。",
      example: `from dataclasses import dataclass

@dataclass
class Config:
    batch: int
    seq: int
    hidden: int
    layers: int
    q_heads: int
    kv_heads: int
    bytes_per_value: int

def analyze(c: Config):
    assert c.hidden % c.q_heads == 0
    d = c.hidden // c.q_heads
    q = (c.batch, c.q_heads, c.seq, d)
    kv = (c.batch, c.kv_heads, c.seq, d)
    kv_bytes = 2 * c.layers * c.batch * c.kv_heads * c.seq * d * c.bytes_per_value
    return {"head_dim": d, "q_shape": q, "k_v_shape": kv, "kv_cache_bytes": kv_bytes}

print(analyze(Config(1, 4096, 4096, 32, 32, 8, 2)))`,
      language: "python",
      exampleNote:
        "这是骨架而不是完整答案。继续加入主要线性层参数量、QKV 投影 GEMM、Attention 分数逻辑 Shape 和单位格式化。",
      checkpoints: [
        "所有整除条件都应显式检查，不能悄悄截断。",
        "参数量公式依赖具体架构，例如是否有 Bias、是否使用 Gated MLP，必须通过配置声明。",
        "理论值与 PyTorch 实际分配量应分栏展示，不能混为同一个数。",
      ],
      exercise: {
        prompt:
          "扩展分析器，输出 QKV 投影和输出投影的 M、N、K，以及每层 Attention 分数的逻辑元素数。",
        hint: "投影可将 B×S 合并为 M；逻辑分数使用 [B,Hq,S,S]。",
        answer:
          "合格实现应在代码中明确矩阵方向约定。例如输入展平为 [B×S,H]，Q 投影可记 M=B×S、K=H、N=H；若 GQA 的 K/V 输出宽度不同，应按 kv_heads×head_dim 计算。分数逻辑元素数为 B×Hq×S×S。",
      },
      quiz: {
        question: "配置分析器为什么必须输出公式假设？",
        options: [
          "为了让代码更长",
          "不同架构与存储策略会改变参数和显存计算",
          "因为 Python 不能计算整数",
          "为了避免使用 GPU",
        ],
        answer: 1,
        explanation:
          "Bias、GQA、Gated MLP、dtype 和缓存布局都会改变结果；公开假设才能复核。",
      },
      references: [...attentionReferences, ...mixedPrecisionReferences],
      verification:
        "公式均由页面给出的 Tensor Shape 推导；API 与数值行为对照 PyTorch/NVIDIA 官方文档，实际显存通过运行时复测。",
    }),
  ],
};

const weekFour: TutorialModule = {
  week: 4,
  eyebrow: "CUDA INDEXING · 人工精编",
  introduction:
    "从二维矩阵开始，把 Grid、Block、Shape、Stride 和边界统一成一套可审查的地址计算方法。",
  lessons: [
    makeLesson({
      id: "w04-dim3-index",
      title: "dim3 与二维线程坐标",
      summary: "把 Block 和 Grid 的 x/y 维映射到矩阵行列。",
      duration: "30 分钟",
      objectives: ["写出二维全局坐标", "正确计算二维 Grid", "解释 x 对应列、y 对应行的约定"],
      explanation:
        "`dim3` 让 Grid 与 Block 使用最多三维的坐标。处理行主序矩阵时，常让 x 方向覆盖列、y 方向覆盖行，因为同一 Warp 内连续的 threadIdx.x 更容易访问连续列地址。这是常用约定，不是语法强制；真正重要的是坐标公式和内存布局一致。",
      example: `__global__ void matrix_add(const float* a, const float* b,
                           float* c, int rows, int cols) {
  int col = blockIdx.x * blockDim.x + threadIdx.x;
  int row = blockIdx.y * blockDim.y + threadIdx.y;
  if (row < rows && col < cols) {
    int i = row * cols + col;
    c[i] = a[i] + b[i];
  }
}

dim3 block(32, 8);
dim3 grid((cols + block.x - 1) / block.x,
          (rows + block.y - 1) / block.y);`,
      exampleNote:
        "Block 一共 256 个线程，但形状是 32×8。为何选它必须通过访问模式、资源限制和实测判断，而不是因为二维问题就固定使用 16×16。",
      checkpoints: [
        "Grid.x 应覆盖 cols，Grid.y 应覆盖 rows。",
        "总线程数不能超过目标设备允许的每 Block 上限。",
        "最后一行和最后一列通常不是完整 Tile，必须做两个方向的边界判断。",
      ],
      exercise: {
        prompt: "rows=1000、cols=1500、block=(32,8) 时，计算 grid.x 与 grid.y。",
        hint: "两个方向分别向上取整。",
        answer: "grid.x=ceil(1500/32)=47；grid.y=ceil(1000/8)=125。",
      },
      quiz: {
        question: "上述行主序示例为什么让 threadIdx.x 对应列？",
        options: [
          "CUDA 强制这样写",
          "相邻 x 线程可对应相邻元素地址",
          "y 维不能访问内存",
          "这样不需要边界判断",
        ],
        answer: 1,
        explanation: "行主序中连续列地址相邻，这种映射有利于形成连续访问。",
      },
      references: programmingGuideReferences,
      verification: "线程层级与 SIMT 语义依据 NVIDIA CUDA Programming Guide。",
    }),
    makeLesson({
      id: "w04-shape-stride",
      title: "Shape、Stride 与线性地址",
      summary: "不用假设连续内存，按每一维步长计算元素位置。",
      duration: "35 分钟",
      objectives: ["区分 Shape 与 Stride", "计算四维 Tensor 地址", "识别连续布局只是 Stride 的一种"],
      explanation:
        "Shape 告诉你每一维有多少元素，Stride 告诉你该维坐标增加 1 时，线性地址跨过多少个元素。对坐标 [b,h,s,d]，元素偏移可写成 `b*sb+h*sh+s*ss+d*sd`。只有在明确连续布局时，才能把它简化成固定乘积。",
      example: `__device__ long offset4(
    int b, int h, int s, int d,
    long stride_b, long stride_h,
    long stride_s, long stride_d) {
  return b * stride_b + h * stride_h
       + s * stride_s + d * stride_d;
}`,
      exampleNote:
        "接口传入 Stride 会增加参数，但能让同一 Kernel 描述更多布局。是否支持任意 Stride 是接口契约，必须在文档和测试中写清。",
      checkpoints: [
        "Stride 的单位要统一：元素数还是字节数。",
        "转置 View 可能只改变 Shape/Stride，并不搬动 Storage。",
        "若 Kernel 只支持 contiguous，应在 Host 侧显式检查并给出错误信息。",
      ],
      exercise: {
        prompt:
          "连续张量 Shape=[2,4,8,16]，按行主序写出元素单位的四个 Stride，并计算 [1,2,3,4] 的偏移。",
        hint: "从最后一维 stride=1 向前累乘。",
        answer:
          "Stride=[512,128,16,1]；偏移=1×512+2×128+3×16+4=820。",
      },
      quiz: {
        question: "Tensor 转置 View 后，最可能发生什么？",
        options: [
          "Storage 一定被完整复制",
          "Shape 与 Stride 改变，Storage 仍可共享",
          "数据类型自动变为 FP16",
          "所有 Stride 都变为 1",
        ],
        answer: 1,
        explanation: "View 可以通过新的 Shape/Stride 解释同一底层存储。",
      },
      references: programmingGuideReferences,
      verification: "CUDA 地址计算由显式 Shape/Stride 公式定义；布局支持范围由接口测试验证。",
    }),
    makeLesson({
      id: "w04-boundary-mask",
      title: "边界判断：让任意 Shape 都安全",
      summary: "理解向上取整为何必然产生越界线程，并设计可测试的边界。",
      duration: "30 分钟",
      objectives: ["解释尾部线程来源", "区分读边界与写边界", "设计非整除 Shape 测试"],
      explanation:
        "Grid 通常向上取整，才能覆盖所有元素，因此最后一个 Block 会包含一些没有对应数据的逻辑线程。边界判断必须发生在任何越界读写之前。对复杂 Kernel，还要区分输入有效区、输出有效区和 Halo 区，而不是只在最后写回时检查。",
      example: `int col = blockIdx.x * blockDim.x + threadIdx.x;
int row = blockIdx.y * blockDim.y + threadIdx.y;

if (row >= rows || col >= cols) return;

float value = input[row * cols + col];
output[row * cols + col] = value;`,
      exampleNote:
        "提前 return 对这个简单 Kernel 是安全的；若后续存在 `__syncthreads()`，不能让同一 Block 只有部分线程提前退出后再让其他线程进入屏障。",
      checkpoints: [
        "屏障前的分支必须保证所有需要参与的线程以符合语义的方式到达屏障。",
        "测试 Shape 应围绕 Tile 边界，例如 31/32/33，而不是只测 32。",
        "空输入是否允许应由 Host 接口定义，避免启动 Grid=0 的不明确路径。",
      ],
      exercise: {
        prompt: "为 block=(32,8) 设计至少 6 组 rows×cols 边界 Shape。",
        hint: "覆盖 0/1、恰好整除、两个方向分别差 1。",
        answer:
          "示例：1×1、8×32、7×31、9×33、8×33、9×32；若接口支持空 Tensor，再加入 0×N 和 N×0，并定义 Host 侧行为。",
      },
      quiz: {
        question: "含 `__syncthreads()` 的 Kernel 为什么不能随意让部分线程提前 return？",
        options: [
          "return 会改变 dtype",
          "可能导致其余线程在 Block 屏障处无法满足同步要求",
          "CUDA 不支持 return",
          "只会影响性能，不影响正确性",
        ],
        answer: 1,
        explanation: "Block 屏障需要按 CUDA 同步语义由相应线程共同到达。",
      },
      references: programmingGuideReferences,
      verification: "边界与线程块同步语义依据 CUDA Programming Guide；具体接口对空输入的约定由项目定义。",
    }),
    makeLesson({
      id: "w04-grid-stride",
      title: "Grid-stride loop：让一个线程处理多个元素",
      summary: "在固定 Grid 下覆盖大数组，并保持连续线程的访问关系。",
      duration: "30 分钟",
      objectives: ["写出 grid-stride loop", "解释步长来源", "知道何时需要 64 位索引"],
      explanation:
        "Grid-stride loop 先让每个线程处理自己的全局索引，再以整个 Grid 的线程总数为步长继续处理后续元素。这样同一轮中相邻线程仍访问相邻元素，同时 Grid 大小可以按设备规模控制，而不必为每个元素都创建唯一线程。",
      example: `__global__ void scale(float* x, long long n, float alpha) {
  long long i = (long long)blockIdx.x * blockDim.x + threadIdx.x;
  long long stride = (long long)blockDim.x * gridDim.x;
  for (; i < n; i += stride) {
    x[i] *= alpha;
  }
}`,
      exampleNote:
        "当元素数量可能超过 32 位索引范围时，索引与乘法应使用足够宽的整数类型。Grid 大小仍需结合 SM 数量、资源和实测选择。",
      checkpoints: [
        "步长是整个 Grid 的线程总数，不是 blockDim.x。",
        "循环次数不均衡时，尾部线程工作量可能不同。",
        "不要用 Grid-stride loop 掩盖本该采用二维局部性或 Tile 的问题。",
      ],
      exercise: {
        prompt: "grid=80、block=256、n=1,000,000 时，线程 7 依次处理哪些索引？",
        hint: "stride=80×256。",
        answer: "索引为 7、20487、40967……，每次增加 20480，直到索引不小于 n。",
      },
      quiz: {
        question: "Grid-stride loop 的核心步长是什么？",
        options: ["warpSize", "blockDim.x", "blockDim.x×gridDim.x", "n/2"],
        answer: 2,
        explanation: "一个循环轮次跨过整个 Grid 的线程总数。",
      },
      references: programmingGuideReferences,
      verification: "线程索引公式依据 CUDA Programming Guide；Grid 规模需要在目标设备实测。",
    }),
    makeLesson({
      id: "w04-naive-transpose",
      title: "Naive Transpose：正确，但为什么常常不快",
      summary: "从读写地址看转置的非连续一侧，为共享内存版本建立基线。",
      duration: "40 分钟",
      level: "进阶",
      objectives: ["写出正确转置索引", "分别分析读写连续性", "建立后续优化基线"],
      explanation:
        "转置把输入 [row,col] 写到输出 [col,row]。若相邻 x 线程读取输入连续列，那么读取通常连续；但写出地址的步长变成输出行宽，相邻线程可能写到相距很远的位置。Naive 版本非常重要，因为它提供正确性参考和性能基线。",
      example: `__global__ void transpose_naive(
    const float* in, float* out, int rows, int cols) {
  int col = blockIdx.x * blockDim.x + threadIdx.x;
  int row = blockIdx.y * blockDim.y + threadIdx.y;
  if (row < rows && col < cols) {
    out[col * rows + row] = in[row * cols + col];
  }
}`,
      exampleNote:
        "不要只说“转置不连续”。明确指出哪一侧访问连续、哪一侧跨步，并用 Nsight 或有效带宽证明瓶颈。",
      checkpoints: [
        "输出 Shape 是 [cols,rows]，输出行宽是 rows。",
        "正确性测试必须覆盖非方阵，否则行列写反更难暴露。",
        "性能对比使用相同输入、预热和计时范围。",
      ],
      exercise: {
        prompt: "对输入 Shape 3×5，写出输入元素 [2,4] 在输出中的坐标和线性偏移。",
        hint: "输出 Shape 为 5×3。",
        answer: "输出坐标 [4,2]；按输出行宽 3，线性偏移为 4×3+2=14。",
      },
      quiz: {
        question: "上述 Naive Kernel 中，相邻 x 线程的输出地址通常如何变化？",
        options: ["相差 1", "相差 rows", "相差 cols", "完全相同"],
        answer: 1,
        explanation: "输出索引为 col×rows+row，col 增加 1 时地址增加 rows。",
      },
      references: bestPracticesReferences,
      verification: "访问分析依据明确索引公式；性能影响需要用 CUDA Event 和 Profiler 在目标 GPU 测量。",
    }),
    makeLesson({
      id: "w04-batched-mapping",
      title: "Batched Tensor：展平还是多维 Grid",
      summary: "比较两种映射方式，并把整数溢出和布局契约写清。",
      duration: "35 分钟",
      level: "进阶",
      objectives: ["把多维坐标展平", "从线性索引还原坐标", "选择适合数据布局的映射"],
      explanation:
        "处理 [B,H,S,D] 可以把总元素数展平成一维，也可以让 Grid 维度承担部分逻辑维。展平代码通用，但需要除法和取模还原坐标；多维映射更直观，却受 Grid 维度限制。两者正确性相同，选择应依据后续访问局部性、维度上限和实际性能。",
      example: `long long linear = (long long)blockIdx.x * blockDim.x + threadIdx.x;
long long total = (long long)B * H * S * D;
if (linear < total) {
  int d = linear % D;
  long long t = linear / D;
  int s = t % S; t /= S;
  int h = t % H;
  int b = t / H;
  // 使用 b, h, s, d
}`,
      exampleNote:
        "总元素数与中间乘法使用 64 位，避免大 Shape 在 32 位整数中先溢出。若仅做逐元素运算，很多场景不必真的还原全部坐标。",
      checkpoints: [
        "先判断算法是否只需要线性地址，避免不必要的除法/取模。",
        "总元素乘法应在转换为宽整数后进行。",
        "非连续 Tensor 仍需使用传入 Stride，而不是只依赖 Shape 展平。",
      ],
      exercise: {
        prompt: "说明逐元素 SiLU Kernel 是否必须还原 b/h/s/d，并给出理由。",
        hint: "如果输入输出布局一致，操作是否依赖坐标？",
        answer:
          "若输入输出都是同样的连续布局，SiLU 只依赖当前元素值，可直接使用线性索引，不必还原各维坐标；若需要广播、不同 Stride 或按维参数，则需相应坐标。",
      },
      quiz: {
        question: "计算 total=B×H×S×D 时，为什么要尽早使用 64 位？",
        options: [
          "让 GPU 自动使用 FP64",
          "避免大 Shape 的整数乘法溢出",
          "减少线程数",
          "取消边界判断",
        ],
        answer: 1,
        explanation: "即使最终地址类型较宽，若乘法先在 32 位完成，溢出已经发生。",
      },
      references: programmingGuideReferences,
      verification: "线程映射依据 CUDA Programming Guide；选择哪种映射需结合目标 Shape 和 Profiler 数据。",
    }),
  ],
};

const weekFive: TutorialModule = {
  week: 5,
  eyebrow: "WARP & SIMT · 人工精编",
  introduction:
    "从 32 线程 Warp 的编程模型出发，分清分支发散、占用率、延迟隐藏和实际性能之间的关系。",
  lessons: [
    makeLesson({
      id: "w05-warp-simt",
      title: "Warp 与 SIMT：同一段代码，不同线程状态",
      summary: "理解线程如何组成 Warp，以及 SIMT 与 SIMD 的区别。",
      duration: "30 分钟",
      objectives: ["说明 Warp 的 32 线程组织", "解释 SIMT 允许线程拥有独立状态", "识别不完整 Warp 的浪费"],
      explanation:
        "CUDA Programming Guide 将线程块内线程按 32 个线程组织为 Warp。SIMT 表示这些线程执行同一 Kernel 程序，但每个线程有自己的寄存器状态和控制流。它不像固定宽度 SIMD 那样只暴露一个控制流；不过从编程模型看，Warp 内线程共同推进，因此分支和内存访问模式会直接影响利用率。",
      example: `__global__ void add_one(float* x, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) x[i] += 1.0f;
}`,
      exampleNote:
        "最后一个 Warp 可能只有部分线程对应有效元素。边界 Mask 是正确性所需，但长期使用非 32 倍数的 Block 会让最后一个 Warp 固定存在未使用 Lane。",
      checkpoints: [
        "Warp 大小可通过设备属性查询；当前 CUDA 编程模型以 32 线程为 Warp。",
        "线程块线程数不是 32 的倍数时，最后一个 Warp 会有未使用 Lane。",
        "不要依赖未由编程模型保证的底层同步细节。",
      ],
      exercise: {
        prompt: "blockDim.x=100 时需要多少个 Warp？最后一个 Warp 有多少有效 Lane？",
        hint: "Warp 数向上取整。",
        answer: "需要 ceil(100/32)=4 个 Warp；最后一个 Warp 有 4 个有效 Lane，另 28 个 Lane 没有对应线程。",
      },
      quiz: {
        question: "SIMT 相比传统 SIMD 的一个重要特点是什么？",
        options: [
          "线程不能有自己的寄存器",
          "线程可拥有独立状态与控制流",
          "只能处理整数",
          "Warp 中只有一个线程",
        ],
        answer: 1,
        explanation: "CUDA 文档强调 SIMT 中每个线程维护自己的状态和控制流。",
      },
      references: programmingGuideReferences,
      verification: "Warp 与 SIMT 定义依据当前 NVIDIA CUDA Programming Guide。",
    }),
    makeLesson({
      id: "w05-divergence",
      title: "分支发散：慢的不是 if，而是 Warp 内路径不同",
      summary: "用三种分支模式区分 Warp 内发散与 Warp 间分工。",
      duration: "40 分钟",
      objectives: ["识别 Warp 内发散", "解释 Masked execution", "设计可比较的分支实验"],
      explanation:
        "条件语句本身不必然昂贵。如果同一 Warp 的线程选择不同路径，硬件需要在不同路径之间推进并屏蔽暂不参与的 Lane，这才是分支发散。若整个 Warp 选择同一分支，例如按 warpId 分工，则 Warp 内没有这类路径分裂。",
      example: `int lane = threadIdx.x & 31;
int warp = threadIdx.x >> 5;

// Warp 内交替：容易发散
if ((lane & 1) == 0) out[i] = path_a(x[i]);
else                 out[i] = path_b(x[i]);

// 整个 Warp 选择同一路径
if ((warp & 1) == 0) out[i] = path_a(x[i]);
else                 out[i] = path_b(x[i]);`,
      exampleNote:
        "两段代码做的工作分布不同，不能只看运行时间下结论。实验应确保 path_a/path_b 的工作量可控，并查看分支与 Warp 状态指标。",
      checkpoints: [
        "编译器可能把短分支转成谓词执行，源代码有 if 不代表一定出现同样的机器控制流。",
        "Warp 间走不同路径不等同于 Warp 内发散。",
        "分支两侧工作量不相等会引入负载不均，需与发散分开分析。",
      ],
      exercise: {
        prompt: "比较 `threadIdx.x % 2` 与 `(threadIdx.x / 32) % 2` 两种分支，说明哪种更可能产生 Warp 内发散。",
        hint: "观察一个 Warp 内条件是否一致。",
        answer:
          "`threadIdx.x % 2` 在一个 Warp 内交替真假，更可能发散；按 warpId 奇偶分支时，一个 Warp 内条件一致。",
      },
      quiz: {
        question: "哪种情况属于 Warp 内分支发散？",
        options: [
          "不同 Block 执行不同数据",
          "同一 Warp 的 Lane 选择不同控制路径",
          "两个 Kernel 使用不同代码",
          "Host 与 Device 并行",
        ],
        answer: 1,
        explanation: "发散关注同一 Warp 内线程的控制路径是否一致。",
      },
      references: programmingGuideReferences,
      verification: "SIMT 控制流解释依据 CUDA Programming Guide；具体生成指令和性能由编译器输出与 Profiler 确认。",
    }),
    makeLesson({
      id: "w05-block-size",
      title: "Block size：128、256 只是起点，不是答案",
      summary: "理解 Warp 整数倍、资源约束与并发 Block 之间的平衡。",
      duration: "35 分钟",
      objectives: ["解释 Block size 的基本约束", "使用 128～256 作为实验起点而非规则", "记录寄存器与共享内存影响"],
      explanation:
        "CUDA Best Practices 建议线程数使用 Warp 大小的倍数，并把 128～256 作为常见实验起点。但最优值依赖 Kernel 每线程寄存器、每 Block 共享内存、同步频率和数据规模。Block 更大可能提高单 Block 并行度，也可能因资源占用减少每个 SM 能同时驻留的 Block。",
      example: `for (int block : {64, 128, 256, 512}) {
  int grid = (n + block - 1) / block;
  kernel<<<grid, block>>>(...);
  // 使用同一数据、预热和 CUDA Event 记录延迟
}`,
      exampleNote:
        "这段代码只表达实验矩阵。每次 launch 后必须检查错误，计时应使用相同 Stream 和重复方法。",
      checkpoints: [
        "线程数必须不超过设备和 Kernel 限制。",
        "Block size 变化可能同时改变 Grid 数量、占用率和每线程工作量。",
        "只比较平均延迟不够，还要记录寄存器、共享内存与有效工作比例。",
      ],
      exercise: {
        prompt: "设计 Block size 实验表格，至少列出 6 个需要记录的字段。",
        hint: "除延迟外，还应包含资源、正确性和环境。",
        answer:
          "可包括 GPU/驱动/CUDA 版本、Block/Grid、寄存器/线程、共享内存/Block、理论与实测占用率、median/p95 延迟、正确性误差和输入 Shape。",
      },
      quiz: {
        question: "为什么 512 线程 Block 不一定比 256 更快？",
        options: [
          "CUDA 禁止 512",
          "更大的 Block 可能加重资源约束并减少并发驻留",
          "512 不是 32 的倍数",
          "512 只能运行整数代码",
        ],
        answer: 1,
        explanation: "资源限制和调度并发会随 Block size 改变，必须实测。",
      },
      references: bestPracticesReferences,
      verification: "Block size 起始建议与资源说明依据 CUDA Best Practices；最优配置仅由目标 Kernel 实测确定。",
    }),
    makeLesson({
      id: "w05-occupancy",
      title: "Occupancy：能驻留多少 Warp，不等于跑得多快",
      summary: "区分理论占用率、实测活跃程度与最终性能。",
      duration: "40 分钟",
      level: "进阶",
      objectives: ["定义 Occupancy", "列出主要资源限制", "避免把高 Occupancy 当优化目标"],
      explanation:
        "NVIDIA 将 Occupancy 定义为每个 SM 的活跃 Warp 数与最大可能活跃 Warp 数之比。更多活跃 Warp 有助于在一个 Warp 等待时切换到其他 Warp，从而隐藏延迟；但官方明确说明更高 Occupancy 不总是带来更高性能。超过足够隐藏延迟的水平后，继续提高可能没有收益，甚至会以减少寄存器等方式伤害单线程效率。",
      example: `int blocks_per_sm = 0;
cudaOccupancyMaxActiveBlocksPerMultiprocessor(
    &blocks_per_sm, kernel, block_size, dynamic_smem_bytes);

printf("active blocks per SM: %d\\n", blocks_per_sm);`,
      exampleNote:
        "Runtime Occupancy API 给出基于资源模型的配置估算。还应结合 Nsight Compute 的 Occupancy、Scheduler Statistics 和 Warp State 指标。",
      checkpoints: [
        "限制因素常见为线程数、寄存器、共享内存和最大 Block 数。",
        "理论 Occupancy 与运行时负载不均造成的实际活跃程度不是同一个问题。",
        "低 Occupancy 往往不利于隐藏延迟，但高 Occupancy 不是充分条件。",
      ],
      exercise: {
        prompt:
          "一个优化把寄存器/线程从 64 降到 32，Occupancy 上升但延迟变慢。列出两个需要继续检查的原因。",
        hint: "考虑溢出到 Local Memory 和指令数量。",
        answer:
          "应检查是否产生寄存器 Spill/更多 Local Memory 流量，以及是否为降低寄存器而增加重算或指令。还应比较 Warp Stall、内存吞吐和正确性。",
      },
      quiz: {
        question: "哪句话符合 NVIDIA 官方说明？",
        options: [
          "Occupancy 越高性能必然越高",
          "Occupancy 只由 Block size 决定",
          "低 Occupancy 会削弱隐藏延迟的能力，但高 Occupancy 不保证更快",
          "Occupancy 与寄存器无关",
        ],
        answer: 2,
        explanation: "这是 CUDA Best Practices 对 Occupancy 与性能关系的明确提醒。",
      },
      references: [...bestPracticesReferences, ...profilerReferences],
      verification: "Occupancy 定义与限制因素依据 NVIDIA Best Practices 与 Nsight Compute 文档。",
    }),
    makeLesson({
      id: "w05-latency-hiding",
      title: "延迟隐藏：Warp 在等待时，调度器做什么",
      summary: "把内存等待、可发射 Warp 与实际 Stall 指标联系起来。",
      duration: "35 分钟",
      level: "进阶",
      objectives: ["解释延迟隐藏直觉", "区分 Active 与 Eligible Warp", "从 Stall 指标提出下一步假设"],
      explanation:
        "GPU 不会让一次高延迟内存访问本身消失，而是尝试在某个 Warp 等待时发射其他已就绪 Warp 的指令。要做到这一点，SM 上既要有足够活跃 Warp，也要有实际可发射的 Warp。如果所有 Warp 都在等待同一种依赖，仅提高理论 Occupancy 也可能无济于事。",
      example: `// 版本 A：每个线程立即使用刚加载的数据
float x = input[i];
output[i] = expensive(x);

// 版本 B：每线程有多个独立加载/计算机会
// 是否更快取决于寄存器、并行性和访存，必须实测。`,
      exampleNote:
        "不要把伪代码当作性能结论。用 Nsight Compute 查看 Scheduler Statistics 与 Warp State，确认主要 Stall 原因。",
      checkpoints: [
        "Active Warp 表示已驻留，不代表当前一定可发射。",
        "Eligible Warp 需要依赖已满足且资源允许发射。",
        "看到某个 Stall 比例高时，先理解指标定义和采样范围，再修改代码。",
      ],
      exercise: {
        prompt:
          "若报告显示高理论 Occupancy，但每周期 Eligible Warp 很少，你会优先检查哪些依赖？",
        hint: "从长延迟内存、数据依赖和同步着手。",
        answer:
          "优先检查长延迟内存访问、连续的数据依赖链、Block 屏障和访问不合并；再对照 Memory Workload 与 Warp State 指标验证。",
      },
      quiz: {
        question: "活跃 Warp 为什么不一定是可发射 Warp？",
        options: [
          "活跃 Warp 可能仍在等待数据或依赖",
          "活跃 Warp 没有线程",
          "只有 CPU 能发射指令",
          "可发射 Warp 必须来自不同 Kernel",
        ],
        answer: 0,
        explanation: "驻留只说明 Warp 在 SM 上，依赖满足后才可能成为 Eligible。",
      },
      references: profilerReferences,
      verification: "术语和分析入口依据 NVIDIA Nsight Compute User/Profiling Guide。",
    }),
    makeLesson({
      id: "w05-profiler-lab",
      title: "实验：分支、Block size 与每线程工作量",
      summary: "用控制变量实验把“可能原因”变成可复现证据。",
      duration: "80 分钟",
      level: "进阶",
      objectives: ["设计三组单变量实验", "记录正确性与性能", "写出不夸大指标的结论"],
      explanation:
        "本周实验不是寻找一组永远正确的 Block size，而是训练诊断方法。分别改变分支模式、Block size、每线程处理元素数；每组实验只改变一个主要因素，使用相同数据、参考结果、预热和重复次数，再用 Nsight Compute 解释观察到的变化。",
      example: `ncu --set full --kernel-name regex:experiment \
  ./warp_experiment --mode divergence --block 256 --items-per-thread 1`,
      language: "bash",
      exampleNote:
        "Nsight Compute 会引入采集开销，文档明确提醒 Profiler 下的时长不等同于独立运行时长。延迟使用单独的 CUDA Event Benchmark，Profiler 用于解释。",
      checkpoints: [
        "正确性测试先于性能采集。",
        "独立 Benchmark 和 Profiler 报告分开运行。",
        "报告至少写出输入 Shape、编译选项、GPU、CUDA/Nsight 版本和命令。",
      ],
      exercise: {
        prompt: "为三组实验写出假设、控制变量、观测指标和可能推翻假设的结果。",
        hint: "结论应允许“没有显著差异”。",
        answer:
          "合格答案需为分支模式、Block size、每线程工作量分别定义唯一主要自变量；固定输入/编译/计时；记录误差、median/p95、Occupancy、Warp State、分支或内存相关指标；并说明何种结果会否定原假设。",
      },
      quiz: {
        question: "为什么不能直接把 Nsight Compute 运行时间当最终延迟？",
        options: [
          "Profiler 不执行 Kernel",
          "采集与 Replay 会引入工具开销",
          "Nsight 只支持 CPU",
          "CUDA Event 不能计时",
        ],
        answer: 1,
        explanation: "官方 Profiling Guide 明确说明采集可能使用多次 Replay 并引入开销。",
      },
      references: profilerReferences,
      verification: "实验方法依据 Nsight Compute 官方采集说明；所有性能结论仅适用于记录的目标环境。",
    }),
  ],
};

const weekSix: TutorialModule = {
  week: 6,
  eyebrow: "GPU MEMORY · 人工精编",
  introduction:
    "沿着一次 Load/Store 的路径理解全局内存、缓存、共享内存、寄存器与 Local Memory，再完成可解释的矩阵转置优化。",
  lessons: [
    makeLesson({
      id: "w06-memory-spaces",
      title: "内存空间：先分清作用域、生命周期和管理者",
      summary: "用一张检查表区分寄存器、Local、Shared、Global 与 Constant。",
      duration: "35 分钟",
      objectives: ["区分常见内存空间", "解释 Local Memory 并不在片上", "按数据复用选择存储位置"],
      explanation:
        "CUDA Best Practices 将寄存器描述为线程私有、片上；Shared Memory 为线程块共享、片上；Global Memory 容量大、设备范围可见；Local Memory 虽名为 local，却是线程私有的设备内存地址空间，可能由过大的局部对象、动态索引数组或寄存器压力产生。选择内存空间要同时考虑作用域、生命周期、容量和访问模式。",
      example: `__global__ void spaces(const float* input, float* output) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  float x = input[i];              // 通常期望保存在寄存器
  __shared__ float tile[256];      // Block 内共享
  tile[threadIdx.x] = x;
  __syncthreads();
  output[i] = tile[threadIdx.x];
}`,
      exampleNote:
        "源代码变量并不能完全决定最终存储位置。使用 `nvcc --ptxas-options=-v` 与 Nsight Compute 检查寄存器、Local Memory 和 Shared Memory。",
      checkpoints: [
        "Local Memory 是线程私有的地址空间，但物理上不等同于低延迟片上存储。",
        "Shared Memory 需要显式协调数据写入与同步。",
        "寄存器使用过多会限制并发驻留，强行减少又可能导致 Spill。",
      ],
      exercise: {
        prompt: "给出三种适合使用 Shared Memory 的数据复用场景。",
        hint: "考虑同一 Block 多线程复用、重排和协作归约。",
        answer:
          "例如矩阵 Tile 被多个线程复用；转置时先连续加载再在片上重排；Block 内归约共享中间值。是否真正更快需比较同步和搬运成本。",
      },
      quiz: {
        question: "CUDA Local Memory 的正确理解是什么？",
        options: [
          "一定是片上低延迟内存",
          "线程私有的设备内存地址空间，可能承载 Spill",
          "所有线程块共享",
          "只存在于 Host",
        ],
        answer: 1,
        explanation: "Local 表示线程作用域，不代表物理位置一定片上。",
      },
      references: bestPracticesReferences,
      verification: "内存空间属性依据 NVIDIA CUDA Best Practices Guide。",
    }),
    makeLesson({
      id: "w06-coalescing",
      title: "合并访存：一个 Warp 需要多少内存事务",
      summary: "从连续 float 访问推导 32 字节事务，并理解“取了但没用”的带宽浪费。",
      duration: "40 分钟",
      level: "进阶",
      objectives: ["解释合并访存", "计算简单连续访问事务", "区分请求字节与实际传输字节"],
      explanation:
        "CUDA Best Practices 说明，在 Compute Capability 6.0 及更高设备上，Warp 的全局内存访问会合并为覆盖所需地址的尽量少的 32 字节事务。32 个线程各读取相邻的一个 4 字节 float，共请求 128 字节；对齐良好时可由四个 32 字节事务服务。若只使用事务中的少数字节，硬件仍要搬完整片段。",
      example: `int i = blockIdx.x * blockDim.x + threadIdx.x;

// 相邻线程读相邻 float
float good = input[i];

// 相邻线程跨 stride 个 float
float strided = input[(long long)i * stride];`,
      exampleNote:
        "事务规则依赖 Compute Capability 和访问宽度。本教程采用官方文档给出的 CC 6.0+、4 字节 word 示例；分析其他硬件时查对应章节。",
      checkpoints: [
        "合并关注一个 Warp 同一条内存指令访问的地址集合。",
        "地址对齐、元素宽度和跨步都会改变事务数量。",
        "缓存可能掩盖部分重复事务成本，但不能把缓存命中当成访问设计正确。",
      ],
      exercise: {
        prompt:
          "在 CC 6.0+ 的官方简化模型下，32 个线程读取对齐的连续 float，最少需要几个 32 字节事务？",
        hint: "总请求字节数是 32×4。",
        answer: "128 字节除以每事务 32 字节，最少 4 个事务；前提是地址覆盖与对齐符合示例条件。",
      },
      quiz: {
        question: "合并访存的目标是什么？",
        options: [
          "让一个 Warp 的请求由尽量少的内存事务服务",
          "让所有线程访问同一地址",
          "完全绕过缓存",
          "把 Global Memory 变为 Shared Memory",
        ],
        answer: 0,
        explanation: "官方指南把合并描述为将 Warp 访问组合成尽量少的事务。",
      },
      references: bestPracticesReferences,
      verification: "事务大小与连续访问示例依据 CUDA Best Practices 对 CC 6.0+ 的说明。",
    }),
    makeLesson({
      id: "w06-stride-misalignment",
      title: "错位与跨步访问：为什么有效带宽下降",
      summary: "分别观察地址整体偏移和线程间跨度造成的额外事务。",
      duration: "35 分钟",
      objectives: ["区分 misaligned 与 strided", "设计 offset/stride 实验", "用有效带宽解释浪费"],
      explanation:
        "Misaligned 表示访问序列整体没有落在理想的对齐边界；Strided 表示相邻线程访问地址之间存在较大跨度。两者都可能让一个 Warp 覆盖更多内存片段。最严重的跨步模式会在搬来一个事务后只使用其中一个很小部分，导致请求字节远小于实际传输字节。",
      example: `__global__ void offset_copy(
    const float* in, float* out, int n, int offset) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) out[i] = in[i + offset];
}

__global__ void stride_copy(
    const float* in, float* out, int n, int stride) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) out[i] = in[(long long)i * stride];
}`,
      exampleNote:
        "实验必须保证输入分配足够大。分别扫描 offset 与 stride，记录 CUDA Event 延迟和 Nsight Memory Workload，不要把越界当性能结果。",
      checkpoints: [
        "Offset 实验改变整体对齐；Stride 实验改变 Lane 间地址跨度。",
        "输出写入也可能成为瓶颈，应保证比较时输出模式一致。",
        "对齐分配不代表所有内部偏移访问仍然对齐。",
      ],
      exercise: {
        prompt: "设计 offset=0..31 与 stride=1,2,4,8,16 的实验，并说明需要固定什么。",
        hint: "固定有效输出元素数、Block size、预热与重复方式。",
        answer:
          "固定 n、输出连续写、Block/Grid、编译选项、GPU 和计时方法；保证每组输入容量足够；记录正确性、median/p95、有效带宽与内存事务相关指标。",
      },
      quiz: {
        question: "Stride 很大时有效带宽可能下降的直接原因是什么？",
        options: [
          "每个事务中大量字节没有被当前请求使用",
          "线程数自动变为 1",
          "Global Memory 容量变小",
          "浮点数变成整数",
        ],
        answer: 0,
        explanation: "跨步访问让 Warp 地址分散到更多片段，事务利用率下降。",
      },
      references: bestPracticesReferences,
      verification: "错位与跨步访问分类依据 CUDA Best Practices；实际影响由目标架构与缓存行为决定。",
    }),
    makeLesson({
      id: "w06-shared-transpose",
      title: "Shared Memory Tiled Transpose",
      summary: "把连续读取与连续写出拆成两个阶段，在片上完成重排。",
      duration: "50 分钟",
      level: "进阶",
      objectives: ["解释 Shared Memory 重排作用", "正确放置同步", "处理非整除矩阵"],
      explanation:
        "Tiled Transpose 先让线程以连续模式把输入 Tile 搬入 Shared Memory，再让线程交换行列角色，以连续模式写出。Shared Memory 不是因为“比 Global 快”就自动有效，而是它允许把一次不合并的全局访问重排为两次更规整的全局访问。",
      example: `template<int TILE>
__global__ void transpose_tiled(
    const float* in, float* out, int rows, int cols) {
  __shared__ float tile[TILE][TILE + 1];

  int x = blockIdx.x * TILE + threadIdx.x;
  int y = blockIdx.y * TILE + threadIdx.y;
  if (x < cols && y < rows)
    tile[threadIdx.y][threadIdx.x] = in[y * cols + x];

  __syncthreads();

  x = blockIdx.y * TILE + threadIdx.x;
  y = blockIdx.x * TILE + threadIdx.y;
  if (x < rows && y < cols)
    out[y * rows + x] = tile[threadIdx.x][threadIdx.y];
}`,
      exampleNote:
        "示例假设 Block 至少覆盖 TILE×TILE 线程；真实高性能实现常让每线程处理多元素。`TILE+1` 与 Bank Conflict 在下一节解释。",
      checkpoints: [
        "所有线程必须在读取 Shared Tile 前完成需要的写入并通过同步。",
        "输入边界使用 rows/cols，转置后的输出边界需交换含义。",
        "测试必须包含长方形矩阵和两个方向的非整除尺寸。",
      ],
      exercise: {
        prompt: "解释第二阶段为何交换 blockIdx.x 与 blockIdx.y 的作用。",
        hint: "输出 Tile 的行列来自输入 Tile 的列行。",
        answer:
          "输入 Block (bx,by) 负责的 Tile 转置后位于输出的 (by,bx)。第二阶段交换 Block 坐标，再由 threadIdx 组织连续输出。",
      },
      quiz: {
        question: "Shared Memory 在 Tiled Transpose 中最关键的作用是什么？",
        options: [
          "增加矩阵元素数量",
          "允许在线程块内重排数据，使两侧全局访问更规整",
          "取消所有同步",
          "自动选择 Tile 大小",
        ],
        answer: 1,
        explanation: "片上 Tile 是全局读取布局与全局写出布局之间的重排缓冲。",
      },
      references: bestPracticesReferences,
      verification: "Shared Memory 重排与矩阵示例依据 NVIDIA CUDA Best Practices Guide。",
    }),
    makeLesson({
      id: "w06-bank-conflict",
      title: "Bank Conflict：为什么 Tile 常多加一列",
      summary: "从 Shared Memory Bank 映射解释 `[TILE][TILE+1]`。",
      duration: "40 分钟",
      level: "进阶",
      objectives: ["说明 Shared Memory Bank", "解释列访问冲突", "知道广播例外"],
      explanation:
        "CUDA Best Practices 说明，Shared Memory 被划分为可并行访问的 Bank；在 CC 5.x 及更新设备的文档模型中，连续 32 位字映射到连续 Bank。若 32×32 的 float Tile 按列访问，地址每次跨 32 个 32 位字，可能让 Warp 的不同线程落到同一 Bank 的不同地址，访问被拆分。把行宽改为 33 会让下一行起点错开一个 Bank。",
      example: `__shared__ float conflict[32][32];
__shared__ float padded[32][33];

// 同一个 Warp 按列读时：
float a = conflict[threadIdx.x][fixed_col];
float b = padded[threadIdx.x][fixed_col];`,
      exampleNote:
        "多加一列不是普适魔法。元素宽度、访问方式和架构都会影响 Bank 映射；应使用 Shared Memory 表和 Bank Conflict 指标验证。",
      checkpoints: [
        "多个线程读同一 Shared 地址可走广播，不按普通冲突理解。",
        "Padding 会增加 Shared Memory 占用，可能影响 Occupancy。",
        "先确认发生冲突，再使用 Padding；不要机械套用 `+1`。",
      ],
      exercise: {
        prompt: "用“行宽 32”解释为什么按列访问容易让线程落到相同 Bank。",
        hint: "连续行同一列的地址相差 32 个 float。",
        answer:
          "在官方给出的 32 Bank、连续 32 位字轮转映射模型中，地址增加 32 个 float 后 Bank 编号回到原处，因此一个 Warp 按列访问不同地址可能集中到同一 Bank。",
      },
      quiz: {
        question: "`tile[32][33]` 相比 `tile[32][32]` 的主要目的是什么？",
        options: [
          "保存更多有效矩阵列",
          "改变列访问的 Bank 映射",
          "让 Warp 变成 33 线程",
          "取消 Global Memory",
        ],
        answer: 1,
        explanation: "Padding 改变相邻行起点，使按列访问不再总落到同一 Bank。",
      },
      references: bestPracticesReferences,
      verification: "Bank 结构、广播例外与 Padding 示例依据当前 NVIDIA CUDA Best Practices Guide。",
    }),
    makeLesson({
      id: "w06-register-spill",
      title: "寄存器压力与 Spill：Local Memory 从哪里来",
      summary: "识别高寄存器用量、占用率下降和 Spill 之间的权衡。",
      duration: "35 分钟",
      level: "进阶",
      objectives: ["查看每线程寄存器数", "解释 Spill 到 Local Memory", "避免用单一 Occupancy 指标优化"],
      explanation:
        "每个 SM 的寄存器总量有限。Kernel 每线程使用的寄存器越多，一个 SM 能同时驻留的线程/Block 可能越少；若编译器无法把所需值都保存在寄存器中，部分值会放入 Local Memory。Local Memory 访问经过设备内存层次，可能明显增加延迟和流量。",
      example: `nvcc -O3 --ptxas-options=-v kernel.cu -o kernel

# Nsight Compute 中同时查看：
# Launch Statistics / Occupancy
# Memory Workload Analysis / Local Memory`,
      language: "bash",
      exampleNote:
        "编译器报告和 Profiler 各自提供不同证据。不要仅看到寄存器多就强制限制；限制寄存器可能引入更多 Spill。",
      checkpoints: [
        "大局部数组或动态索引也可能使用 Local Memory。",
        "寄存器更少不一定更快，必须同时观察指令、Spill 和延迟。",
        "Profiler 下时长受采集影响，最终延迟单独测量。",
      ],
      exercise: {
        prompt:
          "比较默认编译与 `--maxrregcount` 限制版本，列出必须同时记录的指标。",
        hint: "寄存器、Local Memory、Occupancy、延迟和正确性。",
        answer:
          "至少记录寄存器/线程、Local Load/Store 或 Spill、理论/实测 Occupancy、独立 Benchmark 延迟、指令或 Stall 变化以及正确性误差。",
      },
      quiz: {
        question: "强制降低寄存器上限可能带来什么副作用？",
        options: [
          "产生更多 Local Memory Spill",
          "自动增加显存容量",
          "消除所有依赖",
          "让 Kernel 在 CPU 执行",
        ],
        answer: 0,
        explanation: "无法留在寄存器的值可能溢出到 Local Memory。",
      },
      references: [...bestPracticesReferences, ...profilerReferences],
      verification: "寄存器与 Local Memory 关系依据 CUDA Best Practices；具体编译结果由 nvcc 报告与 Nsight 验证。",
    }),
    makeLesson({
      id: "w06-transpose-report",
      title: "阶段实践：四版矩阵转置与证据链",
      summary: "从 Naive 到合并访问、Shared Tile 和 Padding，逐步证明每次变化。",
      duration: "90 分钟",
      level: "进阶",
      objectives: ["实现四版转置", "计算有效带宽", "用 Nsight 解释改进"],
      explanation:
        "四版转置应形成连续证据：Naive 提供正确基线；第二版改善全局访问；第三版使用 Shared Memory 重排；第四版用 Padding 处理 Bank Conflict。每一版都先保持数学语义一致，再测相同 Shape，不能同时改 Tile、向量化和数据类型后把所有收益归给一个原因。",
      example: `effective_GBps =
    ((bytes_read + bytes_written) / 1e9) / seconds

# 对 FP32 transpose：
# bytes_read  = rows * cols * 4
# bytes_written = rows * cols * 4`,
      language: "text",
      exampleNote:
        "有效带宽公式来自 CUDA Best Practices。统一使用 10^9 或 2^30，并在报告中注明 GB/s 或 GiB/s 口径。",
      checkpoints: [
        "Shape 至少包含方阵、长方形和非 Tile 整除矩阵。",
        "每版先通过 CPU/PyTorch Reference，再进行性能测试。",
        "报告同时放 CUDA Event 延迟和 Nsight 的内存/Shared 指标。",
      ],
      exercise: {
        prompt: "设计转置报告目录，并为每一版写出要验证的唯一假设。",
        hint: "分别对应基线、全局访问、Shared 重排、Bank Padding。",
        answer:
          "报告应包含环境、正确性、Shape 表、实现差异、独立 Benchmark、Profiler 证据和结论。每一步只声明与该改动对应的假设，并允许实测未提升。",
      },
      quiz: {
        question: "为什么优化日志应一次只改变一个主要因素？",
        options: [
          "CUDA 只允许一个优化",
          "便于把性能变化归因到具体改动",
          "减少代码行数",
          "避免使用 Profiler",
        ],
        answer: 1,
        explanation: "控制变量让性能证据能够支持或推翻明确假设。",
      },
      references: [...bestPracticesReferences, ...profilerReferences],
      verification: "有效带宽与内存分析方法依据 NVIDIA 官方指南；所有性能结果限定在报告环境。",
    }),
  ],
};

const weekSeven: TutorialModule = {
  week: 7,
  eyebrow: "PERFORMANCE METHOD · 人工精编",
  introduction:
    "建立统一 Benchmark、有效带宽、算术强度、Occupancy 与 Nsight 证据之间的工作流。",
  lessons: [
    makeLesson({
      id: "w07-cuda-event",
      title: "CUDA Event 计时：测到的是哪一段",
      summary: "正确放置 Event、预热和同步，避免用 Host 返回时间测异步 Kernel。",
      duration: "35 分钟",
      objectives: ["写出 Event 计时闭环", "解释异步调用的 Host 计时陷阱", "区分预热与正式重复"],
      explanation:
        "很多 CUDA API 和 Kernel launch 对 Host 是异步的，Host 函数返回不代表 Device 工作完成。CUDA Best Practices 给出的 Event 方法把时间戳记录进 Stream，停止 Event 到达后同步，再计算两个 Event 之间的设备时间。",
      example: `cudaEvent_t start, stop;
cudaEventCreate(&start);
cudaEventCreate(&stop);

cudaEventRecord(start, stream);
for (int i = 0; i < repeat; ++i)
  kernel<<<grid, block, 0, stream>>>(...);
cudaEventRecord(stop, stream);
cudaEventSynchronize(stop);

float ms = 0.0f;
cudaEventElapsedTime(&ms, start, stop);
printf("avg ms: %f\\n", ms / repeat);`,
      exampleNote:
        "正式计时前先用相同 Shape 预热，并在计时区外完成分配和不希望计入的数据传输。Event 必须记录在与被测工作具有正确顺序关系的 Stream。",
      checkpoints: [
        "Event 创建/销毁不放入每次 Kernel 的计时区。",
        "异步错误仍需检查 launch 和同步结果。",
        "Profiler 采集时长不替代独立 Event Benchmark。",
      ],
      exercise: {
        prompt: "列出一个可靠 Kernel Benchmark 的执行顺序。",
        hint: "准备、正确性、预热、Event 重复、统计。",
        answer:
          "准备输入与 Reference；运行并检查正确性；预热若干次；记录 start；重复 launch；记录并同步 stop；计算单次时间；多轮收集 median/p95；保存环境与参数。",
      },
      quiz: {
        question: "为什么只用 CPU 计时包住 Kernel launch 常会得到错误结论？",
        options: [
          "CPU 没有时钟",
          "Kernel launch 通常异步返回",
          "CUDA Event 只能测内存",
          "GPU 不执行 Kernel",
        ],
        answer: 1,
        explanation: "Host 可能只测到提交开销，没有等待设备完成。",
      },
      references: bestPracticesReferences,
      verification: "Event 计时流程依据 CUDA Best Practices Guide Performance Metrics。",
    }),
    makeLesson({
      id: "w07-effective-bandwidth",
      title: "理论带宽与有效带宽",
      summary: "用实际读写字节和时间计算有效带宽，并保持单位一致。",
      duration: "35 分钟",
      objectives: ["写出有效带宽公式", "区分理论峰值与有效值", "避免 GB/GiB 混用"],
      explanation:
        "NVIDIA 将有效带宽写为 `(Br + Bw) / time`，其中 Br、Bw 是算法需要读取和写出的字节数。理论带宽来自硬件规格；有效带宽来自具体 Kernel 的有用数据量。两者差距可能来自访问不合并、额外流量、缓存、指令瓶颈或未充分利用，不应只凭差距给出唯一原因。",
      example: `double bytes = 2.0 * rows * cols * sizeof(float); // copy: read + write
double seconds = milliseconds / 1000.0;
double gbps = (bytes / 1e9) / seconds;`,
      exampleNote:
        "若选择 1024^3，单位写 GiB/s，并对理论值采用同一口径。",
      checkpoints: [
        "Br/Bw 是模型定义的有用字节，不一定等于硬件实际事务。",
        "只报告峰值的一次结果容易受噪声影响，应使用稳定统计。",
        "有效带宽接近理论值也不代表整个应用端到端最优。",
      ],
      exercise: {
        prompt: "4096×4096 FP32 copy 用时 0.2 ms，按 GB/s 计算有效带宽。",
        hint: "读写各一遍，共 2×4096²×4 字节。",
        answer: "字节数约 134,217,728；时间 0.0002 秒；有效带宽约 671.1 GB/s（10^9 口径）。",
      },
      quiz: {
        question: "有效带宽公式中的 Br+Bw 表示什么？",
        options: [
          "Block 与 Warp 数",
          "有用读取与写出字节数",
          "寄存器与 Shared 容量",
          "编译时间",
        ],
        answer: 1,
        explanation: "官方公式按被测计算的读写字节总量除以时间。",
      },
      references: bestPracticesReferences,
      verification: "公式依据 NVIDIA CUDA Best Practices Guide；示例按十进制 GB/s 计算。",
    }),
    makeLesson({
      id: "w07-roofline",
      title: "Roofline：把算术强度放到硬件上界中",
      summary: "理解斜线带宽上界和水平算力上界，不把图当成自动诊断。",
      duration: "40 分钟",
      level: "进阶",
      objectives: ["解释 Roofline 两个上界", "定位理论转折点", "知道 Nsight 图仍需结合其他指标"],
      explanation:
        "Roofline 把横轴设为算术强度，纵轴设为计算吞吐。低算术强度区域的上界随强度按内存带宽增长；达到硬件计算峰值后形成水平上界。Kernel 落在图中只能说明相对上界和潜在方向，不能单独解释是访问不合并、依赖还是指令混合造成距离。",
      example: `ridge_point = peak_flops_per_second / peak_bytes_per_second

# arithmetic_intensity < ridge_point:
#   理论上更容易受带宽上界约束
# arithmetic_intensity > ridge_point:
#   理论上更容易接近计算上界`,
      language: "python",
      exampleNote:
        "峰值必须对应相同数据类型和硬件模式；Tensor Core、FP32、FP64 的峰值不同。",
      checkpoints: [
        "算术强度分母要说明采用理论字节还是 Profiler 推导字节。",
        "峰值规格需要对应当前 GPU 和数据类型。",
        "Roofline 是上界模型，代码优化仍需查看具体内存和调度指标。",
      ],
      exercise: {
        prompt:
          "某 GPU 对目标精度峰值 60 TFLOP/s、带宽 1.5 TB/s，计算转折点。",
        hint: "统一单位后相除。",
        answer: "转折点约 40 FLOPs/byte；低于该值更容易落在带宽斜线上，高于该值才有机会接近计算上界。",
      },
      quiz: {
        question: "Roofline 水平部分表示什么上界？",
        options: ["内存容量", "计算吞吐峰值", "线程数量", "PCIe 延迟"],
        answer: 1,
        explanation: "水平线表示目标精度下的理论计算吞吐上界。",
      },
      references: profilerReferences,
      verification: "Roofline 使用方式依据 NVIDIA Nsight Compute 文档；峰值参数必须取自目标硬件资料。",
    }),
    makeLesson({
      id: "w07-resource-limits",
      title: "寄存器、Shared Memory 与执行配置",
      summary: "把资源限制转成可记录的 Launch 配置，而不是猜 Block size。",
      duration: "35 分钟",
      level: "进阶",
      objectives: ["列出每 Block 资源", "解释资源如何限制并发", "使用 Occupancy API/Calculator"],
      explanation:
        "每个 SM 的寄存器、Shared Memory、线程和 Block 数都有上限。Kernel 的每线程寄存器乘线程数、每 Block Shared Memory 和 Block size 共同决定最多能驻留多少 Block。CUDA 提供 Occupancy API，Nsight Compute 也有 Occupancy Calculator；它们是配置模型，不替代实际性能测量。",
      example: `int active_blocks = 0;
cudaOccupancyMaxActiveBlocksPerMultiprocessor(
    &active_blocks, kernel, block_size, dynamic_smem);

int active_warps = active_blocks * block_size / 32;`,
      exampleNote:
        "若 block_size 不是 32 的倍数，简单整数公式需要按实际 Warp 向上取整。报告应直接使用工具给出的 Occupancy 结果。",
      checkpoints: [
        "动态 Shared Memory 字节数必须传给 Occupancy API。",
        "编译器寄存器分配存在粒度，简单手算只能做初步估算。",
        "提高 Occupancy 若伴随 Spill，性能可能下降。",
      ],
      exercise: {
        prompt: "比较两个配置时，除了 Block size，还应记录哪三个资源字段？",
        hint: "寄存器、Shared、驻留。",
        answer: "至少记录寄存器/线程、静态+动态 Shared Memory/Block、活动 Block/Warp 或理论 Occupancy。",
      },
      quiz: {
        question: "动态 Shared Memory 增加后，哪项可能下降？",
        options: ["每个 SM 可同时驻留的 Block 数", "数组元素值", "Warp 大小", "GPU 显存总容量"],
        answer: 0,
        explanation: "每个 Block 占用更多 Shared Memory，会收紧 SM 资源约束。",
      },
      references: [...bestPracticesReferences, ...profilerReferences],
      verification: "资源限制与 Occupancy 工具依据 NVIDIA CUDA Best Practices 与 Nsight Compute。",
    }),
    makeLesson({
      id: "w07-benchmark-harness",
      title: "统一 Benchmark：让数字可比较",
      summary: "固定输入、预热、重复、误差和环境记录，输出 median 与 p95。",
      duration: "55 分钟",
      objectives: ["设计统一命令行", "计算稳健统计", "把正确性和性能写入同一记录"],
      explanation:
        "一次最快时间不能代表 Kernel 性能。统一 Benchmark 应接受 Kernel、Shape、dtype、预热和重复次数；先验证结果，再执行多轮计时，输出 median、p95、有效带宽或吞吐，同时记录 GPU、CUDA、驱动和编译选项。",
      example: `./benchmark \
  --kernel transpose \
  --rows 4096 --cols 4096 \
  --warmup 20 --repeat 100

# 输出建议：
# max_error, median_ms, p95_ms
# effective_GBps, gpu, cuda, build_flags`,
      language: "bash",
      exampleNote:
        "p95 需要先定义排序与分位数算法；团队内部保持同一实现即可。GPU 时钟、温度和其他进程仍可能影响结果。",
      checkpoints: [
        "输入数据与随机种子可复现。",
        "Reference 与误差阈值针对 dtype 设定并记录。",
        "不把内存分配或 H2D/D2H 混入 Kernel-only 指标，除非明确测端到端。",
      ],
      exercise: {
        prompt: "为 Vector Add 定义一条完整 Benchmark 输出记录。",
        hint: "包括环境、Shape、正确性、延迟、字节模型。",
        answer:
          "答案应包含 n/dtype、GPU/驱动/CUDA、Block/Grid、编译选项、atol/rtol/max_error、预热/重复、median/p95、读写字节模型与有效带宽。",
      },
      quiz: {
        question: "为什么先做正确性再做性能？",
        options: [
          "错误结果也可能看起来非常快",
          "正确性会自动提高 Occupancy",
          "Profiler 不支持错误检查",
          "CUDA Event 会修改输出",
        ],
        answer: 0,
        explanation: "不正确或少做工作的 Kernel 的性能数字没有比较意义。",
      },
      references: bestPracticesReferences,
      verification: "计时和有效带宽方法依据 CUDA Best Practices；统计口径由项目固定并记录。",
    }),
    makeLesson({
      id: "w07-nsight-evidence",
      title: "Nsight Compute：从症状到证据",
      summary: "按 Compute、Memory、Scheduler、Occupancy 四类信息缩小瓶颈范围。",
      duration: "50 分钟",
      level: "进阶",
      objectives: ["找到 Memory Workload", "阅读 Occupancy 与 Warp State", "避免只抄单个指标"],
      explanation:
        "Nsight Compute 的 Memory Workload Analysis 展示缓存、内存请求和数据传输；Occupancy 展示资源限制；Scheduler Statistics 与 Warp State 帮助理解是否有足够可发射 Warp；Roofline 提供上界视角。诊断时从性能症状提出假设，再用多个相关指标交叉验证。",
      example: `ncu --set full --kernel-name regex:my_kernel ./benchmark ...

# 也可按需采集具体 Section，减少不必要的 Replay。
# 指标名称会随 Nsight 版本变化，报告应保存原始 .ncu-rep。`,
      language: "bash",
      exampleNote:
        "官方文档明确说明某些 Section 需要多次 Replay。保存 Nsight 版本和原始报告，避免只截一张没有上下文的图。",
      checkpoints: [
        "Mem Busy 高、Max Bandwidth 高、Mem Pipes Busy 高含义不同。",
        "理论与实测 Occupancy 差距大可能提示负载不均，但仍需结合其他指标。",
        "不同指标组可能来自不同 Replay，不应想当然地做逐周期相关。",
      ],
      exercise: {
        prompt: "为低有效带宽列出三条可被 Nsight 验证的不同假设。",
        hint: "访问不合并、未充分并发、指令/依赖限制。",
        answer:
          "例如：地址分散导致更多内存事务；Eligible Warp 少无法隐藏延迟；内存指令发射或数据依赖成为瓶颈。分别使用 Memory Workload、Scheduler/Warp State 和 Source/Instruction 指标验证。",
      },
      quiz: {
        question: "Nsight Compute Memory Chart 主要帮助观察什么？",
        options: [
          "源代码版权",
          "内存层次的数据传输、命中和请求",
          "CPU 文件系统",
          "Python 包版本",
        ],
        answer: 1,
        explanation: "官方 Profiling Guide 将 Memory Chart 用于展示内存单元与数据传输行为。",
      },
      references: profilerReferences,
      verification: "工具能力与注意事项依据 NVIDIA Nsight Compute User/Profiling Guide。",
    }),
    makeLesson({
      id: "w07-three-kernels",
      title: "阶段实践：Vector Add、Transpose、SiLU 的瓶颈判断",
      summary: "用同一套模型和工具比较三个不同工作负载。",
      duration: "90 分钟",
      level: "进阶",
      objectives: ["建立三算子字节/FLOPs 模型", "独立测量与采集", "写出有边界的优化建议"],
      explanation:
        "Vector Add 和 SiLU 都是逐元素算子，但 SiLU 的数学操作更复杂；Transpose 的数学计算少，却高度依赖访问模式。不要事先写死它们一定属于某类瓶颈。先建 FLOPs/Bytes 模型，再用有效带宽、Roofline、Memory 和 Scheduler 指标判断目标实现。",
      example: `# 报告表
kernel, shape, dtype, block, median_ms, p95_ms,
modeled_bytes, modeled_ops, effective_GBps,
roofline_position, main_metrics, conclusion`,
      language: "text",
      exampleNote:
        "同一个算子在不同 Shape、dtype、硬件和实现版本上可能表现不同。结论要限定条件。",
      checkpoints: [
        "三个算子使用同一 Benchmark 框架和报告单位。",
        "Transpose 至少比较 Naive 与 Tiled 版本。",
        "每条优化建议都引用一个模型推导和一个测量证据。",
      ],
      exercise: {
        prompt: "为“SiLU 是否值得融合”写出判断所需的四类证据。",
        hint: "中间流量、端到端调用、正确性、实测。",
        answer:
          "需要未融合中间 Tensor 的读写字节模型、融合前后 Kernel/端到端延迟、数值误差与支持 Shape、以及 Profiler 对带宽/计算利用率的对比。",
      },
      quiz: {
        question: "为什么不能只凭算子名称判断瓶颈？",
        options: [
          "名称会改变 dtype",
          "Shape、实现、硬件和数据类型都会改变实际行为",
          "所有算子瓶颈相同",
          "Profiler 不显示 Kernel 名",
        ],
        answer: 1,
        explanation: "性能结论必须限定具体实现和运行环境。",
      },
      references: [...bestPracticesReferences, ...profilerReferences],
      verification: "分析框架依据 NVIDIA 官方性能与 Profiler 指南；结论来自用户目标环境实测。",
    }),
  ],
};

const weekEight: TutorialModule = {
  week: 8,
  eyebrow: "STREAMS & ASYNC · 人工精编",
  introduction:
    "把 Stream 当作有序工作队列，使用 Event 表达依赖，再验证传输与计算是否真的重叠。",
  lessons: [
    makeLesson({
      id: "w08-stream-order",
      title: "Stream：一条有序队列，不是一条 CPU 线程",
      summary: "理解同一 Stream 内顺序和不同 Stream 间的并发机会。",
      duration: "35 分钟",
      objectives: ["定义 Stream 顺序", "区分异步提交与实际并发", "创建和销毁 Stream"],
      explanation:
        "CUDA Programming Guide 把 Stream 描述为操作的有序队列：同一 Stream 中的拷贝和 Kernel 按入队顺序执行。多个 Stream 让 Runtime 有机会在资源允许时选择不同任务，但异步 API 返回和实际并发是两回事；并发能力还受硬件、依赖和资源限制。",
      example: `cudaStream_t stream;
cudaStreamCreate(&stream);

cudaMemcpyAsync(d_x, h_x, bytes, cudaMemcpyHostToDevice, stream);
kernel<<<grid, block, 0, stream>>>(d_x, n);
cudaMemcpyAsync(h_x, d_x, bytes, cudaMemcpyDeviceToHost, stream);

cudaStreamSynchronize(stream);
cudaStreamDestroy(stream);`,
      exampleNote:
        "同一 Stream 内三步保持顺序，因此 Kernel 会在 H2D 后执行，D2H 会在 Kernel 后执行。Host 线程在显式同步前可以继续做其他工作。",
      checkpoints: [
        "异步函数返回不代表操作已经开始或完成。",
        "同一 Stream 顺序由运行时保证，无需为每一步插入设备级同步。",
        "销毁仍有工作的 Stream 可能等待其工作完成，生命周期要设计清楚。",
      ],
      exercise: {
        prompt: "解释为什么上例不需要在 H2D 和 Kernel 之间调用 cudaDeviceSynchronize。",
        hint: "它们进入同一 Stream。",
        answer: "同一 Stream 的操作按入队顺序执行，Kernel 只有在此前 H2D 到达相应顺序后才执行。",
      },
      quiz: {
        question: "多个 Stream 的正确理解是什么？",
        options: [
          "保证所有任务一定并发",
          "提供表达潜在并发和独立顺序的机制",
          "每个 Stream 对应一个 SM",
          "每个 Stream 对应一个 CPU Core",
        ],
        answer: 1,
        explanation: "实际并发取决于硬件资源和依赖，Stream 只表达机会与顺序。",
      },
      references: asyncReferences,
      verification: "Stream 顺序与异步语义依据当前 CUDA Programming Guide。",
    }),
    makeLesson({
      id: "w08-pinned-memory",
      title: "异步传输与 Pinned Host Memory",
      summary: "理解为什么普通分页 Host 内存不一定支持真正的异步重叠。",
      duration: "40 分钟",
      level: "进阶",
      objectives: ["分配 Pinned Memory", "说明其与异步传输的关系", "控制锁页内存用量"],
      explanation:
        "CUDA Best Practices 建议用于 GPU 异步传输的 Host Buffer 使用 page-locked（Pinned）内存，例如 `cudaMallocHost`。普通分页内存可能需要额外的内部暂存步骤，无法直接提供相同的异步传输条件。Pinned Memory 是有限系统资源，过量使用会影响操作系统，应按流水线 Buffer 需要控制。",
      example: `float* h = nullptr;
float* d = nullptr;
cudaMallocHost(&h, bytes);
cudaMalloc(&d, bytes);

cudaMemcpyAsync(d, h, bytes, cudaMemcpyHostToDevice, stream);

cudaFree(d);
cudaFreeHost(h);`,
      exampleNote:
        "释放前必须保证使用该 Buffer 的异步操作完成。示例省略错误检查仅为突出 API，项目代码必须检查返回值。",
      checkpoints: [
        "Pinned Memory 不是 GPU 显存。",
        "Pinned 并不自动保证与 Kernel 重叠，还需要不同 Stream、硬件能力和无依赖窗口。",
        "Buffer 生命周期必须覆盖所有异步使用。",
      ],
      exercise: {
        prompt: "设计 pageable 与 pinned H2D 传输对比，说明必须固定哪些变量。",
        hint: "字节数、重复、Stream、同步点、数据内容和环境。",
        answer:
          "固定传输大小、方向、Stream、预热、重复和同步方法；分别使用 pageable/pinned 分配；记录延迟和带宽，并注明 GPU、PCIe/NVLink 路径与 CUDA 版本。",
      },
      quiz: {
        question: "Pinned Host Memory 的主要特点是什么？",
        options: [
          "它位于 GPU 寄存器",
          "其页面被锁定，可用于 CUDA 的异步传输路径",
          "容量无限",
          "不需要释放",
        ],
        answer: 1,
        explanation: "page-locked Host Memory 是异步 Host↔Device 传输的重要条件。",
      },
      references: asyncReferences,
      verification: "Pinned Memory 建议依据 NVIDIA CUDA Programming/Best Practices Guide。",
    }),
    makeLesson({
      id: "w08-events",
      title: "Event：计时，也是跨 Stream 依赖",
      summary: "用 Event 表达“等某一步完成”，避免扩大到整个 Device 同步。",
      duration: "35 分钟",
      objectives: ["记录和等待 Event", "建立跨 Stream 依赖", "区分 Event 与 Device 同步"],
      explanation:
        "Event 会被记录进某条 Stream；当该 Stream 执行到 Event 时，它才算完成。另一条 Stream 可以通过 `cudaStreamWaitEvent` 等待这个 Event，从而只建立必要依赖，不必让 Host 调用 `cudaDeviceSynchronize` 等待整个设备。",
      example: `cudaEvent_t ready;
cudaEventCreate(&ready);

producer<<<grid, block, 0, stream_a>>>(data);
cudaEventRecord(ready, stream_a);

cudaStreamWaitEvent(stream_b, ready);
consumer<<<grid, block, 0, stream_b>>>(data);

cudaEventDestroy(ready);`,
      exampleNote:
        "Event 与 Stream 的生命周期要覆盖使用期。错误检查和最终输出可见性仍需在合适边界同步。",
      checkpoints: [
        "Event 在 Host 调用 record 时并未立即完成。",
        "WaitEvent 只把依赖插入目标 Stream，不必阻塞 Host。",
        "过度使用设备级同步会消除原本可并发的窗口。",
      ],
      exercise: {
        prompt: "画出两个 Stream 的时间线：A 生产数据，B 等待后消费，Host 何时可继续？",
        hint: "Host 在提交异步操作后即可继续，最终需要结果时再同步。",
        answer:
          "A: producer→record event；B: wait event→consumer。Host 依次提交这些操作后可继续其他工作，只有读取最终 Host 结果或释放相关资源前需要合适同步。",
      },
      quiz: {
        question: "cudaStreamWaitEvent 的主要作用是什么？",
        options: [
          "让整个 GPU 永久停止",
          "在目标 Stream 中建立对 Event 的依赖",
          "修改线程索引",
          "分配显存",
        ],
        answer: 1,
        explanation: "它表达 Stream 间的局部依赖，不需要全设备同步。",
      },
      references: asyncReferences,
      verification: "Event 与 Stream 同步语义依据 CUDA Programming Guide Asynchronous Execution。",
    }),
    makeLesson({
      id: "w08-overlap-pipeline",
      title: "分块流水线：H2D、Kernel、D2H 如何尝试重叠",
      summary: "用双 Buffer 和多 Stream 构造流水线，并用时间线验证。",
      duration: "50 分钟",
      level: "进阶",
      objectives: ["拆分 Chunk", "设计双 Buffer 生命周期", "使用 Nsight Systems/时间线验证重叠"],
      explanation:
        "把大输入拆成 Chunk 后，可以让 Stream 0 处理 Chunk 0 的 Kernel，同时 Stream 1 传输 Chunk 1。常见实现为每个 Stream 准备独立的 Pinned Host Buffer 和 Device Buffer，避免数据竞争。是否真正重叠取决于设备复制引擎、资源余量和依赖，必须查看时间线。",
      example: `for (int chunk = 0; chunk < chunks; ++chunk) {
  int s = chunk % 2;
  cudaStreamSynchronize(stream[s]); // 复用该组 Buffer 前确认完成

  cudaMemcpyAsync(d[s], h[s], bytes[s],
                  cudaMemcpyHostToDevice, stream[s]);
  kernel<<<grid[s], block, 0, stream[s]>>>(d[s], count[s]);
  cudaMemcpyAsync(h[s], d[s], bytes[s],
                  cudaMemcpyDeviceToHost, stream[s]);
}`,
      exampleNote:
        "这只是双 Buffer 骨架。生产代码应避免循环中不必要的同步，可用 Event 管理复用；尾部 Chunk 大小与 Grid 要单独计算。",
      checkpoints: [
        "不同 Stream 不能同时写同一 Buffer，除非有明确依赖。",
        "Chunk 太小会让提交开销占比升高，太大又减少流水阶段。",
        "端到端吞吐改善比“时间线上出现重叠颜色”更重要。",
      ],
      exercise: {
        prompt: "列出验证流水线有效的三类证据。",
        hint: "正确性、时间线、端到端。",
        answer:
          "所有 Chunk 结果与 Reference 一致；时间线显示预期传输/Kernel 存在重叠且依赖正确；端到端吞吐相对串行基线改善，并记录环境与 Chunk 大小。",
      },
      quiz: {
        question: "双 Buffer 的主要目的是什么？",
        options: [
          "把 Warp 变成 64 线程",
          "避免当前阶段与下一阶段争用同一存储",
          "取消所有内存传输",
          "让 Host Memory 变成 Shared Memory",
        ],
        answer: 1,
        explanation: "两组 Buffer 允许一个 Chunk 被计算时，另一组服务其他流水阶段。",
      },
      references: asyncReferences,
      verification: "异步并发条件依据 CUDA Programming Guide；重叠效果必须由目标设备时间线和端到端测量确认。",
    }),
    makeLesson({
      id: "w08-default-stream",
      title: "默认 Stream：隐藏同步从哪里来",
      summary: "理解 Legacy Default Stream 与 Blocking/Non-blocking Stream 的交互。",
      duration: "35 分钟",
      level: "进阶",
      objectives: ["识别默认 Stream 操作", "说明 Legacy 同步语义", "创建 Non-blocking Stream"],
      explanation:
        "未显式指定 Stream 的 Kernel 和部分操作进入默认 Stream。CUDA Programming Guide 说明 Legacy Default Stream 会与其他 Blocking Stream 产生特定同步关系，可能把看似独立的工作串行化。可以使用 per-thread default stream 模式或 `cudaStreamNonBlocking`，但必须明确项目采用的语义。",
      example: `cudaStream_t s;
cudaStreamCreateWithFlags(&s, cudaStreamNonBlocking);

kernel_a<<<grid, block, 0, s>>>(...);
kernel_b<<<grid, block>>>(...); // 默认 Stream

cudaDeviceSynchronize();
cudaStreamDestroy(s);`,
      exampleNote:
        "这段代码用于观察 Stream 语义，不预设两个 Kernel 一定并发。实际行为还受资源和默认 Stream 配置影响。",
      checkpoints: [
        "Blocking/Non-blocking 名称主要描述其与 Legacy Default Stream 的同步关系。",
        "项目编译选项可选择 per-thread default stream，团队必须保持一致。",
        "排查意外串行时，检查是否混入了默认 Stream 操作或同步 API。",
      ],
      exercise: {
        prompt: "设计一个实验，用时间线比较 Legacy Default Stream 与 Non-blocking Stream。",
        hint: "保持 Kernel 相同，只改变 Stream 创建/默认操作。",
        answer:
          "准备两个可独立运行的 Kernel；分别用 Blocking Stream+默认 Stream、Non-blocking Stream+默认 Stream；保持输入和资源一致，用时间线观察顺序，并用端到端 Event 计时。",
      },
      quiz: {
        question: "Legacy Default Stream 可能造成什么现象？",
        options: [
          "与 Blocking Stream 发生隐式同步",
          "自动提高显存容量",
          "所有 Kernel 变为 CPU 函数",
          "Warp size 改变",
        ],
        answer: 0,
        explanation: "官方文档说明 Legacy Default Stream 与 Blocking Stream 存在同步语义。",
      },
      references: asyncReferences,
      verification: "默认 Stream、Blocking 与 Non-blocking 语义依据当前 CUDA Programming Guide。",
    }),
    makeLesson({
      id: "w08-stage-project",
      title: "阶段项目：异步算子流水线与验收报告",
      summary: "把正确性、并发时间线和端到端收益整理成可复现项目。",
      duration: "100 分钟",
      level: "进阶",
      objectives: ["实现串行与流水线基线", "验证跨 Stream 依赖", "提交完整性能证据"],
      explanation:
        "阶段项目选择一个已有逐元素或转置 Kernel，建立串行版本和分块多 Stream 版本。目标不是必须得到某个固定加速比，而是证明依赖正确、Buffer 无竞争，并解释在目标硬件和数据规模上为何重叠有效或无效。",
      example: `project/
├── src/
│   ├── serial.cu
│   └── pipeline.cu
├── tests/
├── benchmark/
├── reports/
│   ├── timeline.png
│   └── analysis.md
└── CMakeLists.txt`,
      language: "text",
      exampleNote:
        "报告必须保留可复现命令和运行环境。若没有支持重叠的硬件条件，应如实记录并解释，不伪造收益。",
      checkpoints: [
        "串行与流水版本使用同一数学结果和输入。",
        "覆盖尾部 Chunk、最小输入和非整除大小。",
        "提交 CUDA Event 端到端结果与时间线证据。",
        "说明 Pinned Memory、Stream、Event 和 Buffer 生命周期。",
      ],
      exercise: {
        prompt: "写出阶段项目的通过标准，必须允许“没有加速但分析正确”。",
        hint: "正确性、复现、时间线、结论边界。",
        answer:
          "通过需满足结果正确、边界覆盖、无资源生命周期错误、命令可复现、串行/流水线数据完整、时间线与依赖解释一致。若无加速，能用硬件能力、Chunk、资源或开销证据解释仍可通过。",
      },
      quiz: {
        question: "阶段项目最重要的性能结论应该是什么形式？",
        options: [
          "多 Stream 永远更快",
          "在明确环境与 Shape 下，由时间线和端到端数据支持的结论",
          "只报告最好的一次时间",
          "删除没有加速的实验",
        ],
        answer: 1,
        explanation: "工程结论必须有条件、可复现，并允许实验推翻预期。",
      },
      references: [...asyncReferences, ...profilerReferences],
      verification: "并发语义依据 CUDA Programming Guide；项目性能结论完全由记录环境中的实测证据决定。",
    }),
  ],
};

export const curatedWeeksTwoToEight: TutorialModule[] = [
  weekTwo,
  weekFour,
  weekFive,
  weekSix,
  weekSeven,
  weekEight,
];
