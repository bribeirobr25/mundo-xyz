# Architecture and performance notes

Owner requirement, 9 November 2026, 01:51 Europe/Berlin: mobile first and desktop friendly, including network cost. These notes record the audit of commit `d4f58b4` and the corrections that stayed inside the existing plan. They are not a new host, a new renderer, or a larger catalog.

## Decision

PixiJS 8 with `preference: ['webgl']` stays. The rejected picture was the catalog drawing and a pose that held one of two values for 480 ms. A warm frame’s JavaScript callback was already about 0.1 ms. Replacing the renderer would not have repaired the drawing, and it would have thrown away the pause, reduced-motion, and hidden-tab behavior the plan already requires.

Authored SVG files remain the source. The document measured zero `<svg>` elements and one WebGL canvas. Textures are created once per file and palette id and were not recreated during motion.

The owner later authorized the elements visible in prototype 00, and only those, as administrator scenery. `bus_stop` remains the contribution the fixture can place. Prototypes 01–05 are not loaded. The notes below the first measurement still describe the two-asset build; the prototype 00 measurement follows them.

## What was measured

Environment: a Linux virtual machine, Playwright Chromium, SwiftShader (software Vulkan). A narrow pass used an emulated 1.6 Mbit/s link, 150 ms latency, and 4× CPU. A desktop pass used 1366×768 with no throttle. This is not the owner’s Mac and not a phone. `performance.memory` reported a coarsened 10 MB heap and is not used as a memory result. No battery or energy figure is claimed.

Production build, before the delivery changes, cold narrow load:

- One entry script transferred about 498 KB uncompressed. With the WebGL chunks the page transferred roughly 700 KB of script.
- Repeat navigation transferred those files again. Static responses had no cache header.
- DOMContentLoaded was about 2.8 s on the emulated narrow profile and about 47 ms on the unthrottled desktop.
- `/api/world` was about 2.2 KB and was sent again in full. The page also dispatched a second poll from the scene on the same visibility and focus events the page already listens for.

After, same profiles:

- The entry script transferred about 75 KB compressed (240 KB decoded). The scene script is separate, about 81 KB compressed, and loads with the illustration. WebGPU was not requested.
- Cold narrow transfer for the document and its resources was about 221 KB. DOMContentLoaded was about 0.75 s. The list is in the entry; the canvas waits for the scene script.
- Repeat navigation transferred about 3.9 KB. Hashed scripts reported transfer 0.
- HTML is `no-cache` and gzip. Hashed files under `/assets/` are `public, max-age=31536000, immutable` and gzip when the client accepts it.
- An unchanged world poll returns 304 with the client’s `If-None-Match`. JSON responses are `no-store`. Hidden and paused documents still poll, so a publish is not delayed by the ticker stopping. The scene no longer fires its own poll. A return that raises both visibility and focus shares one request inside a 50 ms window, and a slower overlapping response cannot replace a newer one. A hidden document stops the ticker when the scene finishes booting, not only on a later visibility event. If the scene script fails, the places list stays and the illustration shows its unavailable line. `gzip;q=0` is not treated as acceptance.
- A short frame sample after the motion change: desktop unique-frame p50 16.7 ms and p95 33.4 ms, callback max 1.8 ms; narrow with 4× CPU p50 16.7 ms and max 16.8 ms, callback max 2.1 ms. The desktop p95 does not clear a 10-second 16.7 ms budget. SwiftShader is not that budget’s pass.

## Layout

The picture fills the viewport. A slim bar holds the title, the fixture-mode line, Places, Add your idea, pause, reduced motion, and Account. The place list and the selected place share one surface: a right inspector from 800 px, and a bottom sheet below that, with Expand, Collapse, and Close. Search filters the list. ArrowUp and ArrowDown move through the results when one of them is focused. Back returns from a place to the list. History sits behind “What changed” so the name, the author, and Add your idea stay first. Zoom, Back to café, and a Navigation disclosure stay on the picture. Dragging empty ground pans. The illustration’s loading and unavailable lines stay in the page, because a separate browser pass saw delayed first renders and did not treat that delay as a defect to copy.

## Prototype 00 measurement

Same virtual machine, Playwright Chromium, and SwiftShader. Not a phone, and not a 10-second frame budget. Device pixel ratio on this VM is 1, so the resolution cap of 2 was not exercised. Each sample is 120 frames after 600 ms, viewport 1280×720, chrome removed, fresh `mundo_test`.

