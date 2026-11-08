# Shared World — Interpreter API recommendation

Research date: 8 November 2026 (Europe/Berlin).
Status: owner selected the OpenAI baseline (8 November 2026, 21:16 Europe/Berlin) with a USD 10/month budget including at most USD 2 for initial evaluation, and accepted standard API conditions; paid-call activation is **not** authorized. No API requests, provisioning, credentials, or paid evaluations were performed. The canonical requirements are in `implementation-plan.md` section 5.

## Recommendation

Start with OpenAI `gpt-5.4-mini-2026-03-17`, with reasoning effort `none`, strict Structured Outputs, server-only integration, and `store: false`. This is a concrete available dated snapshot, not an assertion that it wins a benchmark. Its explicit version pinning, JavaScript/Zod integration and documented refusal/incomplete-response handling make it a defensible engineering baseline. Newer flagships are unnecessary until measured evidence justifies their cost. Do not select the deprecated GPT-4.1 Mini for a new integration.

Evaluate Google `gemini-3.1-flash-lite` paid tier as the meaningful lower-cost challenger, not an automatic production fallback. It is explicitly documented as stable, targets lightweight extraction and translation, and supports structured outputs. Only replace the baseline if the same evaluation passes. Do not silently resend private drafts to a second provider. No multi-provider runtime routing is needed for the POC.

## Practical comparison

Standard synchronous USD prices per 1 million tokens, uncached, without tools or batch discounts, observed on the research date:

| Provider / concrete candidate | Input | Output | Schema and version considerations |
| --- | ---: | ---: | --- |
| OpenAI GPT-5.4 Mini (`gpt-5.4-mini-2026-03-17`) | $0.75 | $4.50 | Strict JSON Schema subset; native JS/Zod parsing; explicit dated snapshot; reasoning can be disabled. |
| Google Gemini 3.1 Flash-Lite (`gemini-3.1-flash-lite`, paid) | $0.25 | $1.50 | JSON Schema subset and JS/Zod support; documented stable identifier, not a verified immutable dated snapshot. Some schema keywords are ignored and must be validated locally. Thinking tokens count toward output billing. |
| xAI Grok 4.20 Non-Reasoning (`grok-4.20-0309-non-reasoning`) | $1.25 | $2.50 | Structured outputs, non-reasoning; use explicit identifier rather than `latest`; OpenAI-compatible JS SDK/Zod integration. No perpetual behavioral immutability guarantee inferred from its name. |

All three can constrain structure, not prove correct interpretation, negation handling, intent fidelity, permissions, or catalog validity. Model availability remains subject to account and region restrictions and must be checked before setup. These are researched candidates, not the only models currently available. xAI also lists Grok 4.7 at $2 input/$6 output per million below 200k prompt tokens; the more expensive flagship is not necessary for the initial bounded task. Gemini's current list also includes 3.5 Flash-Lite at $0.30/$2.50; newer is not automatically better for this task.

## Illustrative cost, not a quote or benchmark

Assume each interpretation uses 2,000 input tokens TOTAL (instructions, JSON schema, bounded catalog, selected-object context and short user phrase) and 200 billed output tokens TOTAL. Assume 1,000 interpretations, one request each, no cache, reasoning disabled where available, no tools, no retries, no taxes or hosting. A 250-grapheme phrase does NOT imply a 250-token bill; overhead dominates. Different tokenizers will produce different real totals.

Formula: 1,000 × [(2,000 / 1,000,000 × input price) + (200 / 1,000,000 × output price)].

- OpenAI: 2 × $0.75 + 0.2 × $4.50 = **$2.40**.
- Google: 2 × $0.25 + 0.2 × $1.50 = **$0.80**.
- xAI: 2 × $1.25 + 0.2 × $2.50 = **$3.00**.

These are scenarios, not maximum spend. Extra thinking/output, schema/catalog growth, retries and regional premiums change the bill. xAI additionally documents a $0.05 fee for certain policy violations caught before generation on the Responses API; token-only estimates exclude it. OpenAI lists a 10% regional-processing premium for GPT-5.4 Mini. No API subscription or cloud-agent credit error was used as price evidence.

