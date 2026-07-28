import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const serverDir = resolve(dist, "server");
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "server") continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

const assets = {};
for (const file of await walk(dist)) {
  const path = `/${relative(dist, file).split("\\").join("/")}`;
  assets[path] = [
    mimeTypes[extname(file)] ?? "application/octet-stream",
    (await readFile(file)).toString("base64"),
  ];
}

const worker = `
const assets = ${JSON.stringify(assets)};
const decode = (value) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/store-api" || url.pathname.startsWith("/store-api/")) {
      const upstream = new URL(url.pathname.replace(/^\\/store-api/, "") || "/", "http://38.92.15.80:3021");
      upstream.search = url.search;
      const headers = new Headers(request.headers);
      headers.delete("host");
      headers.set("x-store-namespace", "cuda-study");
      return fetch(upstream, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "follow",
      });
    }

    const key = assets[url.pathname] ? url.pathname : "/index.html";
    const [contentType, encoded] = assets[key];
    return new Response(decode(encoded), {
      headers: {
        "content-type": contentType,
        "cache-control": key === "/index.html" ? "no-cache" : "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  },
};
`;

await mkdir(serverDir, { recursive: true });
await writeFile(resolve(serverDir, "index.js"), worker.trimStart(), "utf8");
console.log(`Prepared Sites worker with ${Object.keys(assets).length} static assets.`);
