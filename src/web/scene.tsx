import { useEffect, useRef, type ReactElement } from "react";
import { Application, Graphics } from "pixi.js";
import { cellToScreen } from "../scene/iso.js";
import { shouldTick } from "../scene/tickerPolicy.js";

export type SceneObject = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  accent: string;
  hidden?: boolean;
  name: string;
};

export function Scene(props: {
  objects: SceneObject[];
  preview: { x: number; y: number; w: number; h: number; fill: string } | null;
  selectedId: string | null;
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

  useEffect(() => {
    const created = appRef.current;
    if (!created) return;
    const run = shouldTick({
      hidden: document.visibilityState === "hidden",
      paused: props.paused,
      reducedMotion: props.reducedMotion || props.deterministic,
    });
    if (run) created.start();
    else created.stop();
  }, [props.paused, props.reducedMotion, props.deterministic]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let app: Application | null = null;
    let stopped = false;
    const boot = async () => {
      const created = new Application();
      await created.init({
        preference: ["webgl"],
        background: "#d7e2cf",
        resizeTo: el,
        antialias: true,
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
      const layer = new Graphics();
      created.stage.addChild(layer);
      const draw = () => {
        const current = state.current;
        layer.clear();
        const frame = current.deterministic ? 0 : Math.floor(created.ticker.lastTime / 400);
        for (const object of current.objects) {
          drawObject(layer, object, current.zoom, current.pan, object.id === current.selectedId, frame, Boolean(object.hidden));
        }
        if (current.preview) {
          drawObject(
            layer,
            { ...current.preview, accent: "#ffffff" },
            current.zoom,
            current.pan,
            false,
            frame,
            false,
          );
        }
      };
      const tick = () => {
        const current = state.current;
        const hidden = document.visibilityState === "hidden";
        const run = shouldTick({ hidden, paused: current.paused, reducedMotion: current.reducedMotion || current.deterministic });
        if (!run) {
          if (created.ticker.started) created.stop();
          return;
        }
        if (!created.ticker.started) created.start();
        draw();
      };
      created.ticker.add(tick);
      draw();
      const onPointer = (event: PointerEvent) => {
        const rect = created.canvas.getBoundingClientRect();
        const sx = event.clientX - rect.left - state.current.pan.x;
        const sy = event.clientY - rect.top - state.current.pan.y;
        const zoom = state.current.zoom;
        let found: string | null = null;
        for (const object of state.current.objects) {
          const p = cellToScreen(object.x, object.y, zoom);
          if (Math.abs(sx - p.sx - 280) < 40 * zoom && Math.abs(sy - p.sy - 80) < 30 * zoom) found = object.id;
        }
        if (found) state.current.onSelect(found);
      };
      created.canvas.addEventListener("pointerdown", onPointer);
      const onVisibility = () => {
        if (document.visibilityState === "visible" && shouldTick({
          hidden: false,
          paused: state.current.paused,
          reducedMotion: state.current.reducedMotion || state.current.deterministic,
        })) created.start();
        else created.stop();
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
        };
      }
    };
    void boot().catch(() => {
      el.dataset.scene = "unavailable";
      el.dispatchEvent(new Event("scene-unavailable", { bubbles: true }));
    });
    return () => {
      stopped = true;
      appRef.current = null;
      app?.destroy();
    };
  }, []);

  return <div ref={host} className="stage" data-scene-host="true" aria-hidden="true" />;
}

function drawObject(
  layer: Graphics,
  object: { x: number; y: number; w: number; h: number; fill: string; accent: string },
  zoom: number,
  pan: { x: number; y: number },
  selected: boolean,
  frame: number,
  hidden: boolean,
): void {
  const p = cellToScreen(object.x, object.y, zoom);
  const bob = hidden ? 0 : (frame % 2) * 2;
  const cx = p.sx + pan.x + 280;
  const cy = p.sy + pan.y + 80 - bob;
  const w = 36 * object.w * zoom;
  const h = 18 * object.h * zoom;
  layer.poly([cx, cy, cx + w, cy + h / 2, cx, cy + h, cx - w, cy + h / 2]).fill(hidden ? "#8a8478" : object.fill);
  if (selected) layer.rect(cx - 4, cy - 4, 8, 8).fill(object.accent);
}
