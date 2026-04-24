"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/flowlog.module.css";
import { runAgentLoop } from "@/lib/flowlog/agent";
import { fmtTime, fmtDate } from "@/lib/flowlog/helpers";
import { useFlowLog } from "@/lib/flowlog/state";
import type { Email } from "@/lib/flowlog/types";
import { PriorityDot, StatusPill } from "../ui";

type View = "inbox" | "drafts" | "sent";

function classifyView(e: Email): View {
  if (e.direction === "incoming") return "inbox";
  if (e.status === "draft") return "drafts";
  return "sent";
}

function categoryLabel(cat: Email["category"]): string {
  return cat.replace(/_/g, " ");
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return fmtDate(iso);
}

function EmailRow({
  email,
  selected,
  onClick,
}: {
  email: Email;
  selected: boolean;
  onClick: () => void;
}) {
  const unread = email.status === "unread";
  const isDraft = email.status === "draft";
  return (
    <button
      type="button"
      className={`${styles["email-row"]} ${selected ? styles.active : ""} ${unread ? styles.unread : ""}`}
      onClick={onClick}
    >
      <div className={styles["email-row-head"]}>
        {unread && <span className={styles["email-unread-dot"]} />}
        <span className={styles["email-row-from"]}>
          {email.direction === "incoming" ? email.from : `To: ${email.to}`}
        </span>
        <span className={styles["email-row-time"]}>
          {relativeTime(email.receivedAt)}
        </span>
      </div>
      <div className={styles["email-row-subject"]}>{email.subject}</div>
      <div className={styles["email-row-meta"]}>
        <span
          className={`${styles["email-cat-chip"]} ${styles[`cat-${email.category}`]}`}
        >
          {categoryLabel(email.category)}
        </span>
        {isDraft && (
          <span className={styles["email-draft-chip"]}>DRAFT · agent</span>
        )}
        {email.relatedOrderId && (
          <span className={styles["email-row-order"]}>
            {email.relatedOrderId}
          </span>
        )}
      </div>
    </button>
  );
}

