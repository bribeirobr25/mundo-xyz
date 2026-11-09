import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactElement, type ReactNode } from "react";
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

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 799px)").matches);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 799px)");
    const onChange = (): void => setNarrow(query.matches);
    onChange();
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return narrow;
}

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
  const [illustrated, setIllustrated] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [inviteNote, setInviteNote] = useState<string | null>(null);
  const [recoverCode, setRecoverCode] = useState("");
  const [surface, setSurface] = useState<Surface>("none");
  const [sheet, setSheet] = useState<"peek" | "open">("open");
  const [query, setQuery] = useState("");
  const [wide, setWide] = useState(window.innerWidth >= 800);
  const [navOpen, setNavOpen] = useState(false);
  const [hint, setHint] = useState(() => {
    try {
      return sessionStorage.getItem("sw-hint") !== "off";
    } catch {
      return true;
    }
  });
  const idempotency = useRef(crypto.randomUUID());
  const confirmLock = useRef(false);
  const publishLock = useRef(false);
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
    const onLost = () => {
      setSceneUnavailable(true);
      setIllustrated(false);
    };
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
    if (!proposalId || confirmLock.current) return;
    confirmLock.current = true;
    try {
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
    } finally {
      confirmLock.current = false;
    }
  }

  async function publish() {
    if (!proposalId || !confirmKey || publishLock.current) return;
    publishLock.current = true;
    setStage("publishing");
    try {
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
    } finally {
      publishLock.current = false;
    }
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
    ? `${copy.testBannerFixture}${config.testIdentity ? ` · ${copy.testBannerIdentity}` : ""}`
    : "";
  const notice = stageNotice(stage);
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = useNarrow();
  const drafting = surface === "compose" && !preview && stage !== "confirming" && stage !== "published" && stage !== "publishing";
  const reviewing = stage === "confirming" || stage === "publishing";

  function onDockKey(event: ReactKeyboardEvent<HTMLElement>) {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-24, 0],
      ArrowRight: [24, 0],
      ArrowUp: [0, -24],
      ArrowDown: [0, 24],
    };
    const delta = step[event.key];
    if (!delta) return;
    event.preventDefault();
    panBy(delta[0], delta[1]);
  }

  function onResultKey(event: ReactKeyboardEvent<HTMLUListElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = [...event.currentTarget.querySelectorAll("button")];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (index < 0) return;
    event.preventDefault();
    const next = event.key === "ArrowDown" ? Math.min(buttons.length - 1, index + 1) : Math.max(0, index - 1);
    buttons[next]?.focus();
  }

  return (
    <>
      <a className="skip" href="#neighborhood">Skip to the neighborhood</a>
      <header className="topbar">
        <div className="brand">
          <h1>{copy.appTitle}</h1>
          {banner ? <p className="chip" role="status">{banner}</p> : null}
        </div>
        <div className="top-actions">
          <button type="button" aria-pressed={surface === "places"} aria-expanded={surface === "places"} onClick={() => openSurface("places")}>Places</button>
          <button type="button" aria-pressed={surface === "account"} aria-expanded={surface === "account"} onClick={() => openSurface("account")}>Account</button>
        </div>
      </header>
      {error ? (
        <p className="banner-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="primary" onClick={() => void load()}>{copy.retry}</button>
        </p>
      ) : null}
      {hint && surface === "none" && illustrated && !error ? (
        <p className="hint-bar">
          <span>{coarse ? "Drag to explore · Pinch to zoom" : "Drag to explore · Select a place"}</span>
          <button type="button" onClick={dismissHint}>Dismiss</button>
        </p>
      ) : null}
      <main className={panelOpen ? "world has-panel" : "world"}>
        <p className="sr-only">{arrived} {copy.exploreFree}</p>
        {!world && !error ? (
          <p className="stage-note" role="status">{copy.illustrationLoading}</p>
        ) : forceDom || sceneUnavailable ? (
          <p className="stage-note" role="status">{copy.illustrationUnavailable}</p>
        ) : world ? (
          <IllustrationBoundary fallback={<p className="stage-note" role="status">{copy.illustrationUnavailable}</p>}>
            <Suspense fallback={<p className="stage-note" role="status">{copy.illustrationLoading}</p>}>
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
                onSelect={(id) => { setSelectedId(id); setSurface("inspect"); setSheet(window.innerWidth >= 800 ? "open" : "peek"); }}
                onPan={panBy}
                onReady={() => setIllustrated(true)}
              />
            </Suspense>
          </IllustrationBoundary>
        ) : null}
        <div className="overlay">
        <div className="dock" id="neighborhood" tabIndex={-1} role="group" aria-label="World controls" onKeyDown={onDockKey}>
          {!narrow ? (
            <div className="cluster">
              <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>{copy.zoomOut}</button>
              <button type="button" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>{copy.zoomIn}</button>
              <button type="button" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>Back to café</button>
            </div>
          ) : null}
          <button type="button" aria-expanded={navOpen} aria-controls="world-nav" onClick={() => setNavOpen((value) => !value)}>Navigation</button>
          {navOpen ? (
            <div id="world-nav" className="row">
              {narrow ? (
                <>
                  <button type="button" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>{copy.zoomOut}</button>
                  <button type="button" onClick={() => setZoom((value) => Math.min(2, value + 0.25))}>{copy.zoomIn}</button>
                  <button type="button" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>Back to café</button>
                </>
              ) : null}
              <button type="button" onClick={() => setPaused((value) => !value)}>{paused ? copy.resume : copy.pause}</button>
              <button type="button" onClick={toggleReduced} aria-pressed={reduced}>{copy.reducedMotion}</button>
              <button type="button" onClick={() => panBy(-24, 0)}>{copy.panLeft}</button>
              <button type="button" onClick={() => panBy(24, 0)}>{copy.panRight}</button>
              <button type="button" onClick={() => panBy(0, -24)}>{copy.panUp}</button>
              <button type="button" onClick={() => panBy(0, 24)}>{copy.panDown}</button>
            </div>
          ) : null}
        </div>
        {surface === "none" && !error ? (
          <button type="button" className="primary add-idea" onClick={() => openSurface("compose")}>{copy.addIdea}</button>
        ) : null}
        </div>
        {panelOpen ? (
          <aside className={sheet === "peek" ? "panel peek" : "panel"} aria-label="Neighborhood details">
            <div className="sheet-bar">
              <button type="button" onClick={() => setSheet("open")} aria-pressed={sheet === "open"}>Expand</button>
              <button type="button" onClick={() => setSheet("peek")} aria-pressed={sheet === "peek"}>Collapse</button>
              <button type="button" className="close" onClick={() => setSurface("none")}>Close</button>
            </div>
            {stage === "published" || stage === "already_published" ? <p className="status success" role="status">{stage === "published" ? copy.published : copy.alreadyPublished}</p> : null}
            {reviewing ? (
              <article className="note">
                <h2>{copy.publishQuestion}</h2>
                <p>{copy.publishExplain}</p>
                {preview ? <p className="preview-name">{preview.name}</p> : null}
                <h3>{copy.policyHeading}</h3>
                <p>{world?.policy}</p>
                <div className="row">
                  <button type="button" className="primary" disabled={stage === "publishing"} onClick={() => void publish()}>{copy.publish}</button>
                  <button type="button" onClick={() => { setStage("preview"); setSurface("compose"); }}>{copy.keepEditing}</button>
                </div>
              </article>
            ) : null}
            {stage === "conflict" ? <p id="conflict-status" className="status" tabIndex={-1} role="status">{copy.conflict}</p> : null}
            {notice ? <p className="status" role="status">{notice}</p> : null}
            {stage === "invite_refused" ? <p className="status danger" role="alert">{copy.inviteRefused}</p> : null}
            {recovery ? (
              <p className="status" role="status">
                Recovery code: {recovery}
                <button type="button" className="primary" onClick={() => setRecovery(null)}>{copy.iUnderstand}</button>
              </p>
            ) : null}
            {!reviewing && surface === "places" ? (
              <div className="stack">
                <h2>Places</h2>
                <label htmlFor="place-search">Search places</label>
                <input
                  id="place-search"
                  value={query}
                  placeholder="Search places"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowDown") return;
                    event.preventDefault();
                    document.querySelector<HTMLButtonElement>("#place-results button")?.focus();
                  }}
                />
                <p className="meta">{world ? `${listed.length} ${listed.length === 1 ? "place" : "places"}` : error ? "The world could not be loaded." : copy.illustrationLoading}</p>
                <ul id="place-results" className="list" onKeyDown={onResultKey}>
                  {listed.map((object) => (
                    <li key={object.id}>
                      <button type="button" aria-current={object.id === selectedId ? "true" : undefined} onClick={() => { setSelectedId(object.id); setSurface("inspect"); }}>
                        <span className="place-name">{object.name}</span>
                        <span className="place-meta">{object.administrator ? copy.administrator : object.authorLabel ?? ""}{object.notPublic ? ` · ${copy.notPublic}` : ""}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                {world && !world.objects.length ? <p>This world has no places yet.</p> : null}
                {world && world.objects.length > 0 && !listed.length ? <p>No place matches that search.</p> : null}
              </div>
            ) : null}
            {!reviewing && surface === "inspect" && selected ? (
              <article className="stack">
                <button type="button" className="back" onClick={() => setSurface("places")}>Back</button>
                <h2>{selected.name}</h2>
                {selected.sentence ? <p>{selected.sentence}</p> : null}
                {selected.authorLabel ? <p className="meta">Created by {selected.authorLabel}.</p> : null}
                <div className="row">
                  <button type="button" className="primary" onClick={() => openSurface("compose")}>{copy.addIdea}</button>
                  <button type="button" onClick={() => void navigator.clipboard.writeText(`${origin}/c/${selected.id}`)}>{copy.copyLink}</button>
                </div>
                {selected.history && sheet === "open" ? (
                  <details>
                    <summary>What changed</summary>
                    <p>{selected.history}</p>
                  </details>
                ) : null}
              </article>
            ) : null}
            {!reviewing && surface === "account" ? (
              <div className="stack">
                <h2>Account</h2>
                {me.signedIn ? (
                  <p className="signed-in">
                    <span>{copy.signedInAs.replaceAll("{name}", me.pseudonym ?? "")}</span>
                    <button type="button" onClick={() => void signOut()}>{copy.signOut}</button>
                  </p>
                ) : (
                  <form className="stack" onSubmit={(event) => { event.preventDefault(); void recover(); }}>
                    <label htmlFor="recovery">{copy.recover}</label>
                    <input id="recovery" value={recoverCode} onChange={(event) => setRecoverCode(event.target.value)} autoComplete="off" />
                    <button type="submit" className="primary">{copy.recover}</button>
                  </form>
                )}
                <label htmlFor="invite">{copy.redeemInvite}</label>
                <input id="invite" value={invite} onChange={(event) => setInvite(event.target.value)} autoComplete="off" />
                <button type="button" className="primary" onClick={() => void redeem()}>{copy.redeemInvite}</button>
                {inviteNote ? <p role="status">{inviteNote}</p> : null}
                <p className="meta">A recovery code is shown once when it is created. This screen cannot reveal a code you did not just receive.</p>
                {me.role === "administrator" ? <p>Moderation is available to the administrator.</p> : null}
                <button type="button" onClick={() => { setSceneUnavailable(false); setIllustrated(false); setSceneKey((value) => value + 1); }}>Reload illustration</button>
              </div>
            ) : null}
            {drafting ? (
              <form className="stack" onSubmit={(event) => { event.preventDefault(); void interpret(text); }}>
                <p className="meta">{selected ? `Adding to ${selected.name}.` : copy.startHere}</p>
                <label htmlFor="composer">{copy.whatAdd}</label>
                <textarea
                  id="composer"
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  maxLength={1000}
                  onFocus={(event) => event.currentTarget.scrollIntoView({ block: "nearest" })}
                />
                <p className="meta">{copy.charCount.replaceAll("{n}", String(text.length)).replaceAll("{max}", String(config?.promptMaxGraphemes ?? 250))}</p>
                <p className="meta">{copy.describe}</p>
                <p className="meta">{copy.ideasYouCanTry}</p>
                <div className="row">
                  {suggestions.map((idea) => (
                    <button key={idea} type="button" onClick={() => { setText(idea); void interpret(idea); }}>{idea}</button>
                  ))}
                </div>
                <button type="submit" className="primary" disabled={stage === "interpreting"}>Preview idea</button>
              </form>
            ) : null}
            {!reviewing && preview && stage !== "published" ? (
              <article className="note" tabIndex={-1} id="preview-heading">
                <h2>{copy.privatePreview}</h2>
                <p>{copy.understood}</p>
                <p className="preview-name">{preview.name}</p>
                <div className="row">
                  <button type="button" className="primary" onClick={() => void confirm()}>{copy.looksRight}</button>
                  <button type="button" onClick={() => { setPreview(null); setStage("ready"); setSurface("compose"); requestAnimationFrame(() => document.getElementById("composer")?.focus()); }}>{copy.editIdea}</button>
                  <button type="button" onClick={() => proposalId && void api(`/api/proposals/${proposalId}/discard`, { method: "POST", body: "{}" }).then(() => { setPreview(null); setText(""); setStage("discarded"); })}>{copy.discard}</button>
                </div>
              </article>
            ) : null}
            {stage === "needs_identity" ? (
              <form className="stack" onSubmit={(event) => { event.preventDefault(); void createIdentity(); }}>
                <h2>{copy.needsIdentity}</h2>
                <label htmlFor="pseudonym">{copy.pseudonym}</label>
                <input id="pseudonym" value={pseudonym} onChange={(event) => setPseudonym(event.target.value)} autoComplete="nickname" />
                <label className="check"><input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} /> {copy.recoveryWarning}</label>
                <button type="submit" className="primary">{copy.createIdentity}</button>
              </form>
            ) : null}
            {world?.returnNote ? (
              <article className="note">
                <p>{world.returnNote.text}</p>
                <p className="meta">{world.returnNote.added}</p>
                <button type="button" onClick={() => void api("/api/return/dismiss", { method: "POST", body: "{}" }).then(load)}>{copy.dismissReturn}</button>
              </article>
            ) : null}
          </aside>
        ) : null}
      </main>
    </>
  );
}
