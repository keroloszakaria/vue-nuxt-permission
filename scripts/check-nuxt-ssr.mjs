import { spawn } from "node:child_process";
import { setTimeout as pause } from "node:timers/promises";

const port = "34563";
const origin = `http://127.0.0.1:${port}`;
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

async function request(role, path = "/") {
  const response = await fetch(new URL(path, origin), {
    redirect: "manual",
    headers: { Cookie: `permission_role=${role}` },
  });
  return {
    status: response.status,
    location: response.headers.get("location"),
    html: await response.text(),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertDirective(html, kind, visible) {
  const tag = html.match(
    new RegExp(`<span\\b[^>]*data-permission-element=["']${kind}["'][^>]*>`, "i"),
  )?.[0];
  assert(Boolean(tag), `Missing SSR directive span for ${kind}`);
  const hidden = /style=["'][^"']*display\s*:\s*none/i.test(tag);
  assert(hidden === !visible, `SSR directive ${kind} should be ${visible ? "visible" : "hidden"}; got ${tag}`);
}

try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) break;
    try {
      const response = await request("guest");
      if (response.status === 200) {
        ready = true;
        break;
      }
    } catch {
      await pause(250);
      continue;
    }
    await pause(250);
  }
  if (!ready) throw new Error("Nuxt SSR server did not start: " + logs);

  // Interleave identities, invalid payloads, and unauthorized API responses.
  const roles = [
    "admin", "guest", "invalid", "admin", "denied", "guest",
    "guest", "admin", "invalid", "denied",
  ];
  const pages = await Promise.all(roles.map(role => request(role)));
  for (let i = 0; i < roles.length; i++) {
    const role = roles[i];
    const { html, status } = pages[i];
    const shouldAdmin = role === "admin";
    const shouldPublic = role === "admin" || role === "guest";
    const expected = `data-permission-role="${shouldAdmin ? "admin" : "guest"}"`;
    assert(status === 200, `Unexpected status ${status} for ${role}`);
    assert(html.includes(expected), `Scoped composable state leaked on request ${i} (${role})`);
    assertDirective(html, "admin", shouldAdmin);
    assertDirective(html, "public", shouldPublic);
  }

  const routes = await Promise.all([
    request("admin", "/admin"),
    request("guest", "/admin"),
    request("invalid", "/admin"),
    request("denied", "/admin"),
  ]);
  assert(routes[0].status === 200 && routes[0].html.includes('data-admin-route="allowed"'),
    "Nuxt middleware incorrectly denied admin access");
  for (let i = 1; i < routes.length; i++) {
    assert(routes[i].status === 302 || routes[i].status === 301,
      `Nuxt middleware allowed unauthorized access (status ${routes[i].status})`);
    assert(new URL(routes[i].location ?? "/", origin).pathname === "/",
      "Nuxt middleware redirect target is unexpected");
  }

  console.log("SSR_SCOPE_DIRECTIVE_MIDDLEWARE_PASS: 10 parallel requests and 4 protected routes");
} finally {
  child.kill("SIGTERM");
}
