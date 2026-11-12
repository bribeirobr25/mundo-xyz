# Development tooling — live inventory and minimal recommendation

Checked November 8, 2026 (Europe/Berlin). Connection status is runtime-reported, not a claim of resource permission or successful workload execution. No private projects, datasets, teams or issues were enumerated. No services were created and nothing was deployed.

| Service | Verified status / capability | Recommended role |
| --- | --- | --- |
| GitHub | Runtime connected; repository metadata read succeeded. Code and CI not investigated. | Requested repository, branches, PR and CI; cloud agents for investigation and all repository writes. |
| Vercel | Runtime connected; deployment lookup and team-list descriptors available; no operational API probe. | Proposed single web/API host; confirm runtime/region/cost before provisioning. |
| Cloudflare | Runtime connected; docs/OpenAPI discovery and identity descriptors available; no operational probe. | Alternative host/edge, deferred unless a concrete requirement favors it; do not add a second host. |
| Supabase | Runtime connected; project-list and SQL descriptors available; no DB probe. | Proposed PostgreSQL plus optional identity, contingent on identity choice and server transaction design. |
| Neon | Runtime connected; project-list and SQL/transaction descriptors available; no DB probe. | PostgreSQL alternative; defer if Supabase selected. Never use both for the POC. |
| Sentry | Runtime connected; issue search and identity descriptors available; no project probe. | Optional scrubbed error monitoring before external testing; disable prompt/PII capture. |
| PostHog | Runtime connected; analytics, funnel, schema and documentation capabilities discovered; no user/project/data probe. | Minimal explicit allowlisted product events; disable autocapture/session replay initially. Not a second error-monitoring system. |
| Linear | Runtime connected; issue-list and identity descriptors available; no workspace probe. | Optional; defer to repository acceptance/findings docs and PR checklist initially. No tickets created. |
| Mobbin | Runtime connected; screen/flow/section search descriptors available; no collections or searches read. | Optional design reference only. Do not copy third-party screens/assets into the public repository. |
| Context7 | Runtime connected; library resolution and current-doc query descriptors available; no documentation call needed for this inventory. | Resolve exact library versions and current APIs during planning/build. |
| Playwright connector | Runtime connected; accessibility snapshot, click and screenshot descriptors available; browser not driven. | Supplementary automation only. Its screenshot descriptor expressly requires snapshots for actions; it does not replace the required parent computerUse visual reviewer. |
| Paper | Runtime error; zero tools; local executable unavailable. | Not a usable design dependency. No repair or laptop inspection attempted. |
| Cursor Origin | Runtime connected; no operation probe. | Defer: the requested GitHub repository remains the source of record. |
| Image generation | First-party generation capability listed; no generation requested or executed. | Existing approved concept imagery only; final game assets need explicit catalog and rights review. |

Other connected marketing, sales, finance, crypto, media and email services are not development prerequisites. Do not introduce payments, email notifications, commerce or additional databases merely because connectors exist. A connector being connected is not a production integration, billing approval, or confirmation of account scopes.

## Proposed minimal stack — decision, not provisioning
React + TypeScript UI and accessible DOM, PixiJS 2D scene after performance spike, one TypeScript API, one PostgreSQL database. Prefer Vercel + Supabase as a planning candidate, not a locked choice; Neon is the alternative for PostgreSQL-only needs and Cloudflare is the alternative host. Reuse no unrelated private project resources.

Development tools to install/configure in cloud development only: pinned package manager/lockfile, TypeScript strict checks, ESLint/formatting, unit/contract tests, real PostgreSQL integration tests, Playwright E2E, axe checks, performance instrumentation and secret/privacy scanning. These are recommendations, not verified installed tools or passing checks. Documentation and protocol live with the repository. Add Sentry and minimal PostHog only after privacy/retention decisions; Linear/Mobbin remain optional.
