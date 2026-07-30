import courseJson from "../course-data.json";
import type {
  ContentBlock,
  CourseData,
  CourseSection,
  CourseWeek,
  TutorialLesson,
  TutorialModule,
  TutorialReference,
} from "../types";

const course = courseJson as CourseData;

const paragraph = (text: string): ContentBlock => ({ type: "paragraph", text });
const quote = (text: string): ContentBlock => ({ type: "quote", text });
const list = (...items: string[]): ContentBlock => ({
  type: "list",
  items,
  ordered: false,
});

const stripMarkup = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#]/g, "")
    .replace(/[；。:]$/, "")
    .trim();

const compactTitle = (text: string, fallback: string) => {
  const clean = stripMarkup(text).replace(/\s+/g, " ");
  if (!clean) return fallback;
  return clean.length > 46 ? `${clean.slice(0, 45)}…` : clean;
};

const slug = (text: string) => {
  const ascii = stripMarkup(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 34);
  return ascii || "topic";
};

export const referencesForWeek = (week: number): TutorialReference[] => {
  if (week <= 2) {
    return [
      {
        label: "C++ Language Reference",
        url: "https://en.cppreference.com/w/cpp",
        source: "cppreference",
      },
      {
        label: "PyTorch Documentation",
        url: "https://pytorch.org/docs/stable/index.html",
        source: "PyTorch",
      },
    ];
  }
  if (week <= 20) {
    return [
      {
        label: "CUDA C++ Programming Guide",
        url: "https://docs.nvidia.com/cuda/cuda-c-programming-guide/",
        source: "NVIDIA",
      },
      {
        label: "CUDA C++ Best Practices Guide",
        url: "https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/",
        source: "NVIDIA",
      },
    ];
  }
  if (week <= 25) {
    return [
      {
        label: "Custom C++ and CUDA Operators",
        url: "https://pytorch.org/tutorials/advanced/cpp_custom_ops.html",
        source: "PyTorch",
      },
      {
        label: "PyTorch C++ API",
        url: "https://pytorch.org/cppdocs/",
        source: "PyTorch",
      },
    ];
  }
  if (week <= 30) {
    return [
      {
        label: "Triton Language Documentation",
        url: "https://triton-lang.org/main/python-api/triton.language.html",
        source: "Triton",
      },
      {
        label: "Triton Tutorials",
        url: "https://triton-lang.org/main/getting-started/tutorials/",
        source: "Triton",
      },
    ];
  }
  if (week <= 37) {
    return [
      {
        label: "FlashAttention Repository",
        url: "https://github.com/Dao-AILab/flash-attention",
        source: "Dao-AILab",
      },
      {
        label: "PyTorch Scaled Dot Product Attention",
        url: "https://pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html",
        source: "PyTorch",
      },
    ];
  }
  if (week <= 42) {
    return [
      {
        label: "CUTLASS Documentation",
        url: "https://docs.nvidia.com/cutlass/",
        source: "NVIDIA",
      },
      {
        label: "CUTLASS Repository",
        url: "https://github.com/NVIDIA/cutlass",
        source: "NVIDIA",
      },
    ];
  }
  if (week <= 47) {
    return [
      {
        label: "NCCL User Guide",
        url: "https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/",
        source: "NVIDIA",
      },
      {
        label: "Megatron Core Documentation",
        url: "https://docs.nvidia.com/megatron-core/developer-guide/latest/",
        source: "NVIDIA",
      },
    ];
  }
  return [
    {
      label: "CUDA Samples",
      url: "https://github.com/NVIDIA/cuda-samples",
      source: "NVIDIA",
    },
    {
      label: "PyTorch Repository",
      url: "https://github.com/pytorch/pytorch",
      source: "PyTorch",
    },
  ];
};

type Topic = {
  title: string;
  section: CourseSection;
  source: string;
  code?: Extract<ContentBlock, { type: "code" }>;
};

