# Shared World — final plan review (paragraph recheck and surgical edits)

**Status:** Final reviewed planning version. Implementation and product acceptance are pending. The technical review is complete, with the owner decisions listed below still open. This is not product acceptance, not implementation approval, and not evidence that any test passed. Every named test is planned, not written, and not run.
**Date:** Sunday 8 November 2026, Europe/Berlin.

## Verdict

The plan is technically ready for implementation, pending owner choices. Implementation has not been approved. It still needs the owner's explicit go. No spending or hosting is approved.

## R-01 to R-13 (paragraph recheck)

| Item | Result |
| --- | --- |
| R-01 Conflict persistence | Fixed. A conflict refresh is committed privately with a new proposal version and the confirm key cleared. Publish carries `proposalVersion`. The fingerprint is defined. A lost response returns the stored body. |
| R-02 Redaction scope | Fixed. Hiding covers the hidden contribution's own fields and server-derived labels. Dependents are listed for moderation. The quote residual risk is stated. |
| R-03 Hidden polling | Fixed. Hidden polling is best-effort, with an immediate poll on visible, `pageshow`, `online`, and `focus`. Blur pauses nothing. |
| R-04 `publishAccess` and test mode | Fixed. Unset means publish is disabled honestly and the app still boots. `local-test` mode has a permanent banner. Production refuses the test access value and the identity double. |
| R-05 Draft adoption | Fixed. Binding happens at the first authenticated confirm, and the capability loses access at bind. |
| R-06 Commit privacy gate | Fixed. The staged-snapshot and message check runs before commit. The commit-range, branch, and PR title/body check runs before push and in CI. gitleaks is pinned and run with `--redact`. Two allowed identities. `.gitignore` is in place first. No traces or source maps are published. |
| R-07 Milestones | Fixed. M1–M5 cover Explore, Try, Publish, Continue, and Deliver, each with a demo. |
| R-08 Catalog floor and seed label | Fixed. The catalog covers the journey script, the admin seed is labeled, and P-49 is added. |
| R-09 Owner provenance | Fixed by surgical edit S-1 (below). |
| R-10 Five reviews | Fixed. Separate non-author agents, the same commit, a real-input visual reviewer, and a recheck by the original reviewer. |
| R-11 Slice feasibility | Fixed. Cumulative tests are first required at S5. |
| R-12 Decision-gated J-6 test and distinct adjacents | Fixed. |
| R-13 Hosting legal checkpoint | Applicable as written. Before public hosting only. Not a PR gate. |

## Surgical edits applied and verified in these copies

**S-1, owner-source provenance.**
- `owner-decision-brief.md`: the section "Owner sources" replaces the earlier "Verified owner statements" table, which quoted planning instructions instead of the owner. It now has two rows:
  - **Concept images:** user message t72, 8 November 2026, 19:39 Europe/Berlin, given as an English translation explicitly labeled "not verbatim". The source message was in Portuguese. This is a verified owner statement. It is clarified that the six images are prototypes 0–5 and that "0 to 6" does not authorize a seventh image.
  - **Prompt limit:** the earlier preference for about 250 characters ("like early Twitter"), labeled "paraphrased preference, not a verified quotation". Date unknown.
- `t.rtm.owner-source` now requires translation and paraphrase labels.
- `implementation-plan.md` §1 Sources and §5 Input default, ledger H-04 and R-09: wording changed to "paraphrased preference" for 250 and "verified statement (t72)" for the images. No occurrence still calls 250 a verified or stated quote.

**S-2, achievable evaluation threshold.** The impossible "90% of 5" is replaced everywhere it appeared: plan §5, ledger M-08, and brief engineering list. The new text: safety cases 5 of 5 runs for every case. Supported mapping needs at least 20 supported cases × 5 runs (at least 100 trials), at least 90% of all trials correct, and no case under 4 of 5. Labeled an engineering proposal, not a quality promise. The ledger adds the planned check `t.eval.threshold`.

**Status and links.**
- All three documents carry the final status line.
- The plan's companion links point to the local file names.
- Plan §15 now records the review status.

**Verification.** A full-text search of the three documents finds:
- no remaining "90% of 5" or "5/5";
- no "re-audit candidate" title;
- no claim that tests passed or that anything is accepted;
- no private machine paths or internal ids.

The only email address present is the public commit-bot identity named in the privacy gate.

## Owner decisions open at review time (updated by the addenda below)

| Decision | Blocks |
| --- | --- |
| ~~Interpreter provider, key outside the repo, spend cap, retention setting~~ (provider, budget, and retention decided 21:16; key and activation pending) | Real-interpreter evidence. Otherwise the PR is labeled "fixture interpreter — not acceptance-ready". |
| ~~Content policy, moderator~~ (decided 21:17); host direction decided 21:17; region, backups, R-13 checkpoint pending | Public hosting |

None of these blocks S0, S1, S-ART, S2, S3, or the S5 transaction core in `local-test` mode.

## Post-review owner decision update (8 November 2026, 21:11 Europe/Berlin)

After this review, the owner approved two product decisions: a pseudonym without email plus a single-use, rotatable recovery code; and invite-only publishing with public read. Plan section 6a, the brief, the ledger (M-03 and the OD-* rows), and the README were updated consistently.

The added requirements:
- server-side hashed secrets with a pepper from the host secret store;
- `__Host-` session cookie;
- atomic, concurrency-safe recovery and invite redemption;
- a retry that consumes no extra invite use;
- the publish grant checked inside the publish transaction;
- the invite code only in the URL fragment, stripped after reading;
- explore and private preview still signed out.

This is a consistency update, not a new audit cycle. Tests remain planned. One small rule is open but not blocking: whether ordinary authors may mint invites (default: only moderators). See `CHANGE-NOTE.md`.


## Final addendum — interpreter, budget, administrator, policy, host (8 November 2026, 21:16–21:17 Europe/Berlin)

A consistency check of the documents, not an executed test run. Confirmed by read-back:
- **Product choices recorded consistently** in the plan (sources, sections 2, 5, 6a, 7, config keys, S7, S-HOST, RTM P-52–P-56, section 15), the brief, the README, the ledger (OD-LLM, OD-BUD, OD-ADM, OD-POL, OD-HOST), and this file. The previously open "ordinary authors mint invites" rule is closed: administrator-only.
- **Choice vs authorization kept distinct.** `interpreterActivation=off` is the only allowed value until explicit approval. No key is requested. Hosting is a direction, with nothing created or published.
- **Budget is fail-closed** through atomic app reservations at worst-case cost. The USD 2 evaluation allowance is inside USD 10. The provider hard limit is described as secondary and able to overshoot.
- **Minimal provider context** excludes identity, invite, recovery, session, and credential data. Retention terms are stated in the privacy copy.
- **Administrator** bootstrap is server-side only with no allowlist in git. The role is checked on every action and read. Self-promotion is impossible.
- **No analytics** by default. No stale "provider/policy/host not chosen" wording remains in the current documents. The audit copies are marked historical.

Result: the plan is consistent and ready for implementation of S0–S8 in `local-test` mode. Tests remain planned, not run. Not product acceptance.