function EmailList({
  view,
  emails,
  selectedId,
  onSelect,
  onDiscard,
}: {
  view: View;
  emails: Email[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDiscard?: (id: string) => void;
}) {
  const filtered = emails
    .filter((e) => classifyView(e) === view)
    .sort(
      (a, b) =>
        new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
    );

  if (!filtered.length) {
    return (
      <div className={styles["email-list-empty"]}>
        {view === "inbox"
          ? "Inbox is empty."
          : view === "drafts"
            ? "No drafts yet — chat with the Outbox Agent to compose one."
            : "No sent messages yet."}
      </div>
    );
  }

  return (
    <div className={styles["email-list"]}>
      {filtered.map((e) => (
        <div key={e.id} className={view === "drafts" ? styles["email-row-wrap"] : undefined}>
          <EmailRow
            email={e}
            selected={selectedId === e.id}
            onClick={() => onSelect(e.id)}
          />
          {view === "drafts" && onDiscard && (
            <div className={styles["email-draft-row-actions"]}>
              <button
                type="button"
                className={`${styles.btn} ${styles["btn-sm"]}`}
                onClick={() => onDiscard(e.id)}
              >
                Discard
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RelatedOrderCard({ orderId }: { orderId: string }) {
  const { state } = useFlowLog();
  const order = state.data.orders.find((o) => o.id === orderId);
  if (!order) return null;
  const driver = state.data.drivers.find(
    (d) => d.id === order.assignedDriverId,
  );
  const vehicle = state.data.vehicles.find(
    (v) => v.id === order.assignedVehicleId,
  );
  return (
    <div className={styles["email-context"]}>
      <div className={styles["email-context-label"]}>Related order</div>
      <div className={styles["email-context-head"]}>
        <span className={styles["order-id"]}>{order.id}</span>
        <PriorityDot priority={order.priority} />
        <span className={styles["order-customer"]}>{order.customerName}</span>
        <StatusPill status={order.status} />
      </div>
      <div className={styles["email-context-grid"]}>
        <div>
          <div className={styles["order-meta-lbl"]}>Window</div>
          <div className={styles["order-meta-val"]}>
            {fmtTime(order.deliveryWindow.earliest)}–
            {fmtTime(order.deliveryWindow.latest)}
          </div>
        </div>
        <div>
          <div className={styles["order-meta-lbl"]}>Driver</div>
          <div className={styles["order-meta-val"]}>
            {driver?.name ?? "— unassigned"}
          </div>
        </div>
        <div>
          <div className={styles["order-meta-lbl"]}>Vehicle</div>
          <div className={styles["order-meta-val"]}>
            {vehicle?.plateNumber ?? "—"}
          </div>
        </div>
        <div>
          <div className={styles["order-meta-lbl"]}>Value</div>
          <div className={`${styles["order-meta-val"]} ${styles.mono}`}>
            ${order.totalValue.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmailBody({ email }: { email: Email }) {
  const { state, dispatch, stateRef } = useFlowLog();
  const api = { getState: () => stateRef.current, dispatch };
  const [busy, setBusy] = useState(false);

  async function triageWithInboxAgent() {
    if (state.agentRunning) return;
    setBusy(true);
    dispatch({ type: "SET_CHAT_OPEN", open: true });
    await runAgentLoop(
      `Triage incoming email ${email.id}. Read it, pull related order/supplier context, and either draft a reply with draft_email_reply or mark_email_handled if no reply is needed.`,
      api,
      "inbox",
      { mode: "ephemeral" },
    );
    setBusy(false);
  }

  async function approveAndSend() {
    if (state.agentRunning) return;
    setBusy(true);
    dispatch({ type: "SET_CHAT_OPEN", open: true });
    await runAgentLoop(
      `Send the draft email ${email.id} now. Use send_email with email_id="${email.id}".`,
      api,
      "outbox",
      { mode: "ephemeral" },
    );
    setBusy(false);
  }

  function discardDraft() {
    dispatch({ type: "DELETE_EMAIL", id: email.id });
  }

  const isDraft = email.status === "draft";
  const isIncoming = email.direction === "incoming";

  return (
    <div className={styles["email-body"]}>
      <div className={styles["email-body-head"]}>
        <div className={styles["email-body-subject"]}>{email.subject}</div>
        <div className={styles["email-body-meta"]}>
          <div>
            <span className={styles.mono}>{email.from}</span>
            <span className={styles["text-hint"]}> → </span>
            <span className={styles.mono}>{email.to}</span>
          </div>
          <div className={styles["text-hint"]}>
            {new Date(email.receivedAt).toLocaleString("en-SG")}
            {" · "}
            <StatusPill status={email.status} />
          </div>
        </div>
      </div>

      {isDraft && email.draftedBy === "agent" && (
        <div className={styles["email-agent-banner"]}>
          <strong>Drafted by Inbox Agent</strong> — review, then approve to
          send or discard.
          <div className={styles["email-agent-actions"]}>
            <button
              type="button"
              className={`${styles.btn} ${styles["btn-accent"]} ${styles["btn-sm"]}`}
              onClick={() => void approveAndSend()}
              disabled={busy || state.agentRunning}
            >
              Approve &amp; send
            </button>
            <button
              type="button"
              className={`${styles.btn} ${styles["btn-sm"]}`}
              onClick={discardDraft}
              disabled={busy || state.agentRunning}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {isIncoming && email.status !== "handled" && (
        <div className={styles["email-toolbar"]}>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-accent"]} ${styles["btn-sm"]}`}
            onClick={() => void triageWithInboxAgent()}
            disabled={busy || state.agentRunning}
          >
            Run Inbox Agent on this email
          </button>
          {email.status === "unread" && (
            <span className={styles["text-hint"]}>
              The agent will read, pull context, and draft a reply.
            </span>
          )}
        </div>
      )}

      <pre className={styles["email-body-text"]}>{email.body}</pre>

      {email.relatedOrderId && (
        <RelatedOrderCard orderId={email.relatedOrderId} />
      )}

      {email.agentNotes && (
        <div className={styles["email-agent-notes"]}>
          <div className={styles["email-context-label"]}>Agent notes</div>
          <div>{email.agentNotes}</div>
        </div>
      )}
    </div>
  );
}

const CHAT_MIN = 2;
const CHAT_MAX = 500;

function validateChatInput(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length < CHAT_MIN)
    return "Message is too short.";
  if (trimmed.length > CHAT_MAX)
    return `Too long — keep it under ${CHAT_MAX} characters.`;
  if (/<[a-z!][\s\S]*?>/i.test(trimmed))
    return "HTML tags are not allowed.";
  if (/javascript:|<script|on\w+\s*=/i.test(trimmed))
    return "Message contains disallowed content.";
  if (!/[a-z0-9]/i.test(trimmed))
    return "Message must contain readable text.";
  return null;
}

function OutboxMessage({ msg }: { msg: import("@/lib/flowlog/types").ChatDisplayMessage }) {
  if (msg.kind === "user") {
    return (
      <div className={`${styles.msg} ${styles["msg-user"]}`}>
        <div className={`${styles["msg-avatar"]} ${styles.user}`}>U</div>
        <div className={styles["msg-bubble"]}>{msg.text}</div>
      </div>
    );
  }
  if (msg.kind === "ai") {
    return (
      <div className={`${styles.msg} ${styles["msg-ai"]}`}>
        <div className={`${styles["msg-avatar"]} ${styles.ai}`}>AI</div>
        <div className={styles["msg-bubble"]}>{msg.text}</div>
      </div>
    );
  }
  if (msg.kind === "thinking") {
    return (
      <div className={styles["thinking-block"]}>
        <div className={styles.dots}>
          <div className={styles.dot} />
          <div className={styles.dot} />
          <div className={styles.dot} />
        </div>
        Composing...
      </div>
    );
  }
  if (msg.kind === "error") {
    return <div className={styles["error-block"]}>Error: {msg.text}</div>;
  }
  if (msg.kind === "tool_call" || msg.kind === "tool_result") {
    const icon = msg.kind === "tool_call" ? "▶" : "✓";
    return (
      <div className={styles["tool-call-block"]} style={{ padding: "5px 10px" }}>
        <div className={styles["tool-call-label"]} style={{ marginBottom: 0 }}>
          {icon} {msg.toolName}
        </div>
      </div>
    );
  }
  return null;
}

function OutboxChatPanel() {
  const { state, dispatch, stateRef } = useFlowLog();
  const messagesRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const api = { getState: () => stateRef.current, dispatch };

  const outboxMessages = state.chat.filter((m) => m.profileId === "outbox");

  const pendingDraft = [...state.data.emails]
    .reverse()
    .find((e) => e.status === "draft" && e.draftedBy === "agent");

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [outboxMessages.length]);

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    if (validationError) setValidationError(null);
  }

  async function send() {
    if (state.agentRunning) return;
    const error = validateChatInput(input);
    if (error) { setValidationError(error); return; }
    setValidationError(null);
    const text = input.trim();
    setInput("");
    await runAgentLoop(text, api, "outbox");
  }

  async function sendDraft(id: string) {
    if (state.agentRunning) return;
    await runAgentLoop(
      `Send the draft email ${id} now. Use send_email with email_id="${id}".`,
      api,
      "outbox",
    );
  }

  const charCount = input.length;
  const isOver = charCount > CHAT_MAX;

  return (
    <div className={styles["outbox-chat-panel"]}>
      <div className={styles["outbox-chat-header"]}>
        <span>Outbox Agent</span>
        {outboxMessages.length > 0 && (
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-sm"]}`}
            onClick={() => dispatch({ type: "CLEAR_CHAT" })}
            disabled={state.agentRunning}
          >
            Clear
          </button>
        )}
      </div>

      {outboxMessages.length === 0 ? (
        <div className={styles["outbox-chat-empty"]}>
          <div>Describe the email you want to send.</div>
          <div className={styles["text-hint"]} style={{ fontSize: "11px" }}>
            e.g. &ldquo;Draft an ETA update for the Changi Airport order&rdquo; — the agent will ask if it needs more details.
          </div>
        </div>
      ) : (
        <div ref={messagesRef} className={styles["outbox-chat-messages"]}>
          {outboxMessages.map((m) => (
            <OutboxMessage key={m.id} msg={m} />
          ))}
        </div>
      )}

      {pendingDraft && (
        <div className={styles["outbox-draft-banner"]}>
          <span className={styles["outbox-draft-banner-label"]}>Draft ready:</span>
          <span className={styles["outbox-draft-subject"]}>{pendingDraft.subject}</span>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-accent"]} ${styles["btn-sm"]}`}
            onClick={() => void sendDraft(pendingDraft.id)}
            disabled={state.agentRunning}
          >
            Send email
          </button>
        </div>
      )}

      <div className={styles["outbox-chat-input-wrap"]}>
        <div className={styles["outbox-chat-input-row"]}>
          <textarea
            className={`${styles["outbox-chat-textarea"]} ${validationError ? styles.invalid : ""}`}
            placeholder="Describe what to compose, or ask a follow-up…"
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            disabled={state.agentRunning}
            aria-invalid={validationError ? true : undefined}
          />
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-accent"]} ${styles["btn-sm"]}`}
            onClick={() => void send()}
            disabled={state.agentRunning || isOver || !input.trim()}
          >
            Send
          </button>
        </div>
        <div className={styles["outbox-chat-meta"]}>
          {validationError ? (
            <span className={styles["compose-error"]}>{validationError}</span>
          ) : (
            <span className={styles["text-hint"]} style={{ fontSize: "10px" }}>
              Enter to send · Shift+Enter for new line
            </span>
          )}
          {charCount > 0 && (
            <span className={`${styles["compose-count"]} ${isOver ? styles.over : ""}`}>
              {charCount}/{CHAT_MAX}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmailTab() {
  const { state, dispatch } = useFlowLog();
  const { emails } = state.data;
  const [view, setView] = useState<View>("inbox");

  function handleDiscard(id: string) {
    dispatch({ type: "DELETE_EMAIL", id });
  }

  const counts = useMemo(() => {
    const c: Record<View, number> = { inbox: 0, drafts: 0, sent: 0 };
    const unreadByView: Record<View, number> = { inbox: 0, drafts: 0, sent: 0 };
    for (const e of emails) {
      const v = classifyView(e);
      c[v]++;
      if (e.status === "unread") unreadByView[v]++;
    }
    return { c, unreadByView };
  }, [emails]);

  const selectedEmail = emails.find((e) => e.id === state.selectedEmailId);

  function selectEmail(id: string) {
    const email = emails.find((e) => e.id === id);
    if (email) setView(classifyView(email));
    dispatch({ type: "SET_SELECTED_EMAIL", id });
  }

  const statusFilters: Array<{ view: View; label: string }> = [
    { view: "inbox", label: "Inbox" },
    { view: "drafts", label: "Drafts" },
    { view: "sent", label: "Sent" },
  ];

  return (
    <section className={styles["tab-section"]}>
      <div className={styles["page-header"]}>
        <div>
          <h1>Email</h1>
          <div className={styles["page-subtitle"]}>
            Operations mailbox: <span className={styles.mono}>tansq05@gmail.com</span>{" "}
            · Inbox Agent triages incoming · Outbox Agent drafts outgoing
          </div>
        </div>
      </div>

      <div className={styles["email-filters"]}>
        {statusFilters.map((f) => {
          const badge = counts.c[f.view];
          const unread = counts.unreadByView[f.view];
          return (
            <button
              key={f.view}
              type="button"
              className={`${styles["filter-pill"]} ${view === f.view ? styles.active : ""}`}
              onClick={() => setView(f.view)}
            >
              {f.label}
              {badge > 0 && (
                <span className={styles["filter-pill-count"]}>
                  {unread > 0 ? `${unread}/${badge}` : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles["email-layout"]}>
        <div className={styles["email-left"]}>
          <EmailList
            view={view}
            emails={emails}
            selectedId={state.selectedEmailId}
            onSelect={selectEmail}
            onDiscard={view === "drafts" ? handleDiscard : undefined}
          />
        </div>
        {view === "drafts" ? (
          <OutboxChatPanel />
        ) : (
          <div className={styles["email-right"]}>
            {selectedEmail ? (
              <EmailBody email={selectedEmail} />
            ) : (
              <div className={styles["empty-state"]}>
                Select an email to view details.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export function unreadEmailCount(emails: Email[]): number {
  return emails.filter(
    (e) => e.direction === "incoming" && e.status === "unread",
  ).length;
}