const sectionTopics = (section: CourseSection): Topic[] => {
  const topics: Topic[] = [];
  let codeIndex = 0;
  for (const block of section.blocks) {
    if (block.type === "list") {
      for (const item of block.items) {
        topics.push({
          title: compactTitle(item, section.title),
          section,
          source: item,
        });
      }
      continue;
    }
    if (block.type === "quote") {
      topics.push({
        title: compactTitle(block.text, section.title),
        section,
        source: block.text,
      });
      continue;
    }
    if (block.type === "code") {
      codeIndex += 1;
      topics.push({
        title: `${section.title}：代码与形状示例${codeIndex > 1 ? ` ${codeIndex}` : ""}`,
        section,
        source: "阅读代码或张量形状，逐行说明输入、输出、索引和边界。",
        code: block,
      });
      continue;
    }
    if (
      block.type === "paragraph" &&
      stripMarkup(block.text).length > 8 &&
      !/[：:]$/.test(block.text.trim()) &&
      !/\]\(https?:\/\//.test(block.text)
    ) {
      topics.push({
        title: compactTitle(block.text, section.title),
        section,
        source: block.text,
      });
    }
  }
  return topics.length
    ? topics
    : [{ title: section.title, section, source: `完成并解释${section.title}。` }];
};

const lessonKind = (sectionTitle: string) => {
  if (/任务|实现|实验|项目/.test(sectionTitle)) return "practice";
  if (/深度|掌握|要求/.test(sectionTitle)) return "concept";
  return "foundation";
};

