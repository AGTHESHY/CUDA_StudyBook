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
const code = (text: string, language = "text"): ContentBlock => ({
  type: "code",
  text,
  language,
});
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
        const cleanItem = stripMarkup(item);
        if (
          /^(学习|任务|记录|要求|能够回答|报告必须包含|通过标准)$/.test(
            cleanItem,
          )
        ) {
          continue;
        }
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

const clarificationForTopic = (focus: string) => {
  const rules: Array<[RegExp, string]> = [
    [
      /storage|shape|stride|contiguous|view|data pointer|tensor 内部/i,
      "Shape 是逻辑坐标系，Stride 是从逻辑坐标走到真实地址时使用的步长表。同一块 Storage 可以被不同的 Shape 和 Stride 解释成不同视图。",
    ],
    [
      /warp|simt|branch divergence|分支发散/i,
      "可以把 Warp 想成一组共同接收指令的 Lane。Lane 的数据互不相同，但控制路径分开时，硬件需要依次推进各条路径。",
    ],
    [
      /coalesc|bank conflict|共享内存|内存事务|合并访存/i,
      "程序写的是逐线程地址，硬件执行的是内存事务。判断访问是否高效，要看一个 Warp 的地址最终落入多少个对齐内存块或共享内存 Bank。",
    ],
    [
      /reduction|归约|prefix sum|scan|前缀/i,
      "串行代码从左到右累计；并行代码把输入先分组得到局部结果，再按树形结构合并。难点不在加法本身，而在分工、同步和边界。",
    ],
    [
      /online softmax|flashattention|flash attention/i,
      "新数据块到来时，旧的最大值可能失效，因此旧的归一化和也要按新旧最大值之差重新缩放；这一步是分块结果仍与完整 Softmax 等价的关键。",
    ],
    [
      /nccl|allreduce|allgather|reducescatter|communicator|rank/i,
      "Rank 是通信参与者的编号，Communicator 定义哪些 Rank 属于同一个通信组，Collective 则规定所有参与者共同完成的数据交换方式。",
    ],
    [
      /tensor parallel|pipeline parallel|sequence parallel|数据并行|张量并行/i,
      "并行策略的本质是决定“哪一维数据或计算由哪张卡负责”，随后补上跨卡依赖所需的通信。切分方式不同，通信原语与通信量也会不同。",
    ],
  ];
  return rules.find(([pattern]) => pattern.test(focus))?.[1];
};