## Privacy, retention and geography

- OpenAI: API content is not used for training by default unless explicitly opted in. Default abuse-monitoring logs can contain prompts/results for up to 30 days, with stated legal/safety exceptions. `store: false` prevents normal Responses application-state storage; it does NOT remove abuse-monitoring retention. ZDR/MAM require approval. European storage/processing is available only with eligibility, supported model/endpoint configuration and additional non-US requirements; never assume an ordinary API key is EU-only.
- Google paid Gemini Developer API: prompts/results are not used to improve products; the terms describe limited-period safety logging and transient storage/caching in countries where Google/agents operate. The inspected terms do not specify an exact number of days, so none is promised here. The pricing table distinguishes free-tier training use from paid, but EEA/Swiss/UK terms apply paid data-use terms even to certain free use; client apps made available in those locations must use Paid Services. Do not base the POC on a blanket claim that all Google free-tier use has identical privacy everywhere. Standard Developer API use is not an EU-only processing guarantee; a regional enterprise/Vertex option would need separate research and approval if mandatory.
- xAI: no API input/output training without explicit permission; default encrypted request/result retention is 30 days. Team-wide ZDR is self-serve where available and disables stateful/other stored features; availability must be verified. Global endpoint has no guaranteed processing location. Documented US regional endpoint is limited to Grok 4.7/4.6 at +10%; the compared 4.20 model is not supported there. No EU-only option was verified.

Send only the user's phrase, minimal relevant catalog and selected-object/relationship context, plus interpretation instructions/schema. Never send pseudonym, recovery code, invitation secret, session cookie, API credential, full world history, personal laptop metadata or analytics identity. Authentication and invitation checks stay local. Users can type personal information themselves: apply privacy messaging and local minimization/redaction; do not claim short text is inherently anonymous. No remote prompt logging in analytics/error trackers by default. State clearly that a private preview is private from other users but its text is processed by the approved external provider.

## Integration and correctness boundary

Use one server-side `Interpreter` port and a small provider adapter; native `openai` SDK/Zod for baseline, `@google/genai` for the challenger, or OpenAI-compatible SDK configured for xAI. No key is requested before activation is approved. Future credentials belong in the deployment secret manager, never client bundles or the public repository.

Input maximum is configurable and enforced as graphemes on the server. Output has one primary action at most, catalog IDs, typed relationships, and explicit `proposal`, `clarification`, `unsupported` or `no_change` outcome; handle safety refusal and service failure separately. Include an uncertainty signal if useful, but self-reported confidence is not a calibrated probability or a publish authorization. English UI uses controlled reason codes/copy, not raw model prose. An unsupported idea must not become a vaguely similar supported asset.

Server validation independently checks schema, catalog membership, relation compatibility, selected target availability, additive-only scope, permissions and current revision. The model never calls a world-mutation tool. A valid interpretation produces only a private preview; explicit publication remains a separate authorized, idempotent, revision-checked transaction. Treat prompt text as untrusted data; prevent instructions within it from overriding policy/schema. On outages, refusal, malformed/incomplete output, timeout or quota exhaustion, preserve the draft and show an honest retryable/non-retryable state; never guess or publish.

## Latency and limits

Official docs describe economical/speed-oriented models, but provide no directly comparable end-to-end latency benchmark for this exact task. Do not promise sub-second response or claim a provider is empirically fastest. OpenAI documents initial schema-compilation overhead. Measure warm/cold p50 and p95 from the intended hosting region with the real catalog and concurrent requests before setting the acceptance target.

Provider limits vary by model/account/tier. The model page currently lists OpenAI Build tier 5,000 RPM/2M TPM, and xAI's compared model lists 37 requests/second and 10M TPM; these are not guaranteed allocations for this project. Gemini limits apply per project, not per key; inspect the actual project quotas. Rate limits are not a monthly budget.

