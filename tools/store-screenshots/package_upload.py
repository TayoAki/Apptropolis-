#!/usr/bin/env python3
"""Packages composed screenshots for upload: one zip with a folder per size, files in upload order.

Usage: python3 package_upload.py <screenshots-dir containing 6.9/ and 6.5/> <out.zip>
"""
import sys
import zipfile
from pathlib import Path

src, out = Path(sys.argv[1]), Path(sys.argv[2])
labels = {"6.9": "iPhone 6.9-inch (1320x2868)", "6.5": "iPhone 6.5-inch (1284x2778)"}
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for slot, label in labels.items():
        for f in sorted((src / slot).glob("*.png")):
            z.write(f, f"{label}/{f.name}")
print(out, out.stat().st_size // 1024, "KB")
