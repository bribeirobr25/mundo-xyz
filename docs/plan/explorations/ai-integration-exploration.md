Exploration — not part of the approved implementation plan; no decisions changed; to be revisited later.

# Shared World — AI Integration Exploration

Date: 8 November 2026 (Europe/Berlin).

This document preserves alternatives for future discussion. It does not authorize implementation, API calls, credentials, account connections, partnership applications, resource creation, deployment, or spending. Research describes publicly documented capabilities on the date above; no paid experiment or end-to-end integration was tested. The implementation plan remains canonical. All prices are illustrative USD estimates, not quotes or guarantees.

## 1. Three ways to connect AI

### A. AI provided by Shared World — current plan

Shared World calls the OpenAI API from its own server using GPT-5.4 Mini, with a configurable model identifier and a pinned snapshot where appropriate. Users need no AI subscription or developer account. Shared World pays API usage and controls prompts, schema, model configuration and application-wide limits.

The current approved budget direction is USD 10 per month, including at most USD 2 for initial evaluation—not USD 10 plus USD 2. Paid calls remain OFF. Budget approval is not activation approval. Local development uses the honestly labeled test interpreter until activation is separately authorized.

This has the lowest integration complexity and preserves the in-app experience. Server validation, private previews, attribution and explicit publishing do not depend on a user's external provider account.

### B. Shared World as an MCP app inside ChatGPT

The user interacts with their ChatGPT assistant, which can interpret the request and call Shared World's bounded tools. ChatGPT controls model selection and available features; Shared World cannot assume GPT-5.4 Mini or a fixed token count. This is the inverse of an API integration: ChatGPT calls our service, rather than our service acquiring the user's subscription.

Potential user flow:

1. The user installs/connects the Shared World app where available and authorizes only its required access.
2. They ask ChatGPT to add or continue something in the world.
3. ChatGPT reads permitted catalog/context and submits a proposed structured action to our server.
4. Our server validates it independently and creates an expiring, access-controlled private preview.
5. The user follows a preview link to Shared World, checks the actual proposed change, and confirms publication there.
6. Shared World verifies its own pseudonym session, invitation, current revision and idempotency key before the publish transaction. A tool invocation or assistant statement alone does not publish.

A bare link must not expose another person's preview; authentication/binding and expiry are needed. ChatGPT app authorization does not replace our publishing permissions. Keep contextual retrieval minimal and do not disclose recovery codes or invite secrets.

Complexity: medium. Additional work includes MCP authentication, tool contracts, host permissions, connector distribution/review, contextual links and cross-surface recovery. The user leaves the original webapp to compose, and behavior varies by ChatGPT account/model/workspace. If our tools internally call an API, that API is still billed to the credential owner; MCP itself does not confer free inference.

### C. Sign in with ChatGPT plan usage inside our webapp

The user stays in Shared World and authorizes eligible AI requests against their own ChatGPT plan. Identity login and inference authorization are distinct: an ID token or connected badge alone does not permit model calls. Current documentation describes eligible Plus/Pro plan usage, account-specific models, OAuth consent/scopes and limits. It does not grant access to past ChatGPT conversations or the user's API key.

Potential user flow, only after hosted-app eligibility is established:

1. The user opens Shared World and chooses to connect ChatGPT without replacing their pseudonym/recovery identity.
2. Official OAuth handles provider authentication and explicit consent for identity and eligible inference permissions.
3. Shared World validates state/PKCE, issuer/audience and the granted scopes, then stores credentials securely, separately from public authorship.
4. The user writes a phrase in Shared World. The authorized provider route interprets it using a model actually available to that account.
5. Our server validates the returned proposal, creates the private preview and presents it inside Shared World.
6. Publication remains an explicit, authorized Shared World transaction. Denied consent, expired/revoked tokens and exhausted plan allowance preserve drafts; no silent fallback charges another account.

Paid or remotely hosted apps must request access through the official interest form before offering this integration: https://openai.com/form/sign-in-with-chatgpt-interest/ . A public GitHub repository does not by itself establish hosted-service eligibility. No application has been submitted.

