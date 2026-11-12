# Findings resolution ledger

**Plan:** `implementation-plan.md`. **Status:** Final reviewed planning version — implementation and product acceptance pending; technical review complete with specified owner decisions open. Every named test is planned, not written, and not run. No commit, push, or provisioning. Product choices are now made. What remains open is paid-call activation and deployment (runtime and infrastructure), each needing separate owner approval.
**Tests:** every id below is planned, not written, and not run. No SHA has closed a finding.
**Rule:** one regression plus three to five adjacent ids. At least three adjacent ids are unique to the finding unless this ledger says why one is shared.

Dispositions: **Accepted**, **Accepted with modification**, **Rejected in part**. Auditor recommendations are not owner approvals.

## C-01 — No asset production path

**Disposition:** Accepted with modification.
**Why not verbatim:** An empty catalog would deadlock the readable starting place. The auditor’s “8–12 assets” list (café, bus, bird, lamp, and the rest) invents a catalog and a count. This correction does not adopt it. The owner asked for real production work from an approved visual grammar, with code-drawn or vector art allowed during implementation, and forbade generating assets in this planning stage. Prototype publication is already authorized and is not re-asked.
**Re-audit:** partial until R-08. The floor is now the journey script, and the seed is a labeled administrator contribution (P-49). No added quota of extra assets.
**Plan:** section 7 art paragraph; P-30, P-49.
**Regression:** `t.world.seed-labeled` — the seeded place is marked as an administrator contribution.
**Adjacent:** `t.art.script-coverage` (the café sentence and the bus-stop sentence map with the fixture); `t.art.suggestion-maps`; `t.world.empty` (no seed still shows the honest empty state); `t.return.none` (the seed does not create a return note); `t.art.provenance`.

## C-02 — Blocker inflation

**Disposition:** Accepted in part.
**Why not verbatim:** Reversible technical parameters should be named config, not owner gates. The auditor’s Tier A item 3 (first-party identity plus invite-only publishing) was a product change for the owner, not the auditor. The owner later decided it (8 November 2026, 21:11 Europe/Berlin; see M-03). Item 2 (provider and spend) is not chosen and no secret is requested. Device profiles and numeric rate limits are engineering defaults, not approvals. Hosted backup and restore are deferred to the deployment stage, not deleted.
**Plan:** sections 6 and 8; owner brief.
**Regression:** `t.config.required` — a missing required key fails boot with a named error.
**Adjacent:** `t.config.grapheme` (editing the grapheme limit changes refusal without a domain edit); `t.pr.no-tierc-gate` (evidence template has no host/backup row marked required for PR-ready); `t.config.invite-prod` (production accepts `publishAccess=invite` and refuses `test-any-authenticated`); `t.ops.dump` (local synthetic dump/restore is in the PR-ready suite).

## C-03 — Proposal ownership and lifecycle

**Disposition:** Accepted.
**Why:** A publish path that ignores the proposal’s owner can attribute A’s private sentence to B. Discard, expiry, and double-apply need explicit states. 404 for non-owners matches the “do not reveal existence” correction and is adopted.
**Plan:** section 6 steps 4–7; unique `proposal_id`; P-48, P-34.
**Re-audit R-05:** the capability loses access at bind, not at purge. Sign-in rotates the cookie. Sign-out clears it.
**Regression:** `t.pub.adopt-bind` — after X binds, the old capability alone, and author Y holding it, both get 404.
**Adjacent:** `t.pub.signout-clears-cap`; `t.pub.unbound-cap-ok` (an anonymous draft is still readable by its capability); `t.pub.bind-then-conflict` (X keeps the draft through a conflict refresh); `t.pub.bind-race` (two authors binding one draft: one wins, the other gets 404); `t.pub.discarded`.

## C-04 — Idempotency race

**Disposition:** Accepted.
**Why:** A check outside the transaction lets two same-key requests both miss the row; the loser then sees a moved revision and can be talked into a second publish. The world-row lock is enough for one world and is simpler than a pending-row protocol. The auditor’s pending-insert alternative is not required.
**Plan:** section 6 steps 2–4; P-23.
**Regression:** `t.pub.idem.race` — two connections, one author, one key, barrier before commit: one contribution, both responses return that id.
**Adjacent:** `t.pub.idem.fingerprint` (same key, other fingerprint, one row and a 422); `t.pub.idem.after-other` (retry after another author advanced the revision returns the stored result); `t.pub.idem.crash` (rollback before commit leaves no row; a retry applies once); `t.fail.03` (double confirmation); `t.pub.idem.ten` (ten parallel identical calls, one row, identical bodies).

