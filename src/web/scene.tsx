import { useEffect, useRef, type ReactElement } from "react";
import { Application, Container, Graphics, Polygon, Rectangle, Sprite, Texture } from "pixi.js";
import catalogJson from "../../assets/catalog/catalog.json" with { type: "json" };
import type { Catalog, CatalogAsset, Palette } from "../domain/catalogModel.js";
import { acceptedPalette, paintSvg } from "../domain/catalogModel.js";
import { CANAL, CANAL_BANK, CORNER_CUTS, DISTRICT_H, DISTRICT_W, GRASS_PLOTS, PLAZAS, type CornerName, type GroundKind, type Plot } from "../domain/district.js";
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
      // Pointer deltas are drawn before React commits the pan, so a drag is not one jump.
      const gesture = { baseX: 0, baseY: 0, sentX: 0, sentY: 0, live: false };
      let followPointer = () => {};
      const onDown = (event: { global: { x: number; y: number } }) => {
        drag = { x: event.global.x, y: event.global.y };
        gesture.baseX = state.current.pan.x;
        gesture.baseY = state.current.pan.y;
        gesture.sentX = 0;
        gesture.sentY = 0;
        gesture.live = true;
      };
      const onMove = (event: { global: { x: number; y: number } }) => {
        if (!drag) return;
        const dx = event.global.x - drag.x;
        const dy = event.global.y - drag.y;
        if (Math.hypot(dx, dy) < 4) return;
        drag = { x: event.global.x, y: event.global.y };
        gesture.sentX += dx;
        gesture.sentY += dy;
        followPointer();
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
      const layoutStamp = (): string => {
        const current = state.current;
        let n = current.objects.length;
        for (let i = 0; i < current.objects.length; i += 1) {
          const object = current.objects[i];
          if (!object) continue;
          n = Math.imul(n, 33) + object.x + Math.imul(object.y, 17) + object.w + object.h + (object.hidden ? 1 : 0);
        }
        const preview = current.preview;
        return `${n}:${current.selectedId ?? ""}:${preview ? `${preview.x},${preview.y},${preview.assetId}` : ""}`;
      };
      let moving: MovingPart[] = [];

      const paletteFor = (asset: CatalogAsset, paletteId: string | null): Palette | null => {
        if (!paletteId) return null;
        return acceptedPalette(asset, paletteId, catalog.palettes);
      };

      const rebuild = async () => {
        const current = state.current;
        const preview = current.preview;
        const key = layoutStamp();
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
      function paintPlaza(plot: Plot): void {
        // One cream slab. A cell grid read as a checker and broke the white base.
        paintFoot(plot.x, plot.y, plot.w, plot.h, "plaza");
        const lip = 0xe6d8c4;
        const span = 0.06;
        const band = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
          const a = cellToScreen(x0, y0);
          const b = cellToScreen(x1, y1);
          const c = cellToScreen(x1 + nx, y1 + ny);
          const d = cellToScreen(x0 + nx, y0 + ny);
          groundLayer.poly([a.sx, a.sy, b.sx, b.sy, c.sx, c.sy, d.sx, d.sy]).fill(lip);
        };
        band(plot.x, plot.y + plot.h, plot.x + plot.w, plot.y + plot.h, 0, span);
        band(plot.x + plot.w, plot.y, plot.x + plot.w, plot.y + plot.h, span, 0);
      }

      const hex = (role: string) => Number.parseInt(tone(role).slice(1), 16);
      function cutFor(plot: Plot): Record<CornerName, number> {
        const cut: Record<CornerName, number> = { top: 0, right: 0, bottom: 0, left: 0 };
        for (const item of CORNER_CUTS) {
          if (item.x === plot.x && item.y === plot.y) cut[item.corner] = Math.max(cut[item.corner], item.cells);
        }
        return cut;
      }
      function lawnQuad(x: number, y: number, w: number, h: number, cut: Record<CornerName, number>): { sx: number; sy: number }[] {
        const grid: [number, number][] = [];
        const push = (gx: number, gy: number) => {
          const point = cellToScreen(gx, gy);
          grid.push([point.sx, point.sy]);
        };
        if (cut.top > 0) {
          push(x, y + cut.top);
          push(x + cut.top, y);
        } else push(x, y);
        if (cut.right > 0) {
          push(x + w - cut.right, y);
          push(x + w, y + cut.right);
        } else push(x + w, y);
        if (cut.bottom > 0) {
          push(x + w, y + h - cut.bottom);
          push(x + w - cut.bottom, y + h);
        } else push(x + w, y + h);
        if (cut.left > 0) {
          push(x + cut.left, y + h);
          push(x, y + h - cut.left);
        } else push(x, y + h);
        return grid.map(([sx, sy]) => ({ sx, sy }));
      }
      function paintLawn(plot: Plot): void {
        const cut = cutFor(plot);
        const curb = lawnQuad(plot.x - 0.04, plot.y - 0.04, plot.w + 0.08, plot.h + 0.08, cut);
        const inner = lawnQuad(plot.x + 0.015, plot.y + 0.015, plot.w - 0.03, plot.h - 0.03, {
          top: Math.max(0, cut.top - 0.015),
          right: Math.max(0, cut.right - 0.015),
          bottom: Math.max(0, cut.bottom - 0.015),
          left: Math.max(0, cut.left - 0.015),
        });
        groundLayer.poly(curb.flatMap((point) => [point.sx, point.sy])).fill(hex("curb"));
        groundLayer.poly(inner.flatMap((point) => [point.sx, point.sy])).fill(hex("grass"));
      }

      function viewWorld() {
        const viewW = created.canvas.clientWidth || 1;
        const viewH = created.canvas.clientHeight || 1;
        const zoom = camera.scale.x || 1;
        return {
          sx0: (0 - camera.position.x) / zoom - 560,
          sx1: (viewW - camera.position.x) / zoom + 560,
          sy0: (0 - camera.position.y) / zoom - 560,
          sy1: (viewH - camera.position.y) / zoom + 560,
        };
      }
      function overlapsView(x: number, y: number, w: number, h: number, view: { sx0: number; sx1: number; sy0: number; sy1: number }): boolean {
        const quad = footprintQuad(x, y, w, h);
        const minX = Math.min(...quad.map((point) => point.sx));
        const maxX = Math.max(...quad.map((point) => point.sx));
        const minY = Math.min(...quad.map((point) => point.sy));
        const maxY = Math.max(...quad.map((point) => point.sy));
        return maxX >= view.sx0 && minX <= view.sx1 && maxY >= view.sy0 && minY <= view.sy1;
      }
      function drawGround(): void {
        if (groundLayer.isCachedAsTexture) groundLayer.cacheAsTexture(false);
        groundLayer.clear();
        const view = viewWorld();
        for (const plot of GRASS_PLOTS) {
          if (!overlapsView(plot.x, plot.y, plot.w, plot.h, view)) continue;
          paintLawn(plot);
        }
        for (const plot of PLAZAS) {
          if (overlapsView(plot.x, plot.y, plot.w, plot.h, view)) paintPlaza(plot);
        }
        // Quads, not one ribbon: a single concave fill left lawns showing through the water.
        const ribbon = (poly: Array<[number, number]>, kind: GroundKind) => {
          const side = poly.length / 2;
          const left = poly.slice(0, side).map(([x, y]) => cellToScreen(x, y));
          const right = poly.slice(side).reverse().map(([x, y]) => cellToScreen(x, y));
          const along = (from: { sx: number; sy: number }, to: { sx: number; sy: number }, t: number) => ({
            sx: from.sx + (to.sx - from.sx) * t,
            sy: from.sy + (to.sy - from.sy) * t,
          });
          for (let i = 0; i < side - 1; i += 1) {
            const a = left[i];
            const b = left[i + 1];
            const c = right[i + 1];
            const d = right[i];
            if (!a || !b || !c || !d) continue;
            // Overlap the joint so the shared edge cannot leave a cream seam.
            const t0 = i === 0 ? 0 : -0.03;
            const t1 = i === side - 2 ? 1 : 1.03;
            paintPoly([along(a, b, t0), along(a, b, t1), along(d, c, t1), along(d, c, t0)], kind);
          }
        };
        ribbon(CANAL_BANK, "road");
        ribbon(CANAL, "water");
        groundLayer.eventMode = "none";
        groundLayer.cacheAsTexture({ resolution: 1, antialias: false });
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
        const wide = viewW >= 800;
        const fitted = wide ? 0.96 : 0.515;
        const zoom = Math.min(2.5, Math.max(0.2, fitted * current.zoom));
        const focusCenter = focus
          ? cellToScreen(focus.x + focus.w / 2, focus.y + focus.h / 2)
          : { sx: (minSx + maxSx) / 2, sy: (minSy + maxSy) / 2 };
        const focusX = wide ? 0.7 : 0.695;
        const focusY = wide ? 0.58 : 0.49;
        const center = {
          sx: focusCenter.sx - (focusX - 0.5) * availW / zoom,
          sy: focusCenter.sy - (focusY - 0.5) * viewH / zoom,
        };
        camera.scale.set(zoom);
        const pendingX = gesture.live ? gesture.sentX - (current.pan.x - gesture.baseX) : 0;
        const pendingY = gesture.live ? gesture.sentY - (current.pan.y - gesture.baseY) : 0;
        if (gesture.live && !drag && pendingX === 0 && pendingY === 0) gesture.live = false;
        camera.position.set(
          availW / 2 - center.sx * zoom + current.pan.x + pendingX,
          viewH / 2 - center.sy * zoom + current.pan.y + pendingY,
        );
        // The ground cache includes a margin, so a pan is a camera move until the view leaves it.
        const shown = {
          sx0: (0 - camera.position.x) / zoom,
          sy0: (0 - camera.position.y) / zoom,
          sx1: (viewW - camera.position.x) / zoom,
          sy1: (viewH - camera.position.y) / zoom,
        };
        const edge = 80;
        const stale = drawnGround === ""
          || !drawnView
          || Math.abs(drawnView.zoom - zoom) > 0.001
          || drawnView.w !== viewW
          || drawnView.h !== viewH
          || shown.sx0 < drawnView.sx0 + edge
          || shown.sx1 > drawnView.sx1 - edge
          || shown.sy0 < drawnView.sy0 + edge
          || shown.sy1 > drawnView.sy1 - edge;
        if (stale) {
          drawGround();
          const view = viewWorld();
          drawnGround = "drawn";
          drawnView = { sx0: view.sx0, sy0: view.sy0, sx1: view.sx1, sy1: view.sy1, zoom, w: viewW, h: viewH };
        }
      };
      let drawnGround = "";
      let drawnView: { sx0: number; sy0: number; sx1: number; sy1: number; zoom: number; w: number; h: number } | null = null;
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
        present();
      };
      let presented = "";
      const present = () => {
        const key = `${Math.floor(elapsed / 50)}|${camera.position.x.toFixed(1)}|${camera.position.y.toFixed(1)}|${camera.scale.x.toFixed(3)}|${world.children.length}`;
        if (key === presented) return;
        presented = key;
        created.render();
      };
      created.ticker.remove(created.render, created);
      // The draw has to happen inside the ticker, which runs on animation frames.
      // A render from the pointer handler is not presented until the next frame,
      // and a later ticker pass then paints over it.
      followPointer = () => {
        frameCamera();
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
      presented = "";
      present();
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
          waterReport: () => {
            const wasVisible = world.visible;
            world.visible = false;
            const viewW = created.canvas.clientWidth || 1;
            const viewH = created.canvas.clientHeight || 1;
            // Frame the seed café cell, not wherever a published row kept the café.
            // The check is about the wide still: water under the bridges and out both edges.
            const savedX = camera.position.x;
            const savedY = camera.position.y;
            const savedScale = camera.scale.x;
            const wideZoom = 0.96;
            const seedCafe = cellToScreen(8 + 1.5, 2 + 1.5);
            const framed = {
              sx: seedCafe.sx - (0.7 - 0.5) * viewW / wideZoom,
              sy: seedCafe.sy - (0.58 - 0.5) * viewH / wideZoom,
            };
            camera.scale.set(wideZoom);
            camera.position.set(viewW / 2 - framed.sx * wideZoom, viewH / 2 - framed.sy * wideZoom);
            const shot = created.renderer.extract.pixels({
              target: created.stage,
              frame: new Rectangle(0, 0, viewW, viewH),
              resolution: 1,
            });
            world.visible = wasVisible;
            const { pixels, width, height } = shot;
            const scaleX = width / viewW;
            const scaleY = height / viewH;
            const isWater = (r: number, g: number, b: number) => r < 120 && g > 125 && b > 140 && g > r + 35 && b > r + 25;
            const sample = (sx: number, sy: number) => {
              const x = Math.round(sx * scaleX);
              const y = Math.round(sy * scaleY);
              if (x < 0 || y < 0 || x >= width || y >= height) return { x, y, r: 0, g: 0, b: 0, water: false };
              const index = (y * width + x) * 4;
              const r = pixels[index] ?? 0;
              const g = pixels[index + 1] ?? 0;
              const b = pixels[index + 2] ?? 0;
              return { x, y, r, g, b, water: isWater(r, g, b) };
            };
            const screenOf = (gx: number, gy: number) => {
              const point = cellToScreen(gx, gy);
              const global = camera.toGlobal({ x: point.sx, y: point.sy });
              return { x: global.x, y: global.y };
            };
            const onScreen = (point: { x: number; y: number }) =>
              point.x >= 1 && point.y >= 1 && point.x <= viewW - 2 && point.y <= viewH - 2;
            const current = state.current;
            const named: { name: string; x: number; y: number }[] = [];
            const boats = current.objects.filter((object) => (object.assetId === "canal_boat" || object.assetId === "canal_boat_blue") && !object.hidden);
            for (const boat of boats) {
              const center = screenOf(boat.x + boat.w / 2, boat.y + boat.h / 2);
              named.push({ name: `boat ${boat.x},${boat.y}`, ...center });
              for (const [dx, dy] of [[24, 0], [-24, 0], [0, 16], [0, -16]] as const) {
                named.push({ name: `boat ${boat.x},${boat.y} ${dx},${dy}`, x: center.x + dx, y: center.y + dy });
              }
            }
            for (const bridge of current.objects.filter((object) => (object.assetId === "red_bridge" || object.assetId === "red_bridge_near") && !object.hidden)) {
              const center = screenOf(bridge.x + bridge.w / 2, bridge.y + bridge.h / 2);
              named.push({ name: `bridge ${bridge.x},${bridge.y}`, ...center });
            }
            const half = CANAL.length / 2;
            const centers: { x: number; y: number }[] = [];
            for (let i = 0; i < half; i += 1) {
              const a = CANAL[i];
              const b = CANAL[CANAL.length - 1 - i];
              if (!a || !b) continue;
              centers.push(screenOf((a[0] + b[0]) / 2, (a[1] + b[1]) / 2));
            }
            for (let i = 0; i < centers.length - 1; i += 1) {
              const from = centers[i];
              const to = centers[i + 1];
              if (!from || !to) continue;
              for (const t of [0.25, 0.5, 0.75]) {
                const point = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
                if (onScreen(point)) named.push({ name: `centerline ${i} ${t}`, ...point });
              }
            }
            const mask = new Uint8Array(width * height);
            for (let i = 0; i < width * height; i += 1) {
              const r = pixels[i * 4] ?? 0;
              const g = pixels[i * 4 + 1] ?? 0;
              const b = pixels[i * 4 + 2] ?? 0;
              if (isWater(r, g, b)) mask[i] = 1;
            }
            const seen = new Uint8Array(width * height);
            let components = 0;
            let touchesLeft = false;
            let touchesBottom = false;
            let biggest = 0;
            for (let start = 0; start < mask.length; start += 1) {
              if (!mask[start] || seen[start]) continue;
              let size = 0;
              let left = false;
              let bottom = false;
              const stack = [start];
              seen[start] = 1;
              while (stack.length) {
                const cursor = stack.pop() ?? 0;
                size += 1;
                const x = cursor % width;
                const y = (cursor - x) / width;
                if (x === 0) left = true;
                if (y === height - 1) bottom = true;
                for (const next of [cursor - 1, cursor + 1, cursor - width, cursor + width]) {
                  if (next < 0 || next >= mask.length || seen[next] || !mask[next]) continue;
                  if (Math.abs((next % width) - x) > 1) continue;
                  seen[next] = 1;
                  stack.push(next);
                }
              }
              if (size < 80) continue;
              components += 1;
              if (size > biggest) {
                biggest = size;
                touchesLeft = left;
                touchesBottom = bottom;
              }
            }
            camera.position.set(savedX, savedY);
            camera.scale.set(savedScale);
            return {
              width,
              height,
              boats: boats.length,
              bridges: current.objects.filter((object) => (object.assetId === "red_bridge" || object.assetId === "red_bridge_near") && !object.hidden).length,
              samples: named.map((point) => ({ name: point.name, sx: point.x, sy: point.y, ...sample(point.x, point.y) })),
              components,
              touchesLeft,
              touchesBottom,
            };
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