Complexity: highest uncertainty and external dependency. Work includes partnership/eligibility, OAuth lifecycle/security, model/feature variation, provider limits, revocation and recovery, plus review of the applicable privacy/retention conditions. Do not assume ordinary API-key retention or regional terms automatically apply unchanged.

Real examples verified in product documentation:

| Example | What was verified | Deployment distinction |
| --- | --- | --- |
| Zed | ChatGPT sign-in powers Zed's own agent with subscription-backed model use; separate from BYOK. Its 15 May 2026 announcement describes working with OpenAI. | Third-party desktop editor. |
| OpenCode | Offers Sign in with ChatGPT with Plus/Pro instead of an API key; usage counts against the plan. Also documents older Codex methods, which are not automatically equivalent to the new app-specific route. | Third-party installed software; not evidence of a public hosted SaaS entitlement. |
| OpenClaw | Explicit Sign in with ChatGPT Beta authorizes app-specific eligible Responses calls using the user's allowance; distinguishes it from API-key and Codex authentication. | Installed/self-hosted agent software; account/workspace eligibility applies. |
| Codex CLI/IDE extension | OpenAI documents subscription sign-in separately from API-key sign-in. | OpenAI's own local clients, not a third-party hosted-webapp precedent. |
| Paste Perfect | OpenAI's executable integration sample rewrites copied text using authorized ChatGPT plan usage. | Desktop/Electron sample, not a verified established commercial service. |

No comparable third-party public hosted webapp with publicly verified subscription-inference authorization was established in this research. This is a research limit, not proof that no such product or private partnership exists. Do not use cookie scraping, imported consumer sessions, undocumented endpoints or browser automation as a backend.

### Other providers

- **Claude:** current legal documentation prohibits offering Claude.ai login in a third-party app and routing requests through consumer subscription credentials. The narrow exception for hosting an unmodified Claude Code binary under its stated terms is not a general interpreter API entitlement. API keys/cloud credentials remain distinct. Eligible Max/Ultra/Team plans now offer separately claimed API credits in a linked Console organization; that is not consumer-session reuse.
- **Grok:** its account may be shared with the xAI API, but billing is separate. No public general-purpose consumer-subscription delegation for our hosted app was verified.
- **Gemini:** Google's official developer-support response of 19 October 2026 says consumer Google AI subscription passthrough is not supported for third-party apps. API/cloud OAuth or BYOK uses API resources/project permissions and billing, not ordinary Google identity login or consumer chat allowance. Separately claimable developer/cloud benefits may exist.
- **BYOK across providers:** possible where supported, but requires developer setup and secure credential management and is unsuitable as mandatory casual-user onboarding. Never collect keys in chat or put tokens in URLs, analytics, public code, client bundles or localStorage.

**Owner's stated future direction:** explore catalog + OAuth to minimize platform inference cost while keeping the user inside Shared World. **For now:** catalog + Shared World's AI remains the plan. Neither statement expands implementation scope.

## 2. Technical flows and illustrative consumption

### Current bounded-catalog flow

Phrase → typed structured interpretation → independent server validation → private reversible preview → explicit publication saves the action and attributed history only → clients render the referenced catalog item.

The approved catalog supplies shared, reviewed assets. No image generation is needed per contribution; clients derive visual life from persisted structures. Persist references/placement/relations, not copies of an image per viewer. Unsupported ideas receive a clear unsupported/clarification result, never a substituted catalog object. Validate negation, relations, availability, additive-only policy and revision independently of JSON conformance or model confidence.

### Future new-object image-generation flow

Phrase → interpretation into object specification(s) → generate a separate asset per object with platform-controlled isometric angle, palette, scale, dimensions and transparent-background requirements → validate transparency, dimensions, angle, style and content → private preview → explicit publish commits approved action/asset references → durable storage/CDN → clients receive the revision and render the shared asset.

Validation and publication must remain separate. Failed/rejected generations stay private, consume no public world revision and require bounded retries. Content and visual checks are not perfectly decidable: alpha/dimensions can be deterministic; style, angle and semantic content may need perceptual checks or human review. One user's generated asset should be stored once and reused by all viewers, not regenerated for every viewer.