const minimumExampleForTopic = (
  focus: string,
): { blocks: ContentBlock[]; result: string } => {
  if (/softmax/i.test(focus)) {
    return {
      blocks: [
        code(
          `import torch

x = torch.tensor([1000.0, 1001.0, 1002.0])
stable = torch.softmax(x - x.max(), dim=0)
print(stable, stable.sum())`,
          "python",
        ),
      ],
      result:
        "观察结果：三个权重均为有限值，且总和接近 1。减去最大值只改善数值范围，不改变归一化后的理论结果。",
    };
  }
  if (/matmul|gemm|矩阵乘/i.test(focus)) {
    return {
      blocks: [
        code(
          `import torch

A = torch.randn(2, 3)
B = torch.randn(3, 4)
C = A @ B
print(A.shape, B.shape, C.shape)  # [2,3] [3,4] [2,4]`,
          "python",
        ),
      ],
      result:
        "观察结果：A 的最后一维必须与 B 的倒数第二维相等；输出保留外侧的 M 与 N 两个维度。",
    };
  }
  if (/attention|qk|mha|mqa|gqa/i.test(focus)) {
    return {
      blocks: [
        code(
          `import torch
import torch.nn.functional as F

q = torch.randn(1, 4, 8, 32)
k = torch.randn(1, 4, 8, 32)
v = torch.randn(1, 4, 8, 32)
out = F.scaled_dot_product_attention(q, k, v)
print(out.shape)  # [1, 4, 8, 32]`,
          "python",
        ),
      ],
      result:
        "观察结果：输出保留 Q 的批次、头数、查询长度和头维度；Mask、GQA 与因果约束应在后续小节单独验证。",
    };
  }
  if (/threadidx|blockidx|blockdim|线程映射|grid|block/i.test(focus)) {
    return {
      blocks: [
        code(
          `__global__ void write_index(int* out, int n) {
  int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) out[i] = i;
}`,
          "cuda",
        ),
      ],
      result:
        "观察结果：每个线程计算一个全局索引；当 n 不能整除 blockDim.x 时，边界判断负责屏蔽尾部多出的线程。",
    };
  }
  if (/warp|shuffle|归约|reduction/i.test(focus)) {
    return {
      blocks: [
        code(
          `for (int offset = 16; offset > 0; offset /= 2) {
  value += __shfl_down_sync(0xffffffff, value, offset);
}`,
          "cuda",
        ),
      ],
      result:
        "观察结果：每轮把距离为 offset 的 Lane 值合并进来；示例假定完整 Warp，实际代码必须明确有效 Lane 与数据边界。",
    };
  }
  if (/prefix sum|scan|前缀/i.test(focus)) {
    return {
      blocks: [
        code(
          `输入       = [3, 1, 4, 0, 2]
inclusive = [3, 4, 8, 8, 10]
exclusive = [0, 3, 4, 8, 8]`,
          "text",
        ),
      ],
      result:
        "先用五个数核对语义：Inclusive 包含当前位置，Exclusive 不包含当前位置。并行实现无论怎样上扫、下扫，结果次序都必须与这一定义一致。",
    };
  }
  if (/histogram|atomic|原子/i.test(focus)) {
    return {
      blocks: [
        code(
          `输入 = [0, 1, 1, 3, 1, 0, 3, 3]
4 个桶的结果 = [2, 3, 0, 3]

均匀数据：线程写入分散的桶
偏斜数据：许多线程争用同一个热点桶`,
          "text",
        ),
      ],
      result:
        "输出完全相同并不代表性能相同。直方图必须同时测试均匀、偏斜和单一取值数据，才能看见 Atomic 争用与私有化的收益边界。",
    };
  }
  if (/double buffer|async copy|异步复制|双缓冲/i.test(focus)) {
    return {
      blocks: [
        code(
          `load(tile[0], global[0]);
for (int k = 0; k < tiles; ++k) {
  load_async(tile[(k + 1) & 1], global[k + 1]);
  compute(tile[k & 1]);
  wait_and_swap();
}`,
          "cuda",
        ),
      ],
      result:
        "两个缓冲区轮流扮演“正在计算”和“正在加载”。真正的重叠需要异步能力、正确的等待位置和足够资源；代码写成双缓冲不等于硬件时间线已经重叠。",
    };
  }
  if (/online softmax|running max|running sum|分块最大值|重缩放/i.test(focus)) {
    return {
      blocks: [
        code(
          `m_new = max(m_old, max(x_block))
l_new = exp(m_old - m_new) * l_old
      + sum(exp(x_block - m_new))

# 旧块的贡献必须随新最大值重缩放`,
          "python",
        ),
      ],
      result:
        "若新块带来更大的最大值，旧块的指数和必须乘上 exp(m_old-m_new)。少掉这一项，分块结果就不再与完整 Softmax 等价。",
    };
  }
  if (/dispatcher|custom op|extension|torch_library|registration/i.test(focus)) {
    return {
      blocks: [
        code(
          `TORCH_LIBRARY(my_ops, m) {
  m.def("fma(Tensor a, Tensor b, Tensor c) -> Tensor");
}
TORCH_LIBRARY_IMPL(my_ops, CUDA, m) {
  m.impl("fma", &fma_cuda);
}`,
          "cpp",
        ),
      ],
      result:
        "Schema 先定义算子契约，设备实现再注册到 Dispatcher。可用的算子还必须补齐 Shape、Dtype、Device、连续性和错误信息检查。",
    };
  }
  if (/triton|tl\./i.test(focus)) {
    return {
      blocks: [
        code(
          `pid = tl.program_id(0)
offsets = pid * BLOCK + tl.arange(0, BLOCK)
mask = offsets < n
x = tl.load(x_ptr + offsets, mask=mask)
tl.store(y_ptr + offsets, x, mask=mask)`,
          "python",
        ),
      ],
      result:
        "一个 Program Instance 负责一个数据块，offsets 是向量化下标，Mask 处理尾块。Triton 隐藏了逐线程写法，但没有替你决定分块和边界。",
    };
  }
  if (/stream|event|异步|overlap|并发/i.test(focus)) {
    return {
      blocks: [
        code(
          `cudaEventRecord(ready, producer);
cudaStreamWaitEvent(consumer, ready);
kernel<<<grid, block, 0, consumer>>>(data);`,
          "cuda",
        ),
      ],
      result:
        "观察结果：consumer 只等待 ready 之前的工作，不需要用设备级同步阻塞所有 Stream；是否产生重叠仍需看时间线。",
    };
  }
  if (/nccl|allreduce|communicator|rank/i.test(focus)) {
    return {
      blocks: [
        code(
          `ncclAllReduce(
  sendBuffer, recvBuffer, count,
  ncclFloat, ncclSum, communicator, stream
);`,
          "cpp",
        ),
      ],
      result:
        "观察结果：通信发生在 communicator 定义的 Rank 集合中，并按给定 CUDA Stream 排序；所有参与 Rank 必须以匹配参数调用。",
    };
  }
  if (/storage|shape|stride|contiguous|view|tensor|布局/i.test(focus)) {
    return {
      blocks: [
        code(
          `import torch

x = torch.arange(12).reshape(3, 4)
y = x.t()
print(x.shape, x.stride())  # [3,4], (4,1)
print(y.shape, y.stride())  # [4,3], (1,4)`,
          "python",
        ),
      ],
      result:
        "观察结果：转置后的视图可以共享底层数据，但 Shape 与 Stride 改变，因此不能仅凭元素数量推断连续布局。",
    };
  }
  return {
    blocks: [
      code(
        `输入：选取一个最小正常案例和一个边界案例
操作：只执行本节讨论的一个变换
对照：使用数学定义、CPU 版本或框架实现
记录：输出、误差、耗时与运行环境`,
        "text",
      ),
    ],
    result:
      "观察结果：最小例子用于隔离一个概念，不替代完整工程测试；若无法明确输入、输出和对照结果，说明概念仍需继续拆分。",
  };
};

