---
name: Expo file exports
description: SDK-specific behavior encountered while implementing on-device exports
---

With the current Expo SDK, the older file-system string-write entry points can be absent or deprecated even when TypeScript accepts parts of the call. Prefer the `File` and `Paths` APIs for journal exports.

**Why:** The first export implementation used the older document directory / string-write methods and failed static checks or would fail at runtime.

**How to apply:** When modifying JSON or CSV exports, consult the installed Expo file-system API and keep the files local until the share sheet is invoked.