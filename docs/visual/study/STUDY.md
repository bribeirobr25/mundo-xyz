# Study only: Shared World in the 3B language

This folder is a comparison study. It is not production acceptance, not a catalog rollout, and not a change to the running world.

The art-direction contract is [STYLE-DIRECTION-3B.md](../STYLE-DIRECTION-3B.md). 3B is the lighting, material, and volume language. Prototype 00 still governs the composition. The pictures here use the existing neighborhood placements (`src/server/neighborhood.ts`) and the app's café-focus camera. They do not copy the street, object count, or palette of `style-3b-approved.webp`.

`render_study.py` draws the stills locally. It is not the PixiJS renderer. The production catalog, including the round tree at commit `4a3529e`, is unchanged.

- `study-1280x720.png` — the study at the desktop viewport
- `study-390x844.png` — the same study at the narrow viewport
- `pair-prototype-vs-study.png` — prototype 00 beside the study, both 1280×720
- `pair-production-vs-study.png` — the current production build beside the study, both 1280×720
- `pair-production-vs-study-390.png` — the same comparison at 390×844

## What this comparison shows

The 3B language, applied to this world, is one warm key from the upper left. Lit faces are lighter than shaded faces. Each round tree has a cream bloom on its upper-left, and a soft shadow falls toward the lower right. Colors stay matte, with a light grain. The water stays turquoise, with one soft light streak. The grid reads as a small physical model.

The landmarks stay the Shared World set, on the existing plots: the fish building, the colored arches, the red tower, the red bridges, the canal, the yellow-roof and blue-roof houses, the tent, the bus, the benches, the bicycles, and the same 31 round trees. Lawn, path, and plaza colors stay the production colors.

This still differs from `style-3b-approved.webp`. It is a local painted picture, not a clay render, so the edges are cleaner and harder than that reference. The café is the blue fish building, not the reference cottage. The arches and the far bridge are simpler than a sculpted stone model, and the trees keep the thin trunk. The scene is the prototype-00 grid, not the reference street.

This still also differs from prototype 00. The volumes are smoother than that flat illustration, and some drawings are cruder, including the fish, the arches, and the far bridge. Both desktop pictures are 1280×720, but prototype 00 was drawn with its own crop, so that pair is the same size and not the same camera. The study shadows are softer than the illustration's hard ovals.

The production pair uses the app's café-focus camera. The canal lines up with the `4a3529e` screenshot. The study paints each object on its plot footprint. Catalog sprites use their own anchors, so a building's painted mass is not in the same pixels as the production sprite. The landmark has not moved.

Carrying this into the PixiJS catalog later would mean baking each object's face light, bloom, grain, and shadow into one atlas texture, the way the round tree already is. That is an authoring cost. It is not a per-frame light and not a renderer change. Unique bevels and the café's wall drawings would each be a drawn asset. This study does not measure phone frame time, and it is not a feasibility proof or a visual acceptance.
