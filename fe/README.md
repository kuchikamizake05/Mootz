# Mootz frontend

Owner: [Wangsit (@wngstnr-code)](https://github.com/wngstnr-code).

| Folder | Purpose | Status |
| --- | --- | --- |
| [app/](app/README.md) | Separate mobile client | Framework and delivery scope not selected |
| [web/](web/README.md) | Responsive web client and independent organizer demo | Planned initial demo; no implementation |

Both clients consume the API owned by Faaid in [be/](../be/README.md). Do not put backend business rules, database access, issuer keys, or relayer keys in a frontend module. Public API schemas are planned under `be/specs/`; signing specifications and exported ABI belong under `sc/specs/` and `sc/abi/`. These artifacts are created and agreed during implementation.

Use the shared [design handoff](../docs/design/README.md) and [Mootz assets](../assets/brand/mootz/README.md). Keep Map and Feed as the two primary tabs, preserve English UI and privacy-aware states, and distinguish a confirmed Dot from a confirmed onchain receipt.
