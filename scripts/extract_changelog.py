#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract a single version's section from CHANGELOG.md and print to stdout.
Used by the release workflow to populate GitHub Release body.

Usage: python scripts/extract_changelog.py v1.1.0
       python scripts/extract_changelog.py 1.1.0
"""

import io
import re
import sys
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

REPO_ROOT = Path(__file__).parent.parent
FALLBACK = "See [CHANGELOG.md](CHANGELOG.md) for details."


def extract_section(version: str) -> str:
    version = version.lstrip("v")
    text = (REPO_ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    pattern = rf"^## \[{re.escape(version)}\][^\n]*\n(.*?)(?=\n^## \[|\Z)"
    m = re.search(pattern, text, re.MULTILINE | re.DOTALL)
    if not m:
        return FALLBACK
    return m.group(1).strip()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: extract_changelog.py <version>", file=sys.stderr)
        sys.exit(1)
    print(extract_section(sys.argv[1]))
