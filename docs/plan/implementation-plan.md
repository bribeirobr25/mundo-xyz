# Shared World — implementation plan

**Status:** Final reviewed planning version — implementation and product acceptance pending; technical review complete with specified owner decisions open. Every named test is planned, not written, and not run. No commit, push, or provisioning. Product choices are now made. What remains open is paid-call activation and deployment (runtime and infrastructure), each needing separate owner approval.

**Date:** 8 November 2026. **Repo inspected:** https://github.com/bribeirobr25/mundo-xyz at `32f4b93` (`main`). Only `README.md` (`# mundo-xyz`). No app, schema, CI, or secrets.

**Companions:** [findings ledger](findings-resolution-ledger.md) (26 findings) and [owner decision brief](owner-decision-brief.md). Auditors do not approve owner decisions. Identity (first-party pseudonym, no email, recovery code) and invite-only publishing are owner-approved product decisions (8 November 2026, 21:11 Europe/Berlin). Later owner choices on the same day select the interpreter (OpenAI GPT-5.4 Mini, budget USD 10/month including at most USD 2 for initial evaluation; paid calls not yet activated, 21:16), make the owner the sole initial administrator with a content policy (21:17), and set the hosting direction (Vercel + Supabase in a European region, subject to availability and cost validation; nothing created or published yet, 21:17). Product choices are not authorization for paid calls, provisioning, deployment, or implementation.

**Sources.** Journey confirmed column and approved architecture principles are requirements. POC text, the unconfirmed stack section, and the tooling note are proposals. Owner sources (see the brief) are: a verified statement authorizing publication of the six concept images (user message t72, 8 November 2026); two verified product decisions on identity and publish access (8 November 2026, 21:11 Europe/Berlin; English translations, not verbatim); the interpreter, budget, administrator, content-policy, and hosting-direction choices (8 November 2026, 21:16–21:17 Europe/Berlin; summarized or translated, not verbatim); and one paraphrased preference (a limit of about 250 characters, exact wording and date unavailable). The interpreter research note (`interpreter-recommendation.md`) is the technical source for provider details. Visibility handling and no image generation during planning are engineering recommendations, not owner quotes.

## 1. Product contract

One public isometric world grows by short text contributions. Visitors explore and preview with no account. The server turns a sentence into one typed action, validates it, and returns a private reversible preview. Publish is explicit, identity-backed, and persisted once. A copied link opens that creation. Someone else continues it. Return shows only real attributed changes.

Confirmed limits: English UI and docs; no signup wall to view or try; no auto-post or external notification; no real payment and no payment UI; additive changes only; no interiors, commerce, uploads, voice, clubs, or per-frame shared simulation; no invented users. Unsupported intent is explained, never swapped for a nearby asset. A fixture or keyword table is a test double, not the product interpreter. Production boot refuses fixture mode.

**PR-ready** and **POC-accepted** are different (section 8). A pull request may exist before a hosted world, a real model, or the uncoached human test. It must say so.

## 2. Stack, after source checks

| Piece | Candidate judgment |
| --- | --- |
| One TypeScript app, React DOM, PostgreSQL | Fits the empty repo and server authority. One database. The API is the only writer. |
| PixiJS 8 for the isometric scene | Conditionally feasible. Not locked until the spike. This pass read tag **v8.22.0**: `Ticker.ts` / `TickerPlugin.ts` contain no `blur`, `visibility`, or `hidden` handling. The ticker uses `requestAnimationFrame`. `app.stop()` / `app.start()` are manual. Browser rAF throttling is not a PixiJS pause and is not blur. `GlContextSystem.ts` listens for `webglcontextlost` / `webglcontextrestored`, calls `preventDefault()` on loss, emits `contextChange` on restore, and exposes `forceContextLoss()`. |
| Canvas renderer | Release **v8.16.0** (3 Feb 2026) added it and labeled it **experimental**. A string `preference` can fall through `webgl → webgpu → canvas`. The spike must not rely on that fall-through. |

**Visibility (engineering recommendation, not an owner quote).** `document.visibilityState === 'hidden'` stops the ticker only. Polling while hidden is best-effort: browsers throttle or freeze timers, and nothing depends on a 2-second hidden interval. On `visibilitychange` to visible, `pageshow` (including back-forward cache), `online`, and `focus`, the client polls once immediately, then resumes the visible interval. Blur never stops the ticker or polling, so an unfocused but visible window still receives publishes. Reduced motion and the pause control stop the ticker and leave polling on. Becoming visible calls `app.start()` unless pause or reduced motion applies. Missed frames are not replayed. Day and night and weather come from the config schedule plus server time. The “visible peer sees a commit within 5 seconds” budget applies to visible documents and to that first poll after the document becomes visible.

**Renderer choice.** Spike with `preference: ['webgl']` and a DOM plus still-scene fallback if WebGL is missing. Enable `['webgl','canvas']` only if the spike shows configured effects (tint and alpha, no custom shaders) survive the experimental Canvas path. WebGPU stays out until tested. Pin the version in the lockfile. Isometric projection is application code.

**Mobile first, desktop friendly (owner, 9 Nov 2026, 01:51 Europe/Berlin).** The local proof of concept is laid out for a narrow screen first and stays comfortable on a desktop. Network cost is in scope with drawing time: compressed transfer, a repeat visit that reuses immutable hashed files, and a poll that does not resend an unchanged world. This does not add a populated city, replace the renderer, create a host, or allow paid generation. Prototypes 0–5 stay style references. Authored SVG source stays allowed and is rasterized once; the page does not animate SVG elements. The measured notes and the engineering budgets, which are not guarantees, are in `docs/plan/architecture-performance.md`.

**Prototype 00 scenery and canvas-first chrome (owner, 9 Nov 2026, 02:54 Europe/Berlin, with the design brief the same day).** The two-asset drawing limit is lifted only for elements actually visible in prototype 00. That image governs the neighborhood art. Public references inform attention and interaction, not the drawing. Administrator scenery is added without deleting published contributions. `bus_stop` stays the fixture contribution and is not seeded as part of the picture. Preview privacy, identity, invites, and explicit publish confirmation stay. Motion stays client-derived, sparse, and slow. A passing test is not visual acceptance.

