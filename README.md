# Smart Upkeep: Sign-Up Funnel (Prototype)

Static HTML/CSS/JS prototype of the Smart Upkeep home maintenance membership funnel for metro Detroit.
Prototype, draft pricing. No backend: progress is stored in the browser (localStorage), photos stay in browser memory, and the payment form is a disabled demo (no card data is collected).

Built by Machan.

## Checks before merge

**Pagelock.** Public HTML pages are encrypted with the AES-GCM/PBKDF2 gate. After you edit, relock and confirm the check exits 0:

    python3 /workspace/security/pagelock/lock_pages.py {lock|unlock|check} <repo>

`check` must exit 0 before push. Relock uses a new IV, so restore any locked page you did not mean to change:

    git checkout origin/main -- index.html faq/index.html

**Pre-merge content check.** Run this on decrypted temp copies of locked pages (same decrypt routine as pagelock) before merge:

    python3 tools/premerge-check.py [repo]
    # or: sh tools/premerge-check.sh [repo]

The script fails if it finds any of: the retired gold plan hex in member, tech, onboarding, billing, or PDF assets; a quarter-code in a visible visit label; "Built by" in `assets/member/pdf`; or the blocked personal name or personal-site link (exact patterns are in the script, which is excluded from the scan). Title Case headings produce warnings only and do not fail the check.