## H-01 — Placement input and keyboard

**Disposition:** Accepted.
**Why:** Model coordinates are unreliable, and a click-only tile picker fails the keyboard journey. Server search from an anchor and a catalog relation is the right authority split.
**Plan:** section 4 placement; P-42.
**Regression:** `t.place.deterministic` — the same world state always yields the same free cell and never overlaps.
**Adjacent:** `t.place.full-ring` (no cell → unsupported, draft kept); `t.place.bounds` (anchor at the edge stays inside bounds); `t.place.anchor-hidden` (hidden anchor → unavailable); `t.a11y.place` (keyboard continuation “next to” a list selection); `t.place.model-xy` (a `position` field is `invalidOutput`).

## H-02 — Anonymous interpret abuse and spend

**Disposition:** Accepted with modification.
**Why:** Cookie resets bypass a per-capability limit, and a paid adapter needs a circuit breaker. The global request cap and the pre-provider refusals are required. The HMAC network key is accepted only if the raw address is never stored or logged. No monthly spend figure and no provider are chosen; enabling a provider without a spend cap fails closed.
**Plan:** section 6 abuse caps; P-44, P-27.
**Regression:** `t.abuse.fresh-cookies` — many interprets with new cookies under one network key call the provider stub at most the configured count.
**Adjacent:** `t.abuse.global` (global cap pauses previews; an already validated proposal can still publish); `t.abuse.csrf` (cross-origin POST is 403); `t.interp.pii-first` (personal-data pattern, zero provider calls); `t.abuse.no-ip-log` (salt rotation leaves no raw address in the database or logs); `t.input.api-oversize` (over-limit body to the API is 422, zero provider calls).

## H-03 — Hidden text in projections, feeds, unfurls

**Disposition:** Accepted.
**Why:** Filtering the hidden row is not enough if captions, return notes, polls, or link previews still carry the words, or if a hidden footprint disappears and a later unhide overlaps.
**Plan:** sections 4 and 7; P-14, P-35.
**Re-audit R-02:** do not promise that every public JSON body lacks the hidden words. Another author’s sentence may quote them.
**Regression:** `t.mod.scope` — after hiding A, B’s quoting sentence remains, and every field sourced from A or derived from A is absent.
**Adjacent:** `t.mod.dependents-list`; `t.mod.cascade-manual` (hiding B as well is a separate append-only decision); `t.mod.template-label` (B’s server template says an unavailable place); `t.mod.name-source` (a catalog-only seed name has no visitor sentence); `t.mod.unhide-restores-derived`. Residual risk is recorded in plan section 7.

## H-04 — Unicode payload and spoofing

**Disposition:** Accepted with the owner’s limit.
**Why:** A grapheme cap alone allows a huge combining-mark sequence. Client and server segmenters can disagree, so the server is the gate. The owner’s paraphrased preference (about 250 characters; exact wording unavailable) sets a configurable 250-grapheme limit; the POC’s 240 is not used. Byte and mark caps are additional constraints, not a second character budget.
**Plan:** section 5; P-31.
**Regression:** `t.input.zalgo` — one grapheme over the combining-mark cap is rejected with a named reason, before any provider call.
**Adjacent:** `t.input.emoji-boundary` (a 250-grapheme emoji sequence gets one server verdict under the pinned ICU); `t.input.bidi` (a bidi control in a display name or sentence is rejected); `t.input.confusable` (a second name with a confusable skeleton is rejected when names exist); `t.input.nfc` (NFD input stores as NFC and counts as NFC); `t.input.bytes` (a mix over 1000 UTF-8 bytes is rejected).

## H-05 — PixiJS pause claim and Canvas fallback

