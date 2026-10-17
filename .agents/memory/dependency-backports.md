---
name: Dependency backports
description: Why unreleased security fixes use reproducible patches rather than framework upgrades or scan suppression
---

Prefer narrowly scoped, reproducible dependency backports when upstream has not
published a fixed release; do not rename versions or suppress findings to obtain
a clean version-only audit.

**Why:** Some advisories had no fixed release, and upgrading the native Expo
framework just to change transitive tooling risks unrelated device compatibility
changes. Version-only scanners cannot recognize mitigations inside patched code.

**How to apply:** Check current registry releases before replacing a backport.
Use behavior-based regression tests to verify the fix and disclose remaining
version-based findings. For transitive CommonJS consumers, verify the actual
consumer API before overriding to an ESM release.