Tradeoffs: more creative freedom and less catalog authoring, but variable latency, inconsistent perspective/palette, moderation risk, rejected-generation charges, storage/CDN lifecycle, asset provenance, orphan cleanup and significantly more failure states. A static image does not supply animation frames, collision geometry or interactive behavior. Multiple objects per contribution would also require a new product policy: the current one-primary-change rule is unchanged. The three-object estimates below are future scenarios, not approved scope.

### Text-only comparison

Illustrative API assumptions: 2,000 input tokens TOTAL, including instructions/schema/catalog/context, and 200 billed output tokens; one interpretation per creation, no cache, extra reasoning or retries. At GPT-5.4 Mini's standard rates of USD 0.75/M input and USD 4.50/M output:

`2,000 × 0.75 / 1,000,000 + 200 × 4.50 / 1,000,000 = USD 0.00240`.

| Route, without new images | Who supplies interpretation | Illustrative platform API cost/creation | Per 1,000 |
| --- | --- | ---: | ---: |
| Shared World API | Our GPT-5.4 Mini integration | USD 0.00240 | USD 2.40 |
| MCP inside ChatGPT | User's ChatGPT assistant; model chosen by host | No separate interpretation API call from us | Not convertible to a verified USD/token figure for the user's plan |
| Authorized ChatGPT OAuth | Eligible model through user's plan allowance | No separate interpretation API call from us | Not convertible to a verified USD/token figure for the user's plan |

The same 2,200-token estimate cannot be assigned as measured usage to MCP/OAuth. Chat history, host instructions, model selection and provider accounting differ. Both still consume user plan allowances and need our hosting/validation infrastructure. If we add a separate model validator, its API cost must be counted. A 250-grapheme phrase is not a 250-token total.

### New-image pricing example

Use **GPT Image 2.5 Flare**, PNG transparent, **1024×1024, medium**, one image per object. This available model has a dated September snapshot; newer GPT Image 2.6 models also exist. Do not transfer one version's output-token estimates to another. Current API documentation supports transparent PNG/WebP via `background: transparent`.

Per image assumptions:

- 500 input text tokens for the object and full style/format/palette instructions, including any internal input overhead within that allowance.
- No input reference images, no image partials, no batch/caching, no model-based visual validation.
- Current official guide calculator, explicitly selecting GPT Image 2.5, estimates approximately **439 output image tokens** for these settings. This is an estimate, not observed usage.
- Text input USD 5/M; image input USD 8/M if references are later introduced; image output USD 30/M.
- Image cost: `500 × 5/M + 439 × 30/M = USD 0.01567`.

The model page still contains older wording saying the GPT Image 2 calculator does not estimate 2.5. The current guide calculator explicitly includes 2.5 and 2.6 selections; this estimate uses its 2.5 formula. Recheck this documentation discrepancy and measure actual `usage` before committing to a budget. No paid measurement was performed.

| Automatic flow | 1 image/creation | Per 1,000 | 3 images/creation | Per 1,000 |
| --- | ---: | ---: | ---: | ---: |
| Our text API + our image API | USD 0.01807 | USD 18.07 | USD 0.04941 | USD 49.41 |
| MCP interpretation + our image API | USD 0.01567 | USD 15.67 | USD 0.04701 | USD 47.01 |
| Eligible OAuth interpretation + our image API | USD 0.01567 | USD 15.67 | USD 0.04701 | USD 47.01 |

**Image-generation boundary:** current Sign in with ChatGPT preview explicitly lists image generation as unsupported. Its text-inference entitlement cannot be assumed to pay for image generation. The hybrid row therefore uses our separately billed image API. A user's own developer API key would be a fourth credential/billing choice, not subscription OAuth.

**MCP boundary:** app file APIs can pass authorized files to our server, but this does not prove an app can trigger native ChatGPT image generation and automatically receive the output. No guaranteed native-image-return workflow was verified. A user-generated/selected/uploaded image is a different interaction. For a predictable automated pipeline, the example budgets our server's image API call. A tool returning an image to ChatGPT is the reverse direction, not evidence that ChatGPT generates it for our server.

