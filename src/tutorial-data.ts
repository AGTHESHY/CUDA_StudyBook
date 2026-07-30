import type {
  ContentBlock,
  TutorialLesson,
  TutorialModule,
} from "./types";
import { weekOneBookModule } from "./tutorials/week-one-book";
import { curatedWeeksTwoToEight } from "./tutorials/weeks-two-to-eight";
import {
  generatedTutorialModules,
  organizeTutorialModule,
} from "./tutorials/generated-weeks";

const p = (text: string): ContentBlock => ({ type: "paragraph", text });
const quote = (text: string): ContentBlock => ({ type: "quote", text });
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

const cppReferences = [
  {
    label: "C++ auto 类型说明",
    url: "https://learn.microsoft.com/en-us/cpp/cpp/auto-cpp?view=msvc-170",
    source: "Microsoft Learn",
  },
  {
    label: "C++ decltype 类型说明",
    url: "https://learn.microsoft.com/en-us/cpp/cpp/decltype-cpp?view=msvc-170",
    source: "Microsoft Learn",
  },
  {
    label: "C++ 类型系统",
    url: "https://learn.microsoft.com/en-us/cpp/cpp/cpp-type-system-modern-cpp?view=msvc-170",
    source: "Microsoft Learn",
  },
  {
    label: "C++ auto 入门练习",
    url: "https://www.w3schools.com/cpp/cpp_auto.asp",
    source: "W3Schools",
  },
];

const cudaReferences = [
  {
    label: "CUDA Programming Guide",
    url: "https://docs.nvidia.com/cuda/cuda-programming-guide/index.html",
    source: "NVIDIA",
  },
  {
    label: "CUDA Programming Model",
    url: "https://docs.nvidia.com/cuda/cuda-programming-guide/01-introduction/programming-model.html",
    source: "NVIDIA",
  },
  {
    label: "CUDA Samples",
    url: "https://github.com/NVIDIA/cuda-samples",
    source: "NVIDIA",
  },
];

const lesson = (
  value: Omit<TutorialLesson, "level" | "verification"> &
    Partial<Pick<TutorialLesson, "level" | "verification">>,
): TutorialLesson => ({
  level: "基础",
  verification: "示例按 C++17 / CUDA C++ 规则审阅；运行环境与命令在代码旁明确标注。",
  ...value,
});

