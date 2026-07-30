import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
import katex from "katex";

const source = await readFile(
  new URL("../src/utils/markdown.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText.replace(
  'import katex from "katex";',
  "const katex = globalThis.__cuda52Katex;",
);
globalThis.__cuda52Katex = katex;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
const { renderMarkdown } = await import(moduleUrl);

test("renders common tutor markdown", () => {
  const html = renderMarkdown(
    `## 核心

**重点**和\`代码\`

- 第一项
- 第二项

\`\`\`cpp
int x = 1;
\`\`\``,
  );

  assert.match(html, /<h4>核心<\/h4>/);
  assert.match(html, /<strong>重点<\/strong>/);
  assert.match(html, /<code>代码<\/code>/);
  assert.match(html, /<ul><li>第一项<\/li><li>第二项<\/li><\/ul>/);
  assert.match(html, /class="language-cpp"/);
});

test("escapes HTML and rejects executable links", () => {
  const html = renderMarkdown(
    '<script>alert("x")</script> [危险](javascript:alert(1)) [文档](https://example.com)',
  );

  assert.doesNotMatch(html, /<script>/);
  assert.doesNotMatch(html, /href="javascript:/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /href="https:\/\/example\.com"/);
});

test("renders inline and display TeX formulas", () => {
  const html = renderMarkdown(
    String.raw`SiLU 是 $\text{SiLU}(x)=x\cdot\sigma(x)$。

$$
\sigma(x)=\frac{1}{1+e^{-x}}
$$`,
  );

  assert.match(html, /class="katex"/);
  assert.match(html, /class="math-display"/);
  assert.match(html, /<mtext>SiLU<\/mtext>/);
  assert.match(html, /<mfrac>/);
  assert.doesNotMatch(html, /<p>.*\$\\text\{SiLU\}/);
});