Hypothetical retry allowance: **20% additional image generations** because some outputs fail platform visual validation. Interpretation is not repeated. This is an average workload assumption, not a measured failure rate or an unlimited geometric retry policy.

| Flow with that allowance | 1 image/creation | Per 1,000 | 3 images/creation | Per 1,000 |
| --- | ---: | ---: | ---: | ---: |
| Full platform API | USD 0.021204 | USD 21.20 | USD 0.058812 | USD 58.81 |
| MCP/OAuth text + platform image API | USD 0.018804 | USD 18.80 | USD 0.056412 | USD 56.41 |

At USD 10 exclusively available for these calls, those assumptions permit roughly 471 one-object or 170 three-object creations with full platform API, versus 531 or 177 in the hybrid. **If USD 2 is reserved for evaluation within the current USD 10 cap, only USD 8 remains:** approximately 377/136 full-API creations or 425/141 hybrid creations. These are planning arithmetic, not capacity guarantees; current-plan catalog-only operation does not incur these generation costs. Do not infer USD 10 approves activating this future flow.

Storage/CDN, taxes, network transfer, reference-image input, semantic/vision validation, edits, provider premiums and additional failures are excluded. Extra style-reference images have variable input-token counts depending on actual inputs; no fixed count is asserted. The generator bills successful generation attempts even if our own later validator rejects the result. Hard application-wide reservations, concurrency limits, bounded attempts and a kill switch would still be needed. Explicit preview/publication cannot refund inference already performed.

## 3. Demand-driven catalog waitlist

A future demand signal could identify what is missing from the catalog without collecting a history of everything people write.

Proposed approach, requiring later approval:

1. Collect only **unmatched/out-of-catalog** concept requests, not all successful prompts.
2. Normalize locally to a controlled requested concept such as “bird school”; aggregate counts for a defined time bucket. Strip names, contact details, locations and other personal content. Do not publish arbitrary model-generated labels without review.
3. Retain no pseudonym, session identifier, account linkage or IP in this demand dataset. Do not join it to identity, attribution or analytics tables. Do not use secret hashes as a disguised identity column.
4. Prefer no raw free-text retention at all. If a short debugging window becomes necessary, define its exact duration and access controls before enabling it, redact personal data first, and delete automatically. The short window is currently undecided, not permission for indefinite retention.
5. Display a clear notice before collection. Keep the initial demand view **admin-only**, suppress concepts below an approved minimum count and review labels for sensitive content. Counts alone do not ensure anonymity, especially in a tiny invited group.
6. Rank a reviewed backlog by aggregate demand, with safety, feasibility, duplication and art effort as explicit secondary criteria. Separate “requested” from “committed”; a popular request is not automatic scope approval.
7. Use transient endpoint-level abuse controls if necessary, but do not persist their identity/IP data into the demand dataset. Without persistent unique identifiers, counts mean request frequency—not verified unique people—and can be manipulated. Rate-limit and review suspicious spikes without claiming unique-user popularity.

This is new telemetry and conflicts with the current **no analytics by default** direction. It requires owner approval, retention/notice decisions and a privacy review before any collection. This document does not enable monitoring or create a backlog service.

## 4. Keep AI for interpretation versus a non-AI parser

There is a reason to preserve an interpreter even when visuals come entirely from a catalog:

- Users express the same concept with different words, spelling and phrasing.
- Negation matters: “not a bus” must not create a bus.
- Relations matter: a café **for birds** is not necessarily a bird **beside a café**.
- Multilingual and mixed-language input should not require English UI vocabulary.
- Unsupported, ambiguous and multi-change requests need explanation/clarification rather than silent substitutions.

A deterministic parser can be simpler to test, predictable and independent of a model. It works best for an intentionally constrained grammar or structured selection UI, but a keyword matcher alone is not a substitute for intent interpretation.

