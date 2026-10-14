import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";

const port = "34563";
const child = spawn(process.execPath, [
  "examples/nuxt-smoke/.output/server/index.mjs",
], {
  cwd: process.cwd(),
  env: { ...process.env, NITRO_PORT: port, HOST: "127.0.0.1" },
  stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (data) => { logs += data.toString(); });
child.stderr.on("data", (data) => { logs += data.toString(); });

async function request(role) {
  const response = await fetch(`http://127.0.0.1:${port}/`, {
    headers: { Cookie: `permission_role=${role}` },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) break;
    try {
      await request("guest");
      ready = true;
      break;
    } catch {
      await pause(250);
    }
  }
  if (!ready) throw new Error("Nuxt SSR server did not start: " + logs);

  // Interleave different cookies to catch process-global permission leakage.
  const roles = ["admin", "guest", "guest", "admin", "guest", "admin"];
  const pages = await Promise.all(roles.map(request));
  for (let i = 0; i < roles.length; i++) {
    const html = pages[i];
    const expected = `data-permission-role="${roles[i]}"`;
    if (!html.includes(expected)) {
      throw new Error(`SSR isolation failed: expected ${expected} for request ${i}. HTML: ${html.slice(0, 1000)}`);
    }
  }
  console.log("SSR_REQUEST_ISOLATION_PASS for 6 interleaved requests");
} finally {
  child.kill("SIGTERM");
}