**Disposition:** Accepted with modification.
**Verified this pass:** At tag v8.22.0, `TickerPlugin.ts` and `Ticker.ts` have zero `blur`, `visibility`, and `hidden` matches. `Ticker.ts` schedules `requestAnimationFrame`. `app.stop` / `app.start` are manual. `GlContextSystem.ts` implements context-loss listeners, `preventDefault`, `contextChange`, and `forceContextLoss`. Release v8.16.0 (published 3 Feb 2026) added the Canvas renderer and labeled it experimental.
**Re-audit R-03:** hidden polling is best-effort. Chrome may limit background timers to about once a minute after several minutes hidden. An immediate poll runs when the document becomes visible, on `pageshow`, on `online`, and on `focus`. Blur still stops nothing. This visibility rule is an engineering recommendation, not an owner quote.
**Plan:** section 2; P-19, P-45.
**Regression:** `t.vis.resume-poll` — after a simulated long hide, a foreign commit, then show, the commit is visible within one poll round-trip of becoming visible.
**Adjacent:** `t.vis.bfcache`; `t.vis.online` (offline then online polls once and does not duplicate the draft); `t.vis.unfocused-poll`; `t.vis.hidden-no-ticker` (no ticker frames; a 2-second hidden poll is not required); `t.vis.poll-backoff` (5xx backs off and recovers without a storm).

## H-06 — CI artifacts, commit metadata, PR text, source maps

**Disposition:** Accepted.
**Why:** A staged-diff scanner does not cover public Actions artifacts, author emails, or pull-request text.
**Re-audit R-06:** pre-commit scans the staged tree and the message file. Pre-push and CI scan the commit range, branch name, and pull-request title and body, with `--redact`. Allowed identities are only the owner noreply for `bribeirobr25` and `Cursor Agent <cursoragent@cursor.com>`. Any other identity halts. The plan does not embed the workspace-root prefix.
**Plan:** section 13; P-39.
**Regression:** `t.gate.commit-range` — a commit message containing a personal mailbox fails the pre-push and CI check.
**Adjacent:** `t.gate.agent-identity-ok` (the named bot committer passes); `t.gate.unknown-identity` (any other bot or person halts); `t.gate.branch-name`; `t.gate.redact` (a planted fake secret is not printed); `t.gate.gitignore` (a staged env file is refused).

## H-07 — Private reads through a Data API

**Disposition:** Accepted.
**Why:** Denying inserts still leaves proposals and hidden rows readable if a browser key can select them.
**Plan:** section 2 host paragraph; P-26.
**Regression:** `t.db.anon-read` — an anon-key select on proposals, contributions, and moderation is denied. Until a host exists, the same test runs against the local role that stands in for the anon role.
**Adjacent:** `t.db.anon-insert`; `t.db.anon-hidden`; `t.db.new-table-schema` (a new table in an exposed schema fails CI); `t.db.bundle-grep` (client build contains no database key); `t.db.service-key-server-only`.

## H-08 — Conflict storms and a second interpretation

**Disposition:** Accepted.
**Why:** The POC asks for a new confirmation when interpretation or placement must change, not a new model call for every unrelated publish. The contradiction was missing from the old conflict register.
**Plan:** section 6 step 6; P-24, P-35.
**Re-audit R-01:** the refreshed placement is committed on the private proposal (`proposal_version + 1`, new base revision, confirm key cleared). The next confirm mints a new key. Fingerprint includes proposal version and placement. No public write on that conflict commit.
**Regression:** `t.pub.conflict.persist` — A at N, B at N+1, A confirms, sees the refresh, confirms again, one contribution at N+2, zero provider calls.
**Adjacent:** `t.pub.conflict.chain` (three foreign publishes, each confirm refreshes once); `t.pub.conflict.old-version` (stale `proposalVersion` is conflict and no write); `t.pub.conflict.lost-response` (retry of the old key returns the stored refresh, not 422); `t.pub.conflict.two-tabs`; `t.pub.fingerprint.def` (any fingerprint field change alters the hash; key reuse across versions is 422).

## H-09 — PR-ready versus POC-accepted

