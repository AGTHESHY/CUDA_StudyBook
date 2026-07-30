import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = await readFile(resolve(root, "content/course.md"), "utf8");

const stageColors = [
  "#34875f",
  "#3f8f75",
  "#4a9784",
  "#5c9d72",
  "#759c63",
  "#9a9458",
  "#a47f58",
  "#9b6f78",
  "#7c7392",
  "#667e98",
];

const cleanInline = (value) =>
  value
    .replace(/\(\[\[([^\]]+)\]\(([^)]+)\)\]\[\d+\]\)/g, "[$1]($2)")
    .replace(/\[\[([^\]]+)\]\(([^)]+)\)\]/g, "[$1]($2)")
    .replace(/\?utm_source=chatgpt\.com/g, "")
    .trim();

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-|-$/g, "");

function parseBlocks(lines) {
  const blocks = [];
  let paragraph = [];
  let list = null;
  let code = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({
      type: "paragraph",
      text: cleanInline(paragraph.join(" ")),
    });
    paragraph = [];
  };

  const flushList = () => {
    if (!list) return;
    blocks.push(list);
    list = null;
  };

  const flushCode = () => {
    if (!code) return;
    blocks.push({
      type: "code",
      language: code.language,
      text: code.lines.join("\n").replace(/\s+$/, ""),
    });
    code = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");

    if (line.startsWith("```")) {
      flushParagraph();
      flushList();
      if (code) flushCode();
      else code = { language: line.slice(3).trim(), lines: [] };
      continue;
    }

    if (code) {
      code.lines.push(raw);
      continue;
    }

    const bullet = line.match(/^\s*[*-]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { type: "list", ordered: isOrdered, items: [] };
      }
      list.items.push(cleanInline((bullet || ordered)[1]));
      continue;
    }

    const subheading = line.match(/^####\s+(.+)$/);
    if (subheading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "subheading", text: cleanInline(subheading[1]) });
      continue;
    }

    const quote = line.match(/^>\s*(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      blocks.push({ type: "quote", text: cleanInline(quote[1]) });
      continue;
    }

    if (!line.trim() || line === "---") {
      flushParagraph();
      flushList();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();
  return blocks.filter((block) => {
    if ("text" in block) return Boolean(block.text);
    if ("items" in block) return block.items.length > 0;
    return true;
  });
}

const lines = source.split(/\r?\n/);
const stageMatches = [];
const weekMatches = [];

lines.forEach((line, lineIndex) => {
  const stage = line.match(/^#\s+.+第\s*(\d+)\s*阶段[：:]\s*(.+)$/);
  if (stage) {
    stageMatches.push({
      index: Number(stage[1]),
      title: cleanInline(stage[2]),
      lineIndex,
    });
  }
  const week = line.match(/^##\s+第\s*(\d+)\s*周[：:]\s*(.+)$/);
  if (week) {
    weekMatches.push({
      week: Number(week[1]),
      title: cleanInline(week[2]),
      lineIndex,
    });
  }
});

const stages = stageMatches.map((stage, stagePosition) => {
  const nextStageLine =
    stageMatches[stagePosition + 1]?.lineIndex ?? Number.POSITIVE_INFINITY;
  const stageWeeks = weekMatches.filter(
    (week) => week.lineIndex > stage.lineIndex && week.lineIndex < nextStageLine,
  );
  const prefaceEnd = stageWeeks[0]?.lineIndex ?? nextStageLine;
  const preface = lines.slice(stage.lineIndex + 1, prefaceEnd).join("\n");
  const time = preface.match(/\*\*时间[：:]\s*([^*]+)\*\*/)?.[1]?.trim() ?? "";
  return {
    id: `stage-${stage.index}`,
    index: stage.index,
    title: `第 ${stage.index} 阶段 · ${stage.title}`,
    shortTitle: stage.title,
    time,
    weekStart: stageWeeks[0]?.week ?? 0,
    weekEnd: stageWeeks.at(-1)?.week ?? 0,
    color: stageColors[stagePosition % stageColors.length],
  };
});

const weeks = weekMatches.map((week, weekPosition) => {
  const end = weekMatches[weekPosition + 1]?.lineIndex ?? lines.length;
  const owningStage =
    [...stageMatches].reverse().find((stage) => stage.lineIndex < week.lineIndex) ??
    stageMatches[0];
  const stage = stages.find((item) => item.index === owningStage.index);
  const bodyLines = lines.slice(week.lineIndex + 1, end);

  const sectionEntries = [];
  let current = {
    title: "本周导读",
    lines: [],
  };

  for (const line of bodyLines) {
    if (/^#\s+/.test(line) || /^##\s+第\s*\d+\s*周/.test(line)) break;
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      if (current.lines.some((item) => item.trim())) sectionEntries.push(current);
      current = { title: cleanInline(heading[1]), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((item) => item.trim())) sectionEntries.push(current);

  const sections = sectionEntries
    .map((entry, index) => ({
      id: `week-${week.week}-${slug(entry.title) || index + 1}`,
      title: entry.title,
      blocks: parseBlocks(entry.lines),
    }))
    .filter((section) => section.blocks.length);

  const searchText = [
    week.title,
    stage?.shortTitle,
    ...sections.flatMap((section) => [
      section.title,
      ...section.blocks.flatMap((block) =>
        "items" in block ? block.items : "text" in block ? [block.text] : [],
      ),
    ]),
  ]
    .join(" ")
    .toLowerCase();

  return {
    id: `week-${week.week}`,
    week: week.week,
    title: week.title,
    stageId: stage?.id ?? "",
    stageName: stage?.shortTitle ?? "",
    stageIndex: stage?.index ?? 0,
    sections,
    searchText,
  };
});

const output = {
  generatedAt: "2026-07-28",
  stages,
  weeks,
};

await writeFile(
  resolve(root, "src/course-data.json"),
  `${JSON.stringify(output, null, 2)}\n`,
  "utf8",
);

console.log(`Generated ${weeks.length} weeks across ${stages.length} stages.`);
