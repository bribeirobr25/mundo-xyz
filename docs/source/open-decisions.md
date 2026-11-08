# Decisions needed for the implementation plan

The architecture companion was approved, but approval does not silently settle choices its text explicitly leaves open. Reconcile these deliberately in the canonical repository requirements.

1. Input policy: earlier POC proposes 240 characters; later architecture proposes approximately 250. Choose a configurable limit, Unicode counting semantics, normalization and supported input languages. English UI/docs do not imply English-only prompts.
2. Core catalog: exact owned/licensed assets, bounded area, supported typed actions/relationships, one-primary-change semantics, placement collision rules and acceptance examples. Clarify whether the flight-prevention narrative rule is in the minimum demonstrable catalog.
3. Publication identity and access: persistent pseudonymous identity mechanism, recovery, anonymous-to-author draft transfer, initial controlled publishing, permissions and moderator authorization.
4. Interpretation: provider/adapter choice, credentials setup outside source control, semantic evaluation corpus (including negation), unsupported-intent UX, cost/abuse/time limits and failure fallback without silent substitution.
5. Revision/recovery: world-versus-space granularity, proposal expiry, versioned policy/catalog, draft storage/access/retention, idempotency retention and timeout/reload lookup behavior. A committed retry must resolve before stale-version rejection.
6. Privacy/moderation: permitted content, rejection/hide/unhide workflow, target availability, rate-limit policy, retention/deletion obligations, analytics allowlist and last-seen state storage. Append-only technical history must not mean publicly exposing hidden text or keeping personal data indefinitely.
7. Hosting/runtime: one host/database, region, environment isolation, migrations/backup/restore, update transport and measurable update latency. No provisioning or deployment is yet done.
8. Rendering: performance-spike density/effects, device/browser profiles, frame time/memory/load budgets, reduced-motion alternative and WebGL failure behavior. Only a few polished configured effects; no per-frame shared simulation.
9. Confirmation: the older spec includes sandbox confirmation, while the later architecture excludes commerce/payments and the journey treats sandbox as optional. Recommend ordinary publish confirmation with no simulated checkout unless explicitly required; resolve rather than silently delete a requirement.
10. Visual artifacts: the six generated concept images are now mapped and visually verified as 0–5. No seventh image/prototype 6 is evidenced; do not invent it. Confirm any intended additional prototype separately. Concept images are not ready-made production scene assets; catalog rights still need review.
11. Release acceptance: tester access/duration, qualitative A/B success criteria and any measurable technical budgets. Rough effort is not a delivery guarantee. Define rollback and residual-risk sign-off.

Provisional additive-only policy remains the implementation boundary: no destructive replacement, deletion or interiors. Neighbor/consent/protection/replacement rules can stay deferred only while dependent features remain excluded.