**Disposition:** Accepted with modification.
**Why:** Without the split, a later implementer either blocks the pull request on a provider that was not authorized, or describes the fixture as a finished interpreter. This correction does not ask for a key and does not name a vendor. The required label is “fixture interpreter — not acceptance-ready” whenever the real corpus was not run. That phrase must not be rewritten into a claim that interpretation works.
**Plan:** section 8; P-33.
**Regression:** `t.pr.mode-label` — the evidence file states interpreter mode and environment, and CI fails if fixture mode is combined with production.
**Adjacent:** `t.interp.fixture-refused` (production boot with no provider leaves preview unavailable and publish refused); `t.eval.fork-skip` (a fork run without secrets records “not run”, not “pass”); `t.eval.split-report`; `t.pr.no-accepted-word` (evidence that still has a POC-accepted row “not run” cannot contain a blanket “accepted”); `t.pr.sha` (a new SHA marks prior evidence stale).

## M-01 — Indirect injection and model-written public text

**Disposition:** Accepted.
**Why:** Putting another author’s sentence into the next prompt lets that sentence steer the model. Public captions must be the author’s text plus templates.
**Plan:** sections 4 and 5.
**Regression:** `t.interp.context-clean` — adapter input for a continuation contains no other user’s free text.
**Adjacent:** `t.interp.extra-caption` (model free-text caption is `invalidOutput`); `t.interp.url-text` (a URL in the author’s sentence is stored as text, not linked); `t.interp.name-not-context` (a display name is not sent as model context); `t.interp.template` (model “explanation” prose is ignored); `t.interp.negation-inject` (negation plus injection stays unsupported).

## M-02 — Retention and check order

**Disposition:** Accepted.
**Why:** Tombstones and late personal-data checks keep private text longer than the product needs, including at a provider.
**Plan:** sections 4 and 5; P-34.
**Regression:** `t.draft.purge` — after discard, a test-database text search does not find the sentence.
**Adjacent:** `t.draft.purge-applied` (proposal text null after commit; contribution keeps approved text); `t.draft.purge-expired` (sweep removes expired text); `t.interp.pii-first`; `t.log.no-sentence`; `t.abuse.no-ip-log`.

## M-03 — Invite-only publishing and pseudonyms

**Disposition:** Rejected as an auditor default, then **decided by the owner** on 8 November 2026, 21:11 Europe/Berlin: pseudonym without email plus recovery code, and invite-only publishing (plan section 6a).
**Why:** The chicken-and-egg problem for an uncoached second publisher is real. Choosing invite codes, or a first-party cookie with no email, changes who can publish and how recovery works. The auditor could not apply that choice. The owner made it on 8 November 2026, 21:11. Pseudonym hiding is specified only if pseudonyms are later in the chosen identity.
**Plan:** section 6a; owner brief.
**Re-audit R-12:** the failure “the partner cannot publish without a database edit” is decision-gated and not run until the owner chooses access.
**Regression:** `t.e2e.j6-no-manual-step` — partner B, holding an invite handed over outside the product, creates a pseudonym, redeems it, and publishes a continuation with no database edit.
**Adjacent (distinct from L-01):** `t.invite.redeem-race` (two authors, one single-use invite: one grant); `t.invite.redeem-retry` (lost response: same author retries and no extra use is consumed); `t.invite.refused-uniform` (invalid, expired, used-up, revoked: one refusal, rate-limited); `t.invite.fragment-only` (a query-string code is ignored; the fragment is stripped and never logged); `t.pub.no-grant` (signed in without a grant: `invite required`, draft kept). Shared with L-01, justified: `t.authz.mod-same-policy` only, because both findings touch moderator publish rights. The other four here are not L-01’s set.

## M-04 — Key, cancel, and cursor lifecycles

**Disposition:** Accepted.
**Why:** A client-minted key per click defeats idempotency. Advancing the cursor on load erases the return note on the refresh the journey requires.
**Plan:** sections 4 and 6; P-13.
**Regression:** `t.return.refresh` — the note remains after refresh until dismiss or open.
**Adjacent:** `t.pub.two-tabs-one-key`; `t.interp.latest-wins` (cancel then resubmit shows only the latest preview); `t.return.dismiss-sync` (dismiss on one session clears the other for the same author); `t.return.none` (no new public change ⇒ no note); `t.pub.resume-reload` (reload while publishing reuses the server key).

## M-05 — Unused structure