type TeachingFamily =
  | "algorithm"
  | "numerical"
  | "memory"
  | "parallel"
  | "matrix"
  | "framework"
  | "distributed"
  | "performance"
  | "project";

type TopicUnit = {
  title: string;
  focus: string;
  topics: Topic[];
  family: TeachingFamily;
  kind: ReturnType<typeof lessonKind>;
};

const familyFor = (focus: string, sectionTitle: string): TeachingFamily => {
  const text = `${focus}\n${sectionTitle}`;
  if (/阶段项目|项目|报告|整理|开源贡献|面试|通过标准|完整算子/i.test(text)) {
    return "project";
  }
  if (/nccl|rank|communicator|allreduce|allgather|reducescatter|broadcast|send\/recv|ddp|parallel|通信|多卡|扩展效率|pipeline bubble/i.test(text)) {
    return "distributed";
  }
  if (/pytorch|dispatcher|extension|autograd|backward|fake.?tensor|opcheck|torch\.compile|triton|cutlass|cute|registration/i.test(text)) {
    return "framework";
  }
  if (/gemm|matmul|矩阵乘|tensor core|wmma|mma|tile/i.test(text)) {
    return "matrix";
  }
  if (/fp16|bf16|fp8|tf32|softmax|误差|精度|accumul|rmsnorm/i.test(text)) {
    return "numerical";
  }
  if (/memory|cache|stride|storage|contiguous|coalesc|bank|shared|register|内存|缓存|访存|halo/i.test(text)) {
    return "memory";
  }
  if (/warp|simt|thread|block|grid|stream|event|同步|atomic|shuffle|occupancy/i.test(text)) {
    return "parallel";
  }
  if (/roofline|benchmark|nsight|flops|bandwidth|arithmetic intensity|性能|吞吐|延迟/i.test(text)) {
    return "performance";
  }
  return "algorithm";
};

const unitTitle = (topics: Topic[]) => {
  if (topics.length === 1) return topics[0].title;
  const names = topics.map((topic) => stripMarkup(topic.title));
  const joined =
    names.length === 2
      ? `${names[0]}与${names[1]}`
      : `${names[0]}、${names[1]}与相关实现`;
  return compactTitle(joined, names[0]);
};

const cohesiveUnits = (topics: Topic[]): TopicUnit[] => {
  const targetCount = Math.min(7, Math.max(4, Math.ceil(topics.length / 2)));
  const chunkSize = Math.max(1, Math.ceil(topics.length / targetCount));
  const units: TopicUnit[] = [];
  for (let index = 0; index < topics.length; index += chunkSize) {
    const grouped = topics.slice(index, index + chunkSize);
    const focus = grouped.map((topic) => stripMarkup(topic.source)).join("；");
    units.push({
      title: unitTitle(grouped),
      focus,
      topics: grouped,
      family: familyFor(focus, grouped[0].section.title),
      kind: lessonKind(grouped[0].section.title),
    });
  }
  return units;
};