**Scene mount, unchanged for the UI branch.** The world pass keeps `Scene`’s props as they are: `objects`, `preview`, `selectedId`, `homeId`, `zoom`, `pan`, `paused`, `reducedMotion`, `deterministic`, `coverRight`, `district`, `onSelect`, and `onPan`. In local test, `window.__sharedWorldTest` still exposes `loseContext`, `tickerStarted`, `homePoint`, and `homeOnScreen`. Chrome, panels, typography, and `styles.css` stay with the interface work. The neighborhood is administrator scenery on a down-right canal. A click selects the place whose cell is under the pointer when one is there, so a neighbor’s drawing does not take the click. Visual acceptance is still not claimed.

A separate browser pass on 9 Nov 2026 looked at Google Research Language Explorer and Bruno Simon’s portfolio. It records observations, not frame-time or transfer measurements. Language Explorer: search, ArrowDown and Enter on a result, a right-side detail with close, a pointer drag on the globe, filters, and a narrow single-column detail. Bruno Simon: the page eventually showed an authored illuminated scene and a “Click to start” prompt; that start control did not advance in this browser, a narrow emulation clipped the callout, and nothing after start was reached. Both first pictures were delayed in this browser. That delay is an observation about this environment, not a defect attributed to either site, and it is why this app keeps a loading line that points at Places, plus the unavailable line when the picture cannot be drawn. The pass’s layout suggestions are not extra product scope. What this app takes from the observed sequence is the existing search, one detail surface, Back and Close, history behind “What changed”, and named pan, zoom, and home controls. It does not add filters, glow, physics, or sound.

**Host (owner-selected direction, 21:17; not provisioned).** Vercel for the app and Supabase for PostgreSQL, in a European region subject to availability and cost validation. No resources are created and nothing is published until the owner separately authorizes it. Region, cost, backups and retention, operational privacy, and the deletion checkpoint are deployment-stage checkpoints (S-HOST), not coding blockers. No second host or database. For Supabase: domain tables are not in an exposed Data API schema, RLS deny-all is defense in depth, and the browser bundle has no database key. Reads and writes go through the API. A smoke test must show anon select and insert denied.

## 3. Shape

One `package.json`. Folders: `src/domain`, `src/server`, `src/web`, `src/scene`, `config/`, `copy/`, `assets/catalog/`. An import rule forbids `src/domain` from importing React, PixiJS, the database driver, or an LLM SDK. No package-per-module split. No analytics product and no null-sink pipeline. Structured server logs use opaque ids and omit sentences, cookies, and keys.

No `container_object_id` column and no commerce tables. Unknown interior or payment fields fail the strict action schema. Stable ids and expand-only migrations keep those products possible later. World bounds, day/night, and weather live in versioned config. There is no weather table until a contribution can change weather, which the POC does not allow.

## 4. Records

Public URL ids are random UUIDs. One world row: monotonic **placement revision**. Moderation uses a separate **feed sequence** and does not bump the placement revision.

| Record | Rule |
| --- | --- |
| Placed object | Catalog asset version, server-computed position, footprint, state, originating contribution. |
| Contribution | Author, time, parent, approved text, proposal id (**unique**), visibility. Idempotency result may live on this row’s companion table, not a second domain model. |
| Proposal | Private text, one validated action including placement, `base_revision`, `proposal_version`, catalog and policy versions, owner binding, confirm key (cleared after a conflict refresh), expiry. |
| Idempotency | Unique `(author, key)`, fingerprint, stored response. |
| Moderation decision | Append-only hide/unhide and reason. |
| Author cursor | Authenticated authors only. Advances when the return note is dismissed or the continuation is opened, not on load. |

Discard **hard-deletes** proposal text. An id-only tombstone is allowed. After a successful apply, proposal text is purged; the contribution keeps approved text. Expired unpublished text is purged at the configured window by a sweep. Logs and rate-limit rows store no sentence and no raw IP.

**Placement.** The model does not emit coordinates. It emits `anchor` (selected id or none) and one catalog relation (`next_to`, `across_from`, `near`). The server places the footprint on the nearest free cell in a fixed ring, inside bounds. No cell means unsupported, draft kept. “Try another spot” asks the server for the next cell and is keyboard-operable. Any model `position` is `invalidOutput`. Pan and zoom have buttons and keys. Hidden objects keep their footprint and render as a textless unavailable marker.

**Actions.** Exactly one of `PlaceObject`, `AttachRelation`, `SetNarrativeState`. Public words are the author’s normalized sentence plus server templates. The model does not author public free text. Explanations are templates filled from the validated action. An object’s display name is the catalog copy key plus that object’s contributing author’s own sentence. A catalog-only administrator seed uses the catalog copy key and no visitor sentence. Names and templates are resolved at read time. A hidden target’s own fields and any server-derived label that points at it render as “an unavailable place.” Share HTML uses a generic title and description with no user text.

## 5. Interpretation

**Provider (owner-selected, 21:16).** OpenAI `gpt-5.4-mini-2026-03-17` (fixed dated snapshot in config, not an alias), reasoning effort `none`, strict Structured Outputs against the action schema, `store: false`, called only from the server. Accepted standard API conditions, recorded in the privacy copy: no training on API data by default; abuse-monitoring logs may keep prompts and results for up to 30 days; processing is **not** EU-only. The composer states that a private preview is hidden from other users but its text is processed by the external provider. Model outcomes `proposal`, `clarification`, `unsupported`, `no_change`, refusal, and incomplete output map to the port results below. Clarification and no-change are honest non-publishing states. Raw model prose is never shown as UI copy.

**Activation is off.** `interpreterActivation=off` is the default and the only allowed value until the owner explicitly approves paid calls (21:16: “Do not activate paid calls yet”, translated). The OpenAI adapter can be written and tested against a recorded or stubbed HTTP double, labeled “double — not real-provider evidence”. No API key is requested or stored now. At activation, the key lives only in the host secret manager, and provider-side spend limits are configured as well. Provider limits can overshoot slightly and are not relied on as the only cap.

