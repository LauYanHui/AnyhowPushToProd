"use client";

import styles from "@/app/flowlog.module.css";
import type { PlanResult, PlanEscalation, PlanAction } from "@/lib/flowlog/planTypes";

/* ── tiny helpers ── */

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

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity.toUpperCase();
  const variant =
    s === "CRITICAL" ? "pill-red" : s === "HIGH" ? "pill-amber" : "pill-blue";
  return (
    <span className={`${styles.pill} ${styles[variant]}`}>
      {s}
    </span>
  );
}

/**
 * Attempt to split a legacy free-text "urgent" or "recommendation" string into
 * individual bullet points so they can be rendered as cards.  Falls back to a
 * single-element array when the string can't be meaningfully split.
 */
function splitLegacyText(text: string): string[] {
  // Common patterns: "(1) …  (2) …" or "1. … 2. …"
  const numbered = text.split(/\s*\(\d+\)\s*|\s*\d+\.\s+/).filter(Boolean);
  if (numbered.length > 1) return numbered;
  // Sentence split as last resort
  const sentences = text.split(/(?<=[.!])\s+/).filter(Boolean);
  if (sentences.length > 1) return sentences;
  return [text];
}

/* ── Escalation card (one per urgent item) ── */

function EscalationCard({ esc }: { esc: PlanEscalation }) {
  return (
    <div className={styles["alert-row"]} style={{ alignItems: "flex-start", gap: 14 }}>
      <div
        className={`${styles["alert-icon"]} ${esc.severity.toUpperCase() === "CRITICAL" ? styles.crit : styles.warn}`}
        style={{ marginTop: 2 }}
      >
        {esc.severity.toUpperCase() === "CRITICAL" ? "!" : "▲"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <SeverityBadge severity={esc.severity} />
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text)" }}>{esc.title}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
          {esc.detail}
        </div>
        {esc.orderIds.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
            {esc.orderIds.map((id) => (
              <span
                key={id}
                className={`${styles.pill} ${styles["pill-muted"]}`}
                style={{ fontFamily: "var(--font-dm-mono), monospace", fontSize: 10 }}
              >
                {id}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Action step row ── */

function ActionRow({ item }: { item: PlanAction }) {
  return (
    <div className={styles["alert-row"]} style={{ gap: 12 }}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: "var(--accent-glow)",
          border: "0.5px solid rgba(245, 166, 35, 0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-dm-mono), monospace",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--accent)",
          flexShrink: 0,
        }}
      >
        {item.priority}
      </div>
      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55, flex: 1 }}>
        {item.action}
      </div>
    </div>
  );
}

/* ── Legacy fallback: render old-style string as bullet list ── */

function LegacyBulletList({ text, color }: { text: string; color: string }) {
  const items = splitLegacyText(text);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((line, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ color, flexShrink: 0, marginTop: 2, fontSize: 8 }}>●</span>
          <span style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55 }}>{line.trim()}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main panel ── */

interface Props {
  result: PlanResult | null;
  loading: boolean;
  error: string | null;
  onApply?: () => void;
  applyLoading?: boolean;
}

export function DailyPlanPanel({ result, loading, error, onApply, applyLoading }: Props) {
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

  /* Build escalation list — prefer structured, fall back to legacy string */
  const escalations: PlanEscalation[] =
    summary.escalations && summary.escalations.length > 0
      ? summary.escalations
      : summary.urgent
        ? splitLegacyText(summary.urgent).map((text, i) => ({
            severity: i === 0 ? "CRITICAL" : "HIGH",
            title: `Escalation ${i + 1}`,
            detail: text.trim(),
            orderIds: [],
          }))
        : [];

  /* Build actions list — prefer structured, fall back to legacy string */
  const actions: PlanAction[] =
    summary.actions && summary.actions.length > 0
      ? summary.actions
      : summary.recommendation
        ? splitLegacyText(summary.recommendation).map((text, i) => ({
            priority: i + 1,
            action: text.trim(),
          }))
        : [];

  return (
    <>
      <div className={styles["sec-lbl"]}>Daily Plan · Owner Summary</div>

      {/* ── KPI strip ── */}
      <div className={styles.card} style={{ padding: "18px 20px" }}>
        <div className={styles["kpi-row"]} style={{ marginBottom: 0 }}>
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
      </div>

      {/* ── Escalations ── */}
      {escalations.length > 0 && (
        <>
          <div className={styles["sec-lbl"]} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Urgent Escalations</span>
            <span
              className={`${styles.pill} ${styles["pill-red"]}`}
              style={{ fontSize: 10, padding: "1px 6px" }}
            >
              {escalations.length}
            </span>
          </div>
          <div className={styles.card}>
            {escalations.map((esc, i) => (
              <EscalationCard key={`esc-${i}`} esc={esc} />
            ))}
          </div>
        </>
      )}

      {/* ── Recommended actions ── */}
      {actions.length > 0 && (
        <>
          <div className={styles["sec-lbl"]}>Recommended Actions</div>
          <div className={styles.card}>
            {actions.map((a, i) => (
              <ActionRow key={`act-${i}`} item={a} />
            ))}
          </div>
        </>
      )}

      {/* ── Fulfilment status table ── */}
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

      {/* ── Shortage alerts ── */}
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

      {/* ── Expiring stock ── */}
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

      {/* ── Delivery plan table ── */}
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

      {onApply && (
        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-accent"]}`}
            onClick={onApply}
            disabled={applyLoading}
            id="apply-daily-plan"
          >
            {applyLoading ? "Applying Plan…" : "✓ Apply Plan — Assign All Orders"}
          </button>
        </div>
      )}
    </>
  );
}
