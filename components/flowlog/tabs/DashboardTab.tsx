"use client";

import styles from "@/app/flowlog.module.css";
import {
  fmtCurrency,
  fmtDate,
  fmtTime,
  getDriver,
  withinNextDays,
  orderIsUpcomingWithinMinutes,
} from "@/lib/flowlog/helpers";
import { useFlowLog } from "@/lib/flowlog/state";
import type { TabId } from "@/lib/flowlog/types";
import { PriorityDot, StatusPill } from "../ui";

interface Alert {
  level: "crit" | "warn";
  text: string;
  action: string | null;
  tab: TabId | null;
}

function useAlerts(): Alert[] {
  const { state } = useFlowLog();
  const { data } = state;
  const today = new Date();
  const alerts: Alert[] = [];

  data.inventory
    .filter((i) => i.currentStock === 0)
    .forEach((i) =>
      alerts.push({
        level: "crit",
        text: `${i.name} is OUT OF STOCK`,
        action: "View Inventory",
        tab: "inventory",
      }),
    );

  data.inventory.forEach((i) =>
    i.expiryDates.forEach((e) => {
      if (withinNextDays(e.expiresOn, today, 3)) {
        alerts.push({
          level: "crit",
          text: `${i.name} — ${e.qty} ${i.unit}s expire ${fmtDate(e.expiresOn)}`,
          action: "Ask Agent",
          tab: "agent",
        });
      } else if (withinNextDays(e.expiresOn, today, 7)) {
        alerts.push({
          level: "warn",
          text: `${i.name} — ${e.qty} ${i.unit}s expire ${fmtDate(e.expiresOn)}`,
          action: "Ask Agent",
          tab: "agent",
        });
      }
    }),
  );

  data.inventory
    .filter((i) => i.currentStock > 0 && i.currentStock <= i.reorderPoint)
    .forEach((i) =>
      alerts.push({
        level: "warn",
        text: `${i.name} below reorder point (${i.currentStock}/${i.reorderPoint} ${i.unit})`,
        action: "Reorder",
        tab: "agent",
      }),
    );

  data.orders
    .filter((o) => o.status === "pending")
    .forEach((o) => {
      if (orderIsUpcomingWithinMinutes(o, today, 120, -30)) {
        alerts.push({
          level: "crit",
          text: `Unassigned ${o.id} delivery window starts in <2h — ${o.customerName}`,
          action: "Assign Now",
          tab: "agent",
        });
      }
    });

  data.vehicles
    .filter((v) => withinNextDays(v.nextServiceDue, today, 7))
    .forEach((v) =>
      alerts.push({
        level: "warn",
        text: `${v.plateNumber} service due ${fmtDate(v.nextServiceDue)}`,
        action: null,
        tab: null,
      }),
    );

  return alerts.sort((a, b) =>
    a.level === "crit" ? -1 : b.level === "crit" ? 1 : 0,
  );
}

function Kpis() {
  const { state } = useFlowLog();
  const { data } = state;
  const today = new Date();
  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);

  const invValue = data.inventory.reduce(
    (s, i) => s + i.currentStock * i.costPerUnit,
    0,
  );
  const lowStock = data.inventory.filter(
    (i) => i.currentStock <= i.reorderPoint,
  ).length;
  const activeDeliveries = data.orders.filter(
    (o) => o.status === "in_transit",
  ).length;
  const expiryRisk = data.inventory.reduce(
    (s, i) =>
      s +
      i.expiryDates
        .filter(
          (e) =>
            new Date(e.expiresOn) <= in7 && new Date(e.expiresOn) >= today,
        )
        .reduce((a, e) => a + e.qty * i.costPerUnit, 0),
    0,
  );

  return (
    <div className={styles["kpi-row"]}>
      <div className={styles["kpi-card"]}>
        <div className={styles["kpi-val"]}>{fmtCurrency(invValue)}</div>
        <div className={styles["kpi-lbl"]}>Inventory Value</div>
        <div className={styles["kpi-sub"]}>
          {data.inventory.length} items tracked
        </div>
      </div>
      <div
        className={`${styles["kpi-card"]} ${lowStock > 0 ? styles.warn : styles.good}`}
      >
        <div className={styles["kpi-val"]}>{lowStock}</div>
        <div className={styles["kpi-lbl"]}>Low Stock Items</div>
        <div className={styles["kpi-sub"]}>At or below reorder point</div>
      </div>
      <div className={`${styles["kpi-card"]} ${styles.good}`}>
        <div className={styles["kpi-val"]}>{activeDeliveries}</div>
        <div className={styles["kpi-lbl"]}>Active Deliveries</div>
        <div className={styles["kpi-sub"]}>In transit now</div>
      </div>
      <div
        className={`${styles["kpi-card"]} ${expiryRisk > 0 ? styles.danger : styles.good}`}
      >
        <div className={styles["kpi-val"]}>{fmtCurrency(expiryRisk)}</div>
        <div className={styles["kpi-lbl"]}>Expiry Risk Value</div>
        <div className={styles["kpi-sub"]}>Expiring within 7 days</div>
      </div>
    </div>
  );
}

