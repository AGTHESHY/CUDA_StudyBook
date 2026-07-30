const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const renderInline = (value: string) => {
  const codeTokens: string[] = [];
  let output = escapeHtml(value).replace(/`([^`\n]+)`/g, (_, code: string) => {
    const index = codeTokens.push(`<code>${code}</code>`) - 1;
    return `\u0000CODE${index}\u0000`;
  });

  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer noopener">$1</a>',
  );
  output = output
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n]+)__/g, "<strong>$1</strong>")
    .replace(/~~([^~\n]+)~~/g, "<del>$1</del>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  return output.replace(/\u0000CODE(\d+)\u0000/g, (_, index: string) =>
    codeTokens[Number(index)] ?? "",
  );
};

export const renderMarkdown = (markdown: string) => {
  const lines = String(markdown ?? "").replace(/\r\n?/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let listItems: string[] = [];
  let codeLanguage = "";
  let codeLines: string[] | null = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${renderInline(paragraph.join("\n")).replace(/\n/g, "<br>")}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!listType || !listItems.length) return;
    html.push(
      `<${listType}>${listItems
        .map((item) => `<li>${renderInline(item)}</li>`)
        .join("")}</${listType}>`,
    );
    listType = null;
    listItems = [];
  };

  const flushCode = () => {
    if (!codeLines) return;
    const language = codeLanguage.replace(/[^a-z0-9_+-]/gi, "").toLowerCase();
    const className = language ? ` class="language-${language}"` : "";
    html.push(
      `<pre><code${className}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    );
    codeLines = null;
    codeLanguage = "";
  };

  for (const line of lines) {
    const fence = line.match(/^```\s*([a-z0-9_+-]*)\s*$/i);
    if (fence) {
      if (codeLines) {
        flushCode();
      } else {
        flushParagraph();
        flushList();
        codeLanguage = fence[1] ?? "";
        codeLines = [];
      }
      continue;
    }

    if (codeLines) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(6, heading[1].length + 2);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const unordered = line.match(/^\s*[-+*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextType = unordered ? "ul" : "ol";
      if (listType && listType !== nextType) flushList();
      listType = nextType;
      listItems.push((unordered?.[1] ?? ordered?.[1]) as string);
      continue;
    }

    const blockquote = line.match(/^\s*>\s?(.*)$/);
    if (blockquote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${renderInline(blockquote[1])}</blockquote>`);
      continue;
    }

    if (/^\s*([-*_])\1\1+\s*$/.test(line)) {
      flushParagraph();
      flushList();
      html.push("<hr>");
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  if (codeLines) flushCode();
  flushParagraph();
  flushList();
  return html.join("");
};

