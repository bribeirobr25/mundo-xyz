# PixiJS spike

Installed and locked version: **8.22.0**.

Renderer preference in the scene is `['webgl']`. Canvas and WebGPU are not enabled. Isometric placement is application code in `src/scene/iso.ts`.

The planning source check of tag v8.22.0 found no blur or visibility handling in `Ticker.ts` or `TickerPlugin.ts`. This app stops and starts the ticker itself. A hidden document stops the ticker only. Blur does not. Polling continues on a timer and runs again when the document becomes visible.

Frame-time budgets in the plan are unmeasured proposals. This file does not record them as results.

`scene=deterministic` is honored only when the public config says `local-test`.

A 9 Nov 2026 production-build measurement kept this WebGL preference. The WebGPU chunk is emitted by the library and was not requested. The drawing and the motion were corrected in the catalog and the pose function. That measurement did not justify replacing PixiJS.