const familyDepth: Record<TeachingFamily, string[]> = {
  algorithm: [
    "先用 5～8 个具体输入手算结果，确认 Inclusive/Exclusive、边界或合并顺序的语义。",
    "再画出线程或线程块的分工，标出每轮读写位置与同步点。",
    "最后覆盖非二次幂、空输入、尾块和跨 Block 合并；不能只测试整齐尺寸。",
  ],
  numerical: [
    "写出数学定义、输入输出 Shape 与累加类型，不从某个 API 的默认值反推定义。",
    "分别检查溢出、下溢、消减误差和低精度累加；误差阈值要随 Dtype 与规模解释。",
    "至少与 FP32 参考实现比较 atol/rtol，并记录最大误差出现在哪个元素。",
  ],
  memory: [
    "把逻辑坐标代入地址公式，列出同一 Warp 每个 Lane 访问的实际地址。",
    "区分请求字节、传输字节、缓存命中与片上复用，不能把它们统称为“访存优化”。",
    "用连续、错位、跨步和非连续 View 做反例，再用 Profiler 指标核对推断。",
  ],
  parallel: [
    "明确谁做什么：线程、Lane、Warp、Block、Stream 各自负责的工作不能混写。",
    "所有同步都要回答参与者是谁、等待什么、等待前的数据由谁写入。",
    "覆盖部分 Warp、尾块和资源极限；Kernel launch 后同时检查 launch error 与异步执行错误。",
  ],
  matrix: [
    "先锁定 A[M,K]、B[K,N]、C[M,N]，沿一个 C[row,col] 手算完整的 K 维点积。",
    "再说明 Tile 在 Global Memory、Shared Memory 与 Register 之间怎样移动和复用。",
    "正确性覆盖非整除 M/N/K 与多种布局；性能同时报告 cuBLAS 基线、FLOP/s 和瓶颈证据。",
  ],
  framework: [
    "沿调用链追踪 Python API、Schema/Dispatcher、设备实现与 Kernel launch，不把“能 import”当成完成。",
    "接口契约明确 Shape、Stride、Dtype、Device、空输入、非连续输入与错误信息。",
    "补齐参考实现、opcheck/gradcheck（适用时）、编译路径与 CI，避免只有一条 CUDA happy path。",
  ],
  distributed: [
    "先为每个 Rank 写出调用前后的 Tensor Shape 与数据内容，再选择 Collective。",
    "所有 Rank 的 Collective 次序、count、dtype 与 communicator 必须匹配；异步错误也要传播。",
    "基准覆盖消息大小与拓扑，拆开计算、通信和等待时间，再讨论重叠与扩展效率。",
  ],
  performance: [
    "先写性能假设：更可能受计算、内存、同步还是启动开销限制，并给出可证伪的指标。",
    "固定硬件、软件版本、时钟条件、输入、预热、同步与重复统计；同时保留 median 和尾延迟。",
    "把端到端、Host-to-Device、Kernel 与通信时间分开，结论只对记录的环境和 Shape 有效。",
  ],
  project: [
    "先冻结接口与支持矩阵，再按 Reference、Naive、Correctness、Optimize、Integrate 的顺序推进。",
    "每次优化只改变一个主要因素，保留失败尝试、Profiler 证据和回退方式。",
    "交付物至少包括可构建代码、自动测试、Benchmark、环境记录、性能分析与双语使用说明。",
  ],
};

const familyMistakes: Record<TeachingFamily, string[]> = {
  algorithm: ["只验证总和，不验证每一步的中间状态。", "把跨 Block 同步写进单个 Kernel 的错误位置。"],
  numerical: ["用完全相等比较浮点结果。", "只测随机小值，遗漏极值、长序列和全相等输入。"],
  memory: ["只看源代码下标“像是连续”，没有列出一个 Warp 的地址。", "看到缓存命中后就忽略错位或跨步访问。"],
  parallel: ["把 Warp 当前大小硬编码成永远成立的业务假设。", "部分线程提前返回后，其余线程仍到达 Block 屏障。"],
  matrix: ["只测 M=N=K 且都是 Tile 整数倍。", "只报告 Occupancy，不解释加载、复用和指令流水线。"],
  framework: ["直接对非连续 Tensor 取 data_ptr 并按连续数组解释。", "只注册 CUDA 实现，不检查设备、Dtype 与 FakeTensor 路径。"],
  distributed: ["不同 Rank 以不同顺序进入 Collective，最终表现为挂起。", "把函数异步返回当成通信已经完成。"],
  performance: ["在未预热、未同步的情况下比较一次耗时。", "把单一 Shape 上的胜出写成普遍结论。"],
  project: ["先写复杂优化，再补参考实现和测试。", "README 只给结果截图，没有复现命令与环境。"],
};

const familySectionTitles: Record<
  TeachingFamily,
  [string, string, string, string]
> = {
  algorithm: ["概念与顺序", "用小输入走一遍", "从串行语义到并行步骤", "边界与反例"],
  numerical: ["数学定义与数值范围", "用具体数值核对", "精度策略", "误差怎样验收"],
  memory: ["地址与存储模型", "跟着访问序列走", "从代码推到内存事务", "用工具验证"],
  parallel: ["执行者与工作划分", "按轮次观察代码", "同步和有效线程", "并发错误排查"],
  matrix: ["矩阵 Shape 与点积", "跟着一个输出元素计算", "Tile、复用与流水线", "正确性和性能基线"],
  framework: ["框架中的调用位置", "最小可调用路径", "接口契约", "测试与集成"],
  distributed: ["参与者和数据变化", "跟随一个数据分片", "调用顺序与失效模式", "通信性能证据"],
  performance: ["先提出可证伪的假设", "建立可信基线", "读取 Profiler 证据", "结论的适用范围"],
  project: ["交付目标", "按风险安排实现顺序", "工程质量门槛", "最终验收"],
};

