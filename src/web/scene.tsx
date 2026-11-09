import { useEffect, useRef, type ReactElement } from "react";
import { Application, Container, Graphics, Polygon, Sprite, Texture } from "pixi.js";
import catalogJson from "../../assets/catalog/catalog.json" with { type: "json" };
import type { Catalog, CatalogAsset, Palette } from "../domain/catalogModel.js";
import { acceptedPalette, paintSvg } from "../domain/catalogModel.js";
import { FRAME_SOURCES } from "../scene/frames.js";
import { FOCUS_FRACTION, TILE_H, TILE_W, buildingHit, cellToScreen, footprintQuad } from "../scene/iso.js";
import { partPose } from "../scene/pose.js";
import { shouldTick } from "../scene/tickerPolicy.js";

const catalog = catalogJson as unknown as Catalog;

export type SceneObject = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  assetId: string | null;
  paletteId: string | null;
  hidden?: boolean;
  name: string;
};

type MovingPart = {
  sprite: Sprite;
  baseX: number;
  baseY: number;
  motion: "none" | "hop" | "sway";
  steps: number;
  phase: number;
  amplitude: number;
};

export function Scene(props: {
  objects: SceneObject[];
  preview: { x: number; y: number; w: number; h: number; assetId: string; paletteId: string } | null;
  selectedId: string | null;
  homeId: string | null;
  zoom: number;
  pan: { x: number; y: number };
  paused: boolean;
  reducedMotion: boolean;
  deterministic: boolean;
  onSelect: (id: string) => void;
}): ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const state = useRef(props);
  state.current = props;
  const applyRest = useRef<(() => void) | null>(null);
  const frameRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const created = appRef.current;
    if (!created) return;
    const run = shouldTick({
      hidden: document.visibilityState === "hidden",
      paused: props.paused,
      reducedMotion: props.reducedMotion || props.deterministic,
    });
    if (run) created.start();
    else {
      applyRest.current?.();
      created.stop();
    }
  }, [props.paused, props.reducedMotion, props.deterministic]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let app: Application | null = null;
    let stopped = false;
    let revoke = () => {};
    let observer: ResizeObserver | null = null;
    const boot = async () => {
      const ground = catalog.palettes.find((palette) => palette.id === catalog.ground.paletteId);
      if (!ground) throw new Error("missing atlas frame");
      const tone = (role: string): string => {
        const color = ground.roles[role];
        if (!color) throw new Error("missing atlas frame");
        return color;
      };
      el.style.setProperty("--plaza-field", tone("field"));
      const created = new Application();
      await created.init({
        preference: ["webgl"],
        background: Number.parseInt(tone("field").slice(1), 16),
        resizeTo: el,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(2, window.devicePixelRatio || 1),
      });
      if (stopped) {
        created.destroy();
        return;
      }
      app = created;
      appRef.current = created;
      created.canvas.setAttribute("aria-hidden", "true");
      created.canvas.addEventListener("webglcontextlost", (event) => {
        event.preventDefault();
        el.dispatchEvent(new Event("scene-unavailable", { bubbles: true }));
      });
      el.appendChild(created.canvas);
      const camera = new Container();
      camera.eventMode = "static";
      created.stage.addChild(camera);
      const groundLayer = new Graphics();
      const world = new Container();
      camera.addChild(groundLayer, world);
      const textures = new Map<string, Texture>();
      const urls: string[] = [];
      const textureFor = async (file: string, palette: Palette) => {
        const key = `${file}:${palette.id}`;
        const cached = textures.get(key);
        if (cached) return cached;
        const source = FRAME_SOURCES[file];
        if (!source) throw new Error("missing atlas frame");
        const painted = paintSvg(source, palette.roles);
        const url = URL.createObjectURL(new Blob([painted], { type: "image/svg+xml" }));
        urls.push(url);
        const image = new Image();
        image.src = url;
        await image.decode();
        const texture = Texture.from(image);
        textures.set(key, texture);
        return texture;
      };
      const assets = new Map(catalog.assets.map((asset) => [asset.id, asset]));
      const paletteById = new Map(catalog.palettes.map((palette) => [palette.id, palette]));
      let signature = "";
      let generation = 0;
      let moving: MovingPart[] = [];

      const paletteFor = (asset: CatalogAsset, paletteId: string | null): Palette | null => {
        if (!paletteId) return null;
        return acceptedPalette(asset, paletteId, catalog.palettes);
      };

      const rebuild = async () => {
        const current = state.current;
        const preview = current.preview;
        const next = current.objects.map((object) =>
          [object.id, object.x, object.y, object.w, object.h, object.assetId, object.paletteId, object.hidden, object.id === current.selectedId].join(":"),
        ).join("|");
        const previewKey = preview ? `${preview.x},${preview.y},${preview.assetId}` : "";
        const key = `${next}~${previewKey}`;
        if (key === signature) return;
        const gen = ++generation;
        signature = key;
        moving = [];
        const specs = [
          ...current.objects.map((object) => ({ object, ghost: false })),
          ...(preview ? [{ object: { id: "preview", name: "", ...preview, hidden: false }, ghost: true }] : []),
        ].sort((a, b) => {
          const front = (item: SceneObject) => item.x + item.w + item.y + item.h;
          const depth = (item: SceneObject) => assets.get(item.assetId ?? "")?.depthKey ?? 0;
          return front(a.object) - front(b.object) || depth(a.object) - depth(b.object);
        });
        const drawn = [];
        for (const spec of specs) {
          drawn.push(await drawPlaced(spec.object, !spec.ghost && spec.object.id === current.selectedId, spec.ghost));
        }
        if (gen !== generation) return;
        world.removeChildren();
        for (const container of drawn) world.addChild(container);
        drawGround(current.objects, preview);
      };

      async function drawPlaced(object: SceneObject, selected: boolean, ghost: boolean): Promise<Container> {
        const container = new Container();
        const center = cellToScreen(object.x + object.w / 2, object.y + object.h / 2);
        container.position.set(center.sx, center.sy);
        const asset = object.assetId ? assets.get(object.assetId) : undefined;
        const palette = asset && object.paletteId ? paletteFor(asset, object.paletteId) : null;
        const shell = asset?.layers[0];
        const localQuad = footprintQuad(object.x, object.y, object.w, object.h).map((point) => ({
          sx: point.sx - center.sx,
          sy: point.sy - center.sy,
        }));
        if (selected) {
          const outline = new Graphics();
          outline.poly(localQuad.flatMap((point) => [point.sx, point.sy])).stroke({ width: 3, color: tone("select") });
          outline.eventMode = "none";
          container.addChild(outline);
        }
        let rise = TILE_H;
        if (asset && palette && shell && !object.hidden) {
          const shellTexture = await textureFor(shell.file, palette);
          const sprite = new Sprite(shellTexture);
          const width = (object.w + object.h) * (TILE_W / 2) * (shell.fit ?? 1);
          sprite.width = width;
          sprite.height = width * (shellTexture.height / shellTexture.width);
          sprite.anchor.set(shell.anchor?.[0] ?? 0.5, shell.anchor?.[1] ?? 0.75);
          sprite.eventMode = "none";
          container.addChild(sprite);
          rise = sprite.height * sprite.anchor.y;
          for (const layer of asset.layers.slice(1)) {
            const layerPalette = paletteById.get(layer.paletteId ?? asset.paletteId);
            if (!layerPalette || !layer.at) continue;
            const texture = await textureFor(layer.file, layerPalette);
            const part = new Sprite(texture);
            part.width = sprite.width * (layer.fit ?? 0.2);
            part.height = part.width * (texture.height / texture.width);
            part.anchor.set(layer.anchor?.[0] ?? 0.5, layer.anchor?.[1] ?? 1);
            part.eventMode = "none";
            const baseX = (layer.at[0] - sprite.anchor.x) * sprite.width;
            const baseY = (layer.at[1] - sprite.anchor.y) * sprite.height;
            part.position.set(baseX, baseY);
            container.addChild(part);
            if (layer.motion !== "none") {
              moving.push({
                sprite: part,
                baseX,
                baseY,
                motion: layer.motion,
                steps: layer.steps ?? 2,
                phase: layer.phase ?? 0,
                amplitude: layer.amplitude ?? 0,
              });
            }
          }
        } else {
          const marker = new Graphics();
          const hw = (object.w + object.h) * (TILE_W / 4);
          const hh = (object.w + object.h) * (TILE_H / 4);
          marker.poly([0, -hh, hw, 0, 0, hh, -hw, 0]).fill(tone("marker"));
          marker.eventMode = "none";
          container.addChild(marker);
          rise = hh;
        }
        const hit = buildingHit(localQuad, rise);
        if (ghost) container.alpha = 0.72;
        if (!ghost) {
          container.eventMode = "static";
          container.interactiveChildren = false;
          container.cursor = "pointer";
          container.hitArea = new Polygon(hit.flatMap((point) => [point.sx, point.sy]));
          container.on("pointerdown", (event) => {
            event.stopPropagation();
            state.current.onSelect(object.id);
          });
        }
        return container;
      }

      function drawGround(
        objects: SceneObject[],
        preview: { x: number; y: number; w: number; h: number } | null,
      ): void {
        groundLayer.clear();
        const spots = preview ? [...objects, preview] : objects;
        if (!spots.length) return;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        for (const spot of spots) {
          minX = Math.min(minX, spot.x);
          minY = Math.min(minY, spot.y);
          maxX = Math.max(maxX, spot.x + spot.w);
          maxY = Math.max(maxY, spot.y + spot.h);
        }
        const home = objects.find((object) => object.id === state.current.homeId) ?? objects[0];
        for (let y = minY - 2; y < maxY + 2; y++) {
          for (let x = minX - 2; x < maxX + 2; x++) {
            const quad = footprintQuad(x, y, 1, 1);
            const edge = quad.map((point) => ({ sx: point.sx, sy: point.sy + 4 }));
            const onPath = Boolean(home && (x === home.x || y === home.y));
            const top = onPath ? tone("path") : (x + y) % 2 === 0 ? tone("grass") : tone("grassAlt");
            groundLayer.poly(edge.flatMap((point) => [point.sx, point.sy])).fill(tone("grassAlt"));
            groundLayer.poly(quad.flatMap((point) => [point.sx, point.sy])).fill(top);
          }
        }
        for (const spot of spots) {
          for (let y = spot.y; y < spot.y + spot.h; y++) {
            for (let x = spot.x; x < spot.x + spot.w; x++) {
              const quad = footprintQuad(x, y, 1, 1);
              groundLayer.poly(quad.flatMap((point) => [point.sx, point.sy])).fill(tone("pad"));
            }
          }
        }
      }

      const poseAll = (reduced: boolean) => {
        const step = reduced ? 0 : Math.floor(created.ticker.lastTime / catalog.motionStepMs);
        for (const part of moving) {
          const pose = partPose(part.motion, step, part.steps, part.phase, part.amplitude, reduced);
          part.sprite.position.set(part.baseX + pose.x, part.baseY + pose.y);
          part.sprite.rotation = pose.rotation;
        }
      };
      applyRest.current = () => poseAll(true);

      const frameCamera = () => {
        const current = state.current;
        const viewW = el.clientWidth || 1;
        const viewH = el.clientHeight || 1;
        const home = current.objects.find((object) => object.id === current.homeId) ?? current.objects[0];
        const focus = home ?? { x: 0, y: 0, w: 2, h: 2, assetId: null };
        const asset = focus.assetId ? assets.get(focus.assetId) : undefined;
        const fit = asset?.layers[0]?.fit ?? 1;
        const worldW = (focus.w + focus.h) * (TILE_W / 2) * fit;
        const fitted = (Math.min(viewW, viewH) * FOCUS_FRACTION) / Math.max(worldW, 1);
        const zoom = Math.min(1.8, Math.max(0.45, fitted)) * current.zoom;
        const center = cellToScreen(focus.x + focus.w / 2, focus.y + focus.h / 2);
        camera.scale.set(zoom);
        camera.position.set(viewW / 2 - center.sx * zoom + current.pan.x, viewH / 2 - center.sy * zoom + current.pan.y);
      };
      const paint = () => {
        frameCamera();
        if (!created.ticker.started) created.render();
      };
      if (!stopped) {
        frameRef.current = paint;
        observer = new ResizeObserver(() => paint());
        observer.observe(el);
      }

      const tick = () => {
        const current = state.current;
        const hidden = document.visibilityState === "hidden";
        const reduced = current.reducedMotion || current.deterministic;
        const run = shouldTick({ hidden, paused: current.paused, reducedMotion: reduced });
        if (!run) {
          poseAll(true);
          if (created.ticker.started) created.stop();
          return;
        }
        if (!created.ticker.started) created.start();
        void rebuild();
        poseAll(false);
        frameCamera();
      };
      created.ticker.add(tick);
      await rebuild();
      frameCamera();
      poseAll(state.current.reducedMotion || state.current.deterministic);
      const onVisibility = () => {
        const current = state.current;
        if (document.visibilityState === "visible" && shouldTick({
          hidden: false,
          paused: current.paused,
          reducedMotion: current.reducedMotion || current.deterministic,
        })) created.start();
        else {
          poseAll(true);
          created.stop();
        }
        window.dispatchEvent(new Event("shared-world-visible"));
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("pageshow", onVisibility);
      window.addEventListener("online", onVisibility);
      window.addEventListener("focus", onVisibility);
      if (state.current.deterministic || !shouldTick({ hidden: false, paused: state.current.paused, reducedMotion: state.current.reducedMotion })) {
        created.stop();
      }
      if (document.documentElement.dataset.localTest === "true") {
        (window as unknown as { __sharedWorldTest?: unknown }).__sharedWorldTest = {
          loseContext: () => {
            const gl = created.canvas.getContext("webgl2") ?? created.canvas.getContext("webgl");
            gl?.getExtension("WEBGL_lose_context")?.loseContext();
          },
          tickerStarted: () => created.ticker.started,
          homeOnScreen: () => {
            const current = state.current;
            const home = current.objects.find((object) => object.id === current.homeId) ?? current.objects[0];
            if (!home) return false;
            const center = cellToScreen(home.x + home.w / 2, home.y + home.h / 2);
            const point = camera.toGlobal({ x: center.sx, y: center.sy });
            const width = created.canvas.clientWidth || 1;
            const height = created.canvas.clientHeight || 1;
            return point.x > width * 0.25 && point.x < width * 0.75 && point.y > height * 0.2 && point.y < height * 0.8;
          },
        };
      }
      revoke = () => {
        for (const url of urls) URL.revokeObjectURL(url);
      };
    };
    void boot().catch(() => {
      el.dataset.scene = "unavailable";
      el.dispatchEvent(new Event("scene-unavailable", { bubbles: true }));
    });
    return () => {
      stopped = true;
      appRef.current = null;
      applyRest.current = null;
      frameRef.current = null;
      observer?.disconnect();
      revoke();
      app?.destroy(true);
    };
  }, []);

  useEffect(() => {
    frameRef.current?.();
  }, [props.zoom, props.pan.x, props.pan.y, props.homeId, props.objects, props.preview, props.paused, props.reducedMotion]);

  return <div ref={host} className="stage" data-scene-host="true" aria-hidden="true" />;
}
