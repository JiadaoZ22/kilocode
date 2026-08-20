---
"@kilocode/cli": patch
---

Stop surfacing transient balance-fetch failures as TUI console overlays. The best-effort balance request can fail on flaky networks or at token-refresh boundaries; these warnings are now only printed when KILO_GATEWAY_DEBUG is set.
