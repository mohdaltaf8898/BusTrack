// Shared helpers for the browser scripts: launches the sandbox Chromium and
// opens BusTrack pages with external hosts intercepted and, for signed-in
// screens, a seeded fake Supabase session. See impeccable-scan.cjs for setup.
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const BROWSER_MODULES = path.join(ROOT, ".cache/browser/node_modules");
const { chromium } = require(path.join(BROWSER_MODULES, "playwright-core"));
const sparticuz = require(path.join(BROWSER_MODULES, "@sparticuz/chromium"));

const ROUTES = { home: "/", login: "/login", signup: "/signup", dashboard: "/dashboard", routes: "/routes", track: "/track", notifications: "/notifications", "bus-details": "/bus-details", profile: "/profile" };

function parsePages(specs) {
  return specs.map((spec) => {
    const [name, width] = spec.split("@");
    return { name, path: ROUTES[name] || name, width: Number(width || 390), signedIn: !["home", "login", "signup"].includes(name) };
  });
}

function b64url(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function fakeSession() {
  const now = Math.floor(Date.now() / 1000);
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "student@example.edu",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { name: "Test Student" },
    created_at: new Date().toISOString(),
  };
  const payload = { sub: user.id, email: user.email, aud: "authenticated", role: "authenticated", exp: now + 3600, iat: now };
  const token = `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.sig`;
  return { access_token: token, refresh_token: "refresh", token_type: "bearer", expires_in: 3600, expires_at: now + 3600, user };
}

async function launch(extraArgs = []) {
  const executablePath = await sparticuz.executablePath();
  return chromium.launch({ executablePath, headless: true, args: [...sparticuz.args, ...extraArgs] });
}

async function openPage(browser, base, spec) {
  const phone = spec.width < 800;
  const context = await browser.newContext({
    viewport: { width: spec.width, height: phone ? 844 : 800 },
    deviceScaleFactor: 1,
    isMobile: phone,
    hasTouch: phone,
  });
  const session = fakeSession();
  await context.route(/fake\.supabase\.co\//, (route) => {
    const url = route.request().url();
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (url.includes("/auth/v1/user")) return json(session.user);
    if (url.includes("/auth/v1/settings")) return json({ external: { email: true, google: false }, disable_signup: false });
    if (url.includes("/rest/v1/profiles")) return json({ id: session.user.id, name: "Test Student", role: "student" });
    if (url.includes("/rest/v1/")) return json([]);
    return json({});
  });
  await context.route(/tile\.openstreetmap\.org|\/api\/road-route/, (route) => route.abort());
  await context.route(/\/api\/admin/, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: {} }) }));
  if (spec.signedIn) {
    await context.addInitScript((s) => window.localStorage.setItem("sb-fake-auth-token", JSON.stringify(s)), session);
  }
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.goto(`${base}${spec.path}`, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  // Walk the page so anything that waits for the viewport has rendered.
  await page.evaluate(async () => {
    const step = Math.max(300, Math.round(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
  return { context, page, errors };
}

module.exports = { ROOT, ROUTES, parsePages, fakeSession, launch, openPage };