Port result: `supported` action, `unsupported`, `invalidOutput`, or `providerFailed`. The server validates again. Context sent to a model is the user's normalized phrase, the minimal catalog subset, and selected object or relation ids with catalog names and relation enums. It never includes pseudonyms, author ids, session, recovery or invite secrets, credentials, full world history, or analytics identifiers. Other people’s sentences are not context. User text cannot change policy, roles, or the catalog, and never becomes code.

Checks **before** any provider call: empty text, grapheme/byte/mark limits, personal-data patterns, same-origin `Origin`. A failed check spends nothing. Provider failure keeps the draft and does not publish. Cancelled interprets are latest-wins per draft; a stale response cannot replace a newer preview.

The fixture adapter is deterministic and **cannot** be selected in production. It is not evidence that interpretation works. Safety cases on the OpenAI adapter, once activation is approved, must pass 5 of 5 runs for every case. Supported mapping (engineering proposal, not an owner quality promise): at least 20 supported corpus cases × 5 runs each (at least 100 trials); the run passes only if at least 90% of all trials map to the expected action **and** no single case passes fewer than 4 of 5 runs. Real-adapter runs do not run on fork pull requests. The corpus follows the research note (Portuguese, English, German and mixed input; negation; relation inversions; replacement and removal requests; injection; personal data; Unicode boundaries). It runs only after activation is approved, and it is charged against the USD 2 evaluation allowance.

**Input default (configurable; 250 follows the owner’s paraphrased preference, not a verified quotation):** NFC, then at most **250** extended grapheme clusters, at most **1000** UTF-8 bytes, at most **8** combining marks per grapheme. The server is authoritative; the client counter is advisory. Reject C0/C1 controls, bidi controls U+202A–U+202E and U+2066–U+2069, U+FEFF, and tag characters. ZWJ is allowed only inside emoji sequences. Stored text is NFC. No autolinking. If pseudonyms exist: NFKC, 2–24 graphemes, letters/digits/space/`-_.`, unique by a confusable skeleton, shown with a short stable id suffix. That rule does not choose an identity system.

## 6. Publish transaction

**Proposal lifecycle.** `draft` → `ready` → `confirming` → `applied`, or `discarded`, `expired`, `superseded`. Exactly one contribution may reference a proposal (`unique proposal_id`). `applied` is terminal. `discarded` hard-deletes text and cannot be published. `expired` cannot be published; the sentence remains until the purge window. `superseded` means a newer interpret on the same draft won. A second confirm of an `applied` proposal returns the existing contribution to that author and does not insert another.

Identity and publish access are owner-approved (section 6a): a first-party pseudonymous author and invite-only publishing. Step 1 requires a real session **and** an active publish grant. Automated tests may also use a **test identity double** that production boot refuses, labeled as a double in every report.

1. Resolve the caller from the server-side session. Signed-out publish is refused. An author without an active, unrevoked publish grant gets `invite required` (no write, draft kept). The grant is re-checked inside this transaction.
2. `BEGIN` at READ COMMITTED.
3. `SELECT` the world row `FOR UPDATE`.
4. Read the idempotency row inside that lock. Matching fingerprint returns the stored result **before** expiry, revision, or availability checks. A different fingerprint returns 422 and writes nothing.
5. Lock the proposal. Binding happens on the first authenticated confirm (`confirming`). From then on only that author may read, confirm, or publish. Until bind, only the creating visitor capability may. Anyone else gets **404**, the same body as a missing id. Discarded proposals return 404. Already applied returns the stored contribution to **that author only**. An expired unpublished proposal returns expired and keeps the sentence until purge. A committed retry still returns the stored result before those checks when the fingerprint matches.
6. On a placement-revision mismatch, re-validate and re-place the stored action with no provider call. If it still fits, **commit a private proposal update**: new placement, new `base_revision`, `proposal_version + 1`, state back to `ready`, confirm key cleared. No public write and no placement-revision bump. Return `conflict` with that refreshed preview. The next confirm mints a **new** key. `Publish(proposalId, proposalVersion, key)` is `conflict` with no write when `proposalVersion` is not current, so the author publishes only the preview last returned. If the anchor is hidden, the spot cannot be re-placed, or catalog or policy versions changed, return unavailable or require a new interpretation. A moderation feed update alone is not a placement conflict.
7. Otherwise insert the contribution (unique `proposal_id`), objects or relations, moderation visibility, idempotency result, and placement revision. Commit.

**Fingerprint** = SHA-256 over proposal id, proposal version, canonical validated action including placement, author id, catalog version, and policy version. The confirm step mints the key on the server and stores it on the proposal. A lost response retries that same key and returns the stored body, including a stored conflict refresh, and does not 422. A new confirm after refresh uses the new key. Reusing a key with a different fingerprint returns 422 and writes nothing. A second key on an already applied proposal does not create a second contribution.

Signing in rotates the capability cookie. Signing out clears it. The old capability loses the draft at bind, not at text purge. An unbound draft stays capability-only. No public endpoint lists proposals.

### 6a. Identity and invite-only publishing (owner-approved product decisions)

**Owner decisions, 8 November 2026, 21:11 Europe/Berlin** (English translations, not verbatim; see brief): a pseudonym without email, with a recovery code, accepting that losing both access and the code makes that identity unrecoverable; the world is public to read, publishing requires identification and an invitation. This is product direction, not authorization to implement.