OpenAI's current help explicitly offers optional enforced hard spend limits, but enforcement is not instantaneous and spending can slightly overshoot; alerts alone never stop requests. Configure provider controls after approval, and independently implement atomic server-side global daily/monthly reservations based on worst-case allowed input/output cost, conservative pricing, in-flight requests and retry allowance. Reconcile actual usage; do not release reservation on ambiguous network failure until safely accounted. Enforce per-identity/session/IP limits, concurrency, bounded token sizes, bounded retry/backoff and a kill switch. Reserve again for every retry; never retry quota/billing errors blindly. Keep budgets, prices, model IDs and limits in configuration, not UI/source literals. Recheck provider pricing before activation and model changes. No automatic top-ups or automatic provider fallback.

## Proposed offline release gate (NOT results)

Prepare at least 20 labeled cases and run each 5 times (100+ outputs per candidate), after explicit authorization for any paid evaluation. This offline/non-public evaluation does not modify the world. Cover Portuguese, English, German and mixed language; negation; cafe for birds versus bird beside cafe; bus beside versus replacing a cafe; missing/ambiguous target; unsupported catalog item; multiple changes; removal/interior requests; prompt injection; protected/unavailable targets; PII; whitespace; Unicode/emoji grapheme boundary and over-limit input. Ground truth must identify valid actions or mandatory clarification/unsupported/no-change outcomes.

Proposed minimum: >=90% overall semantic correctness AND >=4/5 on EVERY ordinary case; safety-critical cases must be 5/5. Safety-critical means no unauthorized mutation, unsupported substitution, negation reversal, credential/identity leakage, destructive action or cross-user preview exposure. Any critical failure blocks release regardless of average score. Separately require schema/error handling tests and server invariants. This small gate is a POC screening threshold, not a reliability guarantee. Add every discovered error as a regression case with 3–5 adjacent variants, rerun the full suite on prompt/catalog/schema/model changes, and record token usage/latency and residual risks. No evaluation has been run.

## Decisions recorded (8 November 2026, 21:16 Europe/Berlin)

1. Provider: OpenAI `gpt-5.4-mini-2026-03-17` (Google remains an evaluated challenger only, not a fallback).
2. Budget: USD 10/month app budget including at most USD 2 for initial evaluation, enforced by the app's atomic reservations; the provider spend limit is secondary.
3. Retention: standard API conditions accepted (no default training, abuse logs up to 30 days, not EU-only processing).
4. Paid calls: not activated. Activation needs separate explicit owner approval.

## Official sources verified

Official public pages, read on the research date. Prices and terms can change; recheck before activating.

- https://developers.openai.com/api/docs/models/gpt-5.4-mini — price, snapshot, reasoning, features and published rate tiers.
- https://developers.openai.com/api/docs/guides/structured-outputs — strict schema, JS/Zod, refusal/incomplete cases, initial schema latency.
- https://developers.openai.com/api/docs/guides/your-data — training, retention, `store`, ZDR and regional eligibility.
- https://ai.google.dev/gemini-api/docs/pricing — exact Gemini standard prices and free/paid distinctions.
- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite — stable model, intended tasks and structured-output support.
- https://ai.google.dev/gemini-api/docs/structured-output — JS/Zod and supported/ignored schema constraints.
- https://ai.google.dev/gemini-api/terms — paid data use, retention wording, geography and EEA restrictions.
- https://docs.x.ai/developers/models/grok-4.20-0309-non-reasoning — concrete model, non-reasoning, schema support, price, limits.
- https://docs.x.ai/developers/pricing — prices, policy-violation fee and regional model restrictions/premium.
- https://docs.x.ai/developers/model-capabilities/text/structured-outputs — schema subset, JS/Zod/OpenAI-compatible integration.
- https://docs.x.ai/developers/faq/security — training, 30-day retention, ZDR and regions.
- https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform — current optional hard spend enforcement, alerts and overshoot caveat (official search excerpt inspected).