const contextParagraph = (
  family: TeachingFamily,
  week: CourseWeek,
  focus: string,
) => {
  const messages: Record<TeachingFamily, string> = {
    algorithm: `在「${week.title}」中，先保持算法定义不变，再改变分工方式。并行化不是换一组 API，而是在不破坏顺序、结合律要求和边界语义的前提下缩短关键路径。`,
    numerical: `这里必须把数学等价与浮点实现分开：公式等价不保证有限精度下逐位相同。Dtype、累加顺序和输入规模共同决定可接受误差。`,
    memory: `这一主题真正处理的是地址集合与数据复用。先列出地址，再讨论事务、Bank、Cache 或 Tile；没有地址证据时，“更连续”“更缓存友好”都只是猜测。`,
    parallel: `控制流要写成参与者之间的时序关系。只要有一个线程、Warp、Block 或 Stream 的等待条件不清楚，正确性就还没有建立。`,
    matrix: `矩阵 Kernel 的学习主线是同一份 A、B 数据能服务多少次乘加。先让任意 Shape 都正确，再逐层增加 Shared Memory、Register 和异步流水线的复用。`,
    framework: `就业场景中的 Kernel 很少孤立存在。${focus}必须放进框架的分派、构建、错误处理和自动测试链路里，调用成功只是第一步。`,
    distributed: `分布式程序的状态分散在多个 Rank。阅读${focus}时要画出每张卡“调用前有什么、调用后得到什么”，再检查调用顺序和同步。`,
    performance: `性能工作遵循“评估—并行化—优化—部署”的迭代。先用真实工作负载定位热点，再改变实现，最后用同一测量协议比较。`,
    project: `本节不再增加孤立术语，而是把${focus}收束为可安装、可测试、可复现和可解释的工程交付物。`,
  };
  return messages[family];
};

const needsWorkedExample = (unit: TopicUnit) =>
  unit.family !== "performance" &&
  unit.family !== "project" &&
  !/报告|阅读目标|通过标准|整理/.test(unit.focus);

const jobReadyAdditions = (week: number, focus: string): string[] => {
  const additions: string[] = [];
  if (/kernel|thread|block|stream|cuda|实现/i.test(focus) && week <= 20) {
    additions.push(
      "Host 侧检查每个 CUDA Runtime 返回值；Kernel launch 后先用 cudaGetLastError 检查启动配置，调试异步错误时再在明确位置同步。",
    );
  }
  if (/reduction|scan|histogram|convolution|gemm|softmax|rmsnorm/i.test(focus)) {
    additions.push(
      "建立 CPU、PyTorch、cuBLAS、CUB 或数学定义中的适用参考结果；正常 Shape、尾块、空输入与非整除尺寸要进入自动测试。",
    );
  }
  if (week >= 15 && week <= 20) {
    additions.push(
      "Benchmark 必须包含预热、CUDA Event、显式同步、重复统计和 cuBLAS 基线；不同 M/N/K 与布局分开报告。",
    );
  }
  if (week >= 21 && week <= 25) {
    additions.push(
      "生产算子还要覆盖 Dispatcher/Schema、Meta 或 FakeTensor 路径、非连续输入、opcheck；有梯度时补 gradcheck 与混合精度误差测试。",
    );
  }
  if (week >= 26 && week <= 30) {
    additions.push(
      "Triton 尾块使用 Mask；Autotune key 必须包含会改变最佳配置的 Shape 或属性，避免把一次调优结果错误复用于不同问题。",
    );
  }
  if (week >= 31 && week <= 37) {
    additions.push(
      "Attention 测试覆盖 causal/non-causal、不同序列长度与头维度、全 Mask 行和低精度累加；Backward 还要与框架梯度对照。",
    );
  }
  if (week >= 43 && week <= 47) {
    additions.push(
      "分布式运行要记录 Rank、local device、communicator 与拓扑；设置可诊断的超时并检查异步通信错误，避免只留下“程序卡住”。",
    );
  }
  return [...new Set(additions)];
};