**Disposition:** Accepted.
**Why:** Interior and commerce columns, a clock table, a package-per-module repo, and a null analytics pipeline are not on the POC critical path. The owner said not to implement unused schema. Restore and reporting stay, staged (C-02).
**Plan:** section 3; P-21, P-22.
**Regression:** `t.arch.domain-import` — the import rule fails if `src/domain` imports React, PixiJS, the database driver, or an LLM SDK.
**Adjacent:** `t.schema.interior`; `t.schema.payment`; `t.config.weather` (schedule edit changes the still frame with no migration); `t.migrate.expand` (an added nullable column still boots the previous build); `t.domain.no-io` (domain unit tests need no database and no browser).

## M-06 — Traceability

**Disposition:** Accepted.
**Why:** Requirements and tests need ids a later reviewer can grep. “Current build instruction” is not a durable pack document; owner-stated items are in the decision brief.
**Plan:** section 12 matrix, P-41–P-48.
**Regression:** `t.rtm.coverage` — every P-id in the matrix has at least one test id, and every shipped test file tags a P-id or a finding id.
**Adjacent:** `t.rtm.missing-test`; `t.rtm.approved-source`; `t.ui.click-all`; `t.share.no-query-text`; `t.rtm.finding-link` (each ledger finding id appears in the plan index).

## M-07 — Adjacent-case rule

**Disposition:** Accepted.
**Why:** The old “three to five” sentence did not bind these audit findings, and the failure table froze one adjacent list for every bug.
**Plan:** section 11; this ledger.
**Re-audit R-12:** the lint also requires three adjacent ids that are not copied from another finding, or a written justification for each shared id.
**Regression:** `t.ledger.shape`.
**Adjacent:** `t.ledger.distinct`; `t.ledger.min-adjacent`; `t.ledger.dangling-test`; `t.ledger.sha`; `t.ledger.reopen`.

## M-08 — Nondeterministic eval

**Disposition:** Accepted with modification.
**Why:** A single lucky model response is not a safety bar. The 5-run safety rule applies only after a provider exists. Fixture runs are  deterministic and must be reported separately so they cannot be described as the functional interpreter. Supported-mapping threshold (engineering proposal, not an owner quality promise): at least 20 supported cases × 5 runs (at least 100 trials); pass only if at least 90% of all trials map correctly and no case passes fewer than 4 of 5. Safety cases: 5 of 5 for every case. The earlier “90% of 5” wording was not achievable and is replaced.
**Plan:** sections 5 and 8; P-33.
**Regression:** `t.eval.safety-fail` — one failed safety case fails the real-adapter run; `t.eval.threshold` (planned) fails a run with fewer than 20 supported cases, under 90% of trials, or any case under 4 of 5. The harness does not run without a provider and then does not report pass.
**Adjacent:** `t.eval.timeout-safe` (provider timeout counts as failure-safe and writes nothing); `t.interp.invalid-json`; `t.eval.temperature-recorded`; `t.eval.corpus-version`; `t.eval.split-report` (fixture and real results are separate files).

## M-09 — Deterministic visual evidence

**Disposition:** Accepted.
**Why:** Client-derived motion will not match across machines. CI needs a frozen mode. The human visual review must use the normal mode or it does not see the product.
**Plan:** section 9.
**Regression:** `t.vis.snapshot-stable` — three CI runs on one SHA produce the same deterministic snapshot.
**Adjacent:** `t.vis.flag-ignored-prod`; `t.vis.reduced-equals-still`; `t.vis.night`; `t.vis.mobile-shot`; `t.vis.selection-not-color-only`.

## L-01 — Role table

**Disposition:** Accepted.
**Why:** The old table contradicted itself on who may see their own hidden text and was silent on moderators. The replacement does not smuggle in invite mode.
**Plan:** section 6 roles.
**Regression:** `t.authz.matrix` — one table generates the allow/deny cases.
**Adjacent:** `t.authz.mod-same-policy`; `t.authz.own-hidden`; `t.authz.other-hidden`; `t.authz.signed-out-hidden`; `t.authz.next-request` (a role change applies on the next request, not a cached client flag).

## L-02 — Canvas off versus in-scene preview