const explainTopic = (focus: string) => {
  const rules: Array<[RegExp, string]> = [
    [
      /fp16|bf16|tf32|fp8|混合精度|accumul/i,
      "低精度格式用更少的位保存数值，因此能减少显存流量并提高矩阵计算吞吐，但可表示范围和精度并不相同。工程中常让输入与权重使用低精度、累加使用 FP32，再通过误差测试判断速度收益是否值得。",
    ],
    [
      /softmax/i,
      "Softmax 先把一组分数变成非负权重，再除以总和。直接计算指数容易上溢，所以实现通常先减去这一行的最大值；并行版本要完成最大值归约、指数与求和归约，最后再归一化。",
    ],
    [
      /rmsnorm/i,
      "RMSNorm 先对一行元素的平方求平均，再用均方根的倒数缩放每个元素。它把一次归约和一次逐元素变换串在一起，融合后可以避免把中间结果反复写回显存。",
    ],
    [
      /gemm|matmul|矩阵乘|矩阵相乘/i,
      "矩阵乘法的核心是让同一块 A、B 数据被多次复用。Naive 版本每算一个输出都反复读取全局内存；Tiled 版本把小块搬进共享内存或寄存器，让更多乘加共享一次加载，随后再考虑向量化和流水线。",
    ],
    [
      /coalesc|global memory|strided access|连续访问|内存事务|合并访存/i,
      "GPU 会把同一个 Warp 的内存请求合并成尽量少的事务。相邻线程访问相邻且对齐的地址时最容易合并；跨步或错位访问会让一次逻辑读取拆成更多事务，带宽没有变，但有效数据占比下降。",
    ],
    [
      /cache|局部性|l2/i,
      "Cache 利用时间局部性和空间局部性：刚访问的数据或附近的数据更可能再次被使用。优化前要先看访问顺序和复用距离，而不是笼统地说“用了缓存”；GPU 上还要区分 L2、共享内存和寄存器各自由谁管理。",
    ],
    [
      /shared memory|bank conflict|共享内存|bank/i,
      "共享内存位于线程块内部，延迟低且可由程序显式复用，但它被划分为多个 Bank。同一 Warp 若让多个线程访问同一个 Bank 的不同地址，请求会被串行化；矩阵转置常通过多加一列改变地址映射来消除冲突。",
    ],
    [
      /warp|simt|branch divergence|分支发散|shuffle/i,
      "Warp 是一组共同发射指令的线程。线程可以有不同数据，但遇到不同控制分支时，硬件通常要分路径执行并屏蔽暂不活跃的线程；Shuffle 则允许 Warp 内线程直接交换寄存器值，常用于减少共享内存和同步。",
    ],
    [
      /threadidx|blockidx|blockdim|griddim|grid|block|线程映射|program instance/i,
      "线程映射就是把逻辑坐标转换成数据地址。一维常用 blockIdx×blockDim+threadIdx，二维再分别计算行列；无论使用 CUDA 还是 Triton，都必须为尾部元素提供边界判断或 Mask。",
    ],
    [
      /reduction|归约|torch\.sum/i,
      "归约把很多输入合成较少输出，例如求和或最大值。并行实现通常构造一棵合并树：线程先处理局部元素，再在 Warp、线程块和多个线程块之间逐层汇总，同时避免错误的同步位置和非二次幂边界。",
    ],
    [
      /prefix sum|scan|前缀/i,
      "Scan 为每个位置计算它之前元素的累计结果。它不像普通归约只留下一个值，而是要保留所有前缀，因此上扫、下扫和跨线程块前缀传播都必须保持元素顺序。",
    ],
    [
      /histogram|atomic|原子/i,
      "直方图会让许多线程更新少量桶，写冲突是主要问题。Atomic 保证一次更新不会被其他线程打断，但热点桶会造成排队；常见优化是先在局部或共享内存中分片统计，再合并到全局结果。",
    ],
    [
      /stream|event|异步|overlap|并发/i,
      "CUDA Stream 定义操作之间的顺序；不同 Stream 才有机会重叠执行，但是否真的并发还受依赖、硬件资源和内存类型影响。Event 既能建立跨 Stream 依赖，也适合测量设备时间，不能只看 Host 端函数返回。",
    ],
    [
      /tensor core|wmma|mma|cublaslt/i,
      "Tensor Core 以固定 Tile 执行矩阵乘加，吞吐很高，但对数据类型、布局、对齐和维度有要求。WMMA、cuBLASLt 或 CUTLASS 负责不同层次的封装；使用前要确认累加类型与误差目标。",
    ],
    [
      /storage|shape|stride|contiguous|view|data pointer|tensor 内部/i,
      "Tensor 不等于一块连续数组：Storage 保存底层数据，Shape 描述各维长度，Stride 描述每一维移动一步要跨过多少元素。View 可以共享 Storage，因此 Kernel 接口必须明确是否接受非连续布局。",
    ],
    [
      /dispatcher|c\+\+\/cuda extension|custom op|pytorch.*扩展/i,
      "PyTorch 自定义算子需要同时处理算子声明、设备实现、类型与设备分派以及构建注册。真正可用的扩展还要检查 Dtype、Device、Shape、连续性和错误信息，而不只是让一个 CUDA 函数被 Python 调到。",
    ],
    [
      /autograd|backward|反向/i,
      "反向传播根据上游梯度和前向中保存的必要信息计算输入梯度。实现时要先写出数学导数，再决定保存哪些 Tensor、哪些可以重算，并用数值梯度或框架参考实现检查。",
    ],
    [
      /triton|tl\./i,
      "Triton 用 Program Instance 表达一块并行工作，程序通过 program_id 找到自己的数据块，再用向量化指针和 Mask 读写。它隐藏了线程级细节，但数据分块、复用、边界与性能模型仍需要开发者决定。",
    ],
    [
      /attention|qk|mha|mqa|gqa|kv cache/i,
      "Attention 先用 QKᵀ 计算相关分数，经过缩放、Mask 和 Softmax 后再与 V 相乘。MHA、MQA、GQA 的关键差异是查询头与 KV 头的共享方式，这会直接影响 KV Cache 容量和读取带宽。",
    ],
    [
      /online softmax|flashattention|flash attention/i,
      "Online Softmax 在分块读取分数时维护当前最大值和归一化和，使新块到来后能校正旧结果。FlashAttention 利用这套更新规则避免完整落地注意力矩阵，以更多片上计算换取更少的 HBM 读写。",
    ],
    [
      /cutlass|cute|layout|epilogue|threadblock tile|warp tile/i,
      "CUTLASS 把 GEMM 分解为设备接口、主循环 Collective、层级 Tile 和 Epilogue；CuTe Layout 则用形状与步长描述线程和值如何映射。学习时要沿着一个元素追踪它从全局内存到最终输出的路径。",
    ],
    [
      /nccl|allreduce|allgather|reducescatter|broadcast|send\/recv|communicator/i,
      "NCCL Collective 让多个 Rank 以约定方式交换 GPU 数据。AllReduce 让每个 Rank 得到归约结果，ReduceScatter 只留下各自分片，AllGather 再收集分片；消息大小、拓扑和并发计算决定实际通信效率。",
    ],
    [
      /ddp|tensor parallel|megatron|数据并行|张量并行/i,
      "数据并行让各 Rank 处理不同样本并同步梯度；张量并行把单层参数和计算拆到多卡。分析时要同时写出每张卡的 Tensor Shape、通信原语、通信量以及能否和计算重叠。",
    ],
    [
      /convolution|stencil|卷积/i,
      "卷积与 Stencil 都会让相邻输出重复读取重叠邻域。优化重点是把带 Halo 的 Tile 搬到片上存储、处理边界，并比较额外同步与减少全局读取之间的收益。",
    ],
    [
      /roofline|arithmetic intensity|bandwidth|flops|occupancy|benchmark|nsight|性能/i,
      "性能分析先估算理论 FLOPs 和最少内存流量，再用算术强度判断更可能受计算还是带宽限制。实测时分别记录延迟、吞吐和硬件利用率；Occupancy 只是隐藏延迟的条件之一，不是最终目标。",
    ],
  ];
  return (
    rules.find(([pattern]) => pattern.test(focus))?.[1] ??
    `“${focus}”要放回完整的数据流中理解。先明确它改变了什么数据或执行关系，再找出正确性边界与主要资源成本，最后通过最小示例和反例把抽象概念变成可观察的结果。`
  );
};

