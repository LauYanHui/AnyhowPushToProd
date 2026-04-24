"use client";

import { useState } from "react";
import styles from "@/app/flowlog.module.css";
import { runAgentLoop } from "@/lib/flowlog/agent";
import {
  fmtCurrency,
  fmtDate,
  fmtTime,
  getDriver,
  withinNextDays,
  orderIsUpcomingWithinMinutes,
} from "@/lib/flowlog/helpers";
import { toPlanInput } from "@/lib/flowlog/planAdapter";
import { useFlowLog } from "@/lib/flowlog/state";
import type { AgentProfileId, TabId } from "@/lib/flowlog/types";
import { DailyPlanPanel } from "../plan/DailyPlanPanel";
import { PriorityDot, StatusPill } from "../ui";

type AlertAction =
  | { kind: "tab"; label: string; tab: TabId }
  | { kind: "chat"; label: string; prefill: string; profile: AgentProfileId }
  | { kind: "run"; label: string; prompt: string; profile: AgentProfileId };

interface Alert {
  level: "crit" | "warn";
  text: string;
  actions: AlertAction[];
}

function useAlerts(): Alert[] {
  const { state } = useFlowLog();
  const { data } = state;
  const today = new Date();
  const alerts: Alert[] = [];

  const unreadIncoming = data.emails.filter(
    (e) => e.direction === "incoming" && e.status === "unread",
  );
  if (unreadIncoming.length > 0) {
    alerts.push({
      level: "warn",
      text: `${unreadIncoming.length} unread email${unreadIncoming.length > 1 ? "s" : ""} in ops inbox`,
      actions: [
        { kind: "tab", label: "Open Inbox", tab: "emails" },
        {
          kind: "run",
          label: "Triage All",
          prompt:
            "List all unread incoming emails and triage each one — draft replies where appropriate, mark informational mail as handled.",
          profile: "inbox",
        },
      ],
    });
  }

  data.inventory
    .filter((i) => i.currentStock === 0)
    .forEach((i) =>
      alerts.push({
        level: "crit",
        text: `${i.name} is OUT OF STOCK`,
        actions: [{ kind: "tab", label: "View Inventory", tab: "inventory" }],
      }),
    );

  data.inventory.forEach((i) =>
    i.expiryDates.forEach((e) => {
      if (withinNextDays(e.expiresOn, today, 3)) {
        alerts.push({
          level: "crit",
          text: `${i.name} — ${e.qty} ${i.unit}s expire ${fmtDate(e.expiresOn)}`,
          actions: [
            {
              kind: "chat",
              label: "Ask Agent",
              profile: "general",
              prefill: `${i.name} has ${e.qty} ${i.unit}(s) expiring on ${fmtDate(e.expiresOn)} — that's critical. What should I do to minimise waste?`,
            },
          ],
        });
      } else if (withinNextDays(e.expiresOn, today, 7)) {
        alerts.push({
          level: "warn",
          text: `${i.name} — ${e.qty} ${i.unit}s expire ${fmtDate(e.expiresOn)}`,
          actions: [
            {
              kind: "chat",
              label: "Ask Agent",
              profile: "general",
              prefill: `${i.name} has ${e.qty} ${i.unit}(s) expiring on ${fmtDate(e.expiresOn)}. What options do I have to use them before they expire?`,
            },
          ],
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
        actions: [
          {
            kind: "chat",
            label: "Reorder",
            profile: "outbox",
            prefill: `${i.name} is at ${i.currentStock} ${i.unit}(s), below the reorder point of ${i.reorderPoint}. Please draft a reorder email to our supplier.`,
          },
        ],
      }),
    );

  const pendingOrders = data.orders.filter((o) => o.status === "pending");
  pendingOrders.forEach((o) => {
    if (orderIsUpcomingWithinMinutes(o, today, 120, -30)) {
      alerts.push({
        level: "crit",
        text: `Unassigned ${o.id} delivery window starts in <2h — ${o.customerName}`,
        actions: [
          {
            kind: "run",
            label: "Run Dispatch",
            prompt: `Assign order ${o.id} for ${o.customerName} urgently — the delivery window starts in under 2 hours. Use the best available driver and check vehicle capacity carefully.`,
            profile: "dispatch",
          },
          { kind: "tab", label: "View Orders", tab: "orders" },
        ],
      });
    }
  });

  if (pendingOrders.length >= 3) {
    alerts.push({
      level: "warn",
      text: `${pendingOrders.length} pending orders awaiting driver assignment`,
      actions: [
        {
          kind: "run",
          label: "Run Dispatch",
          prompt: `Assign all ${pendingOrders.length} pending orders using the best available driver and vehicle. Prioritise urgent orders and check capacity carefully.`,
          profile: "dispatch",
        },
      ],
    });
  }

  data.vehicles
    .filter((v) => withinNextDays(v.nextServiceDue, today, 7))
    .forEach((v) =>
      alerts.push({
        level: "warn",
        text: `${v.plateNumber} service due ${fmtDate(v.nextServiceDue)}`,
        actions: [],
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
  const { state, dispatch, stateRef } = useFlowLog();
  const alerts = useAlerts();
  const api = { getState: () => stateRef.current, dispatch };

  async function runAction(prompt: string, profile: AgentProfileId) {
    if (state.agentRunning) return;
    dispatch({ type: "SET_ACTIVE_PROFILE", profile });
    dispatch({ type: "SET_CHAT_OPEN", open: true });
    await runAgentLoop(prompt, api, profile, { mode: "ephemeral" });
  }

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
      {alerts.slice(0, 10).map((a, i) => (
        <div key={i} className={styles["alert-row"]}>
          <div className={`${styles["alert-icon"]} ${styles[a.level]}`}>
            {a.level === "crit" ? "!" : "▲"}
          </div>
          <div className={styles["alert-text"]}>{a.text}</div>
          <div className={styles["alert-actions"]}>
            {a.actions.map((ac, ai) =>
              ac.kind === "tab" ? (
                <button
                  key={ai}
                  type="button"
                  className={styles["alert-action"]}
                  onClick={() => dispatch({ type: "SET_ACTIVE_TAB", tab: ac.tab })}
                >
                  {ac.label}
                </button>
              ) : ac.kind === "chat" ? (
                <button
                  key={ai}
                  type="button"
                  className={styles["alert-action"]}
                  onClick={() => {
                    dispatch({ type: "SET_ACTIVE_PROFILE", profile: ac.profile });
                    dispatch({ type: "SET_AGENT_PREFILL", text: ac.prefill });
                    dispatch({ type: "SET_CHAT_OPEN", open: true });
                  }}
                >
                  {ac.label}
                </button>
              ) : (
                <button
                  key={ai}
                  type="button"
                  className={styles["alert-action"]}
                  disabled={state.agentRunning}
                  onClick={() => void runAction(ac.prompt, ac.profile)}
                >
                  {ac.label}
                </button>
              ),
            )}
          </div>
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
  const { state, dispatch, stateRef } = useFlowLog();
  const { plan, planLoading, planError } = state;
  const [applyLoading, setApplyLoading] = useState(false);

  const dateStr = new Date().toLocaleDateString("en-SG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  async function generatePlan() {
    dispatch({ type: "SET_PLAN_LOADING", loading: true });
    dispatch({ type: "SET_PLAN_ERROR", error: null });
    dispatch({ type: "SET_PLAN", plan: null });
    try {
      const body = toPlanInput(state.data);
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          data?.error?.message ??
          (typeof data?.error === "string" ? data.error : `HTTP ${res.status}`);
        dispatch({ type: "SET_PLAN_ERROR", error: msg });
        return;
      }
      dispatch({ type: "SET_PLAN", plan: data });
    } catch (e) {
      dispatch({ type: "SET_PLAN_ERROR", error: e instanceof Error ? e.message : String(e) });
    } finally {
      dispatch({ type: "SET_PLAN_LOADING", loading: false });
    }
  }

  async function applyPlan() {
    if (!plan || state.agentRunning || applyLoading) return;
    setApplyLoading(true);

    const assignments = plan.deliveryPlan
      .map(
        (d) =>
          `• ${d.orderId} → driver "${d.driver}", time ${d.timeSlot}, items: ${d.items}`,
      )
      .join("\n");

    const prompt =
      `Apply the following daily delivery plan by assigning each pending order to the specified driver and a suitable available vehicle. ` +
      `Prioritise urgent orders first and check vehicle capacity.\n\n` +
      `Delivery Plan:\n${assignments}\n\n` +
      `For each order, use the assign_delivery tool. Skip orders that are already assigned, in transit, or delivered.`;

    const api = { getState: () => stateRef.current, dispatch };
    dispatch({ type: "SET_ACTIVE_TAB", tab: "agent" });
    try {
      await runAgentLoop(prompt, api, "dispatch");
    } finally {
      setApplyLoading(false);
    }
  }

  return (
    <section className={styles["tab-section"]}>
      <div className={styles["page-header"]}>
        <div>
          <h1>Operations Dashboard</h1>
          <div className={styles["dash-date"]}>{dateStr}</div>
        </div>
        <div className={styles["header-actions"]}>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-accent"]}`}
            onClick={() => void generatePlan()}
            disabled={planLoading}
          >
            {planLoading ? "Generating..." : "Generate Daily Plan"}
          </button>
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
      {(planLoading || planError || plan) && (
        <DailyPlanPanel
          result={plan}
          loading={planLoading}
          error={planError}
          onApply={plan ? () => void applyPlan() : undefined}
          applyLoading={applyLoading}
        />
      )}
      <div className={styles["sec-lbl"]}>Recent Deliveries</div>
      <RecentDeliveries />
    </section>
  );
}