**Identity.** Explore and private preview stay signed out (visitor capability). The identity step appears only on the publish path. The server creates an author: random UUID, a pseudonym under the section 5 rules, and **no email, phone, social profile, or location**. Requests carrying such fields are rejected. The session secret is ≥ 256 bits of random, sent only in a `__Host-` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`), and stored only as a keyed hash (HMAC-SHA-256 with a server-side pepper from the host secret store, never in the repo). Sessions are server-side rows with a configured maximum age. Sign-out revokes the row. Same-origin `Origin` is required on every state-changing request. Local test, corrected 9 November 2026: `localhost`, `127.0.0.1`, and `::1` on the port this process is listening on are the same local page. Production still requires an exact match with `APP_ORIGIN`. A missing `Origin`, a foreign origin, another port, and `https` against this `http` listener stay rejected.

**Recovery code.** ≥ 128 bits of random, encoded for typing (grouped base32), shown once at identity creation with an explicit acknowledgment step and the owner-approved warning that losing both access and code makes the identity unrecoverable. Stored only as a keyed hash. **Single use.** Redemption is one transaction: lock the code row, check it is unused and the author is not disabled, mark it used, revoke all other sessions of that author, create a new session, and issue a **new** recovery code shown once. Two concurrent redemptions of one code produce exactly one success. A signed-in author can **rotate** the code; the old one stops working at commit. Wrong codes get one uniform error, and attempts are rate-limited per network key and globally. There is no support or manual recovery path. Losing both secrets ends that identity; its published history stays attributed.

**Invites.** `publishAccess=invite` is the approved production mode. Unset still disables publishing honestly (R-04). An invite has a random ≥ 128-bit code stored only as a keyed hash, the creating moderator, an expiry, a maximum redemption count, a redemption count, and an optional revocation. **Redemption** happens in the identity step or later while signed in, in one transaction: lock the invite row; check it is not revoked, not expired (database time), and under its count; insert one `publish_grant(author_id unique, invite_id)`; increment the count. Concurrency: two authors racing for a single-use invite produce one grant and one uniform refusal. A retry by an author who already holds a grant (lost response) returns that grant and **does not consume** another use. Invalid, expired, used-up, and revoked codes share one uniform refusal, rate-limited like recovery. A grant is checked server-side inside each publish transaction. A moderator revocation (append-only) applies on the next request. An invite link may carry the code only in the URL fragment (`#invite=`). The client reads it, strips it with `history.replaceState`, and never sends it in a query string, referrer, log, or analytics event.

**Who mints and distributes (owner decision, 21:17).** The owner is the sole initial administrator and alone generates and revokes invites, through the administrator surface or a server-side command that prints the code once and never logs it. Ordinary authors cannot mint invites. Defaults: single use, expiry 14 days (configurable). The product never sends invites; the owner hands them out through channels people already use.

**Administrator bootstrap and role enforcement.** The bootstrap process is chosen during implementation, with fixed constraints. It is a one-time, server-side step run by the operator against the database (for example a CLI that grants the administrator role to an existing author id), and it cannot be reached over HTTP. No personal allowlist, author id, email, or secret is committed to git. It is idempotent, logs no secrets, and records an append-only role event. Every administrator action and administrator read (hidden text, dependents, invite list, grant and block lists) checks the role server-side on each request. No endpoint grants or edits roles, so a user cannot self-promote. Recovery and invite redemption keep their atomic, rate-limited transactions.

**Pseudonym moderation.** Because pseudonyms now ship, a moderator can hide a pseudonym (append-only). Public attribution then reads “a contributor”, and the author id is unchanged.

**Roles (additive).** Any author can read their own hidden text. Another author cannot. A moderator uses the same publish rule as everyone else and is labeled on administrator contributions. A moderator grant is server-side only. Signed-out visitors can read the public world and preview. They cannot publish. Publishing requires a session plus an active invite grant (section 6a). Moderators follow the same rule and also mint invites.

**Abuse caps (required mechanism; numbers are reversible engineering defaults).** Per visitor capability; per HMAC of the network address with a daily salt, held in memory or a TTL ≤ 24 h and never logged; a global interpret request cap. A hit on the global cap pauses new previews with an honest message. Already validated proposals can still be published. Activating the provider while any budget key is unset fails closed. Defaults until replaced in config: 10 interprets / 10 min / capability, 30 / 10 min / network key, 500 interprets / hour global, 20 publishes / author / day.

**Other reversible config, engineering, not an owner approval:** proposal TTL 24 h; idempotency retention 7 days; expired-text purge 7 days; visible poll 2 s. Hidden polling is best-effort and is not a 2-second promise. CI profiles are Chromium 1366×768 and emulated mobile WebKit, plus 4× CPU throttle for the mobile frame sample. A missing required key fails boot with a named error. `publishAccess` is not required; see section 9. A config change alters behavior without a domain-code edit (`t.config.grapheme`).

**Interpreter budget (owner-approved amount, 21:16; enforcement is engineering).** The app-wide budget is USD 10 per calendar month, **including** at most USD 2 for initial evaluation (a subset, not an addition). Before each provider request the server makes an **atomic reservation** in PostgreSQL of the worst-case cost: maximum input tokens plus maximum output tokens, priced from config with the regional premium and a safety margin. The reservation is refused, and the preview honestly paused, if it would exceed the remaining monthly or evaluation allowance, the daily slice, or the concurrency cap. After the response, the reservation is reconciled to actual usage. On an ambiguous network failure the reservation stays held until the call is safely accounted for. Every retry reserves again, and quota or billing errors are never retried blindly. There is a kill switch, no automatic top-up, and no provider fallback. Prices, model id, and token limits live in config and are rechecked before activation. The plan does not promise that provider-side caps prevent all overshoot. The app's own reservation is the primary control.

## 7. Moderation, privacy, art, ops

A moderator appends hide/unhide. Public DTOs are allowlists. Hiding removes that contribution’s own text fields and every server-derived label or template that references it, within one poll, from the scene, the list, derived captions, the return note, and JSON fields sourced from it. It does not rewrite other authors’ free text, which may quote the hidden words. The moderator surface lists dependents (continuations, relations, and contributions whose parent or anchor is the hidden target) so each can be hidden separately. The author can see their own hidden text marked not public. Other authors cannot. The administrator can also hide pseudonyms and **block future publishes** by an author for abuse (an append-only block that revokes their grant on the next request; history is unchanged). **Content policy (owner-approved, 21:17):** no personal data, harassment, hate, sexually explicit content, or illegal content. It is shown at the publish confirmation and stored as versioned policy config. Automated checks remain structural plus personal-data patterns before any provider call. Other categories are enforced by administrator review and hide or block, and the product does not claim automatic detection. Residual risk: quoted words can remain inside someone else’s sentence until that sentence is moderated too.

