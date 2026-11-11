#!/bin/sh
# Pre-merge content check. Decrypts pagelocked HTML into a temp copy (same
# routine as pagelock) and fails on retired gold, visit-label quarter codes,
# "Built by" in PDF assets, or the blocked personal name / site link.
# Title Case heading lint warns only.
exec python3 "$(dirname "$0")/premerge-check.py" "$@"