const curatedTutorialModules: TutorialModule[] = [
  {
    week: 1,
    eyebrow: "C++ FOUNDATION · 深度教程",
    introduction:
      "CUDA C++ 不会替你消除 C++ 的类型、生命周期和所有权问题。这里先把最容易在 Kernel、模板和 PyTorch 扩展里出错的类型推导讲透。",
    lessons: [
      lesson({
        id: "w01-type-system",
        title: "类型系统与初始化",
        summary: "先建立静态类型、对象生命周期和初始化的共同语言。",
        duration: "25 分钟",
        objectives: [
          "区分变量名、对象、值和类型",
          "解释为什么 auto 仍然是静态类型",
          "用列表初始化避免未初始化值",
        ],
        sections: [
          {
            id: "w01-type-system-model",
            title: "类型不是运行时标签",
            blocks: [
              p(
                "C++ 是静态类型语言：表达式与对象的类型在编译期确定。变量一旦声明，类型不会在后续赋值时改变。`auto` 只是让编译器根据初始化表达式写出那个类型，并不会把 C++ 变成 Python 式动态类型。",
              ),
              code(`auto count = 3;        // int
count = 7;             // 正确：仍然给 int 赋值
// count = "seven";    // 错误：const char* 不能赋给 int

const auto scale = 0.5f; // const float`),
              quote(
                "阅读一行代码时，先问“这个表达式的类型和值类别是什么”，再问“它会复制、移动还是绑定引用”。这套习惯会直接迁移到 CUDA 模板 Kernel。",
              ),
            ],
          },
          {
            id: "w01-type-system-init",
            title: "让初始化表达意图",
            blocks: [
              p(
                "局部内置类型若未初始化，其值不确定。教程示例统一使用初始化，并在需要防止窄化转换时使用花括号。`int threads{256};` 比先声明、稍后再赋值更容易审查。",
              ),
              code(`int threads{256};
float alpha{0.5f};
std::vector<float> input(1024, 0.0f);

// int blocks{3.8}; // 编译错误：列表初始化拒绝窄化`),
              list(
                "`T name{value}`：强调创建对象时即建立有效状态。",
                "`T name(args...)`：常用于容器大小、构造函数参数。",
                "`T name = value`：同样是初始化，不是先默认构造再赋值。",
              ),
            ],
          },
        ],
        exercises: [
          {
            id: "w01-type-system-e1",
            prompt:
              "判断 `auto x = 1.0f; x = 2;` 中 x 的最终类型，并说明第二行是否会改变类型。",
            hint: "类型在第一行初始化时已经确定。",
            answer:
              "x 是 float。第二行把 int 值 2 转换为 float 后赋值，x 的类型仍然是 float。",
          },
        ],
        quiz: [
          {
            id: "w01-type-system-q1",
            question: "下面哪条描述最准确？",
            options: [
              "auto 变量可以在运行时改变类型",
              "auto 让编译器从初始化器推导静态类型",
              "auto 总是推导为指针",
              "auto 与模板无关",
            ],
            answer: 1,
            explanation:
              "auto 省略的是类型拼写，不是静态类型检查；推导结果在编译期确定。",
          },
        ],
        references: cppReferences,
      }),
      lesson({
        id: "w01-auto-rules",
        title: "auto：会丢掉什么",
        summary: "掌握值推导时顶层 const 与引用被移除的核心规则。",
        duration: "35 分钟",
        objectives: [
          "预测 auto、auto&、const auto& 的结果",
          "区分顶层 const 与底层 const",
          "为大对象选择复制或引用",
        ],
        sections: [
          {
            id: "w01-auto-rules-deduction",
            title: "值推导默认复制",
            blocks: [
              p(
                "裸 `auto` 像按值传参：它通常移除表达式最外层的引用与 const，得到一个新对象。对标量这很自然；对 `std::vector` 或张量包装器则可能产生昂贵复制。",
              ),
              code(`const int source = 42;
auto a = source;        // int：顶层 const 被移除
const auto b = source;  // const int：在推导结果上重新加 const

std::vector<float> values(1 << 20);
auto copy = values;     // 复制整个 vector
auto& alias = values;   // 引用原 vector，不复制`),
              p(
                "“顶层 const”修饰对象本身，例如 `const int`；“底层 const”修饰指针指向的对象，例如 `const int*` 中的 const。裸 auto 会保留底层 const，因为丢掉它会允许通过指针修改本应只读的对象。",
              ),
              code(`const int value = 7;
const int* ptr = &value;
auto p = ptr;           // const int*
// *p = 8;              // 错误：指向的 int 仍为 const`),
            ],
          },
          {
            id: "w01-auto-rules-choice",
            title: "工程中的选择表",
            blocks: [
              list(
                "`auto x = expr`：明确需要一个独立副本。",
                "`auto& x = expr`：需要修改已有左值，不接受临时对象。",
                "`const auto& x = expr`：只读访问且避免复制，也能绑定临时对象。",
                "`auto* p = expr`：强调这是指针，提升接口可读性。",
              ),
              quote(
                "默认不要为了“少写几个字符”使用 auto。它最有价值的场景，是类型由模板或迭代器产生、右侧已清楚表达类型，或显式保留引用语义。",
              ),
            ],
          },
        ],
        exercises: [
          {
            id: "w01-auto-rules-e1",
            prompt:
              "把 `auto weights = get_weights();` 改成不会复制大型 vector、且调用者不能修改元素的写法。",
            hint: "需要引用和 const 两个限定。",
            answer:
              "若 get_weights() 返回可长期存活的引用，写作 `const auto& weights = get_weights();`。如果它按值返回，const 引用会把临时对象生命周期延长到该局部作用域。",
          },
          {
            id: "w01-auto-rules-e2",
            prompt:
              "预测 `const int n = 4; const auto& r = n;` 中 r 的类型。",
            hint: "显式写出的 const 与 & 会保留。",
            answer: "r 的类型是 `const int&`。",
          },
        ],
        quiz: [
          {
            id: "w01-auto-rules-q1",
            question: "`const int n = 8; auto x = n;` 中 x 是什么类型？",
            options: ["const int&", "const int", "int", "int&"],
            answer: 2,
            explanation: "裸 auto 按值推导，移除顶层 const 和引用。",
          },
          {
            id: "w01-auto-rules-q2",
            question: "只读遍历一个大型容器元素，通常优先使用哪种形式？",
            options: [
              "for (auto item : items)",
              "for (const auto& item : items)",
              "for (auto* item : items)",
              "for (decltype(auto) item : items)",
            ],
            answer: 1,
            explanation: "const auto& 避免逐元素复制，并阻止意外修改。",
          },
        ],
        references: cppReferences,
      }),
      lesson({
        id: "w01-decltype",
        title: "decltype 与 decltype(auto)",
        summary: "从表达式查询类型，并理解那对关键的额外括号。",
        duration: "40 分钟",
        level: "进阶",
        objectives: [
          "区分 auto 推导和 decltype 查询",
          "解释 decltype(name) 与 decltype((name))",
          "避免返回悬空引用",
        ],
        sections: [
          {
            id: "w01-decltype-query",
            title: "decltype 查询表达式",
            blocks: [
              p(
                "`decltype(expr)` 不计算表达式，而是在编译期得到它的类型。对未加括号的变量名或成员访问，它直接返回声明类型；对其他表达式，它还会根据值类别生成 `T&`、`T&&` 或 `T`。",
              ),
              code(`int n = 0;
const int cn = 1;

decltype(n) a = 2;      // int
decltype(cn) b = 3;     // const int
decltype((n)) r = n;    // int&：额外括号形成左值表达式

static_assert(std::is_same_v<decltype(n), int>);
static_assert(std::is_same_v<decltype((n)), int&>);`),
              quote(
                "调试类型推导时，`static_assert(std::is_same_v<实际类型, 预期类型>)` 是可执行的说明书。",
              ),
            ],
          },
          {
            id: "w01-decltype-return",
            title: "返回值中的 decltype(auto)",
            blocks: [
              p(
                "普通 `auto` 返回值使用模板式推导，往往丢掉引用；`decltype(auto)` 则完全按 `decltype` 规则保留引用与 const。它适合转发包装器，也因此更容易把局部对象的引用错误地返回出去。",
              ),
              code(`std::vector<int> data{1, 2, 3};

auto first_copy() {
  return data[0];             // int
}

decltype(auto) first_ref() {
  return (data[0]);           // int&
}

decltype(auto) broken() {
  int local = 1;
  return (local);             // 危险：返回局部对象的悬空引用
}`),
              p(
                "规则不是“尽量保留引用”，而是“接口必须明确所有权与生命周期”。只有当被引用对象一定比返回引用活得更久时，才返回引用。",
              ),
            ],
          },
        ],
        exercises: [
          {
            id: "w01-decltype-e1",
            prompt:
              "写两个 static_assert，分别证明变量 `float x` 的 `decltype(x)` 是 float、`decltype((x))` 是 float&。",
            hint: "使用 `<type_traits>` 中的 std::is_same_v。",
            answer:
              "`static_assert(std::is_same_v<decltype(x), float>);` 和 `static_assert(std::is_same_v<decltype((x)), float&>);`。",
          },
        ],
        quiz: [
          {
            id: "w01-decltype-q1",
            question: "若 `int x;`，`decltype((x))` 的结果是什么？",
            options: ["int", "const int", "int&", "int&&"],
            answer: 2,
            explanation: "带括号的 x 是左值表达式，因此 decltype 得到 int&。",
          },
        ],
        references: cppReferences,
      }),
      lesson({
        id: "w01-template-deduction",
        title: "模板推导与转发引用",
        summary: "读懂 CUDA 模板 Kernel 和框架扩展中常见的 T、T& 与 T&&。",
        duration: "45 分钟",
        level: "进阶",
        objectives: [
          "把 auto 规则映射到模板参数推导",
          "识别转发引用",
          "使用 remove_cvref_t 获得基础类型",
        ],
        sections: [
          {
            id: "w01-template-deduction-rules",
            title: "auto 是模板推导的近亲",
            blocks: [
              p(
                "可把 `auto value = expr` 近似理解成把 expr 传给参数 `T value`；`auto&` 对应 `T&`。因此掌握 auto 不只是语法便利，而是在为模板 Kernel 的数据类型分派打基础。",
              ),
              code(`template <class T>
void inspect_value(T value);       // 按值：移除顶层 const / 引用

template <class T>
void inspect_ref(T& value);        // 左值引用：保留 const

template <class T>
void inspect_forward(T&& value);   // T 被推导时，这是转发引用`),
              p(
                "当函数模板参数恰为 `T&&` 且 T 参与推导时，左值实参会让 T 推导成左值引用，右值实参推导成非引用类型。引用折叠规则保证最终参数能正确绑定。",
              ),
              code(`template <class T>
void launch(T&& callable) {
  using Raw = std::remove_cvref_t<T>;
  static_assert(std::is_invocable_v<Raw&>);
  std::forward<T>(callable)();
}`),
            ],
          },
          {
            id: "w01-template-deduction-cuda",
            title: "为什么 CUDA 工程离不开它",
            blocks: [
              p(
                "泛型 Kernel 常以 `template <typename T>` 支持 float、half 或其他标量类型；框架扩展又会把张量访问器、流和回调层层传递。若误把引用写成值，就可能产生复制；若错误保留引用，则可能悬空。",
              ),
              list(
                "值类型分派：明确支持的 T，并用编译期断言拒绝未知类型。",
                "包装器返回：除非确有引用语义，否则优先显式返回类型。",
                "边界接口：在 host 侧验证数据类型，再进入 Kernel 模板实例化。",
              ),
            ],
          },
        ],
        exercises: [
          {
            id: "w01-template-deduction-e1",
            prompt:
              "解释为什么 `template<class T> void f(T&&); int x; f(x);` 中 T 不是 int。",
            hint: "这是 T 参与推导的转发引用，实参 x 是左值。",
            answer:
              "T 推导为 `int&`；T&& 经引用折叠成为 `int&`，所以能绑定左值 x。",
          },
        ],
        quiz: [
          {
            id: "w01-template-deduction-q1",
            question: "哪一种 T&& 一定不是转发引用？",
            options: [
              "template<class T> void f(T&&)",
              "template<class T> void f(const T&&)",
              "auto&& value = expr",
              "泛型 lambda 的 auto&& 参数",
            ],
            answer: 1,
            explanation: "const T&& 带有额外 cv 限定，不满足转发引用的形式。",
          },
        ],
        references: cppReferences,
      }),
    ],
  },
  {
    week: 3,
    eyebrow: "CUDA BASICS · 深度教程",
    introduction:
      "从一段能运行的向量加法出发，建立 Host、Device、Kernel、线程层级、内存生命周期和错误检查的完整心智模型。",
    lessons: [
      lesson({
        id: "w03-host-device-kernel",
        title: "Host、Device 与 Kernel",
        summary: "看懂 CUDA 程序由谁执行、何时异步、在哪里同步。",
        duration: "30 分钟",
        objectives: [
          "区分 Host 代码和 Device 代码",
          "解释 Kernel launch 的三尖括号",
          "识别异步执行边界",
        ],
        sections: [
          {
            id: "w03-host-device-model",
            title: "一个程序，两类执行者",
            blocks: [
              p(
                "CUDA 程序通常由 CPU 上的 Host 代码分配资源、准备参数并发起工作，由 GPU 上的大量线程执行 Kernel。`__global__` 声明一个从 Host 启动、在 Device 执行的函数。",
              ),
              code(`__global__ void saxpy(float a, const float* x, float* y, int n) {
  const int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) y[i] = a * x[i] + y[i];
}

// Host 侧：grid 个 block，每个 block 有 block 个线程
const int block = 256;
const int grid = (n + block - 1) / block;
saxpy<<<grid, block>>>(2.0f, d_x, d_y, n);`),
              p(
                "三尖括号不是普通 C++ 模板语法。第一项给出 Grid 中的 Block 数，第二项给出每个 Block 的线程数；还可继续指定动态共享内存字节数与 Stream。",
              ),
            ],
          },
          {
            id: "w03-host-device-async",
            title: "Launch 通常是异步的",
            blocks: [
              p(
                "Host 发起 Kernel 后通常继续向下执行。Kernel 启动错误可立即查询，而执行期错误往往要到同步点才显现。调试阶段要把“启动是否成功”和“执行是否成功”分开检查。",
              ),
              code(`saxpy<<<grid, block>>>(2.0f, d_x, d_y, n);
CUDA_CHECK(cudaGetLastError());      // 检查 launch 配置等错误
CUDA_CHECK(cudaDeviceSynchronize()); // 调试时等待执行并暴露运行错误`),
              quote(
                "不要在最终性能路径里无条件到处同步。先用同步定位正确性，再用 CUDA Event 或必要的数据依赖建立准确边界。",
              ),
            ],
          },
        ],
        exercises: [
          {
            id: "w03-host-device-e1",
            prompt:
              "说明 `kernel<<<80, 256>>>` 会创建多少个线程，以及这是否意味着 GPU 同时运行全部线程。",
            hint: "逻辑线程数与硬件驻留线程数不是一回事。",
            answer:
              "逻辑上创建 80×256=20480 个线程。硬件会按 SM 资源和调度能力分批驻留、执行，不保证所有逻辑线程同一时刻运行。",
          },
        ],
        quiz: [
          {
            id: "w03-host-device-q1",
            question: "__global__ 函数通常在哪里启动、在哪里执行？",
            options: [
              "Device 启动，Host 执行",
              "Host 启动，Device 执行",
              "Host 启动，Host 执行",
              "编译器决定，无法知道",
            ],
            answer: 1,
            explanation: "基础 CUDA 模型中，Host 发起 Kernel，GPU Device 执行。",
          },
        ],
        references: cudaReferences,
      }),
      lesson({
        id: "w03-thread-indexing",
        title: "Grid、Block 与线程索引",
        summary: "从一维索引推广到二维数据，并把边界检查写正确。",
        duration: "35 分钟",
        objectives: [
          "计算全局一维线程索引",
          "解释向上取整的 Grid 大小",
          "为任意 N 写边界保护",
        ],
        sections: [
          {
            id: "w03-thread-indexing-1d",
            title: "一维映射公式",
            blocks: [
              p(
                "`threadIdx.x` 是线程在本 Block 内的局部编号，`blockIdx.x` 是 Block 在 Grid 内的编号，`blockDim.x` 是一个 Block 的线程数。三者组成全局线性索引。",
              ),
              code(`const int i = blockIdx.x * blockDim.x + threadIdx.x;
if (i < n) {
  output[i] = input[i] * 2.0f;
}`),
              p(
                "Grid 使用 `(n + block - 1) / block` 向上取整，因此最后一个 Block 常有一部分线程落在数组外。`if (i < n)` 不是装饰，而是内存安全边界。",
              ),
            ],
          },
          {
            id: "w03-thread-indexing-2d",
            title: "二维数据映射",
            blocks: [
              code(`const int col = blockIdx.x * blockDim.x + threadIdx.x;
const int row = blockIdx.y * blockDim.y + threadIdx.y;

if (row < height && col < width) {
  const int index = row * width + col; // row-major
  output[index] = input[index];
}`),
              p(
                "二维线程布局让代码更贴近图像或矩阵坐标，但最终全局内存地址仍需线性化。后续优化合并访存时，要继续观察相邻线程是否访问相邻地址。",
              ),
            ],
          },
        ],
        exercises: [
          {
            id: "w03-thread-indexing-e1",
            prompt: "N=1000、block=256 时 grid 应为多少？总共启动多少个逻辑线程？",
            hint: "使用向上取整公式。",
            answer: "grid=4，总线程数为 4×256=1024，最后 24 个线程必须被边界判断排除。",
          },
        ],
        quiz: [
          {
            id: "w03-thread-indexing-q1",
            question: "为什么最后一个 Block 仍需要 i < n？",
            options: [
              "为了让代码更快",
              "因为 Grid 向上取整后线程数可能超过数据数",
              "因为 threadIdx 从 1 开始",
              "只有二维 Kernel 才需要",
            ],
            answer: 1,
            explanation: "向上取整覆盖全部元素，也会产生少量越界线程。",
          },
        ],
        references: cudaReferences,
      }),
      lesson({
        id: "w03-memory-lifecycle",
        title: "显存生命周期与错误检查",
        summary: "把申请、传输、执行、回传、释放写成可审查的闭环。",
        duration: "40 分钟",
        objectives: [
          "写出最小显存生命周期",
          "理解 cudaMemcpy 的方向参数",
          "统一检查 Runtime API 错误",
        ],
        sections: [
          {
            id: "w03-memory-lifecycle-flow",
            title: "五步闭环",
            blocks: [
              list(
                "Host 准备输入与参考输出。",
                "`cudaMalloc` 在 Device 分配内存。",
                "`cudaMemcpy` 把输入从 Host 复制到 Device。",
                "启动 Kernel，检查启动与执行错误。",
                "复制结果回 Host、验证正确性、释放 Device 内存。",
              ),
              code(`#define CUDA_CHECK(call) do {                                      \\
  cudaError_t error__ = (call);                                      \\
  if (error__ != cudaSuccess) {                                      \\
    std::fprintf(stderr, "%s:%d CUDA error: %s\\n",                  \\
                 __FILE__, __LINE__, cudaGetErrorString(error__));   \\
    std::exit(EXIT_FAILURE);                                         \\
  }                                                                 \\
} while (0)

float* d_data = nullptr;
CUDA_CHECK(cudaMalloc(&d_data, n * sizeof(float)));
CUDA_CHECK(cudaMemcpy(d_data, host.data(), n * sizeof(float),
                      cudaMemcpyHostToDevice));
CUDA_CHECK(cudaFree(d_data));`),
              p(
                "示例宏适合入门项目；更大型工程可以用异常、状态类型或 RAII 包装器。关键是不忽略返回值，并保证失败路径也会释放资源。",
              ),
            ],
          },
        ],
        exercises: [
          {
            id: "w03-memory-lifecycle-e1",
            prompt:
              "从 d_output 把 n 个 float 复制到 host_output，应使用哪个 cudaMemcpyKind？",
            hint: "源在 Device，目标在 Host。",
            answer: "`cudaMemcpyDeviceToHost`。",
          },
        ],
        quiz: [
          {
            id: "w03-memory-lifecycle-q1",
            question: "cudaMalloc 的第一个参数为什么常看到地址的地址？",
            options: [
              "它要写回分配得到的设备指针",
              "它会复制整个数组",
              "它要求二维指针",
              "只是历史写法，没有意义",
            ],
            answer: 0,
            explanation: "Runtime API 通过输出参数把新分配的设备地址写回调用者。",
          },
        ],
        references: cudaReferences,
      }),
      lesson({
        id: "w03-vector-add",
        title: "完整实验：Vector Add",
        summary: "把最小 CUDA 程序写完整，并用 CPU 参考结果验收。",
        duration: "60 分钟",
        objectives: [
          "独立写出可编译的 Vector Add",
          "验证任意长度和边界线程",
          "区分正确性计时与性能计时",
        ],
        sections: [
          {
            id: "w03-vector-add-complete",
            title: "完整可运行程序",
            blocks: [
              p(
                "下面程序故意保留显式内存管理，使每个步骤可见。保存为 `vector_add.cu`，使用 `nvcc -O2 -std=c++17 vector_add.cu -o vector_add` 编译。",
              ),
              code(`#include <cuda_runtime.h>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <vector>

#define CUDA_CHECK(call) do {                                      \\
  cudaError_t e__ = (call);                                        \\
  if (e__ != cudaSuccess) {                                        \\
    std::fprintf(stderr, "CUDA error: %s\\n", cudaGetErrorString(e__)); \\
    std::exit(EXIT_FAILURE);                                       \\
  }                                                                \\
} while (0)

__global__ void vector_add(const float* a, const float* b, float* c, int n) {
  const int i = blockIdx.x * blockDim.x + threadIdx.x;
  if (i < n) c[i] = a[i] + b[i];
}

int main() {
  constexpr int n = 1000003; // 故意不是 block size 的整数倍
  const std::size_t bytes = n * sizeof(float);
  std::vector<float> a(n), b(n), c(n);
  for (int i = 0; i < n; ++i) {
    a[i] = 0.25f * i;
    b[i] = 1.0f - 0.5f * i;
  }

  float *d_a = nullptr, *d_b = nullptr, *d_c = nullptr;
  CUDA_CHECK(cudaMalloc(&d_a, bytes));
  CUDA_CHECK(cudaMalloc(&d_b, bytes));
  CUDA_CHECK(cudaMalloc(&d_c, bytes));
  CUDA_CHECK(cudaMemcpy(d_a, a.data(), bytes, cudaMemcpyHostToDevice));
  CUDA_CHECK(cudaMemcpy(d_b, b.data(), bytes, cudaMemcpyHostToDevice));

  constexpr int block = 256;
  const int grid = (n + block - 1) / block;
  vector_add<<<grid, block>>>(d_a, d_b, d_c, n);
  CUDA_CHECK(cudaGetLastError());
  CUDA_CHECK(cudaMemcpy(c.data(), d_c, bytes, cudaMemcpyDeviceToHost));

  for (int i = 0; i < n; ++i) {
    if (std::fabs(c[i] - (a[i] + b[i])) > 1e-5f) {
      std::fprintf(stderr, "Mismatch at %d\\n", i);
      return EXIT_FAILURE;
    }
  }

  CUDA_CHECK(cudaFree(d_a));
  CUDA_CHECK(cudaFree(d_b));
  CUDA_CHECK(cudaFree(d_c));
  std::puts("PASS");
}`),
              quote(
                "验收不是看到 PASS 就结束：把 N 改成 0、1、255、256、257 和更大规模，明确哪些输入需要接口拒绝，哪些必须正确处理。",
              ),
            ],
          },
          {
            id: "w03-vector-add-proof",
            title: "验收记录",
            blocks: [
              list(
                "正确性：与 CPU 参考结果逐元素比较，记录 atol/rtol。",
                "边界：覆盖 block 前后、非整除长度和大数组。",
                "错误：所有 Runtime API 与 Kernel launch 均检查。",
                "性能：下一阶段用 CUDA Event 测 Kernel，不把 Host-Device 传输混入。",
              ),
            ],
          },
        ],
        exercises: [
          {
            id: "w03-vector-add-e1",
            prompt:
              "修改 Kernel 实现 `c[i] = alpha * a[i] + b[i]`，并列出至少 5 个应测试的 N。",
            hint: "Kernel 新增 alpha 参数；边界围绕 0、1 和 block size。",
            answer:
              "新增 float alpha 参数并在 Kernel 中写 `c[i] = alpha * a[i] + b[i]`。建议 N 为 0、1、255、256、257、1000003；N=0 时 Host 侧应跳过分配与 launch 或明确定义行为。",
          },
        ],
        quiz: [
          {
            id: "w03-vector-add-q1",
            question: "为什么示例把 n 设为 1000003？",
            options: [
              "这是 GPU 的最大数组长度",
              "它是质数所以计算更快",
              "用非整除长度验证最后一个 Block 的边界处理",
              "nvcc 只支持这个长度",
            ],
            answer: 2,
            explanation: "非整除长度能主动覆盖尾部线程越界这一常见错误。",
          },
        ],
        references: cudaReferences,
        verification:
          "代码依据 NVIDIA CUDA Programming Guide 与官方 vectorAdd 示例审阅；需要带 NVIDIA GPU 与 CUDA Toolkit 的环境实际编译运行。",
      }),
    ],
  },
];

const curatedByWeek = new Map(
  [...curatedTutorialModules, ...curatedWeeksTwoToEight].map((module) => [
    module.week,
    module,
  ]),
);

export const tutorialModules: TutorialModule[] = generatedTutorialModules.map(
  (generated) => {
    const selected =
      generated.week === 1
        ? weekOneBookModule
        : (curatedByWeek.get(generated.week) ?? generated);
    return organizeTutorialModule(selected);
  },
);

export const tutorialByWeek = new Map(
  tutorialModules.map((module) => [module.week, module]),
);