const topicLesson = (
  week: CourseWeek,
  topic: Topic,
  index: number,
): TutorialLesson => {
  const kind = lessonKind(topic.section.title);
  const id = `w${String(week.week).padStart(2, "0")}-${slug(topic.title)}-${index + 1}`;
  const focus = stripMarkup(topic.source);
  const practiceSteps =
    kind === "practice"
      ? [
          "先写出最小正确版本，并明确输入、输出、数据类型和 Shape。",
          "加入 CPU 或框架参考实现，覆盖正常输入、边界输入和非整除 Shape。",
          "固定预热与重复次数，记录延迟、吞吐、误差和运行环境。",
          "每次只改变一个优化因素，用数据证明它是否有效。",
        ]
      : [
          "先用一句话说明它解决的问题，不从 API 名称开始背。",
          "画出输入到输出的数据流，标出 Shape、内存位置与同步边界。",
          "写一个最小示例，再主动构造一个会失败或变慢的反例。",
          "用正确性结果和性能证据分别验收，不用“程序跑通”代替结论。",
        ];

  return {
    id,
    title: topic.title,
    summary: `围绕“${focus}”建立直觉、工程步骤和可验证的完成标准。`,
    duration: kind === "practice" ? "35 分钟" : "20 分钟",
    level: week.week >= 31 || kind === "concept" ? "进阶" : "基础",
    objectives: [
      `用自己的话解释“${focus}”解决什么问题`,
      "说明输入、输出、数据布局与主要性能代价",
      "用最小实验验证正确性，并记录能够复现的证据",
    ],
    sections: [
      {
        id: `${id}-intuition`,
        title: "先用通俗的话讲明白",
        blocks: [
          paragraph(explainTopic(focus)),
          paragraph(
            `这一节的重点不是记住“${focus}”这个名词，而是看清它在「${week.title}」中的位置：上游给它什么数据，它做了什么变换，下游依赖什么结果。只要这三件事说不清，代码即使能运行，也很难判断是否正确或值得优化。`,
          ),
          quote(
            "先保证语义正确，再观察瓶颈，最后才选择优化手段。正确性、性能和可维护性要分别给出证据。",
          ),
        ],
      },
      {
        id: `${id}-model`,
        title: "把问题拆成四个检查点",
        blocks: [
          list(
            `语义：${focus} 的定义、适用条件和不适用条件是什么？`,
            "数据：输入输出的 Shape、Stride、Dtype、对齐和所在设备是什么？",
            "执行：线程、Warp、Block、Stream 或通信 Rank 如何分工与同步？",
            "证据：用什么参考结果、误差阈值和性能指标证明实现达标？",
          ),
        ],
      },
      {
        id: `${id}-source`,
        title: "原课程要求，逐项落实",
        blocks: [
          paragraph(
            `原课程要求是：${topic.source}。把它转成可执行任务时，不要省略环境、输入规模、比较基线和通过条件。`,
          ),
          ...(topic.code ? [topic.code] : []),
          list(...practiceSteps),
        ],
      },
      {
        id: `${id}-mistakes`,
        title: "常见误区",
        blocks: [
          list(
            "只测一个方便的 Shape，导致尾部、空输入或非对齐路径从未被覆盖。",
            "把端到端时间、Kernel 时间和数据搬运时间混在一起比较。",
            "看到更高 Occupancy 或更少代码就直接断言性能更好。",
            "只保存最终数字，没有记录硬件、软件版本、编译选项和测量方法。",
          ),
        ],
      },
    ],
    exercises: [
      {
        id: `${id}-exercise`,
        prompt: `针对“${focus}”，写出一个最小验证计划：至少包含参考实现、3 组边界输入、误差标准和一个性能指标。`,
        hint: "先写清输入输出，再分别考虑正确性与性能；两者不要共用一个模糊的“通过”。",
        answer:
          "合格答案应明确参考实现或数学定义；覆盖空值/最小值、非整除或非连续 Shape、常用大 Shape；给出 atol/rtol 或精确匹配标准；并选择延迟、吞吐、有效带宽或 FLOP/s 中与本题匹配的指标，同时记录环境与重复方法。",
      },
    ],
    quiz: [
      {
        id: `${id}-quiz`,
        question: `判断“${focus}”已经掌握，哪组证据最可靠？`,
        options: [
          "代码能够编译，而且只运行了一次",
          "记住了 API 参数和一组固定配置",
          "参考结果与边界测试通过，并有可复现的性能记录和瓶颈解释",
          "Occupancy 数值比之前更高",
        ],
        answer: 2,
        explanation:
          "掌握需要同时覆盖语义、边界和证据；单次运行、背 API 或单一性能指标都不足以完成工程验收。",
      },
    ],
    references: referencesForWeek(week.week),
    verification:
      "本页由原 52 周课程要求拆解而来；外部定义与 API 以页面末尾的官方文档为准，性能结论必须在自己的目标硬件上复测。",
  };
};

export const buildGeneratedTutorialModule = (week: CourseWeek): TutorialModule => {
  const learningSections = week.sections.filter(
    (section) => !/阅读|验收|通过标准/.test(section.title),
  );
  const topics = learningSections.flatMap(sectionTopics);
  return {
    week: week.week,
    eyebrow: `${week.stageName} · 逐节教程`,
    introduction: `把第 ${week.week} 周的提纲拆成可以逐页学习、练习和验证的教材。每一节都从直觉开始，最后落到工程证据。`,
    lessons: topics.map((topic, index) => topicLesson(week, topic, index)),
  };
};

export const generatedTutorialModules = course.weeks.map(
  buildGeneratedTutorialModule,
);