**Art (implementation work, not this stage).** Generating images during planning is an engineering recommendation, not an owner quote: this planning pass generates none. During implementation, produce code-drawn or SVG catalog art from this visual grammar, prototypes 0–5 as style reference only: oblique isometric, flat color, simple geometric masses, readable silhouettes, no photorealism, no sliced concept PNGs. Each asset has footprint, anchor, hit polygon, depth key, states, reaction config, copy key, and a provenance note (method, date, no third-party reference). The catalog must realize the journey test script: a readable starting place (the journey’s example is a café for birds) and the example continuation (a bus stop for its regulars), plus every suggestion chip that ships. The seeded place is an administrator contribution and is labeled. Further assets are an owner choice, not an extra default. CI fails if a visual ref points at `prototypes/`, if a prototype SHA-256 appears in the runtime bundle, or if an asset lacks provenance. A missing atlas frame fails boot.

**Prototypes 0–5** are already authorized for the public repo. The future doc commit still runs the privacy gate, drops `source_image_sha256` from the public manifest, removes the dangling journey line “Optional related working notes.”, and strips PDF Info dates. Concept files are not sprites.

**Ops by stage.** PR-ready includes a synthetic local `pg_dump` / restore smoke and an evidence file. POC-accepted, only after a host is authorized, adds provider backups, one restore onto a disposable copy, and the publish-disable switch. Before any public host, record a legal-applicability checkpoint for that deployment: whether a privacy notice, a provider identification line, and a deletion path are required. This plan does not assert that a particular statute applies. If the checkpoint says they are required, they are part of S-HOST; if not, the evidence is that determination. Rollback of a bad build is the previous immutable build. Hide is the content rollback. Disabling the interpreter leaves preview honestly unavailable and does not switch on the fixture.

## 8. PR-ready versus POC-accepted

| Gate | PR-ready | POC-accepted |
| --- | --- | --- |
| Local disposable Postgres, two sessions, ownership, atomic idempotency, redaction, Unicode, caps | Required | Required |
| Code-drawn catalog and DOM plus scene path | Required | Required |
| Fixture suite | Required, labeled **not** the functional interpreter | Still required as the deterministic contract |
| Real provider corpus | Not run until the owner explicitly approves paid activation; then capped by the USD 2 evaluation allowance. Absence is “not run”, never “pass” | Required |
| Production boot | Refuses fixture and test-identity double. Real pseudonymous identity and `publishAccess=invite` are the production modes. | Same |
| Five independent reviews on the pinned SHA, including a real browser visual review | Required for a ready-for-review claim | Repeated if the SHA changes |
| Host, backups, restore rehearsal, legal-applicability checkpoint, uncoached human pair | Not claimed | Required before public hosting. The checkpoint is a determination, not a claim that a named law applies. |
| Title and evidence | If the real corpus was not run, the title and evidence say “fixture interpreter — not acceptance-ready”. They must not say the interpreter works, and they must not say accepted while any POC-accepted row is not run. | Owner merges. No automatic merge. |

## 9. UI

Panels on one world view: object list, context, composer, private preview, confirm, result, return note, separate moderation. Copy lives in `copy/`. Journey strings stay as specified in the journey document. Ordinary publish confirmation is the proposed UI. A sandbox or simulated-checkout screen is not scheduled. It is not an owner prohibition; open decision 9 can still reinstate it. In `runMode=local-test` a persistent, non-dismissible banner names whatever is test-only in that run (for example “Test mode — fixture interpreter”, plus “test identity” only when the double is active). Production builds omit it. Every review report states the run mode.

States that must exist: loading, empty, ready, contextual arrival, composing, interpreting, preview ready, clarification needed, no change, unsupported, preview failed, discarded, needs identity, recovery code shown once, recovery, invite required, invite refused, confirming, publishing, published, already published, conflict with refreshed preview, expired, unavailable, unauthorized, rate-limited, globally paused, load failed, illustration unavailable, reduced motion, hidden-tab visuals paused, offline before commit. Recovery keeps the draft except after hard discard. Publishing retries the server key without a second confirmation. Conflict requires one new confirmation of the same action.

With WebGL unavailable, the list shows the textual private preview. That degraded path is accepted for the no-canvas journey. A screen reader can complete it. Focus moves to the preview, the conflict text, and back on close. Targets meet WCAG 2.2 AA intent, including focus not obscured, no drag-only placement (2.5.7), and target size (2.5.8), verified by a focused audit rather than an unearned conformance claim. Touch and desktop both complete the seven stages. Every visible control works. A test-only `scene=deterministic` flag freezes motion for CI snapshots and is ignored in production. The parent visual review uses normal motion.

| Failure | Result | Test |
| --- | --- | --- |
| Unsupported, negation, or two actions | Draft kept. No public row. No nearby asset. | `t.fail.01` |
| Provider or preview failure | Draft kept. Other sessions unchanged. Zero writes. | `t.fail.02` |
| Second confirm of the same proposal | Same contribution id. | `t.fail.03` |
| Placement world moved | Refreshed preview of the same action. One new confirm. No new model call. | `t.fail.04` |
| Hidden or missing anchor | Unavailable. No success state. | `t.fail.05` |
| Response lost after commit | Same server key returns the committed id. | `t.fail.06` |
| Response lost before commit | No row. The same key can apply once. | `t.fail.07` |
| Tampered asset, extra field, forged author | Rejected. | `t.fail.08` |
| WebGL missing or context lost | DOM path works, or the scene reloads. No fake map. | `t.fail.09` |
| World request failed | Error and retry. No stand-in people. | `t.fail.10` |

Adjacent cases for a future defect in one of these rows vary actor, revision, retry, payload boundary, and visibility. The ledger already assigns those ids for the audit findings. A purely visual miss uses a labeled manual procedure.