The earlier neighborhood, per-cell ground and one texture per drawing, measured 50.1 ms median, 66.7 ms at the 95th percentile, and 83.3 ms maximum. Drawing the grass as one large polygon made that worse: 66.8 / 83.4 / 83.5. An atlas, culling when the camera changes, and keeping the ground as graphics rather than a full-frame texture brought the median to 33.3 ms. Turning antialiasing off improved the tail of that sample (95th percentile 50 ms to 33.4 ms) and did not move the median. Hiding the ground entirely, so only the object sprites and the clear ran, returned 16.7 ms median. The sprites were already at the earlier median. A viewport-filling ground image costs about another frame on this software renderer, so that bake was not kept.

The current scene clears the canvas to grass and draws the paths, the canal, the plaza, and the bridge decks as a few polygons. Object drawings share one atlas. Off-screen objects are skipped when the camera changes. Antialiasing stays off because the flat colors do not need it and the earlier tail improved. On the 42-place seed this measures 33.4 ms median, 50 ms at the 95th percentile, and 50.1 ms maximum. The remaining distance from 16.7 ms is that ground fill, not the atlas.

The files this view requests gzip to 220,021 bytes before the HTML document: entry 76,252, scene 84,976, stylesheet 1,131, and the WebGL chunks the scene loads. Canvas and WebGPU chunks are built and not requested. The fresh world body is 17,303 bytes. Prototypes 01–05 are not loaded.

## PoC limits and when to revisit

The world bounds are 16 by 16 cells. The client loads every placed row on each poll. The scene chunk contains the current frames, not a future catalog.

Revisit, rather than building it now, when any of these becomes true:

- A production response’s gzip script total exceeds 250 KB on a cold load.
- One view draws more than about 30 sprites across more than 8 textures. The object drawings now share one atlas. A further split is the candidate only if that sheet stops fitting.
- Placed rows exceed about 40, or the world JSON gzip exceeds about 32 KB. The seed is now 42 administrator places and the world body is 17,303 bytes. A revision token plus rows for the visible cells is still the candidate, and this pass does not build it.
- Authored frame source in the scene chunk exceeds about 32 KB. The candidate is immutable versioned files fetched for the assets on screen.

Backing-store resolution is capped at 2 in `src/scene/limits.ts`. This VM’s device pixel ratio was 1, so the cap was not exercised. A real phone at ratio 3 is the check that still matters.

## Engineering budgets

These are proposals for the next measurement, not owner-approved guarantees.

- Emulated narrow cold load, 1.6 Mbit/s and 150 ms: document plus resources at most 250 KB transferred, and DOMContentLoaded at most 1.5 s. Observed here: about 221 KB and 0.75 s.
- Repeat visit: hashed scripts transfer 0. Observed here.
- Unchanged world poll: 304. Observed here.
- Visible desktop median frame at most 16.7 ms over 10 s, and a throttled narrow median at most 33 ms. The short SwiftShader sample is not that 10-second result and is not a phone result.
- Heap at most 256 MB over 5 minutes on a real device. Not measured here.

A physical phone still has to confirm decode time, memory, thermal behavior, and a real radio. Localhost plus emulation cannot.

## Dependency audit

`npm audit` reported 1 moderate and 2 critical findings, all in the Vitest development tool (`vitest` 3.2.7, `@vitest/mocker`, `tinypool`). `npm audit --omit=dev` reported none. The browser and the server do not ship Vitest. The suggested fix is `npm audit fix --force`, which would install Vitest 5, a breaking change. That upgrade was not applied. It is a separate decision, not a production exposure of this proof of concept.

## Fidelity that remains

Prototype 00 is the art target. The current drawing is not a match and is not accepted. The café has a sawtooth roof, a striped awning, two tables, and three birds, one of which glances. It does not have the reference terrace’s row of birds, stools, and depth. The tower, frames, houses, pavilion, bus, bridges, boats, and trees are simplified masses in the same palette, not the reference’s balconies, interlocking frames, or open red pavilion. The canal is two cells wide. Grass, paths, and the canal continue past the 16×16 district so the fitted view is not a hard diamond; the path grid is still coarser than the reference. The server still sends 16 rows. `bus_stop` is redrawn quieter and does not sway; published bus stops stay in the database and are not deleted to tidy a screenshot. The comparison still is a fresh seed. Boats drift out of phase. Buildings stay still. Reduced motion is still. No Mobbin screens were inspected. A passing test is not visual acceptance.
