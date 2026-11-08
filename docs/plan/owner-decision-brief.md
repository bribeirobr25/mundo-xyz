# Owner decision brief

**Status:** Final reviewed planning version — implementation and product acceptance pending; technical review complete with specified owner decisions open. Every named test is planned, not written, and not run. No commit, push, or provisioning. Auditors do not close items here. Dates not available to this thread are marked unknown and are not invented. Product choices are now made. What remains open is paid-call activation and deployment (runtime and infrastructure), each needing separate owner approval.

## Owner sources

| Topic | Source | Date | Status | How the plan uses it |
| --- | --- | --- | --- | --- |
| Concept images | User message t72, originally in Portuguese. English translation (not verbatim): “The GitHub project is this one: https://github.com/bribeirobr25/mundo-xyz — you can already add the files we have generated so far to it, as well as the 6 images we made and called prototypes 0 to 6.” | 8 November 2026, 19:39 Europe/Berlin | **Verified owner statement** (translation labeled). The count was clarified separately: the six images are prototypes 0–5. “0 to 6” does not authorize a seventh image. | The six files may be published after the privacy gate. No seventh image. They are concept references, not sprites. |
| Identity | Owner answer, originally in Portuguese. English translation (not verbatim): “I want a pseudonym without email, with a recovery code. I understand that losing access and the code prevents recovering that identity.” | 8 November 2026, 21:11 Europe/Berlin | **Verified owner product decision** (translation labeled). Not implementation authorization. | First-party pseudonymous author, no email, single-use rotatable recovery code, no manual recovery (plan section 6a). |
| Publish access | Owner answer, originally in Portuguese. English translation (not verbatim): “The world is public for reading, but publishing requires identification and an invitation.” | 8 November 2026, 21:11 Europe/Berlin | **Verified owner product decision** (translation labeled). Not implementation authorization. | Public read. Explore and private preview signed out. Publishing needs a session plus an invite grant; `publishAccess=invite` in production. |
| Interpreter and budget | Owner choice, summarized (not a quotation): OpenAI GPT-5.4 Mini under standard API conditions; budget set before activation at USD 10 per month **including** at most USD 2 for initial evaluation. Explicit instruction, translated (not verbatim): “Do not activate paid calls yet.” | 8 November 2026, 21:16 Europe/Berlin | **Verified owner product choice.** Not authorization for paid calls. | Model `gpt-5.4-mini-2026-03-17` in config. `interpreterActivation=off`. Atomic app budget reservation. Standard retention accepted: no default training, abuse logs up to 30 days, not EU-only processing. No key requested. |
| Administrator and content policy | Owner choice, summarized (not a quotation): the owner is the sole initial administrator, who generates and revokes invitations, hides contributions, and blocks future publishes for abuse. The content policy prohibits personal data, harassment, hate, sexually explicit content, and illegal content. | 8 November 2026, 21:17 Europe/Berlin | **Verified owner product choice.** | Plan sections 6a and 7. Administrator bootstrap is server-side only, chosen during implementation, with no personal allowlist or secret in git. |
| Hosting direction | Owner choice, summarized (not a quotation): Vercel + Supabase in a European region, subject to availability and cost validation. Explicit instruction, translated (not verbatim): “Do not create resources or publish yet.” | 8 November 2026, 21:17 Europe/Berlin | **Verified owner direction.** Not authorization to provision or deploy. | Plan section 2 Host. Region, cost, backups, privacy, and deletion are S-HOST checkpoints. |
| Prompt limit | An earlier owner message (t65) preferred about 250 characters, “like early Twitter”. Known only through a conversation summary. | Unknown | **Paraphrased preference, not a verified quotation.** The exact original wording is unavailable. | Configurable default `promptMaxGraphemes` 250, plus separate caps of 1000 UTF-8 bytes and 8 combining marks per grapheme. The POC figure 240 is not used. The owner may confirm or change it. |

`t.rtm.owner-source` checks that each row has a source and a date (or “Unknown”), that a translation is labeled as a translation, and that a paraphrase row is labeled “paraphrased preference, not a verified quotation”.

## Engineering recommendations (not owner quotes)

These came from the planning correction and the re-audit. They are not labeled as the owner’s words. The owner may override them.

| Topic | Recommendation |
| --- | --- |
| Visibility | A hidden document stops the ticker only. Hidden polling is best-effort because browsers throttle timers. On becoming visible, `pageshow`, `online`, and `focus`, poll once immediately. Blur stops neither the ticker nor polling. |
| Images during planning | Do not generate catalog images in the planning stage. Implementation may draw SVG or code art. The required catalog is the journey script: a labeled administrator seed (café for birds in the script) and the bus-stop continuation, plus chips that actually ship. |
| Invite defaults | Single use and 14-day expiry, configurable. Minting is administrator-only (owner decision above). |
| Schema | Do not add interior or commerce columns. |
| Restore | Local synthetic dump/restore is PR-ready. Hosted backup and restore wait until a host is authorized. |

## What is still open — runtime and infrastructure only

All product choices needed for the POC are now made. What remains are activation and deployment steps, each requiring a separate explicit owner approval. None of them blocks coding or local testing of S0–S8.

### 1. Paid-call activation (runtime)
- Explicit owner approval to switch `interpreterActivation` from `off`.
- The OpenAI API key created and stored only in the host secret manager (never in chat, the repository, or the client).
- Provider-side project spend limit and alerts configured. These are a secondary control and can overshoot slightly.
- Price and model availability rechecked on the activation date.

Until then, reports say “fixture interpreter — not acceptance-ready”, and real-provider tests are “not run”.

### 2. Deployment (infrastructure)
- Separate authorization to create Vercel and Supabase resources and to publish.
- Confirmation of the European region and cost.
- Backup and retention settings.
- The hosting privacy and legal checkpoint: privacy notice, provider identification, and deletion path, as determined for that deployment. No statute is presumed.

### 3. Operational, not a product decision
- The administrator bootstrap mechanism, chosen during implementation within the constraints of plan section 6a.

## Engineering config (reversible)

- Proposal TTL 24 h. Idempotency retention 7 days. Expired private-text purge 7 days.
- Visible poll 2 s. Hidden poll is not promised at 2 s.
- Interpret caps: 10 / 10 min / capability, 30 / 10 min / network key, 500 / hour global.
- Publish cap: 20 / author / day.
- CI viewports: Chromium 1366×768 and emulated mobile WebKit; 4× CPU throttle on the mobile frame sample.
- After activation is approved, within the USD 2 evaluation allowance: safety cases pass 5 of 5 runs for every case. Supported mapping: at least 20 supported cases × 5 runs (at least 100 trials), at least 90% of all trials correct, and no case under 4 of 5. An engineering proposal, not a quality promise.

## Still required, independent of the open items

The fixture is not the product interpreter. Paid calls stay off until explicitly approved. Administrator actions and reads check the role on every request, and nobody can self-promote. Previews do not write public rows. Clients do not choose author ids. Session, recovery, and invite secrets are stored only as keyed hashes. No email is collected. The browser has no database key. One proposal produces one contribution. The conflict path stores the refreshed proposal version. Only the two allowlisted commit identities may commit. There is no automatic merge. No analytics are enabled by default. Ordinary publish confirmation is the proposed screen. A sandbox checkout is not scheduled and is not described as forbidden by the owner. This brief does not say the plan is accepted or that the product is implemented.
