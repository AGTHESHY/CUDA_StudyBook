import type {
  ContentBlock,
  TutorialLesson,
  TutorialModule,
  TutorialReference,
} from "../types";

const paragraph = (text: string): ContentBlock => ({
  type: "paragraph",
  text,
});
const code = (text: string): ContentBlock => ({
  type: "code",
  text,
  language: "cpp",
});
const bullets = (items: string[]): ContentBlock => ({
  type: "list",
  items,
  ordered: false,
});
const note = (text: string): ContentBlock => ({ type: "quote", text });

const typeReferences: TutorialReference[] = [
  {
    label: "C++ 类型系统",
    url: "https://learn.microsoft.com/en-us/cpp/cpp/cpp-type-system-modern-cpp?view=msvc-170",
    source: "Microsoft Learn",
  },
  {
    label: "auto 类型推导",
    url: "https://learn.microsoft.com/en-us/cpp/cpp/auto-cpp?view=msvc-170",
    source: "Microsoft Learn",
  },
  {
    label: "C++ auto 入门页",
    url: "https://www.w3schools.com/cpp/cpp_auto.asp",
    source: "W3Schools",
  },
];

const ownershipReferences: TutorialReference[] = [
  {
    label: "C++ 智能指针",
    url: "https://learn.microsoft.com/en-us/cpp/cpp/smart-pointers-modern-cpp?view=msvc-170",
    source: "Microsoft Learn",
  },
  {
    label: "C++ Core Guidelines：资源管理",
    url: "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-resource",
    source: "Standard C++",
  },
];

const concurrencyReferences: TutorialReference[] = [
  {
    label: "C++ thread 类",
    url: "https://learn.microsoft.com/en-us/cpp/standard-library/thread-class?view=msvc-170",
    source: "Microsoft Learn",
  },
  {
    label: "C++ future 类",
    url: "https://learn.microsoft.com/en-us/cpp/standard-library/future-class?view=msvc-170",
    source: "Microsoft Learn",
  },
  {
    label: "C++ Core Guidelines：并发",
    url: "https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#S-concurrency",
    source: "Standard C++",
  },
];

interface BookItem {
  item: number;
  title: string;
  summary: string;
  plain: string;
  example: string;
  takeaways: string[];
  exercise: string;
  hint: string;
  answer: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  references: TutorialReference[];
  level?: "基础" | "进阶";
}

const itemLesson = (item: BookItem): TutorialLesson => {
  const id = `w01-item-${String(item.item).padStart(2, "0")}`;
  return {
    id,
    title: `Item ${item.item} · ${item.title}`,
    summary: item.summary,
    duration: item.level === "进阶" ? "30 分钟" : "20 分钟",
    level: item.level ?? "基础",
    objectives: item.takeaways.slice(0, 3),
    sections: [
      {
        id: `${id}-plain`,
        title: "先用人话说清楚",
        blocks: [paragraph(item.plain), code(item.example)],
      },
      {
        id: `${id}-use`,
        title: "写代码时怎么用",
        blocks: [
          bullets(item.takeaways),
          note(
            "别背规则表。先判断这里需要副本、独占所有权、共享所有权还是同步关系，再选择对应写法。",
          ),
        ],
      },
    ],
    exercises: [
      {
        id: `${id}-exercise`,
        prompt: item.exercise,
        hint: item.hint,
        answer: item.answer,
      },
    ],
    quiz: [
      {
        id: `${id}-quiz`,
        question: item.question,
        options: item.options,
        answer: item.correct,
        explanation: item.explanation,
      },
    ],
    references: item.references,
    verification:
      "页面内容按现代 C++ 规则重新组织，并配合官方文档校验；示例强调可读性和工程语义，不照搬书中原文。",
  };
};

