"use client";

import { useEffect } from "react";
import styles from "@/app/flowlog.module.css";
import { runAgentLoop } from "@/lib/flowlog/agent";
import { fmtCurrency } from "@/lib/flowlog/helpers";
import { useFlowLog } from "@/lib/flowlog/state";
import type { DailyReport } from "@/lib/flowlog/types";

function ReportCard({
  report,
  selected,
  onClick,
}: {
  report: DailyReport;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`${styles["report-card"]} ${selected ? styles.active : ""}`}
      onClick={onClick}
    >
      <div className={styles["report-card-date"]}>{report.dateCovered}</div>
      <div className={styles["report-card-title"]}>{report.title}</div>
      <div className={styles["report-card-summary"]}>{report.summary}</div>
      <div className={styles["report-card-metrics"]}>
        <span>
          <strong>{report.metrics.ordersDelivered}</strong> delivered
        </span>
        <span>
          <strong>{report.metrics.ordersPending}</strong> pending
        </span>
        <span>
          <strong>{report.metrics.fleetUtilizationPct}%</strong> fleet
        </span>
      </div>
    </button>
  );
}

function ReportFrame({ report }: { report: DailyReport }) {
  return (
    <div className={styles["report-frame"]}>
      <div className={styles["report-frame-head"]}>
        <div className={styles["report-frame-brand"]}>
          <span className={styles["report-frame-brand-mark"]}>⚡</span>
          Genspark Daily Briefing
        </div>
        <div className={styles["report-frame-date"]}>
          Generated{" "}
          {new Date(report.generatedAt).toLocaleString("en-SG", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </div>
      </div>
      <div className={styles["report-frame-kpis"]}>
        <Kpi label="Delivered" value={`${report.metrics.ordersDelivered}`} />
        <Kpi label="Pending" value={`${report.metrics.ordersPending}`} />
        <Kpi label="Failed" value={`${report.metrics.ordersFailed}`} />
        <Kpi
          label="Inv Value"
          value={fmtCurrency(report.metrics.inventoryValue)}
        />
        <Kpi
          label="Expiry Risk"
          value={fmtCurrency(report.metrics.expiryRiskValue)}
        />
        <Kpi
          label="Fleet Util"
          value={`${report.metrics.fleetUtilizationPct}%`}
        />
      </div>
      <div
        className={styles["report-frame-body"]}
        dangerouslySetInnerHTML={{ __html: report.html }}
      />
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles["report-kpi"]}>
      <div className={styles["report-kpi-val"]}>{value}</div>
      <div className={styles["report-kpi-lbl"]}>{label}</div>
    </div>
  );
}

export function ReportsTab() {
  const { state, dispatch, stateRef } = useFlowLog();
  const { reports } = state.data;
  const api = { getState: () => stateRef.current, dispatch };

  const sorted = reports
    .slice()
    .sort(
      (a, b) =>
        new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
    );

  useEffect(() => {
    if (!state.selectedReportId && sorted.length) {
      dispatch({ type: "SET_SELECTED_REPORT", id: sorted[0].id });
    }
  }, [state.selectedReportId, sorted, dispatch]);

  const selected = sorted.find((r) => r.id === state.selectedReportId) ?? null;

  async function generate() {
    if (state.agentRunning) return;
    dispatch({ type: "SET_CHAT_OPEN", open: true });
    await runAgentLoop(
      "Generate today's Genspark Daily Briefing. Follow the Reports Agent workflow exactly.",
      api,
      "reports",
      { mode: "ephemeral" },
    );
  }

  return (
    <section className={styles["tab-section"]}>
      <div className={styles["page-header"]}>
        <div>
          <h1>Daily Reports</h1>
          <div className={styles["page-subtitle"]}>
            Reports Agent compiles the Genspark Daily Briefing from live
            analytics.
          </div>
        </div>
        <div className={styles["header-actions"]}>
          <button
            type="button"
            className={`${styles.btn} ${styles["btn-accent"]}`}
            onClick={() => void generate()}
            disabled={state.agentRunning}
          >
            {state.agentRunning
              ? "Generating…"
              : "Generate daily briefing"}
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.card}>
          <div className={styles["empty-state"]}>
            No reports yet — click &ldquo;Generate daily briefing&rdquo; to have
            the Reports Agent compile today&apos;s summary.
          </div>
        </div>
      ) : (
        <div className={styles["reports-layout"]}>
          <div className={styles["reports-list"]}>
            {sorted.map((r) => (
              <ReportCard
                key={r.id}
                report={r}
                selected={state.selectedReportId === r.id}
                onClick={() =>
                  dispatch({ type: "SET_SELECTED_REPORT", id: r.id })
                }
              />
            ))}
          </div>
          <div className={styles["reports-main"]}>
            {selected && <ReportFrame report={selected} />}
          </div>
        </div>
      )}
    </section>
  );
}
