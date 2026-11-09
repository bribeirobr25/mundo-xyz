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

## Art, palettes, and placed instances

The café and the bus stop are authored SVG layers in `assets/catalog/`. Those files stay in git. They are the reusable source for this local proof of concept. The running page has a canvas and no SVG elements: each layer is painted with a palette id and rasterized once to a WebGL texture. A hop or a sway moves through the poses in between, and it rests when motion is paused, reduced, or the tab is hidden. Polling continues. Prototypes in `docs/prototypes/` are style references only. They are not sliced into sprites. The narrow layout is the base; a wide window places the list beside the scene. Delivery notes are in `docs/plan/architecture-performance.md`.

A palette is a validated set of named colors. An asset definition points at one palette and at layer files. The same bird drawing is painted with three palette ids. A placed café or bus stop is a row in `placed_objects`: an id, a catalog asset id, a catalog version, and a cell. The row does not store a color, a style string, or a copy of the drawing. The server resolves the palette when it reads the world. A client-supplied color is not accepted. Interpret, another spot, and a refreshed conflict preview each return that catalog asset id and palette id. The browser does not send them.

The world response includes `homeId`, the seed row, including when that row is hidden from other visitors. The camera uses that id. The hidden row still omits its asset id and palette id, and the arrival line uses the redacted name.

A next-to placement prefers a free cell in front of its anchor. The new drawing then sits beside that place. A cell behind the anchor would land in the same screen space as the anchor’s roof.

Color skins are not a visitor choice, and there is no second night palette. The world already reports day or night from the clock. A later palette for that phase would be another validated id on the same layers, not a second building and not a style sent by the browser. That change is not in this catalog.

Several bus stops in a local database are separate published rows. The browser journey creates one each time it runs. They are not one object drawn more than once. This scene does not claim it can draw a million instances. It draws the rows the server returns.

## What this is not

- Not product acceptance. Hosting, backups, the legal checkpoint, and an uncoached human pair were not run.
- Not a real model. `interpreterActivation` is `off`. No API key is stored.
- The six files in `docs/prototypes/` are concept references, not sprites.
- `docs/plan/explorations/` is not part of the implementation.

Historical audit drafts are not in the repo. They contain denylist examples the privacy gate rejects. The resolutions are in `docs/plan/findings-resolution-ledger.md`.
