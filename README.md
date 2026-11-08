# mundo-xyz

Shared World: one public isometric world. People explore without an account, preview a sentence privately, and publish on purpose.

This repository is a local implementation of the final plan in `docs/plan/`. The interpreter is the **fixture interpreter — not acceptance-ready**. Paid calls are off. Nothing here creates a Vercel or Supabase project, and nothing is deployed.

## Run locally

PostgreSQL must be reachable. With no `DATABASE_URL`, the server uses the local socket and the `mundo_dev` database.

```bash
npm install
npm test
npm run build
npm start
```

Open the printed local URL. The banner reads “Test mode — fixture interpreter”. Publishing needs a pseudonym and an invite. Create an author, then:

```bash
npm run cli -- grant-admin <author-id>
npm run cli -- mint-invite <author-id>
```

The invite code is printed once.

## What this is not

- Not product acceptance. Hosting, backups, the legal checkpoint, and an uncoached human pair were not run.
- Not a real model. `interpreterActivation` is `off`. No API key is stored.
- The six files in `docs/prototypes/` are concept references, not sprites.
- `docs/plan/explorations/` is not part of the implementation.

Historical audit drafts are not in the repo. They contain denylist examples the privacy gate rejects. The resolutions are in `docs/plan/findings-resolution-ledger.md`.