**Disposition:** Accepted.
**Why:** The DOM path cannot show a Pixi overlay. Calling that path a failure would make the accessibility gate impossible. The textual private marker is the accepted degraded preview.
**Plan:** section 9; P-20.
**Regression:** `t.a11y.dom` — with WebGL disabled, the list shows “Private preview — only you can see this.”
**Adjacent:** `t.a11y.dom-discard`; `t.a11y.dom-publish`; `t.a11y.dom-name` (the preview name is exposed to the accessibility tree); `t.a11y.canvas-restored` (the same proposal overlays when the scene returns); `t.preview.isolation`.

## L-03 — Pack residue and PDF parity

**Disposition:** Accepted as publication hygiene. Parity not re-verified here.
**Why:** `pdftotext` and `pdfinfo` were not available in this correction pass, so the auditor’s 0.971 similarity and six-page metadata report are their evidence, not a second measurement. The public manifest should not keep pre-sanitization hashes or “conversation context” as a rights claim. The dangling journey sentence and PDF Info dates are strip-on-publish items.
**Plan:** section 7 prototypes paragraph; section 13.
**Regression:** `t.gate.pdf-dates` — a PDF Info date fails the metadata gate if that file is staged.
**Adjacent:** `t.gate.docx-core`; `t.gate.png-chunks`; `t.gate.manifest-schema` (public manifest has no `source_image_sha256`); `t.gate.working-notes` (staged journey markdown has no “Optional related working notes.”); `t.gate.pdf-uri`.

## L-04 — Plan size

**Disposition:** Accepted.
**Why:** The previous 1,011-line plan hid the conflict-model contradiction. The candidate is the short plan; this ledger and the owner brief hold the audit detail. A further rationale file was not added, to avoid a fourth artifact the owner did not ask for.
**Regression:** `t.rtm.coverage`.
**Adjacent:** `t.rtm.finding-link`; `t.plan.has-h09` (the plan index lists H-09); `t.plan.lifecycle` (the plan states unique `proposal_id` and the terminal `applied` state); `t.ledger.shape`. Manual check, disclosed: a re-auditor can read the plan without this ledger and still find ownership, idempotency, PixiJS, PR-ready versus POC-accepted, and the owner-approved identity decision.

## Cross-check

| Finding | Regression | Adjacent count | In plan index |
| --- | --- | --- | --- |
| C-01 | `t.world.seed-labeled` | 5 | Yes |
| C-02 | `t.config.required` | 4 | Yes |
| C-03 | `t.pub.adopt-bind` | 5 | Yes |
| C-04 | `t.pub.idem.race` | 5 | Yes |
| H-01 | `t.place.deterministic` | 5 | Yes |
| H-02 | `t.abuse.fresh-cookies` | 5 | Yes |
| H-03 | `t.mod.scope` | 5 | Yes |
| H-04 | `t.input.zalgo` | 5 | Yes |
| H-05 | `t.vis.resume-poll` | 5 | Yes |
| H-06 | `t.gate.commit-range` | 5 | Yes |
| H-07 | `t.db.anon-read` | 5 | Yes |
| H-08 | `t.pub.conflict.persist` | 5 | Yes |
| H-09 | `t.pr.mode-label` | 5 | Yes |
| M-01 | `t.interp.context-clean` | 5 | Yes |
| M-02 | `t.draft.purge` | 5 | Yes |
| M-03 | `t.e2e.j6-no-manual-step` | 5 | Yes, owner-decided |
| M-04 | `t.return.refresh` | 5 | Yes |
| M-05 | `t.arch.domain-import` | 5 | Yes |
| M-06 | `t.rtm.coverage` | 5 | Yes |
| M-07 | `t.ledger.shape` | 5 | Yes |
| M-08 | `t.eval.safety-fail` | 5 | Yes |
| M-09 | `t.vis.snapshot-stable` | 5 | Yes |
| L-01 | `t.authz.matrix` | 5 | Yes |
| L-02 | `t.a11y.dom` | 5 | Yes |
| L-03 | `t.gate.pdf-dates` | 5 | Yes |
| L-04 | `t.rtm.coverage` | 4 automated + 1 disclosed manual | Yes |

No finding is closed by execution. No test has been run.

## Re-audit items R-01–R-13

All tests planned, not executed. Dispositions match the plan paragraphs in the change map.

