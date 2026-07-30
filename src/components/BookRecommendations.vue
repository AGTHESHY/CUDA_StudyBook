<template>
  <section id="recommended-reading" class="book-page">
    <div class="book-page-kicker">WEEK 01 · READING NOTES</div>
    <h2>推荐书籍</h2>
    <p class="book-page-lead">
      书放在最后，是因为它应该帮你加深理解，而不是替代教程。建议先完成左侧
      18 个 Item 和 6 个工程基础强化小节，再按薄弱点回到对应章节。
    </p>

    <article class="featured-book">
      <div class="book-spine">C++</div>
      <div>
        <span>本周主读</span>
        <h3>《Effective Modern C++》</h3>
        <p>
          不需要从头通读。先用页面里的例子建立直觉，再读原书看完整边界条件和设计理由。
        </p>
      </div>
    </article>

    <div class="reading-groups">
      <section>
        <span>ITEM 01—08</span>
        <h3>类型推导与基础语法</h3>
        <p>模板推导、auto、decltype、初始化方式与 nullptr。</p>
        <small>适合在写模板或读不懂编译器类型时回看。</small>
      </section>
      <section>
        <span>ITEM 17—23</span>
        <h3>资源、所有权与移动</h3>
        <p>特殊成员函数、智能指针、Pimpl、move 与 forward。</p>
        <small>适合在设计 Buffer、TensorView 或扩展接口时回看。</small>
      </section>
      <section>
        <span>ITEM 37—39</span>
        <h3>线程与异步状态</h3>
        <p>线程收尾、future 析构行为与一次性事件通信。</p>
        <small>适合在处理 CPU 调度与异步任务生命周期时回看。</small>
      </section>
    </div>

    <article class="secondary-book">
      <div>
        <span>补充阅读</span>
        <h3>《深入理解计算机系统》第 3 版</h3>
      </div>
      <ul>
        <li>第 3 章：函数调用、汇编和数据布局；</li>
        <li>第 5 章：程序性能优化；</li>
        <li>第 6 章：Cache 与存储器层次结构；</li>
        <li>第 7 章前半：编译与链接。</li>
      </ul>
    </article>

    <div class="reading-links">
      <a
        href="https://www.oreilly.com/library/view/effective-modern-c/9781491908419/"
        target="_blank"
        rel="noreferrer"
      >
        <small>O’REILLY</small>
        <strong>Effective Modern C++ 书目信息</strong>
        <span>↗</span>
      </a>
      <a
        href="https://csapp.cs.cmu.edu/3e/home.html"
        target="_blank"
        rel="noreferrer"
      >
        <small>CMU</small>
        <strong>CS:APP 第 3 版配套主页</strong>
        <span>↗</span>
      </a>
    </div>

    <aside class="reading-method">
      <strong>推荐读法</strong>
      <p>
        做完一个 Item 的练习后，只阅读对应章节；把书里新增的边界条件记进右侧学习笔记。
        如果只是“看懂了”但无法独立写出示例，就回到该 Item 再做一次测验。
      </p>
    </aside>
  </section>
</template>