**Config keys (all in `config/`, validated at boot).** `promptMaxGraphemes` 250, `promptMaxUtf8Bytes` 1000, `maxCombiningMarksPerGrapheme` 8, `proposalTtlHours` 24, `idempotencyRetentionDays` 7, `expiredTextPurgeDays` 7, `pollIntervalMs` 2000 while visible, `interpretPerCapability` 10 per 10 minutes, `interpretPerNetworkKey` 30 per 10 minutes, `interpretGlobalPerHour` 500, `publishPerAuthorPerDay` 20. Interpreter: `interpreterProvider` openai, `interpreterModel` gpt-5.4-mini-2026-03-17, `interpreterActivation` off (only value allowed until owner approval), `interpreterMonthlyBudgetUsd` 10, `interpreterEvalBudgetUsd` 2 (part of the monthly budget), `interpreterMaxInputTokens` and `interpreterMaxOutputTokens` (set from the schema and catalog size), `interpreterPriceInputPerMTokUsd` 0.75 and `interpreterPriceOutputPerMTokUsd` 4.50 (research-date list prices, recheck before activation), `interpreterRegionalPremium` 0.10, `interpreterMaxConcurrent` (engineering default 4). Analytics: none enabled by default. `publishAccess` is optional. Unset means publish is disabled, the app still boots, and explore and preview work. The control shows “Publishing isn't open yet” and writes nothing. `invite` is the owner-approved production value. `runMode=local-test` may also use `test-any-authenticated` with the identity double; production refuses both. An unknown value fails boot. Identity and invite defaults (engineering, reversible): `sessionMaxAgeDays` 180, `recoveryAttemptsPerNetworkKeyPerHour` 10, `inviteRedeemAttemptsPerNetworkKeyPerHour` 10, `inviteDefaultExpiryDays` 14, `inviteDefaultMaxRedemptions` 1. The hashing pepper comes from the host secret store and has no default; a missing pepper fails boot outside `local-test`.

## 10. Slices

Technical slices stay below. The five user-visible blocks are the milestones. Each milestone ends with a short demo procedure or recording plus the test ids that were run, the run mode, and what was not run. Those demos are future evidence. None exists now. No extra approval is added here beyond the unresolved decisions in the brief. Implementation still waits until this corrected text is the delivered plan.

| Slice | Delivers | Does not claim |
| --- | --- | --- |
| S0 | Scanned docs, authorized prototypes 0–5, fail-closed gate, CI privacy | A product |
| S1 | One world, config, copy, honest empty DOM list | A catalog scene |
| S-ART | Code-drawn catalog, starting place, hit targets | Generated rasters in planning; concept PNGs as sprites |
| S2 | Pixi view and spike against section 2 | A locked renderer before the report |
| S3 | Preview, limits, caps, fixture contract, production refuses fixture | A real model |
| S4 | First-party pseudonymous identity: session, single-use rotatable recovery code, sign-out; invite mint, redeem, grant, revoke; the double for tests only | Email, social login, or any manual recovery |
| S5 | Atomic publish, ownership, grant check, conflict re-place | Open publishing |
| S6 | Continuation, links, return note | External notifications |
| S7 | Administrator surface: hide, publish block, invite mint and revoke, feed redaction, owner-approved policy text | Automatic content classification |
| S8 | Visual life, hidden-tab visuals, pause, reduced motion, DOM fallback | Shared simulation |
| S-HOST | Vercel + Supabase in a European region: availability and cost validation, backups, restore rehearsal, publish switch, legal and privacy checkpoint, deletion path | Anything before the owner separately authorizes resource creation and publication |

| Milestone | Contains | Demo must show |
| --- | --- | --- |
| M1 Explore | S0, S1, S-ART, S2, and pause / reduced motion from S8 | Seeded labeled place, select in the scene or the list, a few configured animations, keyboard path. WebGL-off still works through the list. |
| M2 Try | S3 | Private fixture preview, labeled, with edit and discard. A second session sees nothing. |
| M3 Publish | S4 and S5 locally | Create a pseudonym with no email, acknowledge the recovery code, redeem an invite, then persist, attribution, conflict refresh, idempotency. Recover with the code on a second browser. The banner names the fixture interpreter. |
| M4 Continue | S6 and S7 | Contextual link, continuation, return note, hide of derived labels. |
| M5 Deliver | Five reviews, fixes, final SHA | PR text lists not-run POC-accepted rows and does not say accepted. |

`t.plan.milestones` checks that each M names at least one J-id and a demo procedure. Scope cutoff: if preview, one persisted publish, and one continuation fail in two local sessions, stop adding effects.

## 11. Verification

Test ids live in the ledger and the matrix. Every requirement maps to a slice and at least one test id. Every audit finding maps to one regression plus three to five adjacent tests. At least three adjacent ids are unique to that finding unless the ledger states why a shared id is reused. Tests are planned, not executed. Visual-only checks are labeled `manual-visual`. A ledger lint fails if a finding has fewer than three adjacent ids, a missing test id, or a close without a SHA. `t.rtm.slice-feasible` fails when a test is required before the slice that completes its behavior. Cumulative tests (`t.a11y.dom`, `t.a11y.place`, `t.e2e.viewports`) are first required at S5 and re-run after every later slice.

Five reviews, each a separate agent that did not write the code, same SHA. Each receives the SHA, plan, ledger, and run mode, not the implementer’s conclusions. Self-review is not one of them. Review 1 attacks only the local or test environment. Review 5 is a separate agent with its own browser session and drives real input. After a fix, the original reviewer of that finding rechecks it on the new SHA. Automated gates rerun in full. Review 5 reruns when any UI or scene file changed. Evidence goes in `docs/evidence/<sha>/`, uses synthetic data, and fails the privacy gate if it contains a machine path.

| Review | Must actually do | Does not pass on |
| --- | --- | --- |
| 1. Abuse and security | Run ownership, idempotency race, injection, anon read, cap, and hidden-body tests in the authorized environment. | A design reading. |
| 2. Product journey | Walk J-1–J-7 against the matrix, including unsupported intent and no fabricated activity. | A screenshot of the happy path. |
| 3. Data and concurrency | Read the migration, the world lock, unique `proposal_id`, and feed sequence versus placement revision. | Unit tests that mock the transaction. |
| 4. Quality, accessibility, performance | Types, lint, the suites above, axe, secret scan, spike numbers next to the budgets. | A coverage percentage. |
| 5. Visual interaction | Separate agent, own browser, real typing and keyboard, desktop and mobile, focus, contrast, loading, error, conflict, reduced motion, hidden-tab ticker stopped. | A DOM dump or a single still. |

A later SHA repeats the reviews whose evidence depended on the old SHA. Reports keep residual risk and name what was not run. Nobody promises zero bugs. Each accepted defect, including these 26 once implementation exists, keeps its regression and three to five adjacent tests in the ledger with the fixing SHA.