| ID | Disposition | Regression | Adjacent (planned) |
| --- | --- | --- | --- |
| R-01 | Applied. Private proposal refresh is committed; new version; new key; fingerprint defined. | `t.pub.conflict.persist` | `t.pub.conflict.chain`, `t.pub.conflict.old-version`, `t.pub.conflict.lost-response`, `t.pub.conflict.two-tabs`, `t.pub.fingerprint.def` |
| R-02 | Applied. No universal string erasure. | `t.mod.scope` | `t.mod.dependents-list`, `t.mod.cascade-manual`, `t.mod.template-label`, `t.mod.name-source`, `t.mod.unhide-restores-derived` |
| R-03 | Applied. Hidden timers best-effort; immediate poll on return. | `t.vis.resume-poll` | `t.vis.bfcache`, `t.vis.online`, `t.vis.unfocused-poll`, `t.vis.hidden-no-ticker`, `t.vis.poll-backoff` |
| R-04 | Applied. Unset `publishAccess` disables publish honestly. `local-test` banner. | `t.config.publish-unset` | `t.config.prod-rejects-test-access`, `t.ui.test-banner`, `t.e2e.j5-local-test`, `t.ui.disabled-reason`, `t.config.unknown-access-value` |
| R-05 | Applied. Bind drops the capability. Cookie rotates on sign-in and clears on sign-out. | `t.pub.adopt-bind` | `t.pub.signout-clears-cap`, `t.pub.unbound-cap-ok`, `t.pub.bind-then-conflict`, `t.pub.bind-race` |
| R-06 | Applied. Pre-commit and pre-push/CI are separate. Two identities only. | `t.gate.commit-range` | `t.gate.agent-identity-ok`, `t.gate.unknown-identity`, `t.gate.branch-name`, `t.gate.redact`, `t.gate.gitignore` |
| R-07 | Applied. M1–M5 map slices to demos. | `t.plan.milestones` | M1 DOM path, M2 isolation, M3 banner, M5 not-run rows (procedures, not new product scope) |
| R-08 | Applied. Journey script plus labeled admin seed. No extra asset quota. | `t.world.seed-labeled` | `t.art.script-coverage`, `t.art.suggestion-maps`, `t.world.empty`, `t.return.none` |
| R-09 | Applied in the brief after the final recheck: one verified owner statement (t72, 8 Nov 2026 19:39 Europe/Berlin, English translation labeled as such) and one paraphrased preference (~250, wording and date unavailable). Everything else is an engineering recommendation. | `t.rtm.owner-source` | `t.rtm.approved-source`, checklist that no auditor row is labeled owner-approved |
| R-10 | Applied. Separate reviewers. Original reviewer rechecks the final SHA. Evidence under `docs/evidence/<sha>/`. | `t.review.report-shape` | same-reviewer recheck, UI diff reruns review 5, path in evidence fails the gate |
| R-11 | Applied. `t.a11y.dom`, `t.a11y.place`, and `t.e2e.viewports` first required at S5 and re-run later. | `t.rtm.slice-feasible` | one check per named test |
| R-12 | Applied. `t.e2e.j6-no-manual-step` is now defined by the invite decision. Distinct-adjacent lint. | `t.e2e.j6-no-manual-step` | `t.ledger.distinct`, `t.config.invite-prod`, `t.authz.mod-same-policy` (shared with L-01, justified in M-03) |
| R-13 | Checkpoint only, before public hosting. Not an assertion that a named law applies. Not a PR-ready gate. | `t.ops.privacy-notice-linked` (only if the checkpoint says a notice is required; otherwise the evidence is the determination) | cookie audit for non-essential cookies, notice reachable without an account, retention figures match config — all only when a notice is in scope |

## Owner decision update — identity and invites (8 November 2026, 21:11 Europe/Berlin)

These are new owner-approved requirements, not audit findings. They follow the same rule: one regression plus 3–5 adjacent tests. All planned, not run.

