"use client";

import styles from "@/app/flowlog.module.css";
import type { PlanResult } from "@/lib/flowlog/planTypes";

function PlanStatusPill({ status }: { status: string }) {
  const variant =
    status === "FULL"
      ? "pill-green"
      : status === "PARTIAL"
        ? "pill-amber"
        : status === "CANNOT_FULFIL"
          ? "pill-red"
          : "pill-muted";
  return (
    <span className={`${styles.pill} ${styles[variant]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

interface Props {
  result: PlanResult | null;
  loading: boolean;
  error: string | null;
}

export function DailyPlanPanel({ result, loading, error }: Props) {
  if (loading) {
    return (
      <>
        <div className={styles["sec-lbl"]}>Daily Plan</div>
        <div className={styles["thinking-block"]}>
          <div className={styles.dots}>
            <div className={styles.dot} />
            <div className={styles.dot} />
            <div className={styles.dot} />
          </div>
          Generating plan...
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className={styles["sec-lbl"]}>Daily Plan</div>
        <div className={styles["error-block"]}>Error: {error}</div>
      </>
    );
  }

  if (!result) return null;

  const summary = result.ownerSummary;

  return (
    <>
      <div className={styles["sec-lbl"]}>Daily Plan · Owner Summary</div>
      <div className={styles.card} style={{ padding: "18px 20px" }}>
        <div className={styles["kpi-row"]}>
          <div className={styles["kpi-card"]}>
            <div className={styles["kpi-val"]}>{summary.totalOrders ?? "—"}</div>
            <div className={styles["kpi-lbl"]}>Total Orders</div>
          </div>
          <div className={`${styles["kpi-card"]} ${styles.good}`}>
            <div className={styles["kpi-val"]}>{summary.canFulfil ?? "—"}</div>
            <div className={styles["kpi-lbl"]}>Can Fulfil</div>
          </div>
          <div
            className={`${styles["kpi-card"]} ${(summary.atRisk ?? 0) > 0 ? styles.warn : styles.good}`}
          >
            <div className={styles["kpi-val"]}>{summary.atRisk ?? "—"}</div>
            <div className={styles["kpi-lbl"]}>At Risk</div>
          </div>
        </div>
        {summary.urgent && (
          <div
            style={{
              fontSize: 13,
              color: "var(--red)",
              marginTop: 12,
              fontWeight: 500,
            }}
          >
            Urgent: {summary.urgent}
          </div>
        )}
        {summary.recommendation && (
          <div
            style={{
              fontSize: 13,
              color: "var(--muted)",
              marginTop: 8,
              lineHeight: 1.6,
            }}
          >
            {summary.recommendation}
          </div>
        )}
      </div>

      {result.fulfillmentStatus.length > 0 && (
        <>
          <div className={styles["sec-lbl"]}>Fulfilment Status</div>
          <div className={styles.card}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.fulfillmentStatus.map((f, i) => (
                  <tr key={`${f.orderId}-${i}`}>
                    <td className={styles["tbl-mono"]}>{f.orderId}</td>
                    <td>{f.customer}</td>
                    <td>
                      <PlanStatusPill status={f.status} />
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        color: "var(--muted)",
                      }}
                    >
                      {f.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {result.shortageAlerts.length > 0 && (
        <>
          <div className={styles["sec-lbl"]}>Shortage Alerts</div>
          <div className={styles.card}>
            {result.shortageAlerts.map((s, i) => (
              <div key={`${s.item}-${i}`} className={styles["alert-row"]}>
                <div
                  className={`${styles["alert-icon"]} ${styles.warn}`}
                >
                  ▲
                </div>
                <div className={styles["alert-text"]}>
                  <div>
                    <strong>{s.item}</strong> — short {s.shortfall} {s.unit}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 2,
                    }}
                  >
                    Affects: {s.affectedOrders.join(", ") || "—"} ·{" "}
                    {s.recommendation}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {result.expiringStock.length > 0 && (
        <>
          <div className={styles["sec-lbl"]}>Expiring Stock</div>
          <div className={styles.card}>
            {result.expiringStock.map((e, i) => {
              const daysColor =
                e.daysLeft <= 1
                  ? "var(--red)"
                  : e.daysLeft <= 3
                    ? "var(--amber)"
                    : "var(--muted)";
              return (
                <div key={`${e.item}-${i}`} className={styles["alert-row"]}>
                  <div
                    className={`${styles["alert-icon"]} ${e.daysLeft <= 1 ? styles.crit : styles.warn}`}
                  >
                    {e.daysLeft <= 1 ? "!" : "▲"}
                  </div>
                  <div className={styles["alert-text"]}>
                    <div>
                      <strong>{e.item}</strong> ·{" "}
                      <span style={{ color: daysColor }}>
                        {e.daysLeft}d left
                      </span>{" "}
                      · {e.qty} {e.unit}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginTop: 2,
                      }}
                    >
                      {e.action}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {result.deliveryPlan.length > 0 && (
        <>
          <div className={styles["sec-lbl"]}>Delivery Plan</div>
          <div className={styles.card}>
            <table className={styles.tbl}>
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Driver</th>
                  <th>Items</th>
                  <th>Priority</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {result.deliveryPlan.map((d, i) => (
                  <tr key={`${d.orderId}-${i}`}>
                    <td
                      className={styles["tbl-mono"]}
                      style={{ color: "var(--text)" }}
                    >
                      {d.timeSlot}
                    </td>
                    <td className={styles["tbl-mono"]}>{d.orderId}</td>
                    <td>{d.customer}</td>
                    <td
                      style={{ fontSize: 12, color: "var(--muted)" }}
                    >
                      {d.driver}
                    </td>
                    <td style={{ fontSize: 12 }}>{d.items}</td>
                    <td style={{ fontSize: 12 }}>{d.priority}</td>
                    <td
                      style={{ fontSize: 12, color: "var(--muted)" }}
                    >
                      {d.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
