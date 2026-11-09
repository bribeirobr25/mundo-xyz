import { useEffect, useRef, type ReactElement } from "react";
import { Application, Container, Graphics, Polygon, Rectangle, Sprite, Texture } from "pixi.js";
import catalogJson from "../../assets/catalog/catalog.json" with { type: "json" };
import type { Catalog, CatalogAsset, Palette } from "../domain/catalogModel.js";
import { acceptedPalette, paintSvg } from "../domain/catalogModel.js";
import { BRIDGES, DISTRICT_H, DISTRICT_W, GRASS_PLOTS, PLAZA, WATER, type GroundKind } from "../domain/district.js";
import { FRAME_SOURCES } from "../scene/frames.js";
import { TILE_H, TILE_W, buildingHit, cellToScreen, footprintQuad } from "../scene/iso.js";
import { SCENE_MAX_RESOLUTION } from "../scene/limits.js";
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
  motion: "none" | "hop" | "sway" | "glance" | "drift";
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
  coverRight: number;
  district: { w: number; h: number; rows: string[] } | null;
  onSelect: (id: string) => void;
  onPan: (dx: number, dy: number) => void;
  onReady?: () => void;
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
    let onVisibility: (() => void) | null = null;
    const boot = async () => {
      const ground = catalog.palettes.find((palette) => palette.id === catalog.ground.paletteId);
      if (!ground) throw new Error("missing atlas frame");
      const tone = (role: string): string => {
        const color = ground.roles[role];
        if (!color) throw new Error("missing atlas frame");
        return color;
      };
      el.style.setProperty("--plaza-field", tone("path"));
      const created = new Application();
      await created.init({
        preference: ["webgl"],
        background: Number.parseInt(tone("path").slice(1), 16),
        resizeTo: el,
        antialias: false,
        autoDensity: true,
        resolution: Math.min(SCENE_MAX_RESOLUTION, window.devicePixelRatio || 1),
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
      camera.eventMode = "passive";
      created.stage.eventMode = "static";
      created.stage.hitArea = created.screen;
      let drag: { x: number; y: number } | null = null;
      const onDown = (event: { global: { x: number; y: number } }) => {
        drag = { x: event.global.x, y: event.global.y };
      };
      const onMove = (event: { global: { x: number; y: number } }) => {
        if (!drag) return;
        const dx = event.global.x - drag.x;
        const dy = event.global.y - drag.y;
        if (Math.hypot(dx, dy) < 4) return;
        drag = { x: event.global.x, y: event.global.y };
        state.current.onPan(dx, dy);
      };
      const onUp = () => {
        drag = null;
      };
      created.stage.on("pointerdown", onDown);
      created.stage.on("pointermove", onMove);
      created.stage.on("pointerup", onUp);
      created.stage.on("pointerupoutside", onUp);
      created.stage.addChild(camera);
      const groundLayer = new Graphics();
      const world = new Container();
      camera.addChild(groundLayer, world);
      const textures = new Map<string, Texture>();
      const urls: string[] = [];
      const textureFor = (file: string, palette: Palette): Texture => {
        const found = textures.get(`${file}:${palette.id}`);
        if (!found) throw new Error("missing atlas frame");
        return found;
      };
      const packAtlas = async (pairs: { key: string; file: string; palette: Palette }[]): Promise<void> => {
        if (!pairs.length) return;
        const images: { key: string; image: HTMLImageElement }[] = [];
        for (const pair of pairs) {
          const source = FRAME_SOURCES[pair.file];
          if (!source) throw new Error("missing atlas frame");
          const painted = paintSvg(source, pair.palette.roles);
          const url = URL.createObjectURL(new Blob([painted], { type: "image/svg+xml" }));
          urls.push(url);
          const image = new Image();
          image.src = url;
          await image.decode();
          images.push({ key: pair.key, image });
        }
        const pad = 2;
        const maxW = 2048;
        let cursorX = pad;
        let cursorY = pad;
        let rowH = 0;
        const frames: { key: string; x: number; y: number; w: number; h: number }[] = [];
        for (const item of images) {
          const w = item.image.naturalWidth || item.image.width;
          const h = item.image.naturalHeight || item.image.height;
          if (w < 1 || h < 1) throw new Error("missing atlas frame");
          if (cursorX + w + pad > maxW) {
            cursorX = pad;
            cursorY += rowH + pad;
            rowH = 0;
          }
          frames.push({ key: item.key, x: cursorX, y: cursorY, w, h });
          cursorX += w + pad;
          rowH = Math.max(rowH, h);
        }
        const sheet = document.createElement("canvas");
        sheet.width = maxW;
        sheet.height = Math.max(1, cursorY + rowH + pad);
        const ctx = sheet.getContext("2d");
        if (!ctx) throw new Error("missing atlas frame");
        for (const frame of frames) {
          const image = images.find((item) => item.key === frame.key)?.image;
          if (image) ctx.drawImage(image, frame.x, frame.y, frame.w, frame.h);
        }
        const base = Texture.from(sheet);
        for (const frame of frames) {
          textures.set(frame.key, new Texture({
            source: base.source,
            frame: new Rectangle(frame.x, frame.y, frame.w, frame.h),
          }));
        }
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
        const wanted: { key: string; file: string; palette: Palette }[] = [];
        const seen = new Set<string>();
        for (const spec of specs) {
          const asset = spec.object.assetId ? assets.get(spec.object.assetId) : undefined;
          const palette = asset && spec.object.paletteId ? paletteFor(asset, spec.object.paletteId) : null;
          if (!asset || !palette || spec.object.hidden) continue;
          for (const layer of asset.layers) {
            const layerPalette = paletteById.get(layer.paletteId ?? asset.paletteId);
            if (!layerPalette) continue;
            const key = `${layer.file}:${layerPalette.id}`;
            if (textures.has(key) || seen.has(key)) continue;
            seen.add(key);
            wanted.push({ key, file: layer.file, palette: layerPalette });
          }
        }
        await packAtlas(wanted);
        if (gen !== generation) return;
        const drawn = [];
        for (const spec of specs) {
          drawn.push(await drawPlaced(spec.object, !spec.ghost && spec.object.id === current.selectedId, spec.ghost));
        }
        if (gen !== generation) return;
        world.removeChildren();
        for (const container of drawn) world.addChild(container);
        drawGround();
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
                phase: (layer.phase ?? 0) + [...object.id].reduce((sum, char) => sum + char.charCodeAt(0), 0),
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
            const local = camera.toLocal(event.global);
            const gridX = local.x / (TILE_W / 2);
            const gridY = local.y / (TILE_H / 2);
            const cellX = (gridY + gridX) / 2;
            const cellY = (gridY - gridX) / 2;
            const occupant = state.current.objects
              .filter((item) => !item.hidden && cellX >= item.x && cellX < item.x + item.w && cellY >= item.y && cellY < item.y + item.h)
              .sort((a, b) => b.x + b.y + b.w + b.h - (a.x + a.y + a.w + a.h))[0];
            state.current.onSelect((occupant ?? object).id);
          });
        }
        return container;
      }

      const kindColor = (kind: GroundKind): number => {
        if (kind === "water") return Number.parseInt(tone("water").slice(1), 16);
        if (kind === "road" || kind === "bridge") return Number.parseInt(tone("path").slice(1), 16);
        if (kind === "plaza") return Number.parseInt(tone("pad").slice(1), 16);
        return Number.parseInt(tone("grass").slice(1), 16);
      };
      function paintPoly(points: { sx: number; sy: number }[], kind: GroundKind): void {
        groundLayer.poly(points.flatMap((point) => [point.sx, point.sy])).fill(kindColor(kind));
      }
      function paintFoot(x: number, y: number, w: number, h: number, kind: GroundKind): void {
        paintPoly(footprintQuad(x, y, w, h), kind);
      }

      function paintRounded(x: number, y: number, w: number, h: number, radius: number, kind: GroundKind): void {
        const quad = footprintQuad(x, y, w, h);
        const draw = (dy: number) => {
          const pts = quad.map((point) => ({ sx: point.sx, sy: point.sy + dy }));
          const count = pts.length;
          const corners = pts.map((curr, index) => {
            const prev = pts[(index + count - 1) % count];
            const next = pts[(index + 1) % count];
            if (!prev || !next) return null;
            const toPrev = { sx: prev.sx - curr.sx, sy: prev.sy - curr.sy };
            const toNext = { sx: next.sx - curr.sx, sy: next.sy - curr.sy };
            const prevLen = Math.hypot(toPrev.sx, toPrev.sy) || 1;
            const nextLen = Math.hypot(toNext.sx, toNext.sy) || 1;
            const cut = Math.min(radius, prevLen * 0.18, nextLen * 0.18);
            return {
              a: { sx: curr.sx + (toPrev.sx / prevLen) * cut, sy: curr.sy + (toPrev.sy / prevLen) * cut },
              c: curr,
              b: { sx: curr.sx + (toNext.sx / nextLen) * cut, sy: curr.sy + (toNext.sy / nextLen) * cut },
            };
          });
          const last = corners[count - 1];
          if (!last) return;
          groundLayer.moveTo(last.b.sx, last.b.sy);
          for (const corner of corners) {
            if (!corner) continue;
            groundLayer.lineTo(corner.a.sx, corner.a.sy);
            groundLayer.lineTo(corner.b.sx, corner.b.sy);
          }
          groundLayer.closePath();
        };
        draw(0);
        groundLayer.fill(kindColor(kind));
      }

      function drawGround(): void {
        groundLayer.clear();
        paintFoot(-28, WATER.y, 72, WATER.h, "water");
        const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
          a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        const bands = [
          { y: -14, h: 4 },
          { y: -8, h: 4 },
          { y: 0, h: 4 },
          { y: 11, h: 6 },
          { y: 19, h: 4 },
          { y: 25, h: 4 },
          { y: 31, h: 4 },
        ];
        const canal = { x: -28, y: WATER.y, w: 72, h: WATER.h };
        for (let x = -20; x <= 36; x += 7) {
          for (const band of bands) {
            const plot = { x: x + 1, y: band.y, w: 5, h: band.h };
            if (overlaps(plot, canal) || GRASS_PLOTS.some((lawn) => overlaps(plot, lawn))) continue;
            paintRounded(plot.x, plot.y, plot.w, plot.h, 18, "grass");
          }
        }
        for (const plot of GRASS_PLOTS) paintRounded(plot.x, plot.y, plot.w, plot.h, 18, "grass");
        paintRounded(PLAZA.x, PLAZA.y, PLAZA.w, PLAZA.h, 12, "plaza");
        for (const bridge of BRIDGES) paintFoot(bridge.x, bridge.y, bridge.w, bridge.h, "bridge");
        groundLayer.eventMode = "none";
      }

      let elapsed = 0;
      let lastTick = 0;
      const poseAll = (reduced: boolean) => {
        for (const part of moving) {
          const pose = partPose(
            part.motion,
            reduced ? 0 : elapsed,
            catalog.motionStepMs,
            part.steps,
            part.phase,
            part.amplitude,
            reduced,
          );
          part.sprite.position.set(part.baseX + pose.x, part.baseY + pose.y);
          part.sprite.rotation = pose.rotation;
        }
      };
      applyRest.current = () => poseAll(true);

      const frameCamera = () => {
        const current = state.current;
        const viewW = el.clientWidth || created.canvas.clientWidth || 1;
        const viewH = el.clientHeight || created.canvas.clientHeight || 1;
        const home = current.objects.find((object) => object.id === current.homeId) ?? current.objects[0];
        const corners = footprintQuad(0, 0, DISTRICT_W, DISTRICT_H);
        const minSx = Math.min(...corners.map((point) => point.sx));
        const maxSx = Math.max(...corners.map((point) => point.sx));
        const minSy = Math.min(...corners.map((point) => point.sy));
        const maxSy = Math.max(...corners.map((point) => point.sy));
        const inset = viewW >= 800 ? current.coverRight : 0;
        const availW = Math.max(1, viewW - inset);
        const cafe = current.objects.find((object) => object.assetId === "cafe_for_birds" && !object.hidden);
        const focus = cafe ?? home;
        const fitted = viewW < 800
          ? Math.max(1.15, Math.min(1.45, viewH / (7 * TILE_H)))
          : 0.72;
        const zoom = Math.min(2.5, Math.max(0.2, fitted * current.zoom));
        const focusCenter = focus
          ? cellToScreen(focus.x + focus.w / 2, focus.y + focus.h / 2)
          : { sx: (minSx + maxSx) / 2, sy: (minSy + maxSy) / 2 };
        const focusX = viewW < 800 ? 0.5 : 0.42;
        const center = {
          sx: focusCenter.sx - (focusX - 0.5) * availW / zoom,
          sy: focusCenter.sy - (0.58 - 0.5) * viewH / zoom,
        };
        camera.scale.set(zoom);
        camera.position.set(availW / 2 - center.sx * zoom + current.pan.x, viewH / 2 - center.sy * zoom + current.pan.y);
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
          lastTick = 0;
          poseAll(true);
          if (created.ticker.started) created.stop();
          return;
        }
        if (!created.ticker.started) created.start();
        const now = created.ticker.lastTime;
        if (lastTick > 0) elapsed += Math.min(100, Math.max(0, now - lastTick));
        lastTick = now;
        void rebuild();
        poseAll(false);
        frameCamera();
        cullOffscreen();
      };
      let cullKey = "";
      const cullOffscreen = () => {
        const width = created.canvas.clientWidth || 1;
        const height = created.canvas.clientHeight || 1;
        const key = `${camera.position.x.toFixed(1)}|${camera.position.y.toFixed(1)}|${camera.scale.x.toFixed(3)}|${width}|${height}|${world.children.length}`;
        if (key === cullKey) return;
        cullKey = key;
        const margin = 220;
        for (const child of world.children) {
          const point = child.getGlobalPosition();
          child.renderable = point.x >= -margin && point.x <= width + margin && point.y >= -margin && point.y <= height + margin;
        }
      };
      created.ticker.add(tick);
      await rebuild();
      frameCamera();
      poseAll(state.current.reducedMotion || state.current.deterministic);
      onVisibility = () => {
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
      };
      if (!stopped) {
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("pageshow", onVisibility);
        window.addEventListener("online", onVisibility);
        window.addEventListener("focus", onVisibility);
      }
      if (state.current.deterministic || !shouldTick({
        hidden: document.visibilityState === "hidden",
        paused: state.current.paused,
        reducedMotion: state.current.reducedMotion,
      })) {
        created.stop();
      }
      state.current.onReady?.();
      if (document.documentElement.dataset.localTest === "true") {
        (window as unknown as { __sharedWorldTest?: unknown }).__sharedWorldTest = {
          loseContext: () => {
            const gl = created.canvas.getContext("webgl2") ?? created.canvas.getContext("webgl");
            gl?.getExtension("WEBGL_lose_context")?.loseContext();
          },
          tickerStarted: () => created.ticker.started,
          homePoint: () => {
            const current = state.current;
            const home = current.objects.find((object) => object.id === current.homeId) ?? current.objects[0];
            if (!home) return null;
            const center = cellToScreen(home.x + home.w / 2, home.y + home.h / 2);
            const point = camera.toGlobal({ x: center.sx, y: center.sy });
            return { x: point.x, y: point.y };
          },
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
      if (onVisibility) {
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("pageshow", onVisibility);
        window.removeEventListener("online", onVisibility);
        window.removeEventListener("focus", onVisibility);
      }
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
  }, [props.zoom, props.pan.x, props.pan.y, props.homeId, props.objects, props.preview, props.paused, props.reducedMotion, props.coverRight, props.district]);

  return <div ref={host} className="stage" data-scene-host="true" aria-hidden="true" />;
}
