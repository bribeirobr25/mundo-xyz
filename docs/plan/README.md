# Shared World — final planning documents

**Status:** The plan text below is the final reviewed planning version. A local implementation now exists in this repository and is labeled fixture interpreter — not acceptance-ready. Paid-call activation and deployment remain unapproved. Historical audit files are not in this tree because they contain denylist examples.

## Files

| File | Purpose |
| --- | --- |
| `implementation-plan.md` | The canonical implementation plan: product contract, stack judgment, data and publish transaction, interpretation, moderation, privacy gate, slices, milestones, verification, and traceability. |
| `findings-resolution-ledger.md` | How each audit finding (26 original findings plus the re-audit items R-01–R-13) was resolved, with one planned regression test and 3–5 planned adjacent tests per finding. |
| `owner-decision-brief.md` | Owner sources (verified decisions with dates, translations labeled, and one paraphrased preference), engineering recommendations, and the remaining runtime and deployment items. |
| `CHANGE-NOTE.md` | Compact note on the owner-decision updates. |
| `interpreter-recommendation.md` | Research note behind the interpreter choice: model, pricing, retention, budget controls, evaluation. |
| `explorations/ai-integration-exploration.md` | Exploration only: alternative AI connections, future image generation, privacy-preserving catalog demand and parsing options. Not part of the approved implementation plan; no decisions changed. |
| `final-plan-review.md` | Final paragraph recheck, including the two surgical edits verified in these copies. |
| `audits/plan-audit.md` | Not in this repository. The historical audit contains denylist examples. |
| `audits/plan-reaudit.md` | Not in this repository. The historical re-audit contains denylist examples. |

Test ids in these documents were the plan. The repository tests cover the local slices that have been implemented. They are not product acceptance.

## Five delivery milestones

1. **M1 Explore:** a seeded, labeled illustrated place. Select objects in the scene or the list, a few configured animations, a keyboard path, and a no-WebGL fallback.
2. **M2 Try:** a private preview of a typed sentence, labeled as the test interpreter until paid calls are activated, with edit and discard. A second session sees nothing.
3. **M3 Publish:** create a pseudonym with no email, acknowledge the one-time recovery code, redeem an invite, then publish. Shows persistence, attribution, conflict refresh, and idempotency, and runs locally with the interpreter labeled as the test fixture.
4. **M4 Continue:** contextual link, continuation by a second person, return note, and moderation hide.
5. **M5 Deliver:** five independent reviews on one pinned commit, fixes with regression and adjacent tests, final privacy and quality gates, and a pull request for the owner to merge.

## Owner decisions (8 November 2026, Europe/Berlin)

Product choices, not authorization to spend, provision, or deploy:
- **21:11:** identity is a pseudonym without email, with a recovery code. The world is publicly readable, and publishing requires identification and an invitation.
- **21:16:** the interpreter is OpenAI GPT-5.4 Mini under standard API conditions, with a budget of USD 10/month including at most USD 2 for initial evaluation. Paid calls are not activated.
- **21:17:** the owner is the sole initial administrator (invites, hiding, publish blocks). There is a content policy. The hosting direction is Vercel + Supabase in a European region, subject to validation, with nothing created or published.

Still open (runtime and infrastructure only; none of them blocks local slices S0–S8):
- paid-call activation approval, the API key in the host secret manager, and provider-side limits;
- authorization to create resources and publish, region and cost validation, backups, and the hosting privacy and legal checkpoint.
