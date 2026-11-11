#!/usr/bin/env python3
"""Pre-merge content check for Smart Upkeep.

Runs against decrypted temp copies of pagelocked HTML (same AES-GCM/PBKDF2
decrypt as /workspace/security/pagelock/lock_pages.py). Plain CSS/JS and
already-unlocked HTML are read in place.

Fails (exit 1) if any of these are found:
  - gold hex #D4A017 (any case) in member, tech, onboarding, billing, or PDF assets
  - the text Q4 in a visible visit label
  - 'Built by' in assets/member/pdf
  - the blocked personal full name or personal-site link (see NAME_RE / SITE_RE)

Title Case heading lint prints WARN only and does not fail the check.

Usage: python3 tools/premerge-check.py [repo_dir]
"""
from __future__ import annotations

import importlib.util
import os
import re
import sys
import tempfile
from pathlib import Path

SKIP_DIRS = {".git", "node_modules", "__pycache__", "tools"}
TEXT_EXT = {".html", ".js", ".css", ".md", ".txt", ".svg", ".json", ".xml"}

# Patterns live only in this script (excluded from the scan).
GOLD_RE = re.compile(r"#D4A017", re.I)
Q4_RE = re.compile(r"\bQ4\b")
BUILT_BY_RE = re.compile(r"Built by", re.I)
NAME_RE = re.compile(r"Max\s+Weberman", re.I)
SITE_RE = re.compile(r"maxweberman\.com", re.I)

GOLD_ROOTS = (
    "member/",
    "tech/",
    "onboarding",
    "billing",
    "assets/member/pdf/",
)
# Onboarding JS lives in app.js at the repo root.
GOLD_FILES = {"app.js", "onboarding.css"}

VISIT_HINT = re.compile(
    r"(visit|season|label|title|caption|rp-type|nv-big|vrow|planVisit|visitLabel|carousel)",
    re.I,
)
# Heading-like tags/classes for the warn-only Title Case lint
HEADING_RE = re.compile(
    r"<(?P<tag>h[1-4]|legend|figcaption)(?:\s[^>]*)?>(?P<text>.*?)</(?P=tag)>",
    re.I | re.S,
)
CLASS_HEADING_RE = re.compile(
    r"<(?:div|span|p|button|summary)\s+[^>]*class=\"[^\"]*\b(?:bh|pv-sec-h|us-k|ms-k|help-grp-h|sh-title|nf-q)\b[^\"]*\"[^>]*>(?P<text>.*?)</(?:div|span|p|button|summary)>",
    re.I | re.S,
)
SMALL_WORDS = {
    "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
    "nor", "of", "on", "or", "per", "the", "to", "vs", "via", "with",
}

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


def is_gold_scope(rel: str) -> bool:
    posix = rel.replace("\\", "/")
    if posix in GOLD_FILES or posix.endswith("/onboarding.css"):
        return True
    if "onboarding" in posix.split("/")[-1].lower() or "/onboarding/" in posix:
        return True
    if "/billing/" in f"/{posix}/" or posix.endswith("/billing") or posix.startswith("billing/"):
        return True
    if posix.startswith("member/") or posix.startswith("tech/"):
        return True
    if posix.startswith("assets/member/pdf/"):
        return True
    return False


def should_skip(rel: Path) -> bool:
    parts = set(rel.parts)
    if parts & SKIP_DIRS:
        return True
    if rel.name.startswith("premerge-check."):
        return True
    return False


def iter_files(root: Path):
    for p in root.rglob("*"):
        if not p.is_file():
            continue
        try:
            rel = p.relative_to(root)
        except ValueError:
            continue
        if should_skip(rel):
            continue
        if p.suffix.lower() not in TEXT_EXT:
            continue
        yield p, rel


def decrypt_tree(root: Path, tmp: Path, lockmod) -> list[str]:
    """Decrypt gated HTML into tmp, same candidates as pagelock unlock."""
    notes = []
    try:
        extra = lockmod.load_config(root)
        main = lockmod.main_key_enabled(root)
    except Exception as e:
        extra, main = None, True
        notes.append(f"pagelock config: {e}")
    cands = []
    caches = []
    if main:
        try:
            pw = lockmod.password()
            cands.append(pw)
            caches.append({})
        except SystemExit as e:
            notes.append(f"pagelock main password unavailable ({e})")
        except Exception as e:
            notes.append(f"pagelock main password unavailable ({e})")
    if extra:
        try:
            for v, _rk in lockmod.extra_passwords(extra):
                cands.append(v)
                caches.append({})
        except Exception as e:
            notes.append(f"pagelock extra password: {e}")
    if not cands:
        notes.append("no pagelock password; will scan unlocked files only")

    n = 0
    failed = 0
    for src, rel in iter_files(root):
        if src.suffix.lower() != ".html":
            continue
        text = src.read_text(errors="replace")
        if not lockmod.is_gate(text):
            continue
        dest = tmp / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        out = None
        for cand, cache in zip(cands, caches):
            try:
                out = lockmod.decrypt(text, cand, cache)
            except Exception:
                out = None
            if out is not None:
                break
        if out is None:
            notes.append(f"decrypt failed: {rel}")
            failed += 1
            continue
        dest.write_text(out)
        n += 1
    if n:
        notes.append(f"decrypted {n} gated HTML file(s) into a temp copy")
    if failed:
        notes.append(f"{failed} gated HTML file(s) could not be decrypted")
    return notes


def read_for_scan(root: Path, tmp: Path, rel: Path) -> str | None:
    decrypted = tmp / rel
    src = root / rel
    if decrypted.exists():
        return decrypted.read_text(errors="replace")
    if src.exists():
        return src.read_text(errors="replace")
    return None


