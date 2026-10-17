# Dependency security fixes

Run `pnpm install --frozen-lockfile`, `pnpm test:security`, and `pnpm typecheck`.
pnpm applies these committed patches during installation; do not edit node_modules.
The one-day minimum release age and package firewall remain enabled.

## Published fixes

Workspace overrides upgrade the transitive packages without upgrading Expo's
native SDK:

| Package | Version | Advisory |
| --- | --- | --- |
| proxy-addr | 2.0.8 | GHSA-jqcg-44mw-7w3h |
| source-map-js | 1.2.2 | GHSA-68fv-2mgg-jv7q |
| brace-expansion | 5.0.12 | GHSA-6j4f-fj2g-mc7p, GHSA-qhr7-859c-m2p7, GHSA-q2hr-2g5m-vwhr |
| shell-quote | 1.12.0 | GHSA-pqg4-j6r4-53mv |
| fast-uri | 3.1.8 | GHSA-hrr3-gc8f-f4qj |
| uuid (xcode dependency) | 11.1.1 | GHSA-w5hq-g745-h8pq |
| decode-uri-component (query-string dependency) | 0.5.0 | GHSA-vcc3-ghjq-m6fr |

`xcode@3.0.1` is the latest upstream release but still requires UUID 7. UUID 11
retains its required CommonJS `v4()` API, unlike the ESM-only later major versions.
`query-string@7.1.3` needs a one-line compatibility patch to unwrap the default
export of the fixed ESM decoder. Keeping query-string 7 preserves Expo Router's
query parsing behavior instead of imposing a major query-string upgrade.

## Backports pending upstream releases

As of 2026-10-17, the latest releases of these packages are still affected:

- **node-forge 1.4.0 / GHSA-86w9-cpqp-85rv:** backports the nested
  DigestAlgorithm sequence-length validation from
  <https://github.com/digitalbazaar/forge/pull/1152>. Tests construct correctly
  signed malformed DigestInfo messages with extra nested elements and verify
  rejection, while keeping valid signatures with/without NULL parameters working.
- **braces 3.0.3 / GHSA-vfj7-8cjw-p6xm:** implements the parser nesting guard
  recommended in <https://github.com/micromatch/braces/issues/70>. Rejects AST
  nesting at 100 levels with a deliberate SyntaxError before recursive walkers
  execute. Parentheses and mixed groups count toward the same cap; escaped and
  quoted literal braces do not. Normal brace expansion remains unchanged.
  The compile, expand, and stringify walkers also enforce a depth limit for
  caller-supplied ASTs, including cyclic child nodes, so bypassing the parser
  cannot reintroduce stack exhaustion.

Version-only vulnerability scanners still report these **two high findings**
because backports intentionally retain upstream package versions. These findings
are **not suppressed or ignored**. The patch files, lockfile patch hashes, and
behavioral regression tests document the mitigations, not a claim that upstream
has released fixes. Replace each backport with an upstream fixed release once
available, remove its patchedDependencies entry, and rerun the tests and scan.
