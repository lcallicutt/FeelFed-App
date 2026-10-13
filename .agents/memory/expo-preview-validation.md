---
name: Expo native preview verification
description: Distinguish web preview success from native Expo launch verification
---

Do not treat a successful FeelFed web screenshot as proof that the embedded iPhone preview can launch.

**Why:** The iPhone preview reported a manifest parsing failure while the web onboarding page loaded normally. Those are different launch paths; a manifest failure happens before app JavaScript executes.

**How to apply:** For native launch reports, check the native Expo manifest response and native bundle separately. A normal browser request can return HTML from the same host where an iOS manifest request returns JSON. Report native device launch as unverified unless it was actually observed.
