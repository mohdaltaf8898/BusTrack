#!/usr/bin/env python3
"""Vendor Overpass for next/font/local with one metadata fix.

Overpass 4.000 (the file shipped by @fontsource-variable/overpass) lists a
handful of *spacing* glyphs in the GDEF mark class: the middle dot (U+00B7),
the spacing accents (U+00A8 and friends) and the denominator digits. HarfBuzz
zeroes the advance of GDEF marks in Latin text, so Chrome and Firefox draw
"Route 01 · Bus" as "Route 01 ·Bus", with the dot sitting on top of the next
letter. Combining marks keep their class; only glyphs that carry a real
advance width are moved back to the base class.

    pip install fonttools brotli
    python3 scripts/fonts/patch-overpass.py

The output is committed under app/fonts/ so the build does not need Python.
Overpass is licensed under the SIL OFL 1.1 without a Reserved Font Name; the
license text is copied alongside the font.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
PACKAGE = ROOT / "node_modules/@fontsource-variable/overpass"
SOURCE = PACKAGE / "files/overpass-latin-wght-normal.woff2"
TARGET = ROOT / "app/fonts/overpass-latin-wght-normal.woff2"
LICENSE = ROOT / "app/fonts/OFL-Overpass.txt"

BASE_CLASS = 1
MARK_CLASS = 3


def main() -> None:
    font = TTFont(SOURCE)
    class_defs = font["GDEF"].table.GlyphClassDef.classDefs
    hmtx = font["hmtx"]
    moved: list[str] = []
    for glyph, cls in list(class_defs.items()):
        advance, _ = hmtx[glyph]
        if cls == MARK_CLASS and advance > 0:
            class_defs[glyph] = BASE_CLASS
            moved.append(glyph)
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    font.flavor = "woff2"
    font.save(TARGET)
    shutil.copyfile(PACKAGE / "LICENSE", LICENSE)
    print(f"reclassified {len(moved)} glyphs: {', '.join(sorted(moved))}")
    print(f"wrote {TARGET.relative_to(ROOT)} ({TARGET.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