def line_no(text: str, idx: int) -> int:
    return text.count("\n", 0, idx) + 1


def strip_tags(s: str) -> str:
    s = re.sub(r"<script[\s\S]*?</script>", " ", s, flags=re.I)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()


def visible_q4_hits(rel: Path, text: str) -> list[str]:
    """Q4 only fails when it shows up in a visit label (not comments or this script)."""
    hits = []
    posix = str(rel).replace("\\", "/")
    in_member = posix.startswith("member/") or posix.startswith("assets/member/")
    if not in_member and posix not in {"app.js"}:
        # Still check other UI files if the line looks like a visit label.
        pass
    for m in Q4_RE.finditer(text):
        # skip comments
        start = max(0, m.start() - 80)
        window = text[start:m.end() + 80]
        line = text[text.rfind("\n", 0, m.start()) + 1: text.find("\n", m.start())]
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*") or stripped.startswith("#"):
            continue
        # visible visit label: string literals near visit wording, or raw HTML text
        if VISIT_HINT.search(window) or VISIT_HINT.search(str(rel)):
            hits.append(f"{rel}:{line_no(text, m.start())}: {stripped[:160]}")
        elif posix.startswith("member/") and ("'" in window or '"' in window or "<" in window):
            # Conservative: any Q4 string in the member app
            if re.search(r"""['"`>][^'"`<]*Q4""", window):
                hits.append(f"{rel}:{line_no(text, m.start())}: {stripped[:160]}")
    return hits


def title_case_ok(text: str) -> bool:
    words = re.findall(r"[A-Za-z][A-Za-z0-9']*", text)
    if not words:
        return True
    for i, w in enumerate(words):
        low = w.lower()
        if i != 0 and i != len(words) - 1 and low in SMALL_WORDS:
            continue
        if w[0].isalpha() and not w[0].isupper():
            return False
    return True


def heading_warnings(rel: Path, text: str) -> list[str]:
    warns = []
    if rel.suffix.lower() not in {".html"}:
        return warns
    if "K='mwPagesKey'" in text or "const D={" in text[:400]:
        return warns
    # Headings inside script are usually templates, not visible copy.
    visible = re.sub(r"<script\b[\s\S]*?</script>", " ", text, flags=re.I)
    visible = re.sub(r"<style\b[\s\S]*?</style>", " ", visible, flags=re.I)
    import html as _html
    for rx in (HEADING_RE, CLASS_HEADING_RE):
        for m in rx.finditer(visible):
            raw = _html.unescape(strip_tags(m.group("text")))
            raw = re.sub(r"\s+", " ", raw).strip()
            if not raw or len(raw) > 80:
                continue
            if not re.search(r"[A-Za-z]", raw):
                continue
            if re.search(r"""['"]\s*\+|\$\{|\\'|\\"|\{\{""", m.group("text")):
                continue
            if not title_case_ok(raw):
                warns.append(f"{rel}:{line_no(visible, m.start())}: {raw}")
    return warns


def main() -> int:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if not root.exists():
        print(f"repo not found: {root}", file=sys.stderr)
        return 2

    lockmod = load_pagelock()
    notes = []
    tmpdir = tempfile.TemporaryDirectory(prefix="su-premerge-")
    tmp = Path(tmpdir.name)
    if lockmod:
        notes.extend(decrypt_tree(root, tmp, lockmod))
    else:
        notes.append("pagelock module not found; scanning files as-is (unlocked or ciphertext)")

    fails: dict[str, list[str]] = {
        "gold #D4A017": [],
        "Q4 visit label": [],
        "Built by in PDF assets": [],
        "blocked personal name or site": [],
    }
    warns: list[str] = []

    for src, rel in iter_files(root):
        text = read_for_scan(root, tmp, rel)
        if text is None:
            continue
        posix = str(rel).replace("\\", "/")

        if is_gold_scope(posix):
            for m in GOLD_RE.finditer(text):
                line = text[text.rfind("\n", 0, m.start()) + 1: text.find("\n", m.start())].strip()
                fails["gold #D4A017"].append(f"{rel}:{line_no(text, m.start())}: {line[:160]}")

        if posix.startswith("assets/member/pdf/"):
            for m in BUILT_BY_RE.finditer(text):
                line = text[text.rfind("\n", 0, m.start()) + 1: text.find("\n", m.start())].strip()
                fails["Built by in PDF assets"].append(f"{rel}:{line_no(text, m.start())}: {line[:160]}")

        for m in list(NAME_RE.finditer(text)) + list(SITE_RE.finditer(text)):
            line = text[text.rfind("\n", 0, m.start()) + 1: text.find("\n", m.start())].strip()
            fails["blocked personal name or site"].append(f"{rel}:{line_no(text, m.start())}: {line[:160]}")

        fails["Q4 visit label"].extend(visible_q4_hits(rel, text))
        warns.extend(heading_warnings(rel, text))

    for n in notes:
        print(f"note: {n}")

    failed = False
    for label, rows in fails.items():
        # de-dupe
        rows = list(dict.fromkeys(rows))
        if not rows:
            print(f"PASS  {label}")
            continue
        failed = True
        print(f"FAIL  {label} ({len(rows)})")
        for r in rows:
            print(f"      {r}")

    if warns:
        print(f"WARN  Title Case headings ({len(warns)}; does not fail the check)")
        # cap noise
        for r in warns[:40]:
            print(f"      {r}")
        if len(warns) > 40:
            print(f"      ... {len(warns) - 40} more")
    else:
        print("WARN  Title Case headings: none")

    if failed:
        print("premerge-check: FAILED")
        return 1
    print("premerge-check: PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
