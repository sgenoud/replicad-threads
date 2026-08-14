#!/usr/bin/env node
// Serves the locally built studio bundle over HTTP and opens it in the replicad
// studio, so the library can be exercised without publishing it.
//
//   node scripts/dev-studio.js [path/to/example.js] [--no-open] [--no-watch]
//
// Env: PORT (default 8081), STUDIO_URL (default https://studio.replicad.xyz)

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const example = path.resolve(
  ROOT,
  args.find((a) => !a.startsWith("--")) ?? "dev/example.js",
);

const PORT = Number(process.env.PORT ?? 8081);
const STUDIO = process.env.STUDIO_URL ?? "https://studio.replicad.xyz";
const ORIGIN = `http://localhost:${PORT}`;
const BUNDLE = path.join(ROOT, "dist/studio/replicad-threads.js");

const send = (res, status, body, type = "text/javascript; charset=utf-8") => {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(body);
};

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, ORIGIN);
  try {
    if (pathname === "/lib.js") {
      return send(res, 200, await readFile(BUNDLE));
    }
    if (pathname === "/example.js") {
      // Cache-bust on every rebuild: the studio worker keeps its own module
      // registry, so a stable URL would keep serving the first build.
      const { mtimeMs } = await stat(BUNDLE);
      const code = await readFile(example, "utf8");
      return send(
        res,
        200,
        code.replaceAll("__THREADS_LIB__", `${ORIGIN}/lib.js?v=${mtimeMs}`),
      );
    }
    send(res, 404, "not found", "text/plain; charset=utf-8");
  } catch (e) {
    send(res, 500, `dev-studio: ${e.message}`, "text/plain; charset=utf-8");
  }
});

const waitForBundle = async () => {
  for (let i = 0; i < 120; i++) {
    try {
      await stat(BUNDLE);
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  return false;
};

const open = (url) => {
  const cmd =
    process.platform === "darwin"
      ? ["open", url]
      : process.platform === "win32"
        ? ["cmd", "/c", "start", "", url]
        : ["xdg-open", url];
  spawn(cmd[0], cmd.slice(1), { stdio: "ignore", detached: true }).unref();
};

const rolldown = path.join(ROOT, "node_modules/.bin/rolldown");
// `-c` takes the config path as its value, so it must be given explicitly —
// otherwise a following flag gets swallowed as the filename.
const buildArgs = ["-c", "rolldown.config.js"];
if (!flag("--no-watch")) buildArgs.push("--watch");
const build = spawn(rolldown, buildArgs, { cwd: ROOT, stdio: "inherit" });
build.on("error", (e) => {
  console.error(`Could not run rolldown (${e.message}). Did you npm install?`);
  process.exit(1);
});

const shutdown = () => {
  build.kill();
  server.close();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.on("error", (e) => {
  console.error(
    e.code === "EADDRINUSE"
      ? `Port ${PORT} is busy — rerun with PORT=<other> npm run dev:studio`
      : `dev-studio: ${e.message}`,
  );
  build.kill();
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", async () => {
  if (!(await waitForBundle())) {
    console.error(`Timed out waiting for ${path.relative(ROOT, BUNDLE)}`);
    return shutdown();
  }

  const url = new URL("/workbench", STUDIO);
  url.searchParams.set("from-url", `${ORIGIN}/example.js`);
  // Without `keep` the studio strips the param, so a reload would lose the
  // example instead of re-fetching it.
  url.searchParams.set("keep", "1");

  console.log(`\n  example  ${path.relative(ROOT, example)}`);
  console.log(`  serving  ${ORIGIN}/example.js`);
  console.log(`  studio   ${url}\n`);
  console.log("  Reload the studio tab to pick up edits. Ctrl-C to stop.\n");

  if (!flag("--no-open")) open(url.toString());
});
