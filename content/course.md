你说得对。上一版更像“技术地图”，还不是能照着执行的“课程表”。

下面给你一条 **52 周、每周约 12～15 小时**的路线。目标不是“了解 CUDA”，而是最终达到：

> 能独立实现和优化大模型 CUDA Kernel，接入 PyTorch，使用 Nsight 定位瓶颈，理解 FlashAttention、Tensor Core、CUTLASS/CuTe，并具备多 GPU 训练系统基础。

主线定位：

> **CUDA Kernel Engineer → LLM Kernel Engineer → 大模型训练系统工程师**

---

# 一、教材版本先统一

为了避免不同版本章节编号混乱，采用：

### 主教材

**《Programming Massively Parallel Processors》第 4 版，简称 PMPP4**

第 4 版章节划分清楚，适合按周学习：

* 第 1～6 章：CUDA、GPU 架构、内存和基础优化；
* 第 9～11 章：Histogram、Reduction、Scan；
* 第 16 章：深度学习；
* 第 20 章：CUDA Stream 与异构集群。

第 5 版于 2026 年出版，新增了高级矩阵乘法、大语言模型、warp-level 编程、Cooperative Groups、NCCL 和 NVSHMEM 等内容，但结构重新组织，所以将它作为专题补充，不按章节编号安排。([[oreilly.com](https://www.oreilly.com/library/view/programming-massively-parallel/9780323984638/xhtml/Contents.xhtml?utm_source=chatgpt.com)][1])

### 官方资料

当前 CUDA Programming Guide 已重新组织为：

* Part 1：编程模型；
* Part 2：CUDA GPU 编程；
* Part 3：高级 CUDA；
* Part 4：CUDA 特性；
* Part 5：技术附录。

前 3 部分适合顺序学习，后两部分适合作为工具书。([[NVIDIA Docs](https://docs.nvidia.com/cuda/cuda-programming-guide/index.html)][2])

---

# 二、所有阶段统一验收标准

以后每写一个 Kernel，都按下面标准验收。

## 1. 正确性

至少测试：

* 正常尺寸；
* 非 2 的幂尺寸；
* 非 Block Size 整数倍；
* 很小尺寸；
* 较大尺寸；
* 连续 Tensor；
* 能支持时测试非连续 Tensor；
* 随机输入；
* 极端输入，如大数、小数和全零。

误差标准可以暂定：

```text
FP32:
rtol <= 1e-4
atol <= 1e-5

FP16 / BF16:
rtol <= 1e-2
atol <= 1e-2
```

归约、Softmax、Attention 等算子要根据累加顺序适当放宽，但必须解释误差来源。

## 2. 性能测试

统一执行：

```text
预热：至少 20 次
正式测量：至少 100 次
Shape：至少 5 组
记录：Median、P95、最小值
计时：CUDA Event
```

不能只运行一次，也不能使用普通 Python 时间函数后直接下结论。

## 3. 性能分析

每个重要 Kernel 至少保存一份 Nsight Compute 报告，说明：

* Memory Throughput；
* Compute Throughput；
* Occupancy；
* Register Usage；
* Shared Memory Usage；
* Warp Stall 原因；
* 分支效率；
* 是否存在不合并访存；
* 是计算受限还是带宽受限。

Nsight Compute 用于 Kernel 级详细分析，Nsight Systems 用于观察 CPU、CUDA Runtime、Kernel、显存复制和 Stream 的整体时间线。([[NVIDIA Docs](https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html?utm_source=chatgpt.com)][3])

## 4. 工程要求

每个项目至少包含：

```text
src/
tests/
benchmarks/
profiles/
docs/
CMakeLists.txt
README.md
```

README 必须写：

* 算子定义；
* 输入输出；
* 并行方案；
* 正确性结果；
* Benchmark；
* 瓶颈分析；
* 优化过程；
* 当前限制。

---

# 三、第 0 阶段：前置能力诊断与定向复习

**时间：第 1～2 周**

你是计算机科班，不重新学完整的操作系统、数据结构和 C++，只补 CUDA 工程直接需要的部分。

---

## 第 1 周：C++、内存与编译工程

### 需要完善的能力

**【科班复习】**

* 栈与堆；
* 指针和引用；
* 对象生命周期；
* 静态库与动态库；
* 编译与链接；
* Cache Line；
* 空间局部性和时间局部性。

**【必须掌握】**

* RAII；
* 移动语义；
* 模板函数；
* 编译期常量；
* 内存对齐；
* `restrict` 思想；
* CMake；
* GDB；
* AddressSanitizer。

### 编程任务

实现一个 CPU 端的基础库：

```text
cpp-foundation/
├── include/
│   ├── aligned_buffer.hpp
│   ├── timer.hpp
│   └── tensor_view.hpp
├── src/
├── tests/
└── CMakeLists.txt
```

要求实现：

1. 一个 RAII 管理的对齐内存类；
2. 一个支持二维 Shape 和 Stride 的 `TensorView`；
3. CPU 矩阵乘法；
4. CPU Softmax；
5. GoogleTest 或 Catch2 单元测试；
6. 编译成共享库。

### 达到的深度

本周结束，你必须能回答：

* 移动构造函数解决什么问题？
* 模板参数和运行时参数有什么区别？
* 为什么矩阵按行访问通常比按列访问快？
* 静态库和动态库有什么差异？
* 为什么内存对齐可能影响 SIMD 和 GPU 访存？
* CMake 是如何组织 `.cpp`、`.cu` 和测试程序的？

### 验收

不看资料，能在 90 分钟内：

* 创建一个 CMake C++ 项目；
* 编译共享库；
* 编写一个模板函数；
* 用单元测试验证 CPU Softmax；
* 使用 GDB 定位一次数组越界。

全部做到，可以把本周压缩成 3～4 天。

### 推荐阅读

先完成本周页面中的 18 个 Item 教程、练习与测验，再带着具体问题阅读原书：

* 《Effective Modern C++》Item 1～4：类型推导；
* 《Effective Modern C++》Item 5～8：`auto`、初始化与 `nullptr`；
* 《Effective Modern C++》Item 17～23：特殊成员函数、智能指针、Pimpl、移动与完美转发；
* 《Effective Modern C++》Item 37～39：线程收尾、异步句柄与一次性事件通信；
* 《深入理解计算机系统》第 3 版第 3、5、6 章及第 7 章前半部分：函数调用、性能、存储层次与链接。

> 推荐阅读是知识点讲完后的延伸，不代替页面教程。先做题，再对照书里的完整论证。

---

## 第 2 周：浮点数、Transformer 计算与性能模型

### 阅读

#### PMPP4

* 附录 A：Numerical Considerations；
* 第 1 章：Introduction。

#### 《Build a Large Language Model From Scratch》

重点读：

* 第 3 章：Attention；
* 第 4 章：GPT 模型结构。

第 3 章从头实现 Self-Attention，第 4 章将其组装成 GPT 风格模型。([[Manning Publications](https://www.manning.com/preview/build-a-large-language-model-from-scratch/chapter-3?utm_source=chatgpt.com)][4])

#### CSAPP

* 第 2 章中浮点数表示部分；
* 第 5 章中循环展开、内存访问和编译器优化部分。

### 需要完善的能力

**【科班复习】**

* IEEE 754；
* FP32；
* 矩阵乘法；
* 链式法则；
* Big-O；
* Cache 和带宽。

**【主修】**

* FP16；
* BF16；
* TF32；
* FP8 的基本概念；
* Softmax 数值稳定性；
* Mixed Precision；
* FLOPs；
* 内存访问量；
* Arithmetic Intensity；
* Compute-bound 与 Memory-bound。

### 编程任务

使用 PyTorch 实现：

* Linear；
* Softmax；
* RMSNorm；
* RoPE；
* MHA；
* GQA；
* SwiGLU。

再写一个模型配置分析器：

```bash
python analyze_model.py --hidden-size 4096 \
                        --layers 32 \
                        --heads 32 \
                        --kv-heads 8 \
                        --seq-len 4096 \
                        --dtype bf16
```

输出：

* 参数量；
* 权重显存；
* 单层 QKV Shape；
* Attention 矩阵大小；
* KV Cache 大小；
* 主要矩阵乘法 Shape；
* 近似 FLOPs；
* 近似内存读写量。

### 达到的深度

必须能够不查资料推导：

```text
X: [B, S, H]
Q: [B, Nq, S, D]
K/V: [B, Nkv, S, D]
Attention Score: [B, Nq, S, S]
```

并能解释：

* MHA、MQA、GQA 对 KV Cache 的影响；
* Softmax 为什么需要减去最大值；
* FP16 累加为什么容易出现精度问题；
* 为什么 RMSNorm 通常是带宽受限算子；
* 为什么矩阵乘法通常更偏计算受限。

### 验收

给你一个任意 Transformer 配置，应在 30 分钟内算出：

* 权重显存的数量级；
* KV Cache 显存；
* Attention 的主要 Tensor Shape；
* 主要 GEMM 的 M、N、K；
* 哪些算子值得融合。

---

# 四、第 1 阶段：CUDA 编程模型与 GPU 架构

**时间：第 3～8 周**

这是第一个真正的 CUDA 阶段。

---

## 第 3 周：CUDA 程序基本结构

### 阅读

#### PMPP4

* 第 2 章：Heterogeneous Data Parallel Computing。

#### CUDA Programming Guide

* 1.1 Introduction；
* 1.2 Programming Model；
* 1.3 CUDA Platform；
* 2.1 Intro to CUDA C++。

官方指南将 Part 1 和 Part 2 定位为 CUDA 新学习者的引导式内容。([[NVIDIA Docs](https://docs.nvidia.com/cuda/cuda-programming-guide/index.html)][2])

### 学习要求

掌握：

* Host 与 Device；
* Kernel；
* `__global__`；
* `__device__`；
* `__host__`；
* `cudaMalloc`；
* `cudaMemcpy`；
* `cudaFree`；
* Kernel Launch；
* Grid、Block、Thread；
* CUDA 错误检查；
* CUDA Event。

### 编程任务

实现：

1. Vector Add；
2. SAXPY；
3. Vector Scale；
4. Element-wise ReLU；
5. Element-wise SiLU。

每个算子都需要：

* CPU Reference；
* CUDA Kernel；
* 随机测试；
* 边界测试；
* CUDA Event Benchmark。

### 达到的深度

你不能只会复制代码，必须能够解释：

```cpp
kernel<<<grid_size, block_size>>>(...);
```

其中：

* Grid Size 为什么这样计算；
* Block Size 为什么选择 128、256 或 512；
* 数据规模不是 Block Size 整数倍时如何处理；
* Kernel Launch 为什么是异步的；
* 为什么错误检查通常需要检查 Launch 和同步结果。

### 验收

在空白文件中独立写出 Vector Add，包括：

* CUDA 内存分配；
* H2D；
* Kernel；
* D2H；
* 错误处理；
* Event 计时；
* 结果验证。

---

## 第 4 周：多维线程映射

### 阅读

#### PMPP4

* 第 3 章：Multidimensional Grids and Data。

#### CUDA Programming Guide

* 2.3 Writing SIMT Kernels；
* 5.4 C/C++ Language Extensions 中与内置变量、Kernel Launch 有关的部分。

### 学习要求

掌握：

* `threadIdx`；
* `blockIdx`；
* `blockDim`；
* `gridDim`；
* `dim3`；
* 一维、二维、三维线程映射；
* 线程与 Tensor 坐标的映射；
* Boundary Check；
* Grid-stride Loop。

### 编程任务

实现：

1. Matrix Add；
2. Matrix Copy；
3. RGB 图像灰度化；
4. 2D Transpose Naive 版本；
5. Batched Element-wise Kernel。

### 深度要求

必须能够自己设计：

```text
一个线程处理一个元素
一个线程处理多个元素
一个 Block 处理一行
一个 Block 处理一个 Tile
```

并说明各自适合什么数据布局。

### 验收

给出 `[B, H, S, D]` Tensor，能够设计线程索引，将它映射到线性地址，并正确处理任意 Shape。

---

## 第 5 周：Warp、SIMT 与分支发散

### 阅读

#### PMPP4

* 第 4 章：Compute Architecture and Scheduling。

#### CUDA Programming Guide

* 2.3 Writing SIMT Kernels；
* 3.2 Advanced Kernel Programming 中 Warp 和执行模型相关内容；
* 5.8 CUDA C++ Execution Model。

### 学习要求

掌握：

* SM；
* Warp；
* SIMT；
* Warp Scheduler；
* Active Warp；
* Eligible Warp；
* Branch Divergence；
* Latency Hiding；
* Block 调度；
* Warp-level Execution。

### 编程实验

设计三组实验：

#### 实验 A：分支发散

```cpp
if (threadIdx.x % 2 == 0) {
    ...
} else {
    ...
}
```

对比：

* Warp 内发散；
* Warp 间分支；
* 无分支版本。

#### 实验 B：Block Size

测试：

```text
32
64
128
256
512
1024
```

观察性能和 Occupancy。

#### 实验 C：每线程工作量

每个线程分别处理：

```text
1
2
4
8
```

个元素。

### 深度要求

必须能解释：

* Warp 发散是如何发生的；
* 为什么 `if` 不一定慢；
* 为什么 Block 越大不一定越快；
* 为什么 Occupancy 高不等于性能一定高；
* GPU 如何通过切换 Warp 隐藏延迟。

### 验收

使用 Nsight Compute 找到一个 Kernel 的：

* Warp 数量；
* Branch Efficiency；
* Occupancy；
* 主要 Stall 原因。

并写一页分析报告。

---

## 第 6 周：GPU 内存体系

### 阅读

#### PMPP4

* 第 5 章：Memory Architecture and Data Locality。

#### CUDA Best Practices Guide

精读：

* 10.2.1 Coalesced Access；
* 10.2.2 L2 Cache；
* 10.2.3 Shared Memory；
* 10.2.6 Constant Memory；
* 10.2.7 Registers；
* 10.2.7.1 Register Pressure。

这些章节分别覆盖合并访存、L2、共享内存、寄存器和寄存器压力。([[NVIDIA Docs](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/contents.html)][5])

### 学习要求

掌握：

* Global Memory；
* L2 Cache；
* Shared Memory；
* Register；
* Local Memory；
* Constant Memory；
* Memory Transaction；
* Coalesced Access；
* Misaligned Access；
* Strided Access；
* Shared Memory Bank；
* Bank Conflict。

### 编程任务：矩阵转置

实现四版：

1. Naive Transpose；
2. Coalesced Read；
3. Shared Memory Tiled；
4. Padding 避免 Bank Conflict。

例如：

```cpp
__shared__ float tile[TILE][TILE + 1];
```

但必须解释为什么加 1，而不能只背代码。

### 深度要求

必须能从地址计算判断：

* 一个 Warp 会产生多少内存事务；
* 为什么按列读取可能变成 Strided Access；
* Shared Memory 为什么能改善 Transpose；
* 为什么 Shared Memory 也可能发生冲突；
* Register Spill 后数据通常去哪。

### 验收

Nsight Compute 报告中至少对比：

* Global Load Efficiency；
* Global Store Efficiency；
* Shared Memory Bank Conflict；
* DRAM Throughput；
* Kernel Duration。

目标不是达到某个固定 GB/s，而是能证明每一步优化为什么有效。

---

## 第 7 周：性能指标与优化方法

### 阅读

#### PMPP4

* 第 6 章：Performance Considerations。

#### CUDA Best Practices Guide

精读：

* 第 4 章 Application Profiling；
* 第 7 章 Getting the Right Answer；
* 第 9 章 Performance Metrics；
* 第 11 章 Execution Configuration；
* 第 13 章 Control Flow。

其中第 9 章包括 GPU Timer 和有效带宽计算，第 11 章包括 Occupancy、Block 配置和并发 Kernel。([[NVIDIA Docs](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/contents.html)][5])

### 学习要求

掌握：

* Theoretical Bandwidth；
* Effective Bandwidth；
* Arithmetic Intensity；
* Occupancy；
* Register Pressure；
* Shared Memory 限制；
* Roofline 基础；
* Amdahl’s Law；
* Kernel Launch Overhead；
* Throughput 与 Latency。

### 编程任务

编写统一 Benchmark 框架：

```bash
./benchmark \
  --kernel transpose \
  --rows 4096 \
  --cols 4096 \
  --warmup 20 \
  --repeat 100
```

输出：

```text
median latency
p95 latency
effective bandwidth
estimated FLOPs
arithmetic intensity
maximum error
GPU model
CUDA version
compile flags
```

### 深度要求

能够针对一个 Kernel 给出：

```text
理论最小内存流量
理论 FLOPs
Arithmetic Intensity
实测带宽
实测吞吐
瓶颈判断
```

### 验收

对 Vector Add、Transpose 和 SiLU 分别判断：

* 更偏带宽受限还是计算受限；
* 是否值得使用 Shared Memory；
* 是否值得 Kernel Fusion。

---

## 第 8 周：Stream、异步执行与阶段项目

### 阅读

#### CUDA Programming Guide

* 2.5 Asynchronous Execution；
* 4.9 Asynchronous Barriers；
* 4.10 Pipelines；
* 4.11 Asynchronous Data Copies。

#### CUDA Best Practices Guide

* 10.1 Host 与 Device 数据传输；
* 10.1.1 Pinned Memory；
* 10.1.2 异步传输与计算重叠。

([[NVIDIA Docs](https://docs.nvidia.com/cuda/cuda-programming-guide/index.html)][2])

### 学习要求

掌握：

* CUDA Stream；
* Default Stream；
* CUDA Event；
* Pinned Memory；
* Async Copy；
* H2D、Kernel、D2H 重叠；
* Stream Synchronization；
* Event Dependency。

### 编程任务

实现一个分块处理流水线：

```text
Chunk 0: H2D → Kernel → D2H
Chunk 1:      H2D → Kernel → D2H
Chunk 2:           H2D → Kernel → D2H
```

分别测试：

* 普通 Pageable Memory；
* Pinned Memory；
* 单 Stream；
* 双 Stream；
* 四 Stream。

### 阶段项目

完成：

> **CUDA Memory and Execution Lab**

至少包含：

* Vector Add；
* Transpose；
* SiLU；
* 多 Stream Pipeline；
* Benchmark 框架；
* Nsight Systems 报告；
* Nsight Compute 报告。

### 阶段通过标准

你应当可以：

1. 独立搭建 CUDA CMake 项目；
2. 正确编写 Kernel；
3. 解释 Warp 执行；
4. 识别合并访存；
5. 使用 Shared Memory；
6. 使用 CUDA Event；
7. 使用 Nsight；
8. 写出有证据的性能分析。

做不到其中任意两项，不进入下一阶段。

---

# 五、第 2 阶段：并行算法模式

**时间：第 9～14 周**

---

## 第 9 周：Reduction 基础

### 阅读

* PMPP4 第 10 章：Reduction；
* CUDA Programming Guide 中 Synchronization 和 Atomic 相关部分。

### 实现顺序

1. Interleaved Addressing；
2. Sequential Addressing；
3. Shared Memory Reduction；
4. 每线程多元素；
5. 展开最后一个 Warp。

### 要掌握

* Reduction Tree；
* 同步位置；
* 分支发散；
* Shared Memory；
* 非 2 的幂长度；
* 多 Block Reduction。

### 验收

实现任意长度数组求和，并与：

* CPU；
* `torch.sum`；
* CUB 或等效高性能实现

比较正确性和性能。

---

## 第 10 周：Warp-level Programming

### 阅读

* PMPP5 中 warp-level programming 专题；
* CUDA Programming Guide 4.4 Cooperative Groups；
* Warp Shuffle 相关 API 文档。

第 5 版新增了更完整的 warp-level 和 Cooperative Groups 内容。([[Google 图书](https://books.google.com/books?id=KRN3EQAAQBAJ)][6])

### 实现

* `__shfl_down_sync` Reduction；
* Warp Max；
* Warp Sum；
* Block Reduction；
* Cooperative Groups 版本。

### 深度要求

理解：

* Shuffle 与 Shared Memory 的区别；
* Mask 的含义；
* Warp-level 同步；
* 为什么不能错误假设所有线程都 Active。

---

## 第 11 周：Prefix Sum / Scan

### 阅读

* PMPP4 第 11 章：Prefix Sum。

### 实现

1. Hillis-Steele；
2. Blelloch Scan；
3. Block Scan；
4. 多 Block Scan；
5. Exclusive 和 Inclusive Scan。

### 深度要求

能够分析：

* Work Complexity；
* Span；
* Work-efficient；
* Bank Conflict；
* 多 Block 间状态传递。

---

## 第 12 周：Histogram 与 Atomic

### 阅读

* PMPP4 第 9 章：Parallel Histogram。

### 实现

1. Global Atomic；
2. Shared Memory Privatization；
3. Warp Privatization；
4. 分层合并。

### 深度要求

理解：

* Atomic Contention；
* Privatization；
* 热点分布；
* 数据分布如何影响性能。

必须测试：

* 均匀分布；
* 高度偏斜分布；
* 全部元素相同。

---

## 第 13 周：Convolution、Stencil 与缓存

### 阅读

* PMPP4 第 7 章：Convolution；
* PMPP4 第 8 章：Stencil。

### 实现

* 1D Convolution；
* 2D Convolution；
* Constant Memory Filter；
* Shared Memory Halo；
* Tiled Stencil。

### 深度要求

理解：

* Halo；
* Tile；
* 数据复用；
* Constant Cache；
* Boundary Handling；
* Tile Size 与 Shared Memory 消耗。

---

## 第 14 周：阶段项目

完成：

> **Parallel Primitives Library**

包含：

* Reduction；
* Scan；
* Histogram；
* Convolution；
* Transpose。

每个算子至少有：

* Naive；
* Optimized；
* 正确性测试；
* 5 组以上 Shape；
* Nsight 分析；
* 优化日志。

通过标准：

> 能根据一个陌生并行问题，判断它更接近 Map、Reduction、Scan、Histogram、Stencil 还是 GEMM。

---

# 六、第 3 阶段：GEMM、流水线与 Tensor Core

**时间：第 15～20 周**

---

## 第 15 周：Naive GEMM 与性能模型

### 阅读

* PMPP4 中矩阵乘法相关内容；
* PMPP5 的 Advanced Matrix Multiplication 专题；
* CUDA Best Practices 10.2.3.2 Shared Memory in GEMM。

### 实现

* CPU GEMM；
* Naive CUDA GEMM；
* cuBLAS 基线。

### 深度要求

推导：

```text
C[M,N] = A[M,K] × B[K,N]

FLOPs ≈ 2MNK
```

计算理论内存流量和 Arithmetic Intensity。

---

## 第 16 周：Shared Memory Tiling

实现：

* 16×16 Tile；
* 32×32 Tile；
* 非整除尺寸；
* Boundary Mask；
* 不同 Tile Size 对比。

掌握：

* A Tile；
* B Tile；
* 数据复用；
* 同步；
* Shared Memory 容量。

---

## 第 17 周：Register Tiling 与向量化

实现：

* 每线程一个输出；
* 每线程多个输出；
* Register Tile；
* `float2` / `float4` Load；
* Loop Unroll。

理解：

* Register Reuse；
* Register Pressure；
* Occupancy Trade-off；
* 向量化 Load 的对齐要求。

---

## 第 18 周：Double Buffering 与 Async Copy

### 阅读

* CUDA Programming Guide 4.9～4.11；
* CUTLASS Efficient GEMM 文档中的分层 Tiling 思想。

CUTLASS 的 GEMM 将 Tile 映射到 Threadblock、Warp 和指令级，并在 Shared Memory 与 Register 中利用局部性。([[NVIDIA Docs](https://docs.nvidia.com/cutlass/latest/media/docs/cpp/efficient_gemm.html?utm_source=chatgpt.com)][7])

### 实现

* 双缓冲 Shared Memory；
* 加载下一块时计算当前块；
* 有条件时实验异步复制。

### 深度要求

能够画出：

```text
Load Tile 0
Compute Tile 0 + Load Tile 1
Compute Tile 1 + Load Tile 2
...
```

---

## 第 19 周：Tensor Core 与混合精度

学习：

* FP16/BF16 输入；
* FP32 Accumulator；
* WMMA 基础；
* Tensor Core Tile；
* TF32；
* cuBLAS 与 cuBLASLt 基础。

实现：

* WMMA GEMM；
* FP16 GEMM；
* FP32 Accumulation；
* 与普通 CUDA Core GEMM 对比。

---

## 第 20 周：GEMM 综合分析

最终至少保留：

1. Naive；
2. Shared Memory Tiled；
3. Register Tiled；
4. Double Buffered；
5. Tensor Core；
6. cuBLAS Baseline。

### 通过标准

不是要求击败 cuBLAS，而是能够解释：

* 为什么你的 Kernel 慢；
* 差距来自访存、指令、流水线还是 Tile；
* 哪些 Shape 表现好；
* 哪些 Shape 性能差；
* Register、Shared Memory、Occupancy 如何相互制约。

---

# 七、第 4 阶段：PyTorch 自定义 CUDA 算子

**时间：第 21～25 周**

PyTorch 官方推荐通过自定义算子注册，将 C++/CUDA Kernel 与 Autograd、`torch.compile`、FakeTensor 等子系统组合，而不只是简单传递裸指针。([[PyTorch 文档](https://docs.pytorch.org/tutorials/advanced/cpp_custom_ops.html?utm_source=chatgpt.com)][8])

---

## 第 21 周：PyTorch Tensor 内部表示

学习：

* Storage；
* Shape；
* Stride；
* Contiguous；
* View；
* Dtype；
* Device；
* Data Pointer；
* Dispatcher 基础。

任务：

* 打印不同 Tensor 的 Shape 和 Stride；
* 手写连续性判断；
* 使用 C++ 读取 PyTorch Tensor。

---

## 第 22 周：C++/CUDA Extension

### 阅读官方教程

重点看：

* Build System；
* C++/CUDA Source；
* Operator Schema；
* `TORCH_LIBRARY`；
* CPU/CUDA Registration；
* Python Binding。

### 任务

实现：

> Fused Multiply + Add

要求：

```python
torch.ops.my_ops.fma(a, b, c)
```

可直接调用。

---

## 第 23 周：Fused RMSNorm Forward

实现：

* PyTorch Reference；
* CUDA FP32；
* CUDA FP16/BF16；
* 每行一个 Block；
* Warp Reduction；
* 向量化读取。

测试 Shape：

```text
[1, 128]
[32, 768]
[1024, 4096]
[4096, 4096]
[8192, 8192]
```

深度要求：

* 解释为什么 RMSNorm 是归约加逐元素运算；
* 解释为什么适合融合；
* 计算中间 Tensor 被消除后减少了多少显存流量。

---

## 第 24 周：Backward 和 Autograd

推导并实现：

* RMSNorm Input Gradient；
* Weight Gradient；
* Autograd Registration；
* `gradcheck`；
* FP32 Reference；
* 混合精度误差分析。

深度要求：

不能只让 PyTorch 自动求导，必须理解 Backward 数学公式和并行归约位置。

---

## 第 25 周：完整算子兼容性

完善：

* FakeTensor；
* `opcheck`；
* `torch.compile`；
* Error Handling；
* Dtype Dispatch；
* Device Check；
* Shape Check；
* CI 测试。

阶段项目：

> **Production-style Fused RMSNorm Extension**

通过标准：

* 能安装；
* 能测试；
* 能前向；
* 能反向；
* 能被 PyTorch 调用；
* 能被 Benchmark；
* 有 Nsight 报告；
* 有完整 README。

---

# 八、第 5 阶段：Triton Kernel

**时间：第 26～30 周**

Triton 官方建议按教程顺序学习，从 Vector Addition 开始，再进入 Fused Softmax 和 Matrix Multiplication。([[Triton Language](https://triton-lang.org/main/getting-started/tutorials/index.html?utm_source=chatgpt.com)][9])

---

## 第 26 周：Triton 编程模型

阅读官方：

* Vector Addition；
* Fused Softmax。

实现：

* Vector Add；
* SiLU；
* Fused Bias + SiLU；
* Softmax。

掌握：

* Program Instance；
* `tl.program_id`；
* Block；
* Mask；
* Pointer Arithmetic；
* `tl.load`；
* `tl.store`；
* `tl.max`；
* `tl.sum`。

---

## 第 27 周：Triton Matmul

阅读 Matrix Multiplication Tutorial。

掌握：

* Block-level Matmul；
* 二维指针运算；
* `tl.dot`；
* L2 Cache Reordering；
* Autotune；
* `num_warps`；
* `num_stages`。

实现不同 M、N、K 的 Matmul。

---

## 第 28 周：Triton LLM 基础算子

实现：

* RMSNorm；
* LayerNorm；
* RoPE；
* SwiGLU。

要求：

* PyTorch Reference；
* Triton；
* CUDA C++；
* 同一 Benchmark 框架。

---

## 第 29 周：Autotune 与 Shape 泛化

测试：

```text
Batch
Sequence Length
Hidden Size
Head Dimension
Dtype
```

不能只针对一个 Shape 写死。

分析：

* 不同 Block Size；
* 不同 Warp 数；
* 不同 Stage；
* 小 Shape；
* 大 Shape；
* 不规则 Shape。

---

## 第 30 周：CUDA 与 Triton 对照项目

选择两个算子：

* RMSNorm；
* SwiGLU。

分别实现：

```text
PyTorch
torch.compile
Triton
CUDA C++
```

比较：

* 开发复杂度；
* 编译时间；
* 性能；
* Shape 泛化；
* 调试难度；
* 数值误差。

---

# 九、第 6 阶段：FlashAttention 与大模型核心 Kernel

**时间：第 31～37 周**

FlashAttention 的核心是 IO-aware：通过 Tiling 减少 HBM 和片上 SRAM 之间的数据读写，而不是近似 Attention。([[arXiv](https://arxiv.org/abs/2205.14135?utm_source=chatgpt.com)][10])

---

## 第 31 周：普通 Attention 实现

重新实现：

```text
QK^T
Scale
Mask
Softmax
PV
```

要求记录每一步：

* Shape；
* FLOPs；
* 中间 Tensor；
* HBM 读写；
* 峰值显存。

---

## 第 32 周：Online Softmax

学习并实现：

* 分块最大值；
* 分块指数和；
* Running Max；
* Running Sum；
* 分块结果重缩放。

先写：

1. Python 版本；
2. PyTorch 版本；
3. CUDA 版本。

深度要求：

能从数学上证明分块 Softmax 与完整 Softmax 等价。

---

## 第 33 周：精读 FlashAttention

重点阅读：

* 摘要与引言；
* 标准 Attention 的 IO 分析；
* FlashAttention Algorithm；
* IO Complexity；
* Forward；
* Backward。

整理：

```text
标准 Attention 写回哪些中间结果
FlashAttention 保留哪些片上状态
Q、K、V 如何分块
Softmax 状态如何更新
为什么不需要保存完整 S×S 矩阵
```

---

## 第 34 周：Mini FlashAttention Forward

第一版限制：

* FP32；
* 固定 Head Dimension；
* 不支持 Dropout；
* 单 GPU；
* Forward Only；
* 支持 Causal Mask。

目标是正确，不追求极致性能。

---

## 第 35 周：混合精度与 Shape 扩展

增加：

* FP16/BF16；
* FP32 累加；
* 多个 Head Dimension；
* 多种 Sequence Length；
* Non-causal；
* Causal。

测试与：

* PyTorch SDPA；
* 普通 Attention；
* 开源 FlashAttention

的结果差异。

---

## 第 36 周：Backward

推导并实现：

* `dQ`；
* `dK`；
* `dV`；
* Softmax Backward；
* 分块重计算。

可以先用 Triton 实现，再尝试 CUDA。

---

## 第 37 周：FlashAttention-2/3/4 专题

FlashAttention-2 重点改进 Threadblock 和 Warp 的工作划分；FlashAttention-3 针对 Hopper 使用异步执行、Warp Specialization、TMA 和 FP8。2026 年的 FlashAttention-4 进一步针对 Blackwell 和异步 MMA 重新设计流水线。([[arXiv](https://arxiv.org/abs/2307.08691?utm_source=chatgpt.com)][11])

这一周不要求完整复现，而要求：

* 能解释 FA1、FA2、FA3 的主要差异；
* 能在 Nsight 中查看现有实现；
* 能定位 Matmul、Softmax 和数据搬运的时间；
* 完成 Mini FlashAttention 技术报告。

---

# 十、第 7 阶段：CUTLASS 与 CuTe

**时间：第 38～42 周**

CUTLASS 提供从 Device、Kernel、Collective 到 MMA/Copy Atom 等层级的 GEMM 抽象；CuTe 的主要概念包括 Layout、Tensor、Tiling 和 MMA 映射。([[NVIDIA Docs](https://docs.nvidia.com/cutlass/latest/media/docs/cpp/gemm_api_3x.html?utm_source=chatgpt.com)][12])

---

## 第 38 周：CUTLASS 基础

阅读：

* CUTLASS Overview；
* Efficient GEMM；
* GEMM API；
* Basic GEMM Example。

掌握：

* Device；
* Kernel；
* Collective；
* Threadblock Tile；
* Warp Tile；
* Instruction Tile；
* Epilogue。

---

## 第 39 周：CuTe Layout

阅读：

* `00_quickstart`；
* `01_layout`；
* `02_layout_algebra`；
* `03_tensor`。

官方建议从 GEMM Tutorial 或 Quickstart 入手，并按 Layout、Layout Algebra、Tensor 逐步学习。([[NVIDIA Docs](https://docs.nvidia.com/cutlass/latest/media/docs/cpp/cute/00_quickstart.html?utm_source=chatgpt.com)][13])

要求能理解：

* Shape；
* Stride；
* Layout；
* Composition；
* Tiling；
* Tensor；
* Coordinate Mapping。

---

## 第 40 周：CuTe GEMM

阅读：

* `0x_gemm_tutorial`。

实现或修改：

* CTA Tile；
* Thread Partition；
* Global-to-Shared Copy；
* Shared-to-Register Copy；
* GEMM Mainloop。

该教程从全局内存分 Tile、线程分区及 `cute::copy`、`cute::gemm` 主循环开始。([[NVIDIA Docs](https://docs.nvidia.com/cutlass/latest/media/docs/cpp/cute/0x_gemm_tutorial.html?utm_source=chatgpt.com)][14])

---

## 第 41 周：Fused Epilogue

实现：

> GEMM + Bias + SiLU / SwiGLU

比较：

* PyTorch 多 Kernel；
* `torch.compile`；
* Triton；
* CUTLASS；
* 自己的 CUDA。

---

## 第 42 周：CUTLASS 项目验收

完成：

> **Fused Linear Layer Kernel**

至少支持：

* FP16/BF16；
* Bias；
* Activation；
* 多种 M、N、K；
* PyTorch 调用；
* 正确性测试；
* Benchmark；
* Nsight 分析。

---

# 十一、第 8 阶段：多 GPU 与大模型训练系统

**时间：第 43～47 周**

这部分需要双卡或多卡环境，建议集中租用云 GPU。

---

## 第 43 周：NCCL

学习：

* Rank；
* Communicator；
* AllReduce；
* AllGather；
* ReduceScatter；
* Broadcast；
* Send/Recv；
* Ring；
* Tree；
* CUDA Stream 与 NCCL。

NCCL 官方提供 AllReduce、AllGather、ReduceScatter 和点对点通信等 GPU 通信原语。([[NVIDIA Docs](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html?utm_source=chatgpt.com)][15])

任务：

* 双 GPU AllReduce；
* 不同消息大小 Benchmark；
* PCIe/NVLink 带宽观察；
* Nsight Systems 查看通信。

---

## 第 44 周：DDP 与通信分析

实现小型 GPT：

* 单卡；
* 双卡 DDP；
* Gradient Accumulation；
* Mixed Precision；
* Activation Checkpointing。

记录：

* Step Time；
* Tokens/s；
* 显存；
* AllReduce 时间；
* Scaling Efficiency。

---

## 第 45 周：Tensor Parallel

学习：

* Column Parallel Linear；
* Row Parallel Linear；
* Attention Head 切分；
* AllReduce；
* AllGather；
* Sequence Parallel。

任务：

自己实现一个简化 Tensor Parallel MLP。

---

## 第 46 周：Megatron Core

阅读官方 Parallelism Guide：

* Tensor Parallel；
* Pipeline Parallel；
* Sequence Parallel；
* Context Parallel；
* Expert Parallel。

Megatron Core 当前支持这些并行策略的组合，用于大规模模型训练。([[NVIDIA Docs](https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html?utm_source=chatgpt.com)][16])

任务：

* 跑通小型 Megatron GPT；
* 修改 TP；
* 修改 Micro Batch；
* 观察 Pipeline Bubble。

---

## 第 47 周：分布式训练报告

报告必须包含：

```text
单卡吞吐
双卡吞吐
扩展效率
显存占用
计算时间
通信时间
AllReduce 占比
Pipeline Bubble
MFU 或近似利用率
```

通过标准：

能够回答：

* 为什么两张 GPU 不等于两倍性能？
* Tensor Parallel 为什么需要通信？
* ReduceScatter 与 AllGather 如何组合？
* 通信与计算如何重叠？
* Pipeline Bubble 如何产生？
* TP、DP、PP 应该如何组合？

---

# 十二、第 9 阶段：作品集、源码与求职

**时间：第 48～52 周**

---

## 第 48 周：整理 CUDA Kernel 库

保留最成熟的：

* Transpose；
* Reduction；
* Scan；
* Softmax；
* RMSNorm；
* GEMM；
* SwiGLU。

删除纯练习代码，统一接口和测试。

---

## 第 49 周：整理 LLM Kernel 库

保留：

* RMSNorm Forward/Backward；
* RoPE；
* SwiGLU；
* Mini FlashAttention；
* Fused Linear。

每个项目都需要中文和英文 README。

---

## 第 50 周：阅读真实源码

选两个项目：

* PyTorch；
* Triton；
* FlashAttention；
* CUTLASS；
* Megatron Core。

阅读目标不是全读，而是追踪一个完整调用链，例如：

```text
Python API
→ Operator Registration
→ C++ Dispatch
→ CUDA Launch
→ Kernel
```

---

## 第 51 周：开源贡献

目标不是提交大型功能，而是完成至少一次：

* 修复编译问题；
* 补测试；
* 补 Benchmark；
* 修文档；
* 修复边界 Shape；
* 添加一种 Dtype；
* 复现并提交 Issue。

---

## 第 52 周：面试准备

必须能手写或讲解：

* Vector Add；
* Reduction；
* Tiled GEMM；
* Softmax；
* Online Softmax；
* RMSNorm；
* Warp Shuffle；
* Coalesced Access；
* Bank Conflict；
* Occupancy；
* FlashAttention；
* Tensor Parallel；
* AllReduce。

---

# 十三、书籍与章节总表

| 资料                       | 阅读范围                                       | 对应能力                     | 深度             |
| ------------------------ | ------------------------------------------ | ------------------------ | -------------- |
| Effective Modern C++     | Item 1～8、17～23、37～39                       | C++ 工程基础                 | 能写模板、RAII、移动语义 |
| CSAPP                    | 第 2、3、5、6、7 章选读                            | 浮点、内存、性能、链接              | 复习，不做全部习题      |
| PMPP4                    | 第 1～6 章                                    | CUDA 和 GPU 基础            | 精读并完成代码        |
| PMPP4                    | 第 9～11 章                                   | Histogram、Reduction、Scan | 精读并实现多版本       |
| PMPP4                    | 第 7～8 章                                    | 卷积、Stencil、缓存            | 实现 Tiled 版本    |
| PMPP4                    | 第 16 章                                     | 深度学习计算                   | 理解 DNN 算子映射    |
| PMPP4                    | 第 20 章                                     | Stream、异构和通信             | 配合官方文档         |
| PMPP5                    | LLM、Warp、Advanced GEMM、NCCL 专题             | 现代 CUDA 补充               | 按主题选读          |
| Build a LLM From Scratch | 第 3～4 章                                    | Attention 和 GPT 结构       | 手写所有核心模块       |
| CUDA Programming Guide   | Part 1～3                                   | CUDA 权威基础                | 顺序学习           |
| CUDA Best Practices      | 第 4、7、9～13 章                               | 正确性、内存、配置和性能             | 精读             |
| Triton Tutorials         | Vector Add、Softmax、Matmul 起                | Triton Kernel            | 跟写后独立重写        |
| CUTLASS/CuTe Docs        | Efficient GEMM、Layout、Tensor、GEMM Tutorial | 高性能 GEMM                 | 能修改模板和 Tile    |
| FlashAttention Papers    | FA1、FA2、FA3，FA4 选读                         | LLM Attention Kernel     | FA1 精读，后续理解演进  |
| NCCL Guide               | Collectives、Streams、Multi-process          | 多 GPU 通信                 | 能写双卡程序         |
| Megatron Core Guide      | TP、PP、SP、CP、EP                             | 大模型并行训练                  | 能跑通并分析         |

---

# 十四、每周时间分配

每周 12～15 小时建议：

| 内容            |     时间 |
| ------------- | -----: |
| 教材和官方文档       |   3 小时 |
| 编写 Kernel     |   6 小时 |
| 测试和 Benchmark |   2 小时 |
| Nsight 分析     |   2 小时 |
| 整理报告          | 1～2 小时 |

原则是：

> 每读 1 小时，至少写 2 小时代码。

CUDA 不能通过读书学会。

---

# 十五、半年和一年时应达到什么水平

## 20 周左右

应该具备：

* 熟练编写基础 CUDA Kernel；
* 理解 GPU 内存层次；
* 会 Reduction、Scan、Transpose、GEMM；
* 会用 Nsight；
* 能判断计算或带宽瓶颈。

这时可以尝试：

* GPU 开发实习；
* CUDA 初级岗位；
* HPC 初级岗位；
* 推理性能工程岗位。

## 30 周左右

应该具备：

* PyTorch 自定义 CUDA 算子；
* Forward/Backward；
* Triton；
* RMSNorm、RoPE、SwiGLU；
* CUDA 与 Triton 性能对比。

这时已经开始接近：

* LLM Kernel 工程岗位；
* 深度学习框架工程岗位；
* AI Infra 性能岗位。

## 42 周左右

应该具备：

* Mini FlashAttention；
* Tensor Core；
* CUTLASS/CuTe；
* Fused GEMM Epilogue；
* 更完整的 Kernel 性能分析。

## 52 周左右

应该具备：

* 单 GPU Kernel；
* LLM 核心算子；
* PyTorch 集成；
* FlashAttention 理解；
* CUTLASS/CuTe；
* NCCL；
* Megatron 并行训练基础；
* 3～4 个高质量公开项目。

这时你的简历定位就不再是“调用大模型的应用工程师”，而是：

> **大模型 CUDA Kernel / GPU 性能 / 训练系统工程师。**

[1]: https://www.oreilly.com/library/view/programming-massively-parallel/9780323984638/xhtml/Contents.xhtml?utm_source=chatgpt.com "Table of Contents - Programming Massively Parallel Processors, 4th ..."
[2]: https://docs.nvidia.com/cuda/cuda-programming-guide/index.html "CUDA Programming Guide — CUDA Programming Guide"
[3]: https://docs.nvidia.com/nsight-compute/ProfilingGuide/index.html?utm_source=chatgpt.com "2. Profiling Guide — NsightCompute 13.3 documentation"
[4]: https://www.manning.com/preview/build-a-large-language-model-from-scratch/chapter-3?utm_source=chatgpt.com "Build a Large Language Model (From Scratch) - 3 Coding Attention Mechanisms"
[5]: https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/contents.html "Contents — CUDA C++ Best Practices Guide 13.3 documentation"
[6]: https://books.google.com/books?id=KRN3EQAAQBAJ "Programming Massively Parallel Processors: A Hands-on Approach - Wen-mei W. Hwu, David B. Kirk, Izzat El Hajj - Google ブックス"
[7]: https://docs.nvidia.com/cutlass/latest/media/docs/cpp/efficient_gemm.html?utm_source=chatgpt.com "Efficient GEMM in CUDA — NVIDIA CUTLASS Documentation"
[8]: https://docs.pytorch.org/tutorials/advanced/cpp_custom_ops.html?utm_source=chatgpt.com "Custom C++ and CUDA Operators — PyTorch Tutorials 2.13.0+cu130 ..."
[9]: https://triton-lang.org/main/getting-started/tutorials/index.html?utm_source=chatgpt.com "Tutorials — Triton documentation"
[10]: https://arxiv.org/abs/2205.14135?utm_source=chatgpt.com "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness"
[11]: https://arxiv.org/abs/2307.08691?utm_source=chatgpt.com "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning"
[12]: https://docs.nvidia.com/cutlass/latest/media/docs/cpp/gemm_api_3x.html?utm_source=chatgpt.com "CUTLASS 3.0 GEMM API - NVIDIA Documentation Hub"
[13]: https://docs.nvidia.com/cutlass/latest/media/docs/cpp/cute/00_quickstart.html?utm_source=chatgpt.com "Getting Started With CuTe — NVIDIA CUTLASS Documentation"
[14]: https://docs.nvidia.com/cutlass/latest/media/docs/cpp/cute/0x_gemm_tutorial.html?utm_source=chatgpt.com "CuTe dense matrix-matrix multiply tutorial — NVIDIA CUTLASS Documentation"
[15]: https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html?utm_source=chatgpt.com "Collective Operations — NCCL 2.30.7 documentation"
[16]: https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html?utm_source=chatgpt.com "Parallelism Strategies Guide — Megatron Core - NVIDIA Documentation Hub"
