#!/usr/bin/env bash
# Installs a headless Chromium plus the Impeccable detector into .cache/
# (gitignored) so the browser checks in this folder can run on a plain Linux
# box without root: playwright-core drives @sparticuz/chromium, whose binary
# needs the NSS/NSPR shared libraries that Amazon Linux ships but Debian
# containers often lack. Those come from older sparticuz and kaleido builds.
#
#   bash scripts/browser/setup.sh
#   export LD_LIBRARY_PATH="$PWD/.cache/browser/libs/lib:/tmp"
#   node scripts/browser/impeccable-scan.cjs http://localhost:3000
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BROWSER_DIR="$ROOT/.cache/browser"
IMPECCABLE_DIR="$ROOT/.cache/skills/impeccable"

mkdir -p "$BROWSER_DIR/libs/lib" "$IMPECCABLE_DIR"

if [ ! -d "$BROWSER_DIR/node_modules/playwright-core" ]; then
  (cd "$BROWSER_DIR" && npm init -y >/dev/null 2>&1 && npm install --silent --no-audit --no-fund playwright-core@1.49.1 @sparticuz/chromium@131.0.1)
fi

if [ ! -f "$BROWSER_DIR/libs/lib/libnss3.so" ]; then
  TMP="$(mktemp -d)"
  (
    cd "$TMP"
    npm pack @sparticuz/chromium@119.0.2 --silent >/dev/null 2>&1
    tar xzf sparticuz-chromium-119.0.2.tgz package/bin/al2.tar.br
    node -e "const z=require('zlib'),fs=require('fs');fs.writeFileSync('al2.tar',z.brotliDecompressSync(fs.readFileSync('package/bin/al2.tar.br')))"
    tar xf al2.tar
    cp lib/*.so* "$BROWSER_DIR/libs/lib/"
  )
  rm -rf "$TMP"
fi

if [ ! -f "$BROWSER_DIR/libs/lib/libnspr4.so" ]; then
  TMP="$(mktemp -d)"
  (
    cd "$TMP"
    pip download kaleido==0.2.1 --no-deps --only-binary=:all: --platform manylinux1_x86_64 --python-version 3.9 -d . -q
    python3 - "$BROWSER_DIR/libs/lib" <<'PY'
import glob, os, sys, zipfile
dest = sys.argv[1]
wheel = zipfile.ZipFile(glob.glob("kaleido-*.whl")[0])
for name in wheel.namelist():
    base = os.path.basename(name)
    if name.startswith("kaleido/executable/lib/") and base in ("libnspr4.so", "libplc4.so", "libplds4.so"):
        open(os.path.join(dest, base), "wb").write(wheel.read(name))
PY
  )
  rm -rf "$TMP"
fi

if [ ! -x "$IMPECCABLE_DIR/node_modules/.bin/impeccable" ]; then
  (cd "$IMPECCABLE_DIR" && npm init -y >/dev/null 2>&1 && npm install --silent --no-audit --no-fund impeccable@4.8.1 @impeccable/cli-linux-x64@0.1.21)
fi

# Extract the Chromium binary once (to /tmp/chromium) and prove it launches.
export LD_LIBRARY_PATH="$BROWSER_DIR/libs/lib:/tmp"
(cd "$BROWSER_DIR" && node -e "
const { chromium } = require('playwright-core');
const sparticuz = require('@sparticuz/chromium');
(async () => {
  const executablePath = await sparticuz.executablePath();
  const browser = await chromium.launch({ executablePath, args: sparticuz.args, headless: true });
  await browser.close();
  console.log('Chromium ready at', executablePath);
})().catch((e) => { console.error(e); process.exit(1); });
")
echo "Impeccable: $($IMPECCABLE_DIR/node_modules/.bin/impeccable detect --list-rules --quiet | wc -l) rules"