**Budgets (unmeasured proposals for the spike):** desktop median frame ≤ 16.7 ms and sustained worst ≤ 33 ms over 10 s; mobile median ≤ 33 ms; first readable DOM state ≤ 3 s desktop lab and ≤ 5 s throttled network; heap ≤ 256 MB over 5 min visible; interpret or honest failure ≤ 15 s once a provider exists; publish transaction ≤ 1 s excluding interpretation; a visible peer, or the first poll after a document becomes visible, sees a commit within 5 s. Hidden tabs produce no ticker frames. Hidden polls are not timed at 2 s. Unfocused visible tabs still poll.

## 12. Traceability

Evidence today: **not produced**. `t.gate.*` and domain tests are the future proofs.

| ID | Requirement | Slice | Test id |
| --- | --- | --- | --- |
| P-01 | One public world | S1 | `t.world.single` |
| P-02 | Grows by contributions | S5 | `t.pub.persists-refresh` |
| P-03 | Explore and preview signed out | S3 | `t.preview.signed-out` |
| P-04 | English copy module | S1 | `t.copy.literals` |
| P-05 | No public write before confirm | S5 | `t.pub.no-confirm` |
| P-06 | Preview isolation | S3 | `t.preview.isolation` |
| P-07 | Unsigned publish refused | S5 | `t.pub.unsigned` |
| P-08 | One schema-valid action | S3 | `t.interp.schema` |
| P-09 | No silent approximation | S3 | `t.interp.negation` |
| P-10 | No destructive overwrite | S5 | `t.pub.additive` |
| P-11 | Parent link and both authors | S6 | `t.cont.parent` |
| P-12 | Opaque contextual link | S6 | `t.share.opaque` |
| P-13 | Return note only for real changes; survives refresh | S6 | `t.return.refresh` |
| P-14 | Hide removes own fields and derived labels, not others’ sentences | S7 | `t.mod.scope` |
| P-15 | Honest empty world | S1 | `t.world.empty` |
| P-16 | Draft kept on failure | S3 | `t.draft.kept` |
| P-17 | Two actions invalid | S3 | `t.interp.multi` |
| P-18 | Motion not synchronized; clock is | S8 | `t.vis.clock` |
| P-19 | Hidden tab stops the ticker; polls are best-effort | S8 | `t.vis.resume-poll` |
| P-20 | Keyboard DOM journey without canvas | First required S5; re-run later | `t.a11y.dom` |
| P-21 | Interior payload rejected | S3 | `t.schema.interior` |
| P-22 | Payment payload rejected; no payment UI | S5 | `t.schema.payment` |
| P-23 | Concurrent same key, one row, both responses match | S5 | `t.pub.idem.race` |
| P-24 | Conflict persists a new proposal version and a new confirm key | S5 | `t.pub.conflict.persist` |
| P-25 | Forged author and self-granted moderator refused | S5 | `t.authz.forge` |
| P-26 | No browser database key; anon read denied | S5 | `t.db.anon-read` |
| P-27 | Injection and personal-data checks before provider | S3 | `t.interp.pii-first` |
| P-28 | Config change without domain edits | S1 | `t.config.grapheme` |
| P-29 | Proposed ordinary confirmation; sandbox not scheduled | S5 | `t.pub.no-sandbox` |
| P-30 | Journey-script catalog, café and bus-stop examples | S-ART | `t.art.script-coverage` |
| P-31 | 250 graphemes plus byte and mark caps | S3 | `t.input.zalgo` |
| P-32 | Pseudonymous identity, no email, hashed session; double refused in production | S4 | `t.id.no-email`, `t.id.double-refused` |
| P-50 | Single-use rotatable recovery code | S4 | `t.id.recover-single-use` |
| P-51 | Invite-only publish with atomic redemption and server grant check | S4 / S5 | `t.invite.redeem-race`, `t.pub.no-grant` |
| P-52 | Provider adapter, activation off, minimal context | S3 | `t.llm.activation-off` |
| P-53 | Atomic budget reservation and reconciliation, USD 2 inside USD 10 | S3 | `t.budget.reserve-race` |
| P-54 | Administrator role enforced on every action and read; no self-promotion; bootstrap not over HTTP | S4 / S7 | `t.admin.no-self-promote` |
| P-55 | Content policy shown; publish block for abuse | S7 | `t.admin.block-publish` |
| P-56 | Host direction recorded; no provisioning before authorization; no default analytics | S-HOST | `t.ops.no-provisioning-in-ci` |
| P-33 | Fixture refused in production; reports split | S3 | `t.interp.fixture-refused` |
| P-34 | Discard removes sentence text | S5 | `t.draft.purge` |
| P-35 | Hide advances feed sequence, not placement revision | S7 | `t.mod.feed` |
| P-36 | Local restore smoke; hosted restore only at S-HOST | S0 / S-HOST | `t.ops.dump` / `t.ops.hosted-restore` |
| P-37 | Spike report on pinned PixiJS | S2 | `t.spike.report` |
| P-38 | Budgets recorded, not invented as results | S2 | `t.spike.budgets` |
| P-39 | Secret, metadata, CI artifact, commit email, PR text gate | S0 | `t.gate.staged` |
| P-40 | Exactly prototypes 0–5, authorized, not runtime sprites | S0 | `t.gate.six-png` |
| P-41 | Every visible control works | S1 | `t.ui.click-all` |
| P-42 | Keyboard placement and focus | First required S5; re-run later | `t.a11y.place` |
| P-43 | URLs and logs omit text and personal data | S6 | `t.share.no-query-text` |
| P-44 | Global interpret cap | S3 | `t.abuse.global` |
| P-45 | Pause stops motion, polling continues | S8 | `t.vis.pause` |
| P-46 | Desktop and mobile viewports | First required S5; re-run later | `t.e2e.viewports` |
| P-47 | Provenance and no prototype hashes in the bundle | S-ART | `t.art.provenance` |
| P-48 | Other caller publishing a proposal gets 404 | S5 | `t.pub.adopt-bind` |
| P-49 | Seeded administrator contribution is labeled | S-ART | `t.world.seed-labeled` |
| J-1–J-7 | Seven journey stages | M1–M4 | `t.e2e.j1` … `t.e2e.j7` |
| F-01–F-10 | Unsupported, preview fail, double submit, conflict, unavailable, timeout after commit, timeout before commit, tamper, no WebGL, world load fail | S3–S8 | `t.fail.01` … `t.fail.10` |

