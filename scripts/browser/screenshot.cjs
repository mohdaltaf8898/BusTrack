// Full-page screenshots of rendered BusTrack pages (same interception and fake
// session as impeccable-scan.cjs). Also reports horizontal overflow.
//
//   LD_LIBRARY_PATH="$PWD/.cache/browser/libs/lib:/tmp" node scripts/browser/screenshot.cjs http://localhost:3000 .cache/shots home@390 login@390 ...
const fs = require("fs");
const path = require("path");
const { parsePages, launch, openPage } = require("./pages.cjs");

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3] || ".cache/shots";
const PAGES = parsePages(process.argv.length > 4 ? process.argv.slice(4) : ["home@390", "login@390", "dashboard@390", "track@390"]);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  for (const spec of PAGES) {
    // One browser per page: the sandbox Chromium drops the connection when a
    // second context with a different device profile is opened.
    const browser = await launch();
    const { context, page, errors } = await openPage(browser, BASE, spec);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const file = path.join(OUT, `${spec.name}-${spec.width}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`${file}  overflow=${overflow}px${errors.length ? `  errors: ${errors.join(" | ")}` : ""}`);
    await context.close();
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