const items: BookItem[] = [
  {
    item: 1,
    title: "模板类型推导",
    summary: "看懂 T、T& 和 const T& 到底会推导成什么。",
    plain:
      "模板推导其实像在做“形状匹配”。参数按值接收时，函数要得到一份自己的副本，所以最外层的 const 和引用会被去掉；参数写成引用时，调用者的 const 才会保留下来。先问参数是值还是引用，答案就已经出来一半了。",
    example: `template<class T> void by_value(T x) {}
template<class T> void by_ref(T& x) {}

const int n = 42;
by_value(n); // T 是 int
by_ref(n);   // T 是 const int`,
    takeaways: [
      "按值参数 `T` 会去掉实参最外层的 const 和引用。",
      "`T&`、`const T&` 会把引用语义写进接口。",
      "数组按值传递会退化为指针，按引用传递可以保留数组长度。",
    ],
    exercise: "写一个能保留数组长度 N 的模板函数参数。",
    hint: "让参数成为数组的引用，并把 N 作为模板参数。",
    answer: "`template<class T, std::size_t N> void inspect(T (&array)[N]);`。",
    question: "`const int n` 传给参数 `T value` 时，T 通常是什么？",
    options: ["const int&", "const int", "int", "int&"],
    correct: 2,
    explanation: "按值推导要创建独立对象，因此去掉顶层 const 和引用。",
    references: typeReferences,
  },
  {
    item: 2,
    title: "auto 类型推导",
    summary: "把 auto 当成编译器帮你填写的模板参数。",
    plain:
      "`auto` 没有让 C++ 变成动态语言。编译器只是看右边的初始化器，在编译期填好类型。裸 auto 像模板的按值参数，会丢掉顶层 const 和引用；`auto&`、`const auto&` 则把引用意图明明白白写出来。",
    example: `const int source = 7;
auto copy = source;        // int
auto& alias = source;      // const int&
const auto& view = source; // const int&`,
    takeaways: [
      "裸 auto 默认得到副本。",
      "大对象只读访问通常用 `const auto&`。",
      "花括号与 auto 一起使用有特殊规则，不要靠猜。",
    ],
    exercise: "避免复制 vector，并禁止通过新变量修改它。",
    hint: "同时需要 const 和引用。",
    answer: "`const auto& values = original;`。",
    question: "`const int n = 8; auto x = n;` 中 x 的类型是？",
    options: ["const int&", "int", "const int", "int&"],
    correct: 1,
    explanation: "裸 auto 按值推导，顶层 const 被移除。",
    references: typeReferences,
  },
  {
    item: 3,
    title: "decltype",
    summary: "不运行表达式，也能问编译器“它是什么类型”。",
    plain:
      "`decltype` 是类型查询器。最容易踩坑的是额外的一对括号：`decltype(name)` 直接给出变量声明时的类型，而 `decltype((name))` 把 name 当成左值表达式，于是通常得到引用。",
    example: `int value = 0;
static_assert(std::is_same_v<decltype(value), int>);
static_assert(std::is_same_v<decltype((value)), int&>);`,
    takeaways: [
      "`decltype(name)` 对变量名使用特殊规则。",
      "`decltype((name))` 会考虑表达式的值类别。",
      "`decltype(auto)` 返回值能保留引用，也可能制造悬空引用。",
    ],
    exercise: "预测 `const float x = 1; decltype((x)) y = x;` 中 y 的类型。",
    hint: "x 是 const 左值。",
    answer: "`const float&`。",
    question: "若 `int x`，`decltype((x))` 是什么？",
    options: ["int", "int&", "int&&", "const int"],
    correct: 1,
    explanation: "带括号的 x 是左值表达式，所以结果为 int&。",
    references: typeReferences,
    level: "进阶",
  },
  {
    item: 4,
    title: "查看推导结果",
    summary: "别靠肉眼猜，让编译器和 IDE 直接告诉你。",
    plain:
      "复杂模板报错像天书时，不要继续脑补。编辑器悬停适合快速看类型，`static_assert` 适合把预期写进代码，编译器诊断适合临时调查。`typeid(...).name()` 常带实现相关的名字，不适合当唯一证据。",
    example: `auto value = 1.0f;
static_assert(std::is_same_v<decltype(value), float>);

using Expected = const std::vector<int>&;
// static_assert(std::is_same_v<decltype(view), Expected>);`,
    takeaways: [
      "先用 IDE 悬停做快速检查。",
      "关键类型用 `std::is_same_v` 固化为编译期测试。",
      "只在调试时制造类型诊断，不把技巧留在正式代码里。",
    ],
    exercise: "为 `auto block = 256u;` 写一条类型断言。",
    hint: "256u 是 unsigned int 字面量。",
    answer: "`static_assert(std::is_same_v<decltype(block), unsigned int>);`。",
    question: "哪种方式最适合把类型预期长期留在测试中？",
    options: ["printf", "typeid 名字", "static_assert + is_same_v", "加注释"],
    correct: 2,
    explanation: "编译期断言会在类型变化时直接让构建失败。",
    references: typeReferences,
  },
  {
    item: 5,
    title: "优先考虑 auto",
    summary: "让变量一定初始化，也避免把复杂类型抄错。",
    plain:
      "auto 的价值不是少敲键盘，而是让左边和右边保持一致。迭代器、lambda 和工厂函数的返回类型很长，手写容易悄悄发生转换。不过，如果右边看不出业务含义，显式类型反而更清楚。",
    example: `auto it = values.cbegin();
auto task = [scale](float x) { return x * scale; };
auto count = values.size(); // 保留容器的 size_type`,
    takeaways: [
      "auto 变量必须初始化。",
      "右侧已清楚表达类型时，auto 通常更易维护。",
      "业务单位或窄类型需要强调时，可以继续显式书写。",
    ],
    exercise: "把冗长的 `std::vector<float>::const_iterator` 声明改写为 auto。",
    hint: "类型信息已经在 cbegin() 里。",
    answer: "`auto it = values.cbegin();`。",
    question: "什么时候不应该机械地使用 auto？",
    options: ["lambda 返回值", "迭代器", "右侧完全看不出关键业务类型时", "工厂函数结果"],
    correct: 2,
    explanation: "可读性比统一风格重要；关键业务语义不清时显式类型更好。",
    references: typeReferences,
  },
  {
    item: 6,
    title: "显式类型初始化器",
    summary: "auto 推错方向时，在右边明确指定你真正想要的类型。",
    plain:
      "auto 很听话，它会照着表达式的真实类型推导；问题是某些表达式返回代理对象，或者计算结果精度不是你想要的。这时别放弃 auto，在初始化器上做一次明确转换，让意图和转换位置都可见。",
    example: `double x = 3.7;
double y = 2.0;
auto ratio = static_cast<float>(x / y); // 明确要 float

std::vector<bool> flags{true, false};
auto enabled = static_cast<bool>(flags[0]); // 不保留代理对象`,
    takeaways: [
      "警惕 `vector<bool>` 等代理引用类型。",
      "转换写在初始化器上，比左边隐式截断更醒目。",
      "先确认确实需要转换，不要用 cast 掩盖接口问题。",
    ],
    exercise: "让整数除法结果明确保存成 double，而不是先算出整数 0。",
    hint: "至少在除法前把一个操作数转成 double。",
    answer: "`auto ratio = static_cast<double>(done) / total;`。",
    question: "显式类型初始化器主要解决什么问题？",
    options: ["让 auto 变成动态类型", "避免 auto 保留不希望的代理或精度", "绕过编译器", "自动释放内存"],
    correct: 1,
    explanation: "它在初始化表达式处明确目标类型，控制代理和转换行为。",
    references: typeReferences,
    level: "进阶",
  },
  {
    item: 7,
    title: "区分 () 和 {}",
    summary: "花括号能防窄化，但遇到 initializer_list 时可能改变构造函数选择。",
    plain:
      "花括号初始化像一道安全门：`int{3.8}` 会直接报错，不让小数悄悄丢掉。但容器类如果有 `initializer_list` 构造函数，花括号会优先选它，所以 `vector<int>(10, 1)` 和 `vector<int>{10, 1}` 完全不是一回事。",
    example: `std::vector<int> a(10, 1); // 10 个 1
std::vector<int> b{10, 1}; // 两个元素：10 和 1

int safe{3};
// int narrowed{3.8};     // 编译错误`,
    takeaways: [
      "花括号拒绝窄化转换。",
      "有 initializer_list 重载时，花括号会优先考虑它。",
      "容器的“大小和值”构造常需要圆括号。",
    ],
    exercise: "创建一个包含 256 个 0 的 vector<int>。",
    hint: "这里需要 size/value 构造函数。",
    answer: "`std::vector<int> values(256, 0);`。",
    question: "`std::vector<int>{10, 1}` 有几个元素？",
    options: ["1", "2", "10", "11"],
    correct: 1,
    explanation: "花括号选择 initializer_list，元素就是 10 和 1。",
    references: typeReferences,
  },
  {
    item: 8,
    title: "用 nullptr 表示空指针",
    summary: "0 是整数，nullptr 才明确表示“这里没有对象”。",
    plain:
      "旧代码常用 0 或 NULL 表示空指针，但重载函数看到它们时可能把它当整数。`nullptr` 有专门的空指针类型，既能转换成不同指针，又不会误选整数重载。",
    example: `void open(int mode);
void open(void* handle);

// open(0);       // 选择 int 版本
open(nullptr);    // 选择指针版本`,
    takeaways: [
      "新代码统一使用 nullptr。",
      "模板和重载场景中 nullptr 的意图更明确。",
      "不要用 NULL 猜测不同平台上的具体定义。",
    ],
    exercise: "把 `float* device = 0;` 改成现代 C++ 写法。",
    hint: "使用专门的空指针字面量。",
    answer: "`float* device = nullptr;`。",
    question: "nullptr 相比 0 的关键优势是什么？",
    options: ["占用更少内存", "有明确的空指针类型", "运行更快", "只能用于 void*"],
    correct: 1,
    explanation: "明确类型能避免整数与指针重载之间的歧义。",
    references: typeReferences,
  },
  {
    item: 17,
    title: "特殊成员函数生成规则",
    summary: "写了析构函数，编译器可能不再自动生成你期待的移动操作。",
    plain:
      "构造、析构、复制和移动是一套联动规则。你手写其中某些函数后，编译器对其他函数的自动生成会改变。最稳的做法是优先让成员自己管理资源，做到 Rule of Zero；真要管裸资源，就明确写出五个操作的取舍。",
    example: `class Buffer {
 public:
  Buffer() = default;
  ~Buffer() = default;
  Buffer(const Buffer&) = delete;
  Buffer& operator=(const Buffer&) = delete;
  Buffer(Buffer&&) noexcept = default;
  Buffer& operator=(Buffer&&) noexcept = default;
 private:
  std::unique_ptr<float[]> data_;
};`,
    takeaways: [
      "Rule of Zero：让标准容器和智能指针管理资源。",
      "独占资源类型通常删除复制、允许移动。",
      "容器更愿意移动 noexcept 的对象。",
    ],
    exercise: "一个独占 GPU 缓冲区类是否应该默认复制？为什么？",
    hint: "复制一个指针不等于复制它指向的资源。",
    answer: "不应该。应删除复制操作并提供安全移动；否则两个对象可能重复释放同一资源。",
    question: "最省心的资源管理策略是什么？",
    options: ["所有成员都手写", "Rule of Zero", "只写析构", "使用全局变量"],
    correct: 1,
    explanation: "由成熟 RAII 成员组合对象，通常不必手写特殊成员函数。",
    references: ownershipReferences,
    level: "进阶",
  },
  {
    item: 18,
    title: "用 unique_ptr 表达独占所有权",
    summary: "资源只有一个主人，需要交接时移动，不允许复制。",
    plain:
      "`unique_ptr` 就像唯一的房门钥匙：同一时间只有一个对象负责释放资源。它很轻量，几乎没有额外运行时成本，适合作为工厂函数返回值和类的资源成员。",
    example: `auto buffer = std::make_unique<float[]>(1024);
auto owner = std::move(buffer);

// buffer 现在为空，owner 负责释放`,
    takeaways: [
      "默认从 unique_ptr 开始，而不是一上来就共享。",
      "通过 std::move 转移所有权。",
      "需要特殊释放方式时使用自定义 deleter。",
    ],
    exercise: "写一个返回独占 Session 对象的工厂函数返回类型。",
    hint: "返回 unique_ptr，并在函数内 make_unique。",
    answer: "`std::unique_ptr<Session> make_session();`。",
    question: "unique_ptr 能直接复制吗？",
    options: ["能", "不能，只能移动所有权", "仅数组能复制", "仅空指针能复制"],
    correct: 1,
    explanation: "复制会制造两个主人，破坏独占所有权。",
    references: ownershipReferences,
  },
  {
    item: 19,
    title: "用 shared_ptr 表达共享所有权",
    summary: "多个对象确实共同决定资源寿命时，才付出引用计数成本。",
    plain:
      "`shared_ptr` 像多人合租：最后一个人离开时才退房。它通过控制块记录引用计数，复制会增加计数，销毁会减少计数。别因为“省得想生命周期”就到处使用，否则所有权关系会越来越模糊。",
    example: `auto model = std::make_shared<Model>();
auto worker_a = model;
auto worker_b = model;

// 最后一个 shared_ptr 销毁时 Model 才释放`,
    takeaways: [
      "只有真实共享所有权才使用 shared_ptr。",
      "复制 shared_ptr 会修改引用计数。",
      "不要从同一裸指针创建多个独立 shared_ptr。",
    ],
    exercise: "缓存和两个 Worker 共同拥有同一模型，应该从哪种智能指针开始考虑？",
    hint: "三个对象共同决定模型寿命。",
    answer: "可以考虑 `shared_ptr<Model>`，同时确认这确实是共同所有权而非单一 Owner 加观察者。",
    question: "shared_ptr 何时释放对象？",
    options: ["第一个副本销毁时", "引用计数归零时", "函数返回时", "程序退出时"],
    correct: 1,
    explanation: "最后一个拥有者离开后，托管对象才会析构。",
    references: ownershipReferences,
  },
  {
    item: 20,
    title: "用 weak_ptr 打破循环",
    summary: "需要观察共享对象，但不想延长它的生命。",
    plain:
      "`weak_ptr` 是一张不续租的门禁卡：它能检查房子还在不在，却不会增加 shared_ptr 的拥有者数量。父子对象互相 shared_ptr 会形成环，双方计数永远不归零；把其中一条边改成 weak_ptr 就能打破循环。",
    example: `std::weak_ptr<Model> cached = model;

if (auto live = cached.lock()) {
  live->run();
} else {
  // 对象已经释放
}`,
    takeaways: [
      "weak_ptr 不拥有对象。",
      "使用前通过 lock() 得到临时 shared_ptr。",
      "常用于缓存、观察者和打破引用环。",
    ],
    exercise: "父对象拥有子对象，子对象只需要回看父对象；哪一边适合 weak_ptr？",
    hint: "子对象不应该决定父对象活多久。",
    answer: "子到父的回看引用适合使用 weak_ptr。",
    question: "weak_ptr::lock() 失败说明什么？",
    options: ["内存不足", "对象已无 shared_ptr 拥有者", "发生死锁", "类型不匹配"],
    correct: 1,
    explanation: "托管对象可能已经释放，lock 会返回空 shared_ptr。",
    references: ownershipReferences,
  },
  {
    item: 21,
    title: "优先 make_unique / make_shared",
    summary: "把对象创建和智能指针构造放进一个清楚、异常安全的表达式。",
    plain:
      "`make_unique` 和 `make_shared` 让 new 不再裸露，代码更短，也减少参数求值与异常交错时泄漏的机会。`make_shared` 还常把对象和控制块合并分配，但如果需要自定义 deleter 或特殊内存布局，就要改用显式构造。",
    example: `auto config = std::make_unique<Config>(path);
auto model = std::make_shared<Model>(config_data);

// 避免：std::shared_ptr<Model>(new Model(...))`,
    takeaways: [
      "常规创建优先 make_unique / make_shared。",
      "make_shared 通常减少一次分配。",
      "自定义 deleter、私有构造或特殊布局时需要其他写法。",
    ],
    exercise: "把 `std::unique_ptr<Job>(new Job(4))` 改写。",
    hint: "把构造参数直接交给 make_unique。",
    answer: "`auto job = std::make_unique<Job>(4);`。",
    question: "make_shared 的常见优势是什么？",
    options: ["禁用析构", "对象和控制块常可一次分配", "不需要类型", "自动多线程"],
    correct: 1,
    explanation: "合并分配通常更紧凑，但仍需理解其生命周期权衡。",
    references: ownershipReferences,
  },
  {
    item: 22,
    title: "Pimpl 隐藏实现",
    summary: "头文件只暴露稳定接口，把容易变化的成员放进实现对象。",
    plain:
      "Pimpl 可以理解为“把机房藏到墙后面”。头文件只留一根指向 Impl 的智能指针，真实成员放在 cpp 文件里。这样实现改动不必让所有使用者重新编译，也能减少头文件依赖。",
    example: `// engine.hpp
class Engine {
 public:
  Engine();
  ~Engine();
 private:
  class Impl;
  std::unique_ptr<Impl> impl_;
};

// engine.cpp 中定义 Engine::Impl 和析构函数`,
    takeaways: [
      "Impl 类型在头文件中保持不完整。",
      "析构函数通常放到 cpp 中定义。",
      "Pimpl 换来编译隔离，但多一次间接访问与分配。",
    ],
    exercise: "为什么持有 unique_ptr<Impl> 的析构函数常放在 cpp 文件？",
    hint: "析构 unique_ptr 时需要看到 Impl 的完整类型。",
    answer: "在 cpp 中定义析构函数时 Impl 已完整，避免头文件实例化析构逻辑时类型不完整。",
    question: "Pimpl 的主要价值是什么？",
    options: ["提升 GPU 算力", "隔离实现与头文件依赖", "代替单元测试", "自动并行"],
    correct: 1,
    explanation: "它稳定接口并缩小实现改动导致的重编译范围。",
    references: ownershipReferences,
    level: "进阶",
  },
  {
    item: 23,
    title: "理解 move 与 forward",
    summary: "它们都不搬数据，只是在表达式上标记“可以被移动”或“保持原类别”。",
    plain:
      "`std::move` 的名字很容易骗人：它自己不移动任何东西，只把表达式转成右值，真正是否移动取决于接下来的构造或赋值。`std::forward` 用在转发引用里，左值进来仍是左值，右值进来仍是右值。",
    example: `std::string source = "weights.bin";
auto target = std::move(source); // string 的移动构造执行资源转移

template<class T>
void wrapper(T&& value) {
  consume(std::forward<T>(value));
}`,
    takeaways: [
      "move 是无条件右值转换。",
      "forward 是有条件转换，只用于转发场景。",
      "被移动对象仍然有效，但值通常未指定；可以销毁或重新赋值。",
    ],
    exercise: "包装器参数为 T&& 时，怎样把它原样转交给 consume？",
    hint: "保留调用者传入时的值类别。",
    answer: "`consume(std::forward<T>(value));`。",
    question: "std::move 本身做了什么？",
    options: ["复制内存", "释放对象", "把表达式转换为右值", "启动线程"],
    correct: 2,
    explanation: "真正的资源转移发生在随后匹配到的移动操作中。",
    references: ownershipReferences,
    level: "进阶",
  },
  {
    item: 37,
    title: "保证 thread 最终不可 join",
    summary: "每条执行路径都必须明确 join 或 detach，异常路径也不例外。",
    plain:
      "一个仍可 join 的 `std::thread` 如果直接析构，程序会调用 `std::terminate`。所以线程不是“启动完就不管”，而是一项必须收尾的资源。用 RAII 守卫或 C++20 `std::jthread` 能把异常和提前 return 的路径也覆盖住。",
    example: `std::thread worker(run_job);
try {
  prepare_result();
  worker.join();
} catch (...) {
  if (worker.joinable()) worker.join();
  throw;
}

// C++20 可优先考虑 std::jthread`,
    takeaways: [
      "析构前必须让 std::thread 变为不可 join。",
      "join 等待完成；detach 放弃后续管理，要谨慎。",
      "用 RAII 覆盖异常和提前返回。",
    ],
    exercise: "为什么只在正常路径末尾调用 join 不够？",
    hint: "中间函数可能抛异常或提前 return。",
    answer: "异常路径会绕过 join，thread 析构时仍可 join，导致 terminate；应使用守卫或 jthread。",
    question: "可 join 的 std::thread 析构时会怎样？",
    options: ["自动 join", "自动 detach", "调用 std::terminate", "什么也不做"],
    correct: 2,
    explanation: "标准库要求程序终止，避免悄悄丢失线程所有权。",
    references: concurrencyReferences,
    level: "进阶",
  },
  {
    item: 38,
    title: "理解线程句柄的析构差异",
    summary: "std::thread 会终止程序，某些 future 却可能在析构时等待。",
    plain:
      "不同并发句柄的析构行为并不统一。`std::thread` 不替你等；某些由 `std::async` 产生且持有最后共享状态的 future，析构时可能等待任务完成。代码表面只是离开作用域，实际却可能终止程序或发生隐藏等待。",
    example: `auto future = std::async(std::launch::async, [] {
  do_expensive_work();
});

// 某些条件下，最后一个相关 future 离开作用域会等待任务结束`,
    takeaways: [
      "不要假设所有并发句柄析构行为一致。",
      "明确保存 future，并在清楚的位置 get 或 wait。",
      "性能分析时注意作用域末尾的隐藏等待。",
    ],
    exercise: "异步任务突然在函数返回处阻塞，首先检查什么？",
    hint: "看看是否有 future 正在离开作用域。",
    answer: "检查 std::async 返回的 future 是否是关联共享状态的最后引用，以及是否在析构时等待。",
    question: "为什么应显式安排 future 的 wait/get？",
    options: ["让类型更短", "避免析构处出现意外等待", "增加线程数", "关闭异常"],
    correct: 1,
    explanation: "同步点应该在代码中可见，便于推理正确性与性能。",
    references: concurrencyReferences,
    level: "进阶",
  },
  {
    item: 39,
    title: "用 void future 做一次性通知",
    summary: "把“数据准备好了”表达成一个只发生一次的事件。",
    plain:
      "有时线程间不需要传值，只需要一个“现在可以开始”的信号。`std::promise<void>` 配合 `std::future<void>` 就像一次性门铃：一端等待，另一端 set_value 后放行。它比忙等一个普通 bool 更安全，也不会白白占满 CPU。",
    example: `std::promise<void> ready;
auto signal = ready.get_future();

std::thread worker([&] {
  signal.wait();
  consume_data();
});

prepare_data();
ready.set_value();
worker.join();`,
    takeaways: [
      "promise/future 可以只传递完成事件，不必携带数据。",
      "一次 promise 通常只能满足一次。",
      "异常也可通过 set_exception 传给等待方。",
    ],
    exercise: "为什么不建议用 `while (!ready) {}` 等待普通 bool？",
    hint: "同时考虑数据竞争和 CPU 占用。",
    answer: "普通 bool 跨线程读写会产生数据竞争，忙等还持续占用核心；future 提供同步语义和阻塞等待。",
    question: "promise<void> 适合表达什么？",
    options: ["反复触发的消息队列", "一次性完成通知", "GPU 显存分配", "对象所有权"],
    correct: 1,
    explanation: "它不传具体值，只把一次完成或异常传给 future。",
    references: concurrencyReferences,
    level: "进阶",
  },
];

export const weekOneBookModule: TutorialModule = {
  week: 1,
  eyebrow: "EFFECTIVE C++ · 逐项深度教程",
  introduction:
    "先在页面里把 18 个知识点讲懂、练会，再把书当作深入阅读，而不是一上来面对一串 Item 编号。",
  lessons: items.map(itemLesson),
};