| ID | Requirement | Regression | Adjacent (planned) |
| --- | --- | --- | --- |
| OD-ID | Pseudonymous identity, no email, hashed `__Host-` session (P-32) | `t.id.no-email` (an email or phone field is rejected; no such column exists) | `t.id.secret-hashed` (no raw session, recovery, or invite secret in the database or logs); `t.id.signout-revokes`; `t.id.session-max-age`; `t.id.double-refused` |
| OD-REC | Single-use, rotatable recovery code (P-50) | `t.id.recover-single-use` (two concurrent redemptions: one succeeds) | `t.id.recover-rotates` (new code issued once; old code and other sessions invalid); `t.id.rotate-signed-in`; `t.id.recover-ratelimit` (uniform error, capped attempts); `t.id.lost-both` (no recovery path; history stays attributed) |
| OD-INV | Invite-only publish, atomic redemption, server grant check (P-51) | `t.invite.redeem-race` | `t.invite.redeem-retry`; `t.invite.expiry-db-time`; `t.invite.revoke-next-request`; `t.invite.mint-admin-only`; `t.pub.no-grant` |


## Owner decision update — interpreter, budget, administrator, policy, host (8 November 2026, 21:16–21:17 Europe/Berlin)

Owner product choices, not authorization for paid calls, provisioning, or deployment. One regression and 3–5 distinct adjacent tests each. All planned, not run. Tests that use HTTP doubles are labeled “double — not real-provider evidence”.

| ID | Requirement | Regression | Adjacent (planned) |
| --- | --- | --- | --- |
| OD-LLM | OpenAI `gpt-5.4-mini-2026-03-17`, strict structured output, server validation, `store:false`, minimal context, activation off (P-52) | `t.llm.activation-off` (with activation off, no outbound provider request happens and the preview shows the fixture label or an honest unavailable state; production refuses a fixture) | `t.llm.context-minimal` (a captured double request contains no pseudonym, author id, session, recovery or invite value, or other authors' text); `t.llm.schema-strict` (schema-invalid or extra-field output gives `invalidOutput`, no proposal); `t.llm.refusal-maps` (refusal, incomplete, clarification, and no_change map to non-publishing states with no raw model prose); `t.llm.no-key-in-client` (bundle and responses contain no key or provider URL); `t.llm.model-pinned` (an alias or unknown model id fails boot) |
| OD-BUD | USD 10 monthly budget including USD 2 evaluation; atomic reservation and reconciliation; fail closed (P-53) | `t.budget.reserve-race` (concurrent reservations near the limit never exceed the remaining budget) | `t.budget.eval-subset` (evaluation spend counts against both allowances and stops at USD 2); `t.budget.reconcile` (actual usage replaces the worst-case hold); `t.budget.ambiguous-held` (a timeout keeps the hold and the retry reserves again); `t.budget.unset-fails-closed` (activation with any budget key missing refuses boot or the call); `t.budget.kill-switch` |
| OD-ADM | Owner is the sole initial administrator; bootstrap not over HTTP; role checked on every action and read; no self-promotion (P-54) | `t.admin.no-self-promote` (no request by any author can create or change a role) | `t.admin.read-enforced` (hidden text, dependents, invite and block lists refuse non-admins); `t.admin.bootstrap-idempotent` (a second run changes nothing and logs no secret); `t.admin.no-git-allowlist` (privacy gate finds no role allowlist or ids in config); `t.invite.mint-admin-only`; `t.admin.revoke-invite` |
| OD-POL | Content policy shown and versioned; publish block for abuse; no claim of automatic detection (P-55) | `t.admin.block-publish` (a blocked author's next publish is refused inside the transaction; history unchanged) | `t.policy.shown-at-confirm` (the confirmation shows the current policy version); `t.policy.version-recorded` (the contribution stores the policy version); `t.admin.unblock-appends` (block and unblock are append-only events); `t.admin.block-race` (a block committed before a publish lock wins) |
| OD-HOST | Vercel + Supabase in a European region as direction only; nothing provisioned; S-HOST checkpoints (P-56 documented in S-HOST) | `t.ops.no-provisioning-in-ci` (the CI and scripts contain no deploy or resource-creation step before authorization) | `t.supabase.anon-denied` (local smoke: anon select and insert denied); `t.config.no-analytics-default` (no analytics script or key by default); `t.ops.region-recorded` (the deploy checklist requires a recorded region before publish); `t.ops.privacy-notice-linked` (from R-13, only if required) |