const explicitAnimation = (
  week: number,
  focus: string,
): TutorialLesson["animation"] => {
  const candidates: Array<
    [number, RegExp, NonNullable<TutorialLesson["animation"]>]
  > = [
    [
      9,
      /reduction tree|interleaved|sequential|归约/i,
      {
        template: "reduction-tree",
        title: "8 个输入怎样逐层归约成 1 个结果",
        caption:
          "动画对应本节 Warp/Block 归约代码：每一轮把距离为 offset 的元素合并，标出仍然活跃的 Lane 与同步边界。",
      },
    ],
    [
      15,
      /gemm|矩阵乘|C\[M,N\]/i,
      {
        template: "matrix-multiply",
        title: "C[2,3] 的 K 维点积",
        caption:
          "行列下标均标为 0～4。固定 C[2,3]，逐个读取 A[2,k] 与 B[k,3]，把 2MNK 中的一条点积变成可观察步骤。",
      },
    ],
    [
      18,
      /双缓冲|async|load tile|异步复制/i,
      {
        template: "pipeline-buffer",
        title: "Tile 0 计算时，Tile 1 在哪里",
        caption:
          "动画严格对应双缓冲伪代码，展示两个 Shared Memory 缓冲区在 Load、Compute 与 Wait 之间交换角色。",
      },
    ],
    [
      31,
      /QK|scale|mask|softmax|PV|attention/i,
      {
        template: "attention-flow",
        title: "一次 Attention 前向的数据流",
        caption:
          "动画对应本节 QKᵀ→Scale/Mask→Softmax→PV 示例，并标出中间分数矩阵何时产生。",
      },
    ],
    [
      32,
      /running max|running sum|重缩放|online softmax/i,
      {
        template: "online-softmax",
        title: "新分块到来后为何要重缩放旧结果",
        caption:
          "动画代入两块具体分数，展示 running max 变大时，旧的指数和如何乘 exp(m_old-m_new) 后再与新块合并。",
      },
    ],
    [
      43,
      /ring|allreduce|reducescatter|allgather/i,
      {
        template: "collective-ring",
        title: "一个分片如何完成 Ring AllReduce",
        caption:
          "动画标出 Rank 0～5，只跟踪一个数据分片经历 Reduce-Scatter 与 AllGather；它不代表 NCCL 在所有拓扑上固定选择 Ring。",
      },
    ],
  ];
  return candidates.find(
    ([candidateWeek, pattern]) =>
      candidateWeek === week && pattern.test(focus),
  )?.[2];
};

const buildFamilySections = (
  week: CourseWeek,
  unit: TopicUnit,
  id: string,
): CourseSection[] => {
  const headings = familySectionTitles[unit.family];
  const clarification = clarificationForTopic(unit.focus);
  const sourceCode = unit.topics.find((topic) => topic.code)?.code;
  const example = minimumExampleForTopic(unit.focus);
  const useExample = needsWorkedExample(unit);
  const courseRequirements = unit.topics.map((topic) => stripMarkup(topic.source));
  const additions = jobReadyAdditions(week.week, unit.focus);

  return [
    {
      id: `${id}-definition`,
      title: headings[0],
      blocks: [
        paragraph(explainTopic(unit.focus)),
        ...(clarification ? [quote(`理解提示：${clarification}`)] : []),
        paragraph(contextParagraph(unit.family, week, unit.focus)),
      ],
    },
    ...(useExample
      ? [
          {
            id: `${id}-worked`,
            title: headings[1],
            blocks: [
              ...(sourceCode ? [sourceCode] : example.blocks),
              paragraph(
                sourceCode
                  ? "阅读时逐行写出输入、输出、下标和边界；若无法预测这一小段的结果，先不要进入性能优化。"
                  : example.result,
              ),
            ],
          } satisfies CourseSection,
        ]
      : []),
    {
      id: `${id}-depth`,
      title: headings[2],
      blocks: [
        list(...familyDepth[unit.family]),
        ...(additions.length
          ? [
              {
                type: "subheading" as const,
                text: "工程中还必须补齐",
              },
              list(...additions),
            ]
          : []),
        quote(
          `本节要落实的原始要求：${courseRequirements.join("；")}。这些要求被放在同一页，是因为它们共同描述一条实现或验证链，而不是彼此独立的名词。`,
        ),
      ],
    },
    {
      id: `${id}-evidence`,
      title: headings[3],
      blocks: [
        list(...familyMistakes[unit.family]),
        paragraph(
          unit.family === "performance"
            ? "最后保留原始测量数据、运行命令和 Profiler 截图。若新数据推翻假设，应修改解释，而不是只挑选支持优化的结果。"
            : "完成后同时留下正确性证据与工程证据：参考结果、边界输入、错误处理，以及能复现实验的环境和命令。",
        ),
      ],
    },
  ];
};