Journey acceptance stays the written journey: two sessions, no coaching in the human test, link lands on the creation, no fabricated activity. The human test is POC-accepted evidence, not PR-ready evidence.

## 13. Publication and privacy gate

Future commit only. Eligible after a fresh staged scan: sanitized markdown sources, the re-audited plan, the six authorized PNGs, and a manifest **without** pre-sanitization hashes. DOCX only if core props stay empty and relationships stay internal. PDF only if the metadata gate passes. Not eligible: the zip as a blob, any seventh image, the third-party reference, original filenames, local paths.

Two checks, not one. Before `git commit`, scan the staged snapshot and the proposed message file (secrets, binaries, metadata, denylist). Before push, and again in CI on `git log` from `origin/main` to `HEAD`, scan author, committer, trailers, and message text, plus the branch name and the pull-request title and body. gitleaks is pinned by version and checksum, runs with `--redact`, and a missing or mismatched binary fails closed. CI logs never print config or environment. PNG chunks are limited to `IHDR`, `PLTE`, `tRNS`, `IDAT`, and `IEND`. The denylist (home-directory prefixes, the workspace-root prefix, store ids) lives in the gate script. This plan does not repeat those prefixes. A reviewed allowlist may exempt only the script’s own pattern lines, by path and line hash, not general paths.

Allowed identities, and no others. Halt otherwise. (1) The repository owner’s GitHub noreply form for the login `bribeirobr25` only (`users.noreply.github.com`). (2) The bot already on `32f4b93`: name `Cursor Agent`, address `cursoragent@cursor.com`. That address is the product bot, not a personal mailbox. Any other author, committer, or `Co-authored-by` identity halts the commit. Do not allow an unknown bot. CI uses `pull_request`, not `pull_request_target`, has no secrets on pull-request workflows, uploads no traces, videos, HAR files, or server logs, and ships no public source maps. `.gitignore` covers `.env*`, `playwright-report/`, `test-results/`, traces, and coverage before the first code commit. The gate script is committed in S0 only after a manual run of the same checks. Hook bypasses are forbidden.

## 14. Finding disposition index

Full text, rejected alternatives, and adjacent test ids are in the ledger. Short form:

| ID | Disposition |
| --- | --- |
| C-01 | Journey-script floor and a labeled administrator seed (R-08). No extra asset quota. |
| C-02 | Config defaults. `publishAccess` unset disables publish and still boots (R-04). |
| C-03 | Capability loses the draft at bind. Sign-in rotates the cookie (R-05). |
| C-04 | Accepted. Idempotency read is inside the world-row lock. |
| H-01 | Accepted. Server placement; no model coordinates; keyboard path. |
| H-02 | Accepted. Global cap plus an atomic budget reservation. Provider and USD 10 budget are owner-selected, and activation is off. |
| H-03 | Derived labels and own fields only. Other authors’ sentences are not rewritten (R-02). |
| H-04 | Accepted beside the owner’s paraphrased ~250 preference. |
| H-05 | Ticker stops when hidden. Hidden polls are best-effort. Immediate poll on return (R-03). |
| H-06 | Pre-commit and pre-push/CI are separate. Two allowlisted identities only (R-06). |
| H-07 | Accepted. No browser database key; private reads denied. |
| H-08 | Refreshed placement is persisted on the proposal with a new version and a new key (R-01). |
| H-09 | PR-ready is not POC-accepted. `local-test` shows a banner (R-04). |
| M-01 | Accepted. No other users’ free text in model context. |
| M-02 | Accepted. Hard-delete text; checks before the provider. |
| M-03 | Owner decided: pseudonym plus recovery code, invite-only publishing (section 6a). `t.e2e.j6-no-manual-step` now means the partner, holding an invite handed over outside the product, publishes with no database edit. |
| M-04 | Accepted. Server-minted key; cursor not advanced on load. |
| M-05 | Accepted. One app, no unused interior or commerce schema. |
| M-06 | P-49 added. Owner rows in the brief carry a source or are relabeled (R-09, R-11). |
| M-07 | Adjacent ids must be distinct per finding unless reuse is written down (R-12). |
| M-08 | Accepted for the OpenAI adapter after activation. Fixture and HTTP-double results stay separate. |
| M-09 | Accepted. Deterministic scene flag is test-only. |
| L-01 | Accepted. Roles follow the approved invite rule (section 6a). |
| L-02 | Accepted. DOM path shows a textual private preview. |
| L-03 | Publication hygiene accepted. PDF parity was not re-extracted in this pass. |
| L-04 | Accepted by splitting this plan, the ledger, and the brief. |

## 15. Review status

Independent review complete at planning level: adversarial audit, re-audit, and a final paragraph recheck (see `final-plan-review.md`). R-01 through R-12 are applied. R-13 is the S-HOST checkpoint. Owner product decisions of 8 November 2026 (21:11 identity and invites; 21:16 interpreter and budget; 21:17 administrator, content policy, and hosting direction) are incorporated.

Remaining before **paid calls**: the owner's explicit activation approval, the API key placed in the host secret manager, and provider-side limits configured. Remaining before **deployment**: separate authorization to create resources and publish, region and cost validation, backups, and the legal and privacy checkpoint. None of these blocks coding S0–S8 locally. This text is not product acceptance, not an implementation, and not evidence that any test passed. Named tests remain planned.

The scene mount contract gained one optional callback, `onReady`, fired once after the picture is on screen. Every earlier prop is unchanged: objects, preview, selection, zoom, pan, motion flags, coverRight, district, onSelect, and onPan. The interface around that picture was redesigned on this branch. That redesign is not visual acceptance.

A later pass on the same branch redraws the café, sculpture, and tower toward prototype 00, draws the ground as a few large plots instead of a per-cell grid, and biases the wide camera so the café sits in the foreground. Published rows are kept. The bus-stop drawing is smaller. The narrow Navigation control opens as a compact sheet, and the test-mode chip shows a short label. A follow-up on the same branch redraws the café as an upright isometric box with a five-peak roof, puts the canal back as one full-width channel, and fills the frame with large lawns. None of that is visual acceptance.
