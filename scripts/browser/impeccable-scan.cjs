// Runs the Impeccable detector (impeccable.style) against rendered BusTrack
// pages. Pages open in the sandbox Chromium with external hosts intercepted
// and a seeded fake session for the signed-in screens, so the detector sees
// the real DOM, computed styles and contrast instead of regex-matched source.
//
//   bash scripts/browser/setup.sh
//   NEXT_PUBLIC_SUPABASE_URL=https://fake.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=fake-anon-key npm run build
//   npm run start &
//   LD_LIBRARY_PATH="$PWD/.cache/browser/libs/lib:/tmp" node scripts/browser/impeccable-scan.cjs http://localhost:3000 [home@390 login@390 ...]
//
// Exit status 2 from the detector means primary findings; a silent run with
// status 0 is a clean page.
const path = require("path");
const { spawnSync } = require("child_process");
const { ROOT, parsePages, launch, openPage } = require("./pages.cjs");

const IMPECCABLE = path.join(ROOT, ".cache/skills/impeccable/node_modules/.bin/impeccable");
const PORT = 9333;

const BASE = process.argv[2] || "http://localhost:3000";
const DEFAULT_PAGES = ["home@390", "home@1280", "login@390", "dashboard@390", "dashboard@1280", "routes@390", "routes@1280", "track@390", "notifications@390"];
const PAGES = parsePages(process.argv.length > 3 ? process.argv.slice(3) : DEFAULT_PAGES);

(async () => {
  let failures = 0;
  for (const spec of PAGES) {
    // Impeccable closes the attached browser when it finishes, so launch one per page.
    const browser = await launch([`--remote-debugging-port=${PORT}`, "--remote-debugging-address=127.0.0.1"]);
    const { context, page, errors } = await openPage(browser, BASE, spec);
    console.log(`\n===== ${spec.name} @${spec.width} — ${page.url()} =====`);
    if (errors.length) console.log("page errors:", errors.join(" | "));
    const result = spawnSync(IMPECCABLE, ["detect", "--cdp", String(PORT), "--target", `${BASE}${spec.path}`], {
      cwd: ROOT,
      encoding: "utf8",
      timeout: 150000,
    });
    if (result.status === 2) failures += 1;
    const out = `${result.stdout || ""}${result.stderr || ""}`.trim();
    console.log(out || `(clean, status ${result.status})`);
    try {
      await context.close();
      await browser.close();
    } catch {
      /* already closed by the detector */
    }
  }
  console.log(`\n${failures} of ${PAGES.length} pages have primary findings.`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