const familyExercise = (
  unit: TopicUnit,
  id: string,
): TutorialLesson["exercises"][number] => {
  const prompts: Record<TeachingFamily, string> = {
    algorithm: `用 8 个以内的具体输入，手算“${unit.title}”每一轮中间结果，再写出一个非整除边界案例。`,
    numerical: `为“${unit.title}”设计三组数值输入：普通值、极值和容易发生消减的值，并分别给出参考结果与误差标准。`,
    memory: `选择一个 Warp，列出执行“${unit.title}”时 Lane 0～7 的地址，并预测事务、Bank 或复用情况。`,
    parallel: `画出“${unit.title}”的参与者时间线，标出每个同步点前后的生产者、消费者和有效线程。`,
    matrix: `取 M=N=K=5，手算 C[2,3]，再说明 2×2 Tile 如何处理最后一行、最后一列和最后一个 K 分块。`,
    framework: `为“${unit.title}”写一张接口支持表，至少覆盖 CPU/CUDA、Dtype、连续/非连续、空输入和错误信息。`,
    distributed: `用 4 个 Rank、每个 Rank 4 个数，写出“${unit.title}”调用前后的数据，并列出必须匹配的参数。`,
    performance: `为“${unit.title}”写一份可复现 Benchmark 协议：输入分布、预热、同步、重复统计、环境和需要验证的瓶颈指标。`,
    project: `把“${unit.title}”拆成 5 个可独立验收的里程碑，每个里程碑写明输入、产物、测试与失败回退方式。`,
  };
  return {
    id: `${id}-exercise`,
    prompt: prompts[unit.family],
    hint: "答案必须含具体输入、预期结果或通过条件；只写“实现并优化”不算完成。",
    answer:
      "合格答案会先固定语义和接口，再给出至少一个正常案例、一个边界或反例，以及能复现的验证步骤。性能主题还必须分离测量区间并记录环境；并行或分布式主题必须标出参与者与同步关系。",
  };
};

const familyQuiz = (
  unit: TopicUnit,
  id: string,
): TutorialLesson["quiz"][number] => ({
  id: `${id}-quiz`,
  question: `完成“${unit.title}”后，哪项证据最能说明你已经达到工程可用深度？`,
  options: [
    "记住本页出现的 API 名称",
    "只在一个整齐 Shape 上运行成功",
    "能解释定义与边界，并用参考结果、反例和可复现实测支持结论",
    "代码行数比参考实现更少",
  ],
  answer: 2,
  explanation:
    "工程可用要求语义、边界、错误处理和证据同时成立；API 记忆、单一输入或代码长度都不能替代这些条件。",
});

const topicUnitLesson = (
  week: CourseWeek,
  unit: TopicUnit,
  index: number,
): TutorialLesson => {
  const id = `w${String(week.week).padStart(2, "0")}-${slug(unit.title)}-${index + 1}`;
  return {
    id,
    title: unit.title,
    summary:
      unit.family === "project"
        ? `把 ${unit.focus} 收束成可构建、可测试、可复现的交付物。`
        : `本节把 ${unit.focus} 放进同一条数据或执行链中讲清楚，并明确做到什么深度。`,
    duration:
      unit.kind === "practice" || unit.family === "project"
        ? "45 分钟"
        : unit.topics.length > 1
          ? "35 分钟"
          : "25 分钟",
    level:
      week.week >= 31 ||
      ["framework", "distributed", "matrix"].includes(unit.family)
        ? "进阶"
        : "基础",
    objectives: [
      `解释“${unit.title}”处理的数据、执行关系或工程问题`,
      `达到${familyDepth[unit.family][0].replace(/[。；]$/, "")}的深度`,
      "用边界输入、参考结果或测量证据支持结论",
    ],
    sections: buildFamilySections(week, unit, id),
    exercises: [familyExercise(unit, id)],
    quiz: [familyQuiz(unit, id)],
    references: referencesForWeek(week.week),
    verification:
      "定义与 API 以本页列出的官方资料为准；性能结论必须使用真实工作负载在目标硬件复测，并保留环境、输入与测量方法。",
    animation: explicitAnimation(week.week, unit.focus),
  };
};

export const buildGeneratedTutorialModule = (week: CourseWeek): TutorialModule => {
  const learningSections = week.sections.filter(
    (section) => !/阅读|验收|通过标准/.test(section.title),
  );
  const topics = learningSections.flatMap(sectionTopics);
  const units = cohesiveUnits(topics);
  let animationAssigned = false;
  const lessons = units.map((unit, index) => {
    const built = topicUnitLesson(week, unit, index);
    if (!built.animation) return built;
    if (animationAssigned) {
      const { animation: _animation, ...withoutAnimation } = built;
      return withoutAnimation;
    }
    animationAssigned = true;
    return built;
  });
  return {
    week: week.week,
    eyebrow: `${week.stageName} · 逐节教程`,
    introduction: `第 ${week.week} 周按知识依赖组织为 ${units.length} 个小节：先建立定义和数据流，再实现、验证和分析。只有静态文字难以解释的过程才配置动画。`,
    lessons,
  };
};

