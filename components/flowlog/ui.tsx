"use client";

import styles from "@/app/flowlog.module.css";
import { stockStatus } from "@/lib/flowlog/helpers";
import type { Inventory, Priority } from "@/lib/flowlog/types";

const PILL_MAP: Record<string, string> = {
  delivered: "pill-green",
  in_transit: "pill-blue",
  pending: "pill-amber",
  failed: "pill-red",
  cancelled: "pill-muted",
  assigned: "pill-blue",
  available: "pill-green",
  on_route: "pill-blue",
  maintenance: "pill-amber",
  offline: "pill-muted",
  on_duty: "pill-blue",
  off_duty: "pill-muted",
  on_leave: "pill-muted",
  received: "pill-green",
  sent: "pill-blue",
};

export function StatusPill({ status }: { status: string }) {
  const variant = PILL_MAP[status] ?? "pill-muted";
  return (
    <span className={`${styles.pill} ${styles[variant]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span
      className={`${styles["priority-dot"]} ${styles[`p-${priority}`]}`}
      title={priority}
    />
  );
}

export function StockPill({ item }: { item: Inventory }) {
  const s = stockStatus(item);
  if (s === "out")
    return (
      <span className={`${styles.pill} ${styles["pill-red"]}`}>
        Out of Stock
      </span>
    );
  if (s === "low")
    return <span className={`${styles.pill} ${styles["pill-red"]}`}>Low</span>;
  if (s === "warn")
    return (
      <span className={`${styles.pill} ${styles["pill-amber"]}`}>Warning</span>
    );
  return <span className={`${styles.pill} ${styles["pill-green"]}`}>OK</span>;
}

export function StockBar({ item }: { item: Inventory }) {
  const pct = item.maxCapacity
    ? Math.min(100, Math.round((item.currentStock / item.maxCapacity) * 100))
    : 0;
  let color = "#4ade80";
  if (pct < 25) color = "#f87171";
  else if (pct < 50) color = "#fbbf24";
  return (
    <div className={styles["stock-bar"]}>
      <div className={styles["stock-bar-track"]}>
        <div
          className={styles["stock-bar-fill"]}
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className={styles["stock-bar-val"]}>
        {item.currentStock} {item.unit}
      </span>
    </div>
  );
}

export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles["filter-pill"]} ${active ? styles.active : ""}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
