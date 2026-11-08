# mundo-xyz

Shared World: one public isometric world. People explore without an account, preview a sentence privately, and publish on purpose.

This repository is a local implementation of the final plan in `docs/plan/`. The interpreter is the **fixture interpreter — not acceptance-ready**. Paid calls are off. Nothing here creates a Vercel or Supabase project, and nothing is deployed.

## Run locally

The app listens on port **4500** unless `PORT` is set. `APP_ORIGIN` defaults to `http://127.0.0.1:4500`. Set either variable to point the server and the browser origin check somewhere else.

PostgreSQL must already be running. With no `DATABASE_URL`, the server uses the first socket it finds: the Linux directory `/var/run/postgresql`, `/tmp` (the usual Homebrew socket), or a Homebrew data directory for PostgreSQL 16 or 17. If none of those sockets exist, it uses `postgresql://localhost:5432/` and the database name `mundo_dev` (the tests use `mundo_test`). Set `DATABASE_URL` to override that choice.

Create `mundo_dev` and `mundo_test` once. The banner reads “Test mode — fixture interpreter”. Publishing needs a pseudonym and an invite.

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
createdb mundo_dev
createdb mundo_test
npm install
npm test
npm run build
npm start
```

Open http://127.0.0.1:4500. If Postgres is not on port 5432, set `DATABASE_URL`.

### Linux

```bash
npm install
npm test
npm run build
npm start
```

Open the printed local URL. Publishing needs a pseudonym and an invite. Create an author, then:

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
