"use client";

import styles from "@/app/flowlog.module.css";
import { useFlowLog } from "@/lib/flowlog/state";
import type { TabId } from "@/lib/flowlog/types";
import {
  DashboardIcon,
  EmailIcon,
  InventoryIcon,
  OrdersIcon,
  TruckIcon,
} from "./Icons";

const NAV: Array<{ id: TabId; label: string; Icon: () => React.JSX.Element }> = [
  { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { id: "inventory", label: "Inventory", Icon: InventoryIcon },
  { id: "orders", label: "Deliveries", Icon: OrdersIcon },
  { id: "emails", label: "Emails", Icon: EmailIcon },
];

export function Sidebar() {
  const { state, dispatch } = useFlowLog();
  const { data, activeTab } = state;

  const lowInv = data.inventory.filter(
    (i) => i.currentStock <= i.reorderPoint,
  ).length;
  const pending = data.orders.filter((o) => o.status === "pending").length;
  const unread = data.emails.filter(
    (e) => e.direction === "incoming" && e.status === "unread",
  ).length;
  const drafts = data.emails.filter((e) => e.status === "draft").length;
  const emailBadge = unread + drafts;

  const badgeFor = (id: TabId): number | null => {
    if (id === "inventory") return lowInv || null;
    if (id === "orders") return pending || null;
    if (id === "emails") return emailBadge || null;
    return null;
  };

  return (
    <nav className={styles.sidebar}>
      <div className={styles["sidebar-brand"]}>
        <div className={styles["brand-icon"]}>
          <TruckIcon />
        </div>
        <div>
          <div className={styles["brand-name"]}>FlowLog AI</div>
          <div className={styles["brand-sub"]}>Food Logistics</div>
        </div>
      </div>

      <div className={styles["nav-section"]}>
        <div className={styles["nav-label"]}>Operations</div>
        {NAV.map(({ id, label, Icon }) => {
          const badge = badgeFor(id);
          return (
            <button
              key={id}
              type="button"
              className={`${styles["nav-item"]} ${activeTab === id ? styles.active : ""}`}
              onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: id })}
            >
              <Icon />
              {label}
              {badge !== null && (
                <span className={styles["nav-badge"]}>{badge}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className={styles["sidebar-footer"]}>
        {state.planLoading && (
          <button
            type="button"
            className={styles["plan-indicator"]}
            onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: "dashboard" })}
          >
            <span className={styles["plan-indicator-dot"]} />
            <span className={styles["plan-indicator-text"]}>Generating daily plan…</span>
            <span className={styles["plan-indicator-arrow"]}>→</span>
          </button>
        )}
        <div className={styles["api-key-block"]}>
          <div className={styles["api-key-label"]}>Anthropic API Key</div>
          <div className={styles["api-key-row"]}>
            <input
              type="password"
              className={styles["api-key-input"]}
              value={state.apiKey}
              onChange={(e) =>
                dispatch({ type: "SET_API_KEY", key: e.target.value })
              }
              placeholder="sk-ant-..."
              spellCheck={false}
              autoComplete="off"
              aria-label="Anthropic API key"
            />
            {state.apiKey && (
              <button
                type="button"
                className={styles["api-key-clear"]}
                onClick={() => dispatch({ type: "SET_API_KEY", key: "" })}
                aria-label="Clear API key"
                title="Clear"
              >
                ×
              </button>
            )}
          </div>
          <div className={styles["api-key-status"]}>
            {state.apiKey ? (
              <span style={{ color: "var(--green)" }}>Key set</span>
            ) : (
              <span style={{ color: "var(--hint)" }}>Required to run agents</span>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
