import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import copy from "../../copy/en.json" with { type: "json" };
import { stageNotice } from "./notices.js";
import { beginPoll, createPollBurst, isLatestPoll, POLL_BURST_MS } from "./poll.js";
import type { SceneObject } from "./scene.js";

class IllustrationBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const Scene = lazy(() => import("./scene.js").then((mod) => ({ default: mod.Scene })));

type PublicConfig = {
  runMode: string;
  fixture: boolean;
  testIdentity: boolean;
  pollIntervalMs: number;
  promptMaxGraphemes: number;
  publishingOpen: boolean;
};

type WorldObject = SceneObject & {
  contributionId?: string;
  authorLabel?: string;
  administrator?: boolean;
  sentence?: string | null;
  history?: string;
  notPublic?: boolean;
};

type WorldResponse = {
  objects: WorldObject[];
  homeId: string | null;
  district?: { w: number; h: number; rows: string[] };
  phase: string;
  weather: string;
  returnNote: { contributionId: string; objectId: string | null; text: string; added: string } | null;
  policy: string;
  publishingOpen: boolean;
};

type Preview = { name: string; x: number; y: number; w: number; h: number; assetId: string; paletteId: string; explanation: string };
type Surface = "none" | "places" | "inspect" | "compose" | "account";

const origin = window.location.origin;

function storedMotion(): boolean | null {
  try {
    const value = localStorage.getItem("sw-motion");
    if (value === "reduce") return true;
    if (value === "full") return false;
  } catch {
    return null;
  }
  return null;
}

async function api(path: string, init: RequestInit = {}): Promise<{ status: number; body: Record<string, unknown> }> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
    credentials: "include",
  });
  const body = (await response.json()) as Record<string, unknown>;
  return { status: response.status, body };
}

