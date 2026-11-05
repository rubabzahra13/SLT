import { ApiClientError, invalidateInflightGets } from "./client";
import { subscribeStudioStream, type StudioStreamEvent } from "./studio-stream";

export type LiveStreamEvent =
  | { type: "ready"; reconnect: boolean; downMs: number }
  | Exclude<StudioStreamEvent, { type: "ready" }>;

type Listener = (event: LiveStreamEvent) => void;

/**
 * One SSE per tab, shared by AppState + boards. Each open stream is a
 * long-running function (provisioned memory), so background tabs drop it.
 */
const HIDDEN_DISCONNECT_MS = 8_000;
/** Route remounts unsubscribe then resubscribe within a frame or two. */
const IDLE_DISCONNECT_MS = 2_000;

const listeners = new Set<Listener>();
let controller: AbortController | null = null;
let everReady = false;
let downSince: number | null = null;
let attempt = 0;
let retryTimer: number | null = null;
let hiddenTimer: number | null = null;
let idleTimer: number | null = null;
let pausedHidden = false;
let unauthorized = false;
let visibilityBound = false;

function dispatch(event: LiveStreamEvent) {
  for (const listener of Array.from(listeners)) {
    try {
      listener(event);
    } catch {
      /* one bad listener must not break the others */
    }
  }
}

function clearRetry() {
  if (retryTimer != null) {
    window.clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function disconnect() {
  clearRetry();
  if (controller) {
    controller.abort();
    controller = null;
    if (downSince == null) downSince = Date.now();
  }
}

function connect() {
  if (controller || retryTimer != null) return;
  if (listeners.size === 0 || pausedHidden || unauthorized) return;
  const ac = new AbortController();
  controller = ac;
  void subscribeStudioStream((event) => {
    if (event.type === "ready") {
      const reconnect = everReady;
      const downMs = downSince != null ? Date.now() - downSince : 0;
      everReady = true;
      downSince = null;
      attempt = 0;
      if (reconnect) invalidateInflightGets();
      dispatch({ type: "ready", reconnect, downMs });
      return;
    }
    invalidateInflightGets();
    dispatch(event);
  }, ac.signal)
    .then(
      () => null,
      (err: unknown) => err
    )
    .then((err) => {
      if (controller === ac) controller = null;
      if (ac.signal.aborted) return;
      if (downSince == null) downSince = Date.now();
      if (err instanceof ApiClientError && err.status === 401) {
        unauthorized = true;
        return;
      }
      attempt += 1;
      const delay = Math.min(30_000, 800 * 2 ** Math.min(attempt, 5));
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    });
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    if (hiddenTimer != null) return;
    hiddenTimer = window.setTimeout(() => {
      hiddenTimer = null;
      pausedHidden = true;
      disconnect();
    }, HIDDEN_DISCONNECT_MS);
    return;
  }
  if (hiddenTimer != null) {
    window.clearTimeout(hiddenTimer);
    hiddenTimer = null;
  }
  if (pausedHidden) {
    pausedHidden = false;
    attempt = 0;
    connect();
  }
}

/** Subscribe to the shared studio stream. Returns an unsubscribe function. */
export function subscribeLiveStream(listener: Listener): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener("visibilitychange", onVisibilityChange);
  }
  listeners.add(listener);
  if (idleTimer != null) {
    window.clearTimeout(idleTimer);
    idleTimer = null;
  }
  if (document.visibilityState === "hidden" && !controller) {
    pausedHidden = true;
  }
  connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || idleTimer != null) return;
    idleTimer = window.setTimeout(() => {
      idleTimer = null;
      if (listeners.size === 0) disconnect();
    }, IDLE_DISCONNECT_MS);
  };
}