export const generatedTutorialModules = course.weeks.map(
  buildGeneratedTutorialModule,
);

const removeChapterName = (title: string, chapterTitle: string) => {
  const escaped = chapterTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const cleaned = title
    .replace(new RegExp(escaped, "gi"), "")
    .replace(/^[\s·：:、—\-–]+|[\s·：:、—\-–]+$/g, "")
    .trim();
  return cleaned || "概念、边界与应用位置";
};

const representativeTitles = (titles: string[], limit = 8) => {
  const unique = [...new Set(titles)];
  if (unique.length <= limit) return unique;
  const selected = Array.from({ length: limit }, (_, index) => {
    const position = Math.round((index * (unique.length - 1)) / (limit - 1));
    return unique[position];
  });
  return [...new Set(selected)];
};

const overviewReferences = (module: TutorialModule) => {
  const references = [
    ...module.lessons.flatMap((lesson) => lesson.references),
    ...referencesForWeek(module.week),
  ];
  return [
    ...new Map(references.map((reference) => [reference.url, reference])).values(),
  ].slice(0, 4);
};

export const organizeTutorialModule = (
  module: TutorialModule,
): TutorialModule => {
  const week = course.weeks.find((item) => item.week === module.week);
  if (!week) return module;

  const lessons = module.lessons
    .filter((lesson) => lesson.id !== `w${String(module.week).padStart(2, "0")}-overview`)
    .map((lesson) => ({
      ...lesson,
      title: removeChapterName(lesson.title, week.title),
    }));
  const topicTitles = representativeTitles(
    lessons.map((lesson) => lesson.title),
  );
  const overviewId = `w${String(module.week).padStart(2, "0")}-overview`;
  const overviewExplanation = module.eyebrow.includes("逐节教程")
    ? explainTopic(week.title)
    : module.introduction;
  const hiddenTopicCount = Math.max(0, lessons.length - topicTitles.length);
  const topicList = topicTitles.map((title) => `先理解「${title}」`);
  if (hiddenTopicCount > 0) {
    topicList.push(`再完成其余 ${hiddenTopicCount} 个实现、实验或分析小节`);
  }

  const overview: TutorialLesson = {
    id: overviewId,
    title: "本周导读",
    summary: `先回答“${week.title}解决什么问题”，再看清本周小节的学习顺序与完成标准。`,
    duration: "15 分钟",
    level: module.week >= 31 ? "进阶" : "基础",
    objectives: [
      `用自己的话说明“${week.title}”在完整系统中的作用`,
      "知道后续各小节分别解决什么问题",
      "建立从概念、实现到验证的学习顺序",
    ],
    sections: [
      {
        id: `${overviewId}-what`,
        title: "这一章在讲什么",
        blocks: [
          paragraph(overviewExplanation),
          paragraph(
            "这一页只建立全章地图。术语、代码、边界条件和性能分析会放到后续对应小节，不在导读里提前堆叠。",
          ),
        ],
      },
      {
        id: `${overviewId}-next`,
        title: "后续会学什么",
        blocks: [
          {
            type: "list",
            items: topicList,
            ordered: true,
          },
        ],
      },
      {
        id: `${overviewId}-review`,
        title: "学完以后怎样回顾",
        blocks: [
          list(
            "概念：能用简洁语言说明本章对象、输入输出与适用边界。",
            "实现：完成本周要求的最小代码、测试或分析记录。",
            "证据：正确性与性能分别核对；依赖硬件的结论必须保留实测条件。",
          ),
        ],
      },
    ],
    exercises: [
      {
        id: `${overviewId}-exercise`,
        prompt: `不用 API 名称堆砌，用三句话解释“${week.title}”：它解决什么问题、后续会学什么、最后拿什么验收。`,
        hint: "先说问题，再说学习路径，最后说证据；不要从函数参数开始。",
        answer:
          "合格答案应覆盖本章对象与作用、后续主要小节，以及正确性/实现结果/性能记录中的适用验收证据。具体内容以本页列出的课程小节和官方资料为准。",
      },
    ],
    quiz: [
      {
        id: `${overviewId}-quiz`,
        question: "章导读最重要的作用是什么？",
        options: [
          "一次讲完后续所有 API 细节",
          "建立本章对象、学习顺序和验收证据的整体地图",
          "提前给出不依赖硬件的性能结论",
          "代替后续实验与练习",
        ],
        answer: 1,
        explanation:
          "导读负责建立地图；定义细节、代码与实测结论应留在对应小节展开。",
      },
    ],
    references: overviewReferences(module),
    verification:
      "本章导读只归纳现有课程标题、精编介绍与页面所列资料，不新增未经来源支持的性能结论。",
  };

  return {
    ...module,
    lessons: [overview, ...lessons],
  };
};