export function App(): ReactElement {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [world, setWorld] = useState<WorldResponse | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposalVersion, setProposalVersion] = useState(1);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [stage, setStage] = useState("ready");
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => storedMotion() ?? window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [me, setMe] = useState<{ signedIn: boolean; pseudonym?: string; role?: string | null; authorId?: string }>({ signedIn: false });
  const [pseudonym, setPseudonym] = useState("");
  const [recovery, setRecovery] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [invite, setInvite] = useState("");
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  const [recoverCode, setRecoverCode] = useState("");
  const [surface, setSurface] = useState<Surface>("none");
  const [sheet, setSheet] = useState<"peek" | "open">("open");
  const [query, setQuery] = useState("");
  const [wide, setWide] = useState(window.innerWidth >= 800);
  const [hint, setHint] = useState(() => {
    try {
      return sessionStorage.getItem("sw-hint") !== "off";
    } catch {
      return true;
    }
  });
  const idempotency = useRef(crypto.randomUUID());
  const worldTag = useRef<string | null>(null);
  const pollGeneration = useRef({ n: 0 });
  const params = new URLSearchParams(window.location.search);
  const deterministic = config?.runMode === "local-test" && params.get("scene") === "deterministic";
  const forceDom = params.get("webgl") === "0";

  const load = useCallback(async () => {
    const id = beginPoll(pollGeneration.current);
    try {
      const headers: Record<string, string> = {};
      if (worldTag.current) headers["if-none-match"] = worldTag.current;
      const response = await fetch("/api/world", { headers, credentials: "include" });
      if (!isLatestPoll(id, pollGeneration.current)) return;
      if (response.status === 304) {
        setError("");
        return;
      }
      if (!response.ok) {
        setError("The world could not be loaded.");
        return;
      }
      worldTag.current = response.headers.get("etag");
      setWorld((await response.json()) as WorldResponse);
      setError("");
    } catch {
      if (!isLatestPoll(id, pollGeneration.current)) return;
      setError(copy.offline);
    }
  }, []);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const code = fragment.get("invite");
    if (code) {
      setInvite(code);
      setSurface("account");
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    const id = window.location.pathname.startsWith("/c/") ? window.location.pathname.slice(3) : null;
    if (id) {
      setSelectedId(id);
      setSurface("inspect");
    }
    void api("/api/public-config").then((result) => {
      const cfg = result.body as unknown as PublicConfig;
      setConfig(cfg);
      document.documentElement.dataset.localTest = cfg.runMode === "local-test" ? "true" : "false";
    });
    void api("/api/me").then((result) => setMe(result.body as typeof me));
    void load();
    const onLost = () => setSceneUnavailable(true);
    const onResize = () => setWide(window.innerWidth >= 800);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSurface("none");
    };
    window.addEventListener("scene-unavailable", onLost);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scene-unavailable", onLost);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [load]);

  useEffect(() => {
    if (!config) return;
    const burst = createPollBurst(POLL_BURST_MS, () => void load());
    const poll = () => burst.push(performance.now());
    const timer = window.setInterval(poll, config.pollIntervalMs);
    const onShow = () => poll();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pageshow", onShow);
    window.addEventListener("online", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("pageshow", onShow);
      window.removeEventListener("online", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [config, load]);

  useEffect(() => {
    if (stage === "conflict") document.getElementById("conflict-status")?.focus();
  }, [stage]);

  const selected = world?.objects.find((object) => object.id === selectedId) ?? null;
  const home = world?.objects.find((object) => object.id === world.homeId) ?? null;
  const suggestions = copy.suggestions;
  const panelOpen = surface !== "none";
  const listed = (world?.objects ?? []).filter((object) => object.name.toLowerCase().includes(query.trim().toLowerCase()));

  const arrived = useMemo(() => {
    if (selected) return copy.arrived.replaceAll("{name}", selected.name);
    if (home?.hidden) return copy.arrived.replaceAll("{name}", home.name);
    return copy.startHere;
  }, [selected, home]);

  function openSurface(next: Surface) {
    setSurface((current) => (current === next ? "none" : next));
    setSheet("open");
  }

  function toggleReduced() {
    setReduced((value) => {
      const next = !value;
      try {
        localStorage.setItem("sw-motion", next ? "reduce" : "full");
      } catch {
        /* the preference still applies for this visit */
      }
      return next;
    });
  }

  function dismissHint() {
    setHint(false);
    try {
      sessionStorage.setItem("sw-hint", "off");
    } catch {
      /* the hint stays dismissed for this visit */
    }
  }

  function panBy(dx: number, dy: number) {
    setPan((current) => ({ x: current.x + dx, y: current.y + dy }));
  }

  async function interpret(phrase: string) {
    setSurface("compose");
    setSheet("open");
    setStage("interpreting");
    const result = await api("/api/interpret", {
      method: "POST",
      body: JSON.stringify({ text: phrase, anchorId: selectedId }),
    });
    if (result.body.code === "ready") {
      setProposalId(String(result.body.proposalId));
      setProposalVersion(Number(result.body.proposalVersion ?? 1));
      setPreview(result.body.preview as Preview);
      setStage("preview");
      document.getElementById("preview-heading")?.focus();
      return;
    }
    setProposalId(typeof result.body.proposalId === "string" ? result.body.proposalId : proposalId);
    setPreview(null);
    setStage(String(result.body.code ?? "unsupported"));
  }

  async function confirm() {
    if (!me.signedIn) {
      setSurface("compose");
      setStage("needs_identity");
      return;
    }
    if (!proposalId) return;
    const result = await api(`/api/proposals/${proposalId}/confirm`, {
      method: "POST",
      body: JSON.stringify({ idempotencyKey: idempotency.current }),
    });
    if (result.body.code === "conflict") {
      setProposalVersion(Number(result.body.proposalVersion));
      setPreview((current) => current && result.body.preview ? { ...current, ...(result.body.preview as Preview) } : current);
      setConfirmKey(null);
      setStage("conflict");
      idempotency.current = crypto.randomUUID();
      return;
    }
    if (result.body.confirmKey) {
      setConfirmKey(String(result.body.confirmKey));
      setProposalVersion(Number(result.body.proposalVersion));
      setStage("confirming");
    }
  }

  async function publish() {
    if (!proposalId || !confirmKey) return;
    setStage("publishing");
    const result = await api(`/api/proposals/${proposalId}/publish`, {
      method: "POST",
      body: JSON.stringify({ proposalVersion, key: confirmKey }),
    });
    if (result.body.code === "conflict") {
      setProposalVersion(Number(result.body.proposalVersion));
      setConfirmKey(null);
      setStage("conflict");
      idempotency.current = crypto.randomUUID();
      return;
    }
    if (result.body.code === "published" || result.body.code === "already_published") {
      setStage(String(result.body.code));
      setPreview(null);
      setConfirmKey(null);
      setSurface("places");
      await load();
      return;
    }
    setStage(String(result.body.code ?? "unavailable"));
  }

  async function createIdentity() {
    const result = await api("/api/identity", {
      method: "POST",
      body: JSON.stringify({ pseudonym, acknowledge: ack }),
    });
    if (result.status === 201) {
      setRecovery(String(result.body.recoveryCode));
      setStage("recovery_shown");
      const who = await api("/api/me");
      setMe(who.body as typeof me);
    } else setError(stageNotice(String(result.body.code)) ?? "Try again.");
  }

  async function redeem() {
    const result = await api("/api/invites/redeem", { method: "POST", body: JSON.stringify({ code: invite }) });
    if (result.body.code === "grant") setInviteNote("Invitation accepted. You can publish.");
    else {
      setInviteNote(null);
      setStage(result.status === 401 ? "needs_identity" : "invite_refused");
    }
  }

  async function recover() {
    const result = await api("/api/recover", { method: "POST", body: JSON.stringify({ code: recoverCode }) });
    if (result.status === 200) {
      setRecovery(String(result.body.recoveryCode));
      const who = await api("/api/me");
      setMe(who.body as typeof me);
      setRecoverCode("");
      setStage("recovery_shown");
    } else setStage(String(result.body.code ?? "recovery_refused"));
  }

  async function signOut() {
    await api("/api/sign-out", { method: "POST", body: "{}" });
    setMe({ signedIn: false });
    setRecovery(null);
    setStage("ready");
  }

  const banner = config?.runMode === "local-test"
    ? `Test mode — fixture interpreter${config.testIdentity ? " · test identity" : ""}`
    : "";
  const notice = stageNotice(stage);

  return (
    <>
      <a className="skip" href="#neighborhood">Skip to the neighborhood</a>
      <header className="topbar">
        <h1>Shared world</h1>
        {banner ? <p className="chip" role="status">{banner}</p> : null}
        <div className="top-actions">
          <button type="button" aria-pressed={surface === "places"} onClick={() => openSurface("places")}>Places</button>
          <button type="button" onClick={() => openSurface("compose")}>Add your idea</button>
          <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? "Resume motion" : "Pause motion"}</button>
          <button type="button" className="secondary" onClick={toggleReduced} aria-pressed={reduced}>Reduced motion</button>
          <button type="button" className="secondary" aria-pressed={surface === "account"} onClick={() => openSurface("account")}>Account</button>
        </div>
      </header>
      <main className="world">
        {forceDom || sceneUnavailable ? (
          <p className="stage-note" role="status">{copy.illustrationUnavailable}</p>
        ) : (
          <IllustrationBoundary fallback={<p className="stage-note" role="status">{copy.illustrationUnavailable}</p>}>
            <Suspense fallback={<div className="stage" role="status">{copy.illustrationLoading}</div>}>
              <Scene
                key={sceneKey}
                objects={world?.objects ?? []}
                preview={preview}
                selectedId={selectedId}
                homeId={world?.homeId ?? null}
                zoom={zoom}
                pan={pan}
                paused={paused}
                reducedMotion={reduced}
                deterministic={Boolean(deterministic)}
                coverRight={wide && panelOpen ? 360 : 0}
                district={world?.district ?? null}
                onSelect={(id) => { setSelectedId(id); setSurface("inspect"); setSheet("open"); }}
                onPan={panBy}
              />
            </Suspense>
          </IllustrationBoundary>
        )}
        <div className="corner" id="neighborhood">
          <button
            type="button"
            className="secondary"
            aria-label="Neighborhood"
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") panBy(-24, 0);
              if (event.key === "ArrowRight") panBy(24, 0);
              if (event.key === "ArrowUp") panBy(0, -24);
              if (event.key === "ArrowDown") panBy(0, 24);
            }}
          >Neighborhood</button>
          <button type="button" className="secondary" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>Zoom out</button>
          <button type="button" className="secondary" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>Zoom in</button>
          <button type="button" className="secondary" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>Back to café</button>
          <details className="nav">
            <summary>Navigation</summary>
            <div className="row">
              <button type="button" className="secondary" onClick={() => panBy(-24, 0)}>Pan left</button>
              <button type="button" className="secondary" onClick={() => panBy(24, 0)}>Pan right</button>
              <button type="button" className="secondary" onClick={() => panBy(0, -24)}>Pan up</button>
              <button type="button" className="secondary" onClick={() => panBy(0, 24)}>Pan down</button>
            </div>
          </details>
        </div>
        {hint ? (
          <p className="hint" role="note">
            {arrived} Explore freely — no account needed. Drag empty ground to look around, or select a place to read it.
            <button type="button" className="secondary" onClick={dismissHint}>Dismiss</button>
          </p>
        ) : null}
        {error ? <p className="error toast" role="alert">{error} <button type="button" onClick={() => void load()}>Retry</button></p> : null}
        {panelOpen ? (
          <aside className={sheet === "peek" ? "panel peek" : "panel"} aria-label="Neighborhood details">
            <div className="sheet-bar">
              <button type="button" className="secondary" onClick={() => setSheet("open")}>Expand</button>
              <button type="button" className="secondary" onClick={() => setSheet("peek")}>Collapse</button>
              <button type="button" className="secondary" onClick={() => setSurface("none")}>Close</button>
            </div>
            {surface === "places" ? (
              <>
                <h2>Places</h2>
                <label htmlFor="place-search">Search places</label>
                <input id="place-search" value={query} onChange={(event) => setQuery(event.target.value)} />
                <ul
                  className="list"
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
                    const buttons = [...event.currentTarget.querySelectorAll("button")];
                    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
                    if (index < 0) return;
                    event.preventDefault();
                    const next = event.key === "ArrowDown" ? Math.min(buttons.length - 1, index + 1) : Math.max(0, index - 1);
                    buttons[next]?.focus();
                  }}
                >
                  {listed.map((object) => (
                    <li key={object.id}>
                      <button type="button" aria-current={object.id === selectedId ? "true" : undefined} onClick={() => { setSelectedId(object.id); setSurface("inspect"); }}>
                        {object.name}{object.administrator ? " · Administrator" : ""}{object.notPublic ? " · Not public" : ""}
                      </button>
                    </li>
                  ))}
                </ul>
                {!world?.objects.length ? <p>This world has no places yet.</p> : null}
                {world?.objects.length && !listed.length ? <p>No place matches that search.</p> : null}
              </>
            ) : null}
            {surface === "inspect" && selected ? (
              <article className="note">
                <button type="button" className="secondary" onClick={() => setSurface("places")}>Back</button>
                <h2>{selected.name}</h2>
                {selected.authorLabel ? <p>Created by {selected.authorLabel}.</p> : null}
                <button type="button" onClick={() => openSurface("compose")}>Add your idea</button>
                <button type="button" className="secondary" onClick={() => void navigator.clipboard.writeText(`${origin}/c/${selected.id}`)}>Copy link</button>
                {selected.history ? (
                  <details>
                    <summary>What changed</summary>
                    <p>{selected.history}</p>
                  </details>
                ) : null}
              </article>
            ) : null}
            {surface === "compose" || preview || stage === "confirming" || stage === "needs_identity" ? (
              <div>
                <label htmlFor="composer">What would you add?</label>
                <textarea id="composer" value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} />
                <p>{text.length} / {config?.promptMaxGraphemes ?? 250}</p>
                <p>Ideas you can try</p>
                <div className="row">
                  {suggestions.map((idea) => (
                    <button key={idea} type="button" className="secondary" onClick={() => { setText(idea); void interpret(idea); }}>{idea}</button>
                  ))}
                </div>
                <button type="button" onClick={() => void interpret(text)}>Preview idea</button>
              </div>
            ) : null}
            {preview ? (
              <article className="note" tabIndex={-1} id="preview-heading">
                <h2>Private preview — only you can see this.</h2>
                <p>Here’s how the world understood your idea.</p>
                <p>{preview.name}</p>
                <div className="row">
                  <button type="button" onClick={() => { setPreview(null); setStage("ready"); document.getElementById("composer")?.focus(); }}>Edit idea</button>
                  <button type="button" className="secondary" onClick={() => proposalId && void api(`/api/proposals/${proposalId}/discard`, { method: "POST", body: "{}" }).then(() => { setPreview(null); setText(""); setStage("discarded"); })}>Discard draft</button>
                  <button type="button" onClick={() => void confirm()}>This looks right</button>
                </div>
              </article>
            ) : null}
            {stage === "confirming" ? (
              <article className="note">
                <h2>Publish this to the shared world?</h2>
                <p>Once published, other people can see it and continue it. You’ll be credited as its author.</p>
                <h3>Content policy</h3>
                <p>{world?.policy}</p>
                <div className="row">
                  <button type="button" onClick={() => void publish()}>Publish</button>
                  <button type="button" className="secondary" onClick={() => setStage("preview")}>Keep editing</button>
                </div>
              </article>
            ) : null}
            {stage === "conflict" ? <p id="conflict-status" tabIndex={-1} role="status">The world changed. Review the refreshed preview, then confirm again.</p> : null}
            {stage === "published" ? <p role="status">Published. It’s part of the shared world.</p> : null}
            {stage === "needs_identity" ? (
              <form onSubmit={(event) => { event.preventDefault(); void createIdentity(); }}>
                <h2>Choose a pseudonym to publish. No email is asked.</h2>
                <label htmlFor="pseudonym">Pseudonym</label>
                <input id="pseudonym" value={pseudonym} onChange={(event) => setPseudonym(event.target.value)} />
                <label><input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} /> This recovery code is shown once. If you lose access and this code, this identity cannot be recovered.</label>
                <button type="submit">Create pseudonym</button>
              </form>
            ) : null}
            {recovery ? (
              <p role="status">
                Recovery code: {recovery}
                <button type="button" onClick={() => setRecovery(null)}>I understand. I have saved the code.</button>
              </p>
            ) : null}
            {surface === "account" ? (
              <div>
                <h2>Account</h2>
                {me.signedIn ? <p>Signed in as {me.pseudonym} <button type="button" className="secondary" onClick={() => void signOut()}>Sign out</button></p> : null}
                {!me.signedIn ? (
                  <form onSubmit={(event) => { event.preventDefault(); void recover(); }}>
                    <label htmlFor="recovery">Recover with a code</label>
                    <input id="recovery" value={recoverCode} onChange={(event) => setRecoverCode(event.target.value)} autoComplete="off" />
                    <button type="submit">Recover with a code</button>
                  </form>
                ) : null}
                <label htmlFor="invite">Use invitation</label>
                <input id="invite" value={invite} onChange={(event) => setInvite(event.target.value)} />
                <button type="button" onClick={() => void redeem()}>Use invitation</button>
                {inviteNote ? <p role="status">{inviteNote}</p> : null}
                {me.role === "administrator" ? <p>Moderation is available to the administrator.</p> : null}
                <button type="button" className="secondary" onClick={() => { setSceneUnavailable(false); setSceneKey((value) => value + 1); }}>Reload illustration</button>
              </div>
            ) : null}
            {notice ? <p role="status">{notice}</p> : null}
            {stage === "invite_refused" ? <p role="alert">That invitation could not be used.</p> : null}
            {world?.returnNote ? (
              <article className="note">
                <p>{world.returnNote.text}</p>
                <p>{world.returnNote.added}</p>
                <button type="button" onClick={() => void api("/api/return/dismiss", { method: "POST", body: "{}" }).then(load)}>Dismiss</button>
              </article>
            ) : null}
          </aside>
        ) : null}
      </main>
    </>
  );
}