A future hybrid could parse unambiguous supported forms deterministically first, then use AI only when that parser cannot confidently return an exact supported interpretation. Treat “confidence” as an evaluated routing rule, not a trustworthy self-reported model probability. Explicitly test negation, competing relations and unsupported concepts; fall back to clarification when uncertainty remains. Do not introduce a second parser during current implementation merely because this option is documented.

**Always:** server schema/catalog/relationship/policy validation remains authoritative, irrespective of AI, deterministic parser, external assistant or local model. Proposal creation never grants publishing authority. Keep the interpreter boundary independent of rendering, identity and transaction code.

## 5. Open questions and revisit triggers

- Is hosted Sign in with ChatGPT access granted, with acceptable product terms, scopes, privacy and regional behavior? Revisit only after official eligibility is established, not by borrowing another client's credentials.
- Do user research and usage patterns justify optional AI-account connection? How do contributors without a compatible subscription participate?
- Can an authorized model/schema route meet multilingual semantic and safety gates consistently? Re-evaluate on catalog, prompt, schema or model changes.
- Is a reliable native ChatGPT image-to-MCP-server handoff officially documented and demonstrated for the target host? Until then, keep it an unknown, not a zero-cost assumption.
- When does catalog demand justify expanding art assets versus permitting real-time generation? What moderation, copyright/provenance and asset lifecycle rules would apply?
- Would multiple objects violate the current one-primary-change contribution rule? Require a separate product decision before implementation.
- What percentage of generated assets actually pass style/angle/content validation, and how much human review is required? Run a separately authorized bounded spike before choosing generation scope.
- What notice, normalization vocabulary, retention window, minimum count and admin controls are acceptable for demand logging? Approval is required before collection.
- Would a deterministic-first parser improve speed/reliability enough to justify its extra behavior surface?

If revisited, write a new decision record and update the canonical plan only after owner approval. Preserve draft recovery, accessibility, invitation rules, idempotency, current-revision publication and public-repository privacy checks regardless of the chosen AI route.

## Official sources and verified product documentation

Checked during research on 8 November 2026. These document capabilities, not successful tests in Shared World. Some pages expose no precise publication date; none is inferred.

### OpenAI contracts, APIs and examples

- Sign in with ChatGPT scope/hosted restrictions: https://developers.openai.com/siwc/token-sharing-open-source
- Hosted/paid app interest form: https://openai.com/form/sign-in-with-chatgpt-interest/
- Preview feature restrictions, including unsupported image generation: https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
- OpenAI Paste Perfect desktop sample: https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt
- Codex subscription versus API-key authentication: https://developers.openai.com/codex/auth
- GPT-5.4 Mini model/pricing: https://developers.openai.com/api/docs/models/gpt-5.4-mini
- GPT Image 2.5 Flare model/pricing: https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- Image generation options, limitations and cost calculator: https://developers.openai.com/api/docs/guides/image-generation#calculating-costs
- Newer GPT Image 2.6 Flare: https://developers.openai.com/api/docs/models/gpt-image-2.6-flare
- MCP app file-input/download contracts: https://developers.openai.com/plugins/reference
- ChatGPT app permissions and plan-dependent availability: https://help.openai.com/en/articles/11487775-apps-in-chatgpt

### Real third-party software examples

- Zed announcement, 15 May 2026: https://zed.dev/blog/chatgpt-subscription-in-zed
- OpenCode subscription route: https://opencode.ai/docs/providers/
- OpenClaw authentication comparison: https://docs.openclaw.ai/providers/openai/authentication

### Other provider boundaries

- Claude credential-use policy and narrow Claude Code hosting exception: https://code.claude.com/docs/en/legal-and-compliance
- Claude separately claimed API credits: https://support.claude.com/en/articles/17154008-monthly-api-credits-for-max-ultra-and-team-plans
- Grok/API shared identity but separate billing: https://docs.x.ai/developers/faq/accounts
- Google official developer-support reply, 19 October 2026: https://discuss.ai.google.dev/t/supported-gemini-subscription-access-for-a-third-party-vs-code-extension/189889
