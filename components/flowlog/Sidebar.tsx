"use client";

import styles from "@/app/flowlog.module.css";
import { useFlowLog } from "@/lib/flowlog/state";
import type { TabId } from "@/lib/flowlog/types";
import {
  AgentIcon,
  DashboardIcon,
  EmailIcon,
  InventoryIcon,
  OrdersIcon,
  ReportsIcon,
  TruckIcon,
} from "./Icons";

const NAV: Array<{ id: TabId; label: string; Icon: () => React.JSX.Element }> = [
  { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
  { id: "inventory", label: "Inventory", Icon: InventoryIcon },
  { id: "orders", label: "Deliveries", Icon: OrdersIcon },
  { id: "emails", label: "Emails", Icon: EmailIcon },
  { id: "reports", label: "Reports", Icon: ReportsIcon },
  { id: "agent", label: "AI Agents", Icon: AgentIcon },
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
        <div className={styles["api-hint"]}>
          Agents run server-side via /api/agent. Set{" "}
          <span className={styles.mono}>ANTHROPIC_API_KEY</span> in{" "}
          <span className={styles.mono}>.env.local</span>.
        </div>
      </div>
    </nav>
  );
}
