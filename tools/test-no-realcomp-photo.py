#!/usr/bin/env python3
"""Fail if the Realcomp-watermarked 5439 Deerfield Village Drive JPEG
(or its listing attribution) is still present in decrypted sources.

The member address itself may remain in sample data. This test looks for:
  - unique bytes / base64 of the removed JPEG (sha256 5cae62abfa95...)
  - a data:image/jpeg URI on that address's home.photo field
  - the old Realcomp MLS 61025956 photoSource / photoWhy strings

Other listing photos (e.g. 2573 Wickfield, 3153 Belinda) are out of scope.

Usage: python3 tools/test-no-realcomp-photo.py [repo_dir]
"""
from __future__ import annotations

import base64
import gzip
import hashlib
import importlib.util
import json
import re
import sys
from pathlib import Path

# Unique fingerprints of the removed 960x639 JPEG (not shared with other
# listing JPEGs in this repo, which can share a common /9j/ SOI prefix).
JPEG_SHA256 = "5cae62abfa95e12a3c87c27f6842f8ffd2cfa05d0bf2cbce2a31afcaa2744d03"
B64_MID = "o1S+o+IO2IVn6hozYcBAAOc6gu34TZZqL6HUQF3AoKzWZlCVgueD95gl2lDJGqbTx2mX1EoGjzME0dwL"
B64_END = "/NnrMFN8jsJsCa19QrgHIVUI8oEb+CUgINeF7IINRyU7g4BdK5dZhW5bZLgXM3ELvPjxKeIesVP/2Q=="
B64_OFFS400 = "oLTosdr5zvVNysSLOtnzliq1Y3ePTxIPbgjte87qWfu5XQGY878nxvTTV68Mm5Luuk8vZz5lm3nOl34j"
MLS_ID = "61025956"
OLD_SOURCE = "Listing photo, Realcomp MLS 61025956, via Redfin (photo 50 of 65)"
OLD_WHY_SNIP = "Best of 65 listing photos plus Street View"
ADDRESS = "5439 Deerfield Village Drive"
JPEG_URI_RE = re.compile(r"data:image/jpeg;base64,([A-Za-z0-9+/=]+)")

LOCK_PATHS = [
    Path("/workspace/security/pagelock/lock_pages.py"),
    Path(__file__).resolve().parents[2] / "security/pagelock/lock_pages.py",
]


def load_pagelock():
    for p in LOCK_PATHS:
        if p.exists():
            spec = importlib.util.spec_from_file_location("mw_lock_pages", p)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod
    return None


def decrypt_passwords(root: Path, lock) -> list[str]:
    """Same password candidates as pagelock unlock / premerge-check."""
    cands = []
    try:
        extra = lock.load_config(root)
        main = lock.main_key_enabled(root)
    except Exception:
        extra, main = None, True
    if main:
        try:
            cands.append(lock.password())
        except Exception:
            pass
    if extra:
        try:
            cands.extend(v for v, _rk in lock.extra_passwords(extra))
        except Exception:
            pass
    return cands


def decrypt_html(path: Path, lock, caches: dict, cands: list[str]) -> str:
    text = path.read_text(errors="replace")
    if not (lock and lock.is_gate(text)):
        return text
    last = None
    for cand in cands:
        cache = caches.setdefault(cand, {})
        try:
            return lock.decrypt(text, cand, cache)
        except Exception as e:
            last = e
            continue
    raise RuntimeError(f"no matching key ({last})")


def expand_sources(rel: str, text: str) -> list[tuple[str, str]]:
    out = [(rel, text)]
    m = re.search(r'<script id="su-testdata"[^>]*>(.*?)</script>', text, re.S)
    if m:
        raw = base64.b64decode(m.group(1))
        if raw[:2] == b"\x1f\x8b":
            out.append((rel + " [su-testdata]", gzip.decompress(raw).decode("utf-8")))
    return out


def uri_sha(uri: str) -> str | None:
    try:
        return hashlib.sha256(base64.b64decode(uri.split(",", 1)[1])).hexdigest()
    except Exception:
        return None


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1]).resolve()
    lock = load_pagelock()
    cands = decrypt_passwords(root, lock) if lock else []
    caches: dict = {}
    failures: list[str] = []

    html_files = sorted(p for p in root.rglob("*.html") if ".git" not in p.parts)
    other = [
        p
        for p in root.rglob("*")
        if p.is_file()
        and ".git" not in p.parts
        and p.suffix.lower() in {".js", ".css", ".json", ".md", ".txt", ".svg"}
        and p.name != Path(__file__).name
    ]

    sources: list[tuple[str, str]] = []
    for p in html_files:
        rel = str(p.relative_to(root))
        try:
            text = decrypt_html(p, lock, caches, cands)
        except Exception as e:
            failures.append(f"{rel}: decrypt failed: {e}")
            continue
        sources.extend(expand_sources(rel, text))
    for p in other:
        rel = str(p.relative_to(root))
        sources.append((rel, p.read_text(errors="replace")))

    needles = {
        "jpeg sha256": JPEG_SHA256,
        "jpeg b64 mid": B64_MID,
        "jpeg b64 end": B64_END,
        "jpeg b64 +400": B64_OFFS400,
        "MLS 61025956": MLS_ID,
        "old photoSource": OLD_SOURCE,
        "old photoWhy": OLD_WHY_SNIP,
    }
    for rel, text in sources:
        for label, needle in needles.items():
            if needle in text:
                failures.append(f"{rel}: found {label}")

        for m in JPEG_URI_RE.finditer(text):
            sha = uri_sha("data:image/jpeg;base64," + m.group(1))
            if sha == JPEG_SHA256:
                failures.append(f"{rel}: found removed JPEG by sha256")

        # Address + jpeg data-URI on the same home object (sample address may stay).
        if ADDRESS in text:
            for block in re.finditer(r'\{[^{}]*"street":"Deerfield Village Drive"[^{}]*\}', text):
                if "data:image/jpeg" in block.group(0) or MLS_ID in block.group(0):
                    failures.append(f"{rel}: Deerfield home object still has a JPEG data-URI or MLS id")
            # Also catch compact JSON where photo comes before/after systems (fields may
            # sit outside a single-level { } because of nested systems arrays).
            for m in re.finditer(
                r'"address":"5439 Deerfield Village Drive[^"]*"', text
            ):
                window = text[max(0, m.start() - 200) : m.end() + 200000]
                # Stop at the next top-level member if possible
                photo = re.search(r'"photo":"(.*?)"', window)
                src = re.search(r'"photoSource":"(.*?)"', window)
                if photo and photo.group(1).startswith("data:image/jpeg"):
                    failures.append(f"{rel}: home.photo for {ADDRESS} is still a JPEG data-URI")
                if src and "61025956" in src.group(1):
                    failures.append(f"{rel}: photoSource for {ADDRESS} still cites MLS 61025956")

    # Raw JPEG file must not exist as a standalone repo asset.
    img_ext = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    for p in root.rglob("*"):
        if not p.is_file() or ".git" in p.parts:
            continue
        if p.suffix.lower() not in img_ext:
            continue
        data = p.read_bytes()
        if hashlib.sha256(data).hexdigest() == JPEG_SHA256:
            failures.append(f"{p.relative_to(root)}: standalone file is the removed JPEG")

    if failures:
        print("FAIL: Realcomp Deerfield photo still present:")
        for f in failures:
            print("  -", f)
        return 1
    print(f"PASS: no Deerfield Realcomp JPEG or MLS 61025956 attribution in {len(sources)} sources under {root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
