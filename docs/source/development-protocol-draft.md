# Development protocol — proposed gate contract

Status: proposed workflow, not implementation evidence. Repository documentation becomes canonical after review. No merge is delegated.

## 1. Plan before implementation
- Reconcile the POC, journey and architecture into a requirement register. Distinguish approved rules, proposed defaults, open decisions and exclusions. Never silently resolve conflicting documents.
- Assign stable IDs to product journeys, business rules, architecture invariants, privacy/security rules and accessibility/performance requirements.
- For every ID record: source section, business rationale, Given/When/Then acceptance, implementation slice and owning module, data/API implications, tests, failure paths, evidence and status. Include negative cases and two independent sessions.
- Plan vertical slices with breadth and depth: arrival/exploration; interpretation/private preview; identity/authorization; transactional publication; continuation/history; links/return updates; moderation/abuse; accessibility/visual life; observability/recovery. Every shipped visible action needs a real implementation and acceptance test.
- Select one host and one database; resolve identity, input/catalog/policy and privacy decisions. A rendering spike must have agreed representative scene density, device/browser profiles and measurable budgets before evaluation.
- Document migration, backup/restore, environment isolation, rollback and data retention. Never test destructive scenarios against production or real personal data.

## 2. Independent adversarial plan audit
A separate agent tries to break the plan before implementation: missing requirements, contradictions, permission escalation, prompt injection, tampered actions, stale revisions, concurrent retries, timeout-after-commit, moderated targets, accessibility gaps, performance assumptions and public-repository leakage. It does not implement its own suggestions.

Record findings with severity, requirement IDs, reproduction or counterexample, impact, proposed correction and verification criteria. Correct the plan, reconcile every finding, and have the independent auditor recheck it. Unknown evidence is not a pass. Material product decisions need explicit resolution before the dependent slice begins.

## 3. Implementation and continuous verification
Implement through cloud agents on an isolated branch, following the reviewed plan. Keep domain rules server-authoritative, typed, provider-independent and transactionally consistent. Centralize mutable product data and English copy; allow justified constants and test fixtures. Keep an acceptance matrix current; scope additions need explicit review. Use synthetic data only. Do not provision paid resources or deploy without the separate required authorization.

## 4. Five independent implementation audits
Run five separately tasked reviewers on the same pinned candidate SHA; implementation self-review is additional, not one of the five.
1. Adversarial/security: actively attempt abuse, authorization bypass, data leakage, injection, replay and concurrency failures within the authorized test environment.
2. Product/business: verify all agreed journeys, catalog semantics, unsupported intent, explicit publishing, attribution and honest states against requirement IDs.
3. Architecture/data/reliability: boundaries, schema/migrations, transaction atomicity, revision checks, actor-scoped idempotency, recovery and moderation read filtering.
4. Automated quality/accessibility/performance: types/lint, unit/contract/integration/E2E, dependencies, automated accessibility, scene/performance budgets and reduced-motion/background behavior. Manual screen-reader checks remain necessary.
5. Actual visual/interactive audit: parent-operated computerUse reviewer opens the running candidate, sees screenshots, clicks/types/uses keyboard and completes A/B journeys on agreed desktop/mobile viewports. Inspect focus, clipping, contrast, loading/error/conflict states and reduced motion. Static screenshots, DOM snapshots, or written claims alone do not satisfy this gate. A real screen-reader journey supplements automated accessibility.

Each report identifies exact SHA, environment/config, tested requirements, commands/actions, observations, evidence, findings, limitations and verdict. Do not claim a visual test happened unless it actually did.

## 5. Findings, adjacent tests and fixes
For every defect, preserve a minimal reproducer and add a regression test that fails before the fix and passes after it. Add 3–5 meaningful adjacent scenarios per issue (vary actor/permission, state/version, timing/retry, payload boundaries, target visibility or browser/input modality as relevant). For document-only findings use an enforceable check where feasible; disclose when a manual verification is necessary rather than inventing automation.

Fix root causes and inspect affected modules and business invariants. Run focused regressions plus the adjacent scenarios and the broader suite. Have the original independent reviewer recheck. Any final SHA change invalidates impacted prior evidence; rerun all release gates on the final SHA and repeat affected independent audits. Preserve residual risks and explicitly accepted exceptions. No process guarantees zero bugs or side effects.

## 6. Mandatory fail-closed gate before every commit
- Inspect the exact staged file list AND complete staged diff; include new/untracked files intended for the commit, binary assets, generated files and metadata. Never stage broad folders without reviewing each file.
- Run pinned, approved secret scanning on the staged snapshot (not only unstaged working files), plus privacy checks and human review. Scanner errors, missing scanner, unsupported formats or unexplained findings BLOCK the commit.
- Exclude credentials, real environment files, access tokens, database URLs, private keys, signed URLs, personal names/emails, account/workspace IDs, device IDs, home/laptop paths, chat/transcript dumps, private third-party documentation and internal links. Permit only deliberate public project identifiers, such as the requested repository URL.
- Inspect image EXIF/XMP/comments, office/PDF authors, hyperlinks, hidden content/comments and embedded objects. Decode/archive-inspect supported formats; unknown binary content is held back.
- Scan all newly introduced content and referenced build artifacts; use synthetic fixtures. Never echo detected secret values into logs, reports, tickets or PRs. Findings identify rule/file/location with redaction.
- No hooks bypass, no `--no-verify`, no weakening scanner rules to make a commit pass. Narrow false-positive allowlists require documented justification and review; genuine secrets must be removed and rotated if exposed.
- CI repeats privacy/secret scanning on the PR diff and committed tree/history introduced by the PR, dependency/security checks, lint/types, tests, build, accessibility and agreed performance checks. Do not upload sensitive scanner output or source maps publicly.

## 7. Handoff
Commit and open a PR only after gates pass. The PR contains traceability, final-SHA test/audit evidence, sanitized screenshots, migrations/rollback instructions and known limitations. No fabricated acceptance and no automatic merge: the owner reviews and merges. A blocked audit, untested requirement or unresolved critical/high defect prevents a ready-for-acceptance claim.
