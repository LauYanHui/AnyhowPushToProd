"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/flowlog.module.css";
import { runAgentLoop } from "@/lib/flowlog/agent";
import { PROFILES } from "@/lib/flowlog/agents/profiles";
import { useFlowLog } from "@/lib/flowlog/state";
import type {
  AgentProfileId,
  ChatDisplayMessage,
} from "@/lib/flowlog/types";

const PROFILE_ORDER: AgentProfileId[] = [
  "general",
  "inbox",
  "outbox",
  "dispatch",
  "reports",
];

const WINDOW_W = 420;
const WINDOW_H = 600;
const PILL_MARGIN = 24;

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<strong key={key++}>{m[1]}</strong>);
    else if (m[2] !== undefined) parts.push(<em key={key++}>{m[2]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function Message({ msg }: { msg: ChatDisplayMessage }) {
  switch (msg.kind) {
    case "user":
      return (
        <div className={`${styles.msg} ${styles["msg-user"]}`}>
          <div className={`${styles["msg-avatar"]} ${styles.user}`}>U</div>
          <div className={styles["msg-bubble"]}>{renderInline(msg.text)}</div>
        </div>
      );
    case "ai":
      return (
        <div className={`${styles.msg} ${styles["msg-ai"]}`}>
          <div className={`${styles["msg-avatar"]} ${styles.ai}`}>AI</div>
          <div className={styles["msg-bubble"]}>{renderInline(msg.text)}</div>
        </div>
      );
    case "thinking":
      return (
        <div className={styles["thinking-block"]}>
          <div className={styles.dots}>
            <div className={styles.dot} />
            <div className={styles.dot} />
            <div className={styles.dot} />
          </div>
          Agent is working...
        </div>
      );
    case "error":
      return <div className={styles["error-block"]}>Error: {msg.text}</div>;
    // tool_call + tool_result intentionally hidden — summary-only UX
    default:
      return null;
  }
}

function ChatWindow() {
  const { state } = useFlowLog();
  const ref = useRef<HTMLDivElement>(null);
  const profileMessages = state.chat.filter(
    (m) => m.profileId === state.activeAgentProfile,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [profileMessages.length]);

  return (
    <div ref={ref} className={styles["fchat-window"]}>
      {profileMessages.length === 0 && (
        <div className={styles["fchat-empty"]}>
          Pick a profile above and ask anything — or trigger an agent from the
          dashboard, emails, or reports.
        </div>
      )}
      {profileMessages.map((m) => (
        <Message key={m.id} msg={m} />
      ))}
    </div>
  );
}

interface Pos {
  x: number;
  y: number;
}

function defaultPos(): Pos {
  if (typeof window === "undefined") return { x: 40, y: 40 };
  return {
    x: Math.max(20, window.innerWidth - WINDOW_W - PILL_MARGIN),
    y: Math.max(20, window.innerHeight - WINDOW_H - PILL_MARGIN),
  };
}

function clampPos(pos: Pos): Pos {
  if (typeof window === "undefined") return pos;
  const maxX = Math.max(0, window.innerWidth - WINDOW_W);
  const maxY = Math.max(0, window.innerHeight - 60); // leave header visible
  return {
    x: Math.min(Math.max(0, pos.x), maxX),
    y: Math.min(Math.max(0, pos.y), maxY),
  };
}

export function FloatingAgentChat() {
  const { state, dispatch, stateRef } = useFlowLog();
  const [input, setInput] = useState("");
  const [pos, setPos] = useState<Pos>(defaultPos);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<Pos>({ x: 0, y: 0 });
  const posRef = useRef<Pos>(pos);

  const activeProfile = PROFILES[state.activeAgentProfile];
  const hasInteracted = state.chat.some(
    (m) => m.profileId === state.activeAgentProfile,
  );

  useEffect(() => {
    if (state.agentPrefill) {
      setInput(state.agentPrefill);
      dispatch({ type: "SET_AGENT_PREFILL", text: null });
    }
  }, [state.agentPrefill, dispatch]);

  // Keep posRef in sync so listeners read the latest value without re-binding.
  useEffect(() => {
    posRef.current = pos;
  }, [pos]);

  // Install pointer listeners while dragging; remove them when the drag ends.
  // Using an effect keyed on `dragging` avoids the self-referential-callback
  // pitfall of inline handlers that need to remove themselves.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const next = clampPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
      posRef.current = next;
      setPos(next);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  function onHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Ignore drags originating from buttons inside the header.
    if ((e.target as HTMLElement).closest("button")) return;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
    setDragging(true);
  }

  // Reclamp on window resize so the window doesn't get orphaned off-screen.
  useEffect(() => {
    function onResize() {
      setPos((p) => clampPos(p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const api = { getState: () => stateRef.current, dispatch };

  async function send(overrideText?: string) {
    if (state.agentRunning) return;
    const text = (overrideText ?? input).trim();
    if (!text) return;
    if (!overrideText) setInput("");
    await runAgentLoop(text, api, state.activeAgentProfile);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  if (!state.chatOpen) {
    const unread = state.agentRunning ? "●" : null;
    return (
      <button
        type="button"
        className={styles["fchat-pill"]}
        onClick={() => dispatch({ type: "SET_CHAT_OPEN", open: true })}
        aria-label="Open AI agent chat"
      >
        <span className={styles["fchat-pill-icon"]}>AI</span>
        <span className={styles["fchat-pill-label"]}>Agents</span>
        {unread && <span className={styles["fchat-pill-dot"]}>{unread}</span>}
      </button>
    );
  }

  return (
    <div
      className={`${styles["fchat-window-frame"]} ${dragging ? styles.dragging : ""}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: WINDOW_W,
        height: WINDOW_H,
      }}
      role="dialog"
      aria-label="AI agents chat"
    >
      <div
        className={styles["fchat-header"]}
        onPointerDown={onHeaderPointerDown}
      >
        <div className={styles["fchat-title"]}>
          <span className={styles["fchat-title-mark"]}>AI</span>
          <span className={styles["fchat-title-text"]}>
            {activeProfile.label}
          </span>
          {state.agentRunning && (
            <span className={styles["fchat-running-dot"]} title="Running" />
          )}
        </div>
        <div className={styles["fchat-header-actions"]}>
          <button
            type="button"
            className={styles["fchat-icon-btn"]}
            onClick={() => dispatch({ type: "CLEAR_CHAT", profileId: state.activeAgentProfile })}
            title="Clear chat"
            aria-label="Clear chat"
          >
            ⟲
          </button>
          <button
            type="button"
            className={styles["fchat-icon-btn"]}
            onClick={() => dispatch({ type: "SET_CHAT_OPEN", open: false })}
            title="Minimize"
            aria-label="Minimize"
          >
            —
          </button>
        </div>
      </div>

      <div className={styles["fchat-profiles"]}>
        {PROFILE_ORDER.map((pid) => {
          const p = PROFILES[pid];
          const active = state.activeAgentProfile === pid;
          return (
            <button
              key={pid}
              type="button"
              className={`${styles["profile-pill"]} ${active ? styles.active : ""}`}
              onClick={() =>
                dispatch({ type: "SET_ACTIVE_PROFILE", profile: pid })
              }
              disabled={state.agentRunning}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {!hasInteracted && (
        <div className={styles["fchat-suggested"]}>
          {activeProfile.suggestedPrompts.map((s) => (
            <button
              key={s}
              type="button"
              className={styles["prompt-btn"]}
              onClick={() => void send(s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <ChatWindow />

      <div className={styles["fchat-input-bar"]}>
        <textarea
          className={styles["chat-textarea"]}
          placeholder={`Ask the ${activeProfile.label}...`}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          type="button"
          className={styles["chat-send-btn"]}
          onClick={() => void send()}
          disabled={state.agentRunning}
        >
          Send
        </button>
      </div>
    </div>
  );
}
