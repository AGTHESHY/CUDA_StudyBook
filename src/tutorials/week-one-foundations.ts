import type {
  ContentBlock,
  TutorialLesson,
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

const cppGuidelines: TutorialReference[] = [
  {
    label: "C++ Core Guidelines",
    url: "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines",
    source: "Standard C++",
  },
  {
    label: "现代 C++ 类型系统",
    url: "https://learn.microsoft.com/en-us/cpp/cpp/cpp-type-system-modern-cpp?view=msvc-170",
    source: "Microsoft Learn",
  },
];

const lesson = (
  id: string,
  title: string,
  summary: string,
  objectives: string[],
  sections: TutorialLesson["sections"],
  exercise: TutorialLesson["exercises"][number],
  quiz: TutorialLesson["quiz"][number],
  references: TutorialReference[] = cppGuidelines,
): TutorialLesson => ({
  id,
  title,
  summary,
  duration: "35 分钟",
  level: "基础",
  objectives,
  sections,
  exercises: [exercise],
  quiz: [quiz],
  references,
  verification:
    "本页用最小工程例子解释概念；完成练习后，再把结论应用到本周 CPU 基础库。",
});

export const weekOneFoundationLessons: TutorialLesson[] = [
  lesson(
    "w01-foundation-memory",
    "强化 1 · 内存与对象生命周期",
    "把栈、堆、指针、引用和 RAII 串成一条资源生命周期。",
    ["判断对象由谁拥有", "避免悬空指针与重复释放", "用 RAII 自动回收资源"],
    [
      {
        id: "w01-foundation-memory-model",
        title: "先别背“栈快、堆慢”",
        blocks: [
          p(
            "真正要问的是：对象什么时候创建、谁负责释放、引用能活多久。局部对象通常随作用域结束而析构；动态资源需要 Owner。指针可以为空、可以改指向；引用必须绑定对象，更适合表达“这里一定有一个对象”。",
          ),
          code(`void normalize(std::vector<float>& values) { // 一定有对象，可修改
  // ...
}

void maybe_launch(Stream* stream) {            // 可以为空
  if (stream == nullptr) return;
}`),
        ],
      },
      {
        id: "w01-foundation-memory-raii",
        title: "RAII：把释放动作绑到对象上",
        blocks: [
          p(
            "RAII 的核心不是某个语法，而是“资源寿命等于对象寿命”。即使中途 return 或抛异常，析构函数也会运行。标准容器、智能指针和锁都在使用这套办法。",
          ),
          code(`class Buffer {
 public:
  explicit Buffer(std::size_t n)
      : data_(std::make_unique<float[]>(n)), size_(n) {}
 private:
  std::unique_ptr<float[]> data_;
  std::size_t size_;
};`),
          list(
            "Owner 用值、容器或智能指针表达。",
            "只观察对象时使用引用、指针或 view，不负责释放。",
            "返回引用前确认被引用对象比引用活得更久。",
          ),
        ],
      },
    ],
    {
      id: "w01-foundation-memory-e1",
      prompt: "为什么不能返回函数局部 vector 的引用？",
      hint: "函数返回时局部对象会发生什么？",
      answer: "局部 vector 会析构，返回的引用立即悬空。应按值返回，让移动或返回值优化处理。",
    },
    {
      id: "w01-foundation-memory-q1",
      question: "RAII 最重要的保证是什么？",
      options: ["所有对象都在堆上", "资源释放跟随对象生命周期", "指针永不为空", "程序不会抛异常"],
      answer: 1,
      explanation: "作用域退出会触发析构，从而覆盖正常、提前返回和异常路径。",
    },
  ),
  lesson(
    "w01-foundation-linking",
    "强化 2 · 编译、链接与库",
    "看懂源文件怎样变成程序，并能判断错误发生在哪一阶段。",
    ["区分声明与定义", "判断编译错误和链接错误", "理解静态库与动态库"],
    [
      {
        id: "w01-foundation-linking-flow",
        title: "编译器不是一次把整个项目吞进去",
        blocks: [
          p(
            "每个 `.cpp` 通常先独立编译成目标文件。头文件提供声明，让当前文件知道接口长什么样；链接器再把目标文件和库中的定义拼起来。语法或类型不对是编译错误，找不到函数实现常是链接错误。",
          ),
          code(`// math.hpp
float dot(const float* a, const float* b, int n);

// math.cpp
#include "math.hpp"
float dot(const float* a, const float* b, int n) {
  float sum = 0;
  for (int i = 0; i < n; ++i) sum += a[i] * b[i];
  return sum;
}`),
        ],
      },
      {
        id: "w01-foundation-linking-libs",
        title: "静态库和动态库差在哪",
        blocks: [
          p(
            "静态库的代码在链接时进入可执行文件，部署简单但文件更大；动态库在运行时加载，多个程序可共享，但要处理搜索路径和版本兼容。CUDA/PyTorch 扩展常以动态库形式被 Python 加载。",
          ),
          list(
            "看到 undefined reference：先检查实现文件是否加入目标、函数签名是否一致。",
            "看到 multiple definition：检查定义是否重复放进多个翻译单元。",
            "运行时找不到 `.so`：检查库文件、搜索路径与 ABI。",
          ),
        ],
      },
    ],
    {
      id: "w01-foundation-linking-e1",
      prompt: "头文件声明了 dot，但 math.cpp 没加入构建，最可能出现哪类错误？",
      hint: "调用处知道接口，所以能通过类型检查，但最后找不到实现。",
      answer: "链接错误，通常表现为 undefined reference 或 unresolved external symbol。",
    },
    {
      id: "w01-foundation-linking-q1",
      question: "哪个阶段负责把多个目标文件中的符号连接起来？",
      options: ["预处理", "解析", "链接", "运行"],
      answer: 2,
      explanation: "链接器解析跨翻译单元和库中的符号引用。",
    },
  ),
  lesson(
    "w01-foundation-cache",
    "强化 3 · Cache、局部性与内存对齐",
    "解释为什么相同计算量，换个访问顺序就可能快很多。",
    ["识别空间与时间局部性", "理解 Cache Line", "知道对齐与连续访问为何重要"],
    [
      {
        id: "w01-foundation-cache-locality",
        title: "CPU 一次搬来的不只是一个数",
        blocks: [
          p(
            "处理器通常按 Cache Line 搬运一段连续内存。刚访问 `a[i]`，附近元素往往已经一起进入 Cache，所以按行连续遍历矩阵通常比跨行跳跃更友好。这就是空间局部性；短时间内重复使用同一数据则是时间局部性。",
          ),
          code(`// row-major 矩阵：这一版连续访问
for (int row = 0; row < rows; ++row)
  for (int col = 0; col < cols; ++col)
    sum += matrix[row * cols + col];`),
        ],
      },
      {
        id: "w01-foundation-cache-alignment",
        title: "对齐和 restrict 思想",
        blocks: [
          p(
            "对齐让对象从适合硬件访问的地址开始，便于 SIMD 和某些设备指令。`restrict` 思想则是告诉优化器两块内存不会互相重叠；标准 C++ 没有统一 restrict 关键字，所以只能在编译器扩展或明确接口约束中使用，不能随便承诺。",
          ),
          code(`struct alignas(64) CacheAlignedCounter {
  std::atomic<std::uint64_t> value{0};
};`),
          list(
            "先优化访问顺序，再考虑手工对齐。",
            "对齐不等于数据一定更快，要用 Benchmark 验证。",
            "错误的“不别名”承诺会产生未定义行为。",
          ),
        ],
      },
    ],
    {
      id: "w01-foundation-cache-e1",
      prompt: "row-major 矩阵为什么按行遍历通常更快？",
      hint: "观察相邻循环迭代访问的地址。",
      answer: "按行遍历访问连续地址，能充分利用一个 Cache Line 中已经搬入的相邻元素。",
    },
    {
      id: "w01-foundation-cache-q1",
      question: "短时间内重复使用同一数据体现哪种局部性？",
      options: ["空间局部性", "时间局部性", "链接局部性", "线程局部性"],
      answer: 1,
      explanation: "同一数据很快再次被访问，Cache 有机会直接命中。",
    },
  ),
  lesson(
    "w01-foundation-compile-time",
    "强化 4 · 模板与编译期计算",
    "分清模板参数、运行时参数和 constexpr 的职责。",
    ["写出基础函数模板", "区分编译期与运行时参数", "使用 constexpr 表达编译期约束"],
    [
      {
        id: "w01-foundation-template",
        title: "模板是生成代码的规则",
        blocks: [
          p(
            "模板不是运行时的“万能变量”。编译器会针对用到的具体类型或常量生成实例。CUDA Kernel 常把数据类型、Tile 大小放进模板参数，让分支和数组大小在编译期确定。",
          ),
          code(`template<class T, int Tile>
T block_sum(const T* values) {
  static_assert(Tile > 0);
  T sum{};
  for (int i = 0; i < Tile; ++i) sum += values[i];
  return sum;
}`),
        ],
      },
      {
        id: "w01-foundation-constexpr",
        title: "constexpr 不等于“永远在编译期运行”",
        blocks: [
          p(
            "`constexpr` 表示函数或变量具备在编译期求值的能力；只有上下文要求常量且输入也是常量时，计算才必须发生在编译期。运行时输入仍可调用 constexpr 函数。",
          ),
          list(
            "模板参数会影响类型或生成的代码。",
            "运行时参数不需要重新实例化代码。",
            "用 static_assert 把编译期前提写成可执行规则。",
          ),
        ],
      },
    ],
    {
      id: "w01-foundation-compile-time-e1",
      prompt: "Tile 大小为什么常适合作为非类型模板参数？",
      hint: "考虑循环展开、静态数组大小和分支消除。",
      answer: "Tile 在编译期已知，编译器可据此实例化代码、展开循环并确定静态资源大小。",
    },
    {
      id: "w01-foundation-compile-time-q1",
      question: "constexpr 函数是否每次都在编译期执行？",
      options: ["是", "否，它只是具备编译期求值能力", "仅模板中是", "仅 debug 模式是"],
      answer: 1,
      explanation: "是否在编译期求值取决于调用上下文和实参。",
    },
  ),
  lesson(
    "w01-foundation-cmake",
    "强化 5 · 用 CMake 组织工程",
    "把库、测试和依赖关系写成可重复的构建说明。",
    ["创建库和可执行目标", "使用 target 级依赖", "让测试进入统一构建流程"],
    [
      {
        id: "w01-foundation-cmake-targets",
        title: "先想 Target，不要先堆全局选项",
        blocks: [
          p(
            "现代 CMake 的核心是 Target：库、可执行程序和测试都是目标。编译特性、头文件目录和链接依赖尽量挂在具体目标上，这样依赖关系能自动传播，也不会污染整个项目。",
          ),
          code(`cmake_minimum_required(VERSION 3.24)
project(cpp_foundation LANGUAGES CXX)

add_library(foundation src/tensor_view.cpp)
target_include_directories(foundation PUBLIC include)
target_compile_features(foundation PUBLIC cxx_std_17)

add_executable(foundation_tests tests/test_tensor.cpp)
target_link_libraries(foundation_tests PRIVATE foundation)`, "cmake"),
        ],
      },
      {
        id: "w01-foundation-cmake-build",
        title: "源码目录和构建目录分开",
        blocks: [
          p(
            "推荐 out-of-source build：源码保持干净，所有生成文件进入 `build/`。配置阶段生成构建系统，构建阶段才真正编译。以后加入 CUDA 时，只需在项目语言和目标源文件中显式声明。",
          ),
          code(`cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
ctest --test-dir build --output-on-failure`, "bash"),
        ],
      },
    ],
    {
      id: "w01-foundation-cmake-e1",
      prompt: "头文件要让链接 foundation 的使用者可见，include 目录应使用 PRIVATE 还是 PUBLIC？",
      hint: "依赖者编译时也需要这个头文件目录。",
      answer: "使用 PUBLIC；foundation 自己和依赖它的目标都需要该 include 路径。",
    },
    {
      id: "w01-foundation-cmake-q1",
      question: "现代 CMake 推荐把编译选项挂在哪里？",
      options: ["全局变量", "具体 Target", "环境变量", "README"],
      answer: 1,
      explanation: "Target 级配置能准确表达作用范围并传播依赖。",
    },
    [
      {
        label: "CMake Tutorial",
        url: "https://cmake.org/cmake/help/latest/guide/tutorial/",
        source: "CMake",
      },
    ],
  ),
  lesson(
    "w01-foundation-debugging",
    "强化 6 · GDB、ASan 与错误定位",
    "用调试器观察程序，用 Sanitizer 主动抓内存错误。",
    ["读取调用栈和局部变量", "使用断点定位状态变化", "用 ASan 捕获越界与释放后使用"],
    [
      {
        id: "w01-foundation-debugging-gdb",
        title: "GDB 回答“程序此刻发生了什么”",
        blocks: [
          p(
            "遇到崩溃先拿到调用栈，再查看出错帧的参数和局部变量。断点适合观察状态怎样一步步变化；不要靠到处加 printf 猜执行路径。",
          ),
          code(`gdb ./foundation_tests
(gdb) break softmax
(gdb) run
(gdb) backtrace
(gdb) frame 1
(gdb) print index`, "text"),
        ],
      },
      {
        id: "w01-foundation-debugging-asan",
        title: "ASan 回答“哪次内存访问不合法”",
        blocks: [
          p(
            "AddressSanitizer 会在程序里插入检查，常能直接指出堆越界、栈越界、释放后使用和重复释放。它会让程序变慢、占更多内存，所以主要用于测试构建。",
          ),
          code(`cmake -S . -B build-asan \\
  -DCMAKE_CXX_FLAGS="-fsanitize=address -fno-omit-frame-pointer -g"
cmake --build build-asan
./build-asan/foundation_tests`, "bash"),
          list(
            "先读第一处错误，不要被后续连锁报错淹没。",
            "保留调试符号，报告才能显示源码行。",
            "修复后加入回归测试，确保同类问题不再出现。",
          ),
        ],
      },
    ],
    {
      id: "w01-foundation-debugging-e1",
      prompt: "测试随机崩溃且怀疑数组越界，第一轮优先使用什么？",
      hint: "需要自动检测非法内存访问并给出源码位置。",
      answer: "先使用 AddressSanitizer 运行可复现测试，再根据报告用 GDB 检查具体状态。",
    },
    {
      id: "w01-foundation-debugging-q1",
      question: "ASan 最适合发现哪类问题？",
      options: ["链接库版本", "内存越界和释放后使用", "算法复杂度", "网络延迟"],
      answer: 1,
      explanation: "ASan 专门检测多类非法内存访问和生命周期错误。",
    },
    [
      {
        label: "AddressSanitizer 文档",
        url: "https://clang.llvm.org/docs/AddressSanitizer.html",
        source: "LLVM",
      },
      {
        label: "GDB 用户手册",
        url: "https://sourceware.org/gdb/current/onlinedocs/gdb.html/",
        source: "GNU",
      },
    ],
  ),
];

