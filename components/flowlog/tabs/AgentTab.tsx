"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/flowlog.module.css";
import { runAgentLoop } from "@/lib/flowlog/agent";
import { useFlowLog } from "@/lib/flowlog/state";
import type { ChatDisplayMessage } from "@/lib/flowlog/types";

const SUGGESTED = [
  "What items are low on stock and what will it cost to reorder them all?",
  "Which deliveries are pending? Find available drivers and assign them.",
  "Give me a full daily operations summary with any alerts.",
  "What's my expiry risk this week?",
];

function renderInline(text: string): React.ReactNode {
  // Minimal markdown: **bold** and *italic*. Avoid dangerouslySetInnerHTML.
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
  const [expanded, setExpanded] = useState(false);

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
    case "tool_call":
      return (
        <div className={styles["tool-call-block"]}>
          <div className={styles["tool-call-label"]}>▶ Tool Call</div>
          <div className={styles["tool-call-name"]}>{msg.toolName}</div>
          <div className={styles["tool-call-args"]}>
            {JSON.stringify(msg.input, null, 2)}
          </div>
        </div>
      );
    case "tool_result": {
      const result = msg.result as {
        error?: string;
        count?: number;
        success?: boolean;
      };
      const summary = result?.error
        ? `Error: ${result.error}`
        : result?.count !== undefined
          ? `${result.count} item(s) returned`
          : result?.success
            ? "Success"
            : "Result received";
      return (
        <div
          className={`${styles["tool-result-block"]} ${expanded ? styles.expanded : ""}`}
          onClick={() => setExpanded((v) => !v)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setExpanded((v) => !v);
          }}
        >
          <div className={styles["tool-result-label"]}>
            ◀ Result · {msg.toolName}
          </div>
          <div className={styles["tool-result-summary"]}>
            {summary} — click to expand
          </div>
          <div className={styles["tool-result-body"]}>
            {JSON.stringify(msg.result, null, 2)}
          </div>
        </div>
      );
    }
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
  }
}

function ChatWindow() {
  const { state } = useFlowLog();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state.chat.length]);

  return (
    <div ref={ref} className={styles["chat-window"]}>
      {state.chat.map((m) => (
        <Message key={m.id} msg={m} />
      ))}
    </div>
  );
}

export function AgentTab() {
  const { state, dispatch, stateRef } = useFlowLog();
  const [input, setInput] = useState("");
  const hasInteracted = state.chat.length > 0;

  const api = {
    getState: () => stateRef.current,
    dispatch,
  };

  async function send(overrideText?: string) {
    if (state.agentRunning) return;
    const text = (overrideText ?? input).trim();
    if (!text) return;
    if (!overrideText) setInput("");
    await runAgentLoop(text, api);
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <section className={styles["tab-agent-section"]}>
      <div className={styles["agent-header"]}>
        <h1>AI Logistics Agent</h1>
        <p>
          Ask anything. The agent can query data, create reorders, assign
          deliveries, and generate insights using live tool access.
        </p>
      </div>
      <div className={styles["capability-chips"]}>
        {[
          "Query inventory",
          "Check orders",
          "Fleet status",
          "Create reorders",
          "Assign drivers",
          "Generate reports",
        ].map((c) => (
          <span key={c} className={styles["cap-chip"]}>
            {c}
          </span>
        ))}
      </div>
      {!hasInteracted && (
        <div className={styles["suggested-row"]}>
          {SUGGESTED.map((s) => (
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
      <div className={styles["chat-input-bar"]}>
        <textarea
          className={styles["chat-textarea"]}
          placeholder="Ask your logistics agent anything..."
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
        <button
          type="button"
          className={styles["chat-clear-btn"]}
          onClick={() => dispatch({ type: "CLEAR_CHAT" })}
        >
          Clear
        </button>
      </div>
    </section>
  );
}
