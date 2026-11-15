#!/usr/bin/env python3
"""Checks a folder of App Store screenshots for one slot: exact size, no alpha, at most 10.

Usage: python3 check_shots.py <folder> --slot 6.9|6.5
Exit code 1 on any failure.
"""
import sys
from pathlib import Path
from PIL import Image

SIZES = {"6.9": [(1320, 2868), (2868, 1320)], "6.5": [(1284, 2778), (2778, 1284), (1242, 2688), (2688, 1242)]}

def main():
    if len(sys.argv) < 4 or sys.argv[2] != "--slot" or sys.argv[3] not in SIZES:
        print(__doc__)
        sys.exit(2)
    folder, slot = Path(sys.argv[1]), sys.argv[3]
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg"))
    failures = []
    if not files:
        failures.append("no images")
    if len(files) > 10:
        failures.append(f"{len(files)} images; the limit is 10")
    for f in files:
        with Image.open(f) as im:
            problems = []
            if im.size not in SIZES[slot]:
                problems.append(f"{im.size[0]}x{im.size[1]} is not a {slot}-inch size")
            if im.mode in ("RGBA", "LA", "P") or "transparency" in im.info:
                problems.append(f"has alpha ({im.mode})")
            status = "FAIL " + "; ".join(problems) if problems else "ok"
            print(f"{f.name}: {im.size[0]}x{im.size[1]} {im.mode} {f.stat().st_size // 1024} KB  {status}")
            failures += [f"{f.name}: {p}" for p in problems]
    print(f"\n{len(files)} images, {'PASS' if not failures else 'FAIL'}")
    for line in failures:
        print("  -", line)
    sys.exit(1 if failures else 0)

main()