function AlertsCard() {
  const { dispatch } = useFlowLog();
  const alerts = useAlerts();
  if (!alerts.length) {
    return (
      <div className={styles.card}>
        <div className={styles["empty-state"]}>
          No active alerts — operations nominal
        </div>
      </div>
    );
  }
  return (
    <div className={styles.card}>
      {alerts.slice(0, 8).map((a, i) => (
        <div key={i} className={styles["alert-row"]}>
          <div className={`${styles["alert-icon"]} ${styles[a.level]}`}>
            {a.level === "crit" ? "!" : "▲"}
          </div>
          <div className={styles["alert-text"]}>{a.text}</div>
          {a.action && a.tab && (
            <button
              type="button"
              className={styles["alert-action"]}
              onClick={() =>
                dispatch({ type: "SET_ACTIVE_TAB", tab: a.tab as TabId })
              }
            >
              {a.action}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function FleetCard() {
  const { state } = useFlowLog();
  const { data } = state;
  return (
    <div className={styles.card}>
      {data.vehicles.map((v) => {
        const driver = getDriver(data, v.currentDriverId);
        const fuelColor =
          v.fuelLevelPct < 25
            ? "var(--red)"
            : v.fuelLevelPct < 50
              ? "var(--amber)"
              : "var(--muted)";
        return (
          <div key={v.id} className={styles["fleet-row"]}>
            <span className={styles["fleet-plate"]}>{v.plateNumber}</span>
            <StatusPill status={v.status} />
            <span className={styles["fleet-loc"]}>
              {driver && `${driver.name} · `}
              <span style={{ color: "var(--hint)" }}>{v.currentLocation}</span>
            </span>
            <span
              className={styles["fleet-fuel"]}
              style={{ color: fuelColor }}
            >
              {v.fuelLevelPct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RecentDeliveries() {
  const { state } = useFlowLog();
  const { data } = state;
  const recent = data.orders.slice().reverse().slice(0, 8);
  return (
    <div className={styles.card}>
      <table className={styles.tbl}>
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Driver</th>
            <th>Value</th>
            <th>Window</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((o) => {
            const driver = getDriver(data, o.assignedDriverId);
            return (
              <tr key={o.id}>
                <td className={styles["tbl-mono"]}>{o.id}</td>
                <td>
                  <PriorityDot priority={o.priority} /> {o.customerName}
                </td>
                <td>
                  <StatusPill status={o.status} />
                </td>
                <td style={{ color: "var(--muted)", fontSize: 12 }}>
                  {driver?.name ?? "—"}
                </td>
                <td className={styles["tbl-mono"]}>
                  {fmtCurrency(o.totalValue)}
                </td>
                <td style={{ fontSize: 12, color: "var(--muted)" }}>
                  {fmtTime(o.deliveryWindow.earliest)}–
                  {fmtTime(o.deliveryWindow.latest)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardTab() {
  const dateStr = new Date().toLocaleDateString("en-SG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <section className={styles["tab-section"]}>
      <div className={styles["page-header"]}>
        <div>
          <h1>Operations Dashboard</h1>
          <div className={styles["dash-date"]}>{dateStr}</div>
        </div>
      </div>
      <Kpis />
      <div className={styles["two-col"]}>
        <div>
          <div className={styles["sec-lbl"]} style={{ marginTop: 0 }}>
            Alerts &amp; Actions
          </div>
          <AlertsCard />
        </div>
        <div>
          <div className={styles["sec-lbl"]} style={{ marginTop: 0 }}>
            Fleet Status
          </div>
          <FleetCard />
        </div>
      </div>
      <div className={styles["sec-lbl"]}>Recent Deliveries</div>
      <RecentDeliveries />
    </section>
  );
}
