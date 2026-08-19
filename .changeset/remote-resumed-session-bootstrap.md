---
"@kilocode/cli": patch
---

Fix mobile app showing "not found" when opening a session that was created before the current CLI process started. The heartbeat advertises these resumed sessions, but they were never bootstrapped to the session ingest service because bootstrap only ran on the Session.Event.Created event. Advertised sessions without a cloud record are now bootstrapped once per process (with retry on the next heartbeat after a failure).
