# Change note — identity and invite decision (8 November 2026, 21:11 Europe/Berlin)

**What changed:** the owner answered two open product questions. The answers were in Portuguese. These English translations are **not verbatim**:
- “I want a pseudonym without email, with a recovery code. I understand that losing access and the code prevents recovering that identity.”
- “The world is public for reading, but publishing requires identification and an invitation.”

**Status:** owner-approved product decisions. Not implementation authorization, not product acceptance. Every test is still planned and none has been run.

**Where it changed:**
- **Plan:**
  - New section 6a (identity, recovery code, invites, who mints, pseudonym moderation).
  - Publish step 1 now checks the grant.
  - Roles, UI states, and config keys updated (`publishAccess=invite` in production; identity and invite defaults; pepper from the host secret store).
  - S4/S5 slice rows, M3 demo, traceability (P-32 updated; P-50 and P-51 added), §14 M-03 and L-01 rows, and §15 status updated.
- **Brief:** two verified owner-decision rows (translation labeled). The invite-operations recommendation replaces "leave unresolved". The identity and publish-access items moved out of "Unresolved".
- **Ledger:** M-03 is now owner-decided, with regression `t.e2e.j6-no-manual-step` and five invite adjacents. C-02 and R-12 references updated. New OD-ID, OD-REC, and OD-INV rows, each with 1 regression plus 4–5 adjacents (planned).
- **README and final review:** updated consistently.

**Key requirements added:**
- No email, phone, or social data.
- `__Host-` HttpOnly Secure session cookie.
- Session, recovery, and invite secrets stored only as keyed hashes.
- Recovery code: single use, rotatable, shown once. Redemption is atomic and revokes other sessions.
- Invite redemption is atomic under concurrency. A retry does not consume another use.
- Invite refusals are uniform and rate-limited.
- The grant is checked inside the publish transaction.
- An invite code travels only in the URL fragment, and is stripped after reading.
- Explore and private preview stay signed out.

**Superseded at 21:17:** minting invites is administrator-only (the owner).

**Superseded at 21:16–21:17:** see the next section.

## Update — 8 November 2026, 21:16–21:17 Europe/Berlin

- **Interpreter:** OpenAI `gpt-5.4-mini-2026-03-17` with strict structured output, server validation, `store:false`, and minimal context. Standard retention is accepted. Activation is off; no key is requested.
- **Budget:** USD 10/month including USD 2 evaluation. Atomic reservation, reconciliation, and fail-closed behavior.
- **Administrator:** the owner, solely. Generates and revokes invites, hides contributions, and blocks future publishes. Server-side bootstrap. No self-promotion.
- **Content policy:** no personal data, harassment, hate, sexually explicit content, or illegal content.
- **Host direction:** Vercel + Supabase, EU region, subject to validation. Nothing created or published.
- **Added:** `interpreter-recommendation.md` (sanitized research note), RTM P-52–P-56, ledger OD-LLM/BUD/ADM/POL/HOST, and a final review addendum. Audit copies are marked historical.
- **Still open:** paid-call activation and the key; deployment authorization and infrastructure checkpoints.
