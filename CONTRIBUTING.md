# Contributing

Start with [PRD](PRD.md), [decisions](docs/decisions.md), and the feature's acceptance criteria. Use a focused branch from main and explain the trigger, resulting behavior, and evidence in the pull request.

For documentation, check internal links, consistency with current decisions, versions, status claims, and absence of secrets/private screenshots. Update the relevant index when adding a guide.

Use each module's pinned runtime, lockfile and actual scripts. Test important authorization, signature, replay, distance-check, media, and supply boundaries. Record exact commands and passed/failed/unavailable/unverified results. Run the chosen ecosystem's dependency audit before commits that introduce dependencies.

Review the staged diff and file list before every push. Do not stage the entire local workspace blindly: local export ZIPs, old briefs, and design reference screenshots are intentionally ignored. Report security issues using [SECURITY.md](SECURITY.md).

No license for public redistribution has been selected. Repository access and content changes follow the owner's permissions.
