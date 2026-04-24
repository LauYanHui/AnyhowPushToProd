"use client";

import styles from "@/app/flowlog.module.css";
import {
  fmtCurrency,
  fmtTime,
  getDriver,
  getItem,
  getVehicle,
} from "@/lib/flowlog/helpers";
import { useFlowLog } from "@/lib/flowlog/state";
import type { OrdFilter } from "@/lib/flowlog/types";
import { FilterPill, PriorityDot, StatusPill } from "../ui";

const FILTERS: Array<{ id: OrdFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in_transit", label: "In Transit" },
  { id: "delivered", label: "Delivered" },
  { id: "failed", label: "Failed" },
];

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function AvailStrip() {
  const { state } = useFlowLog();
  const { data } = state;
  const avail = data.drivers.filter((d) => d.status === "available");
  const onDuty = data.drivers.filter((d) => d.status === "on_duty");
  const vehicles = data.vehicles.filter((v) => v.status === "available");
  const pending = data.orders.filter((o) => o.status === "pending").length;

  return (
    <div className={styles["avail-strip"]}>
      <div className={styles["avail-chip"]}>
        <div className={`${styles["avail-dot"]} ${styles.green}`} />
        <div>
          <div className={styles["avail-name"]}>
            {avail.length} Driver{avail.length !== 1 ? "s" : ""} Available
          </div>
          <div className={styles["avail-sub"]}>
            {avail.map((d) => d.name.split(" ")[0]).join(", ") || "None"}
          </div>
        </div>
      </div>
      <div className={styles["avail-chip"]}>
        <div className={`${styles["avail-dot"]} ${styles.amber}`} />
        <div>
          <div className={styles["avail-name"]}>{onDuty.length} On Duty</div>
          <div className={styles["avail-sub"]}>Currently delivering</div>
        </div>
      </div>
      <div className={styles["avail-chip"]}>
        <div className={`${styles["avail-dot"]} ${styles.green}`} />
        <div>
          <div className={styles["avail-name"]}>
            {vehicles.length} Vehicle{vehicles.length !== 1 ? "s" : ""} Free
          </div>
          <div className={styles["avail-sub"]}>
            {vehicles.map((v) => v.plateNumber).join(", ") || "None"}
          </div>
        </div>
      </div>
      <div className={styles["avail-chip"]}>
        <div
          className={`${styles["avail-dot"]} ${pending > 0 ? styles.red : styles.muted}`}
        />
        <div>
          <div className={styles["avail-name"]}>
            {pending} Pending Order{pending !== 1 ? "s" : ""}
          </div>
          <div className={styles["avail-sub"]}>Need assignment</div>
        </div>
      </div>
    </div>
  );
}

export function OrdersTab() {
  const { state, dispatch } = useFlowLog();
  const { data, ordFilter } = state;

  const filtered =
    ordFilter === "all"
      ? data.orders
      : data.orders.filter((o) => o.status === ordFilter);
  const sorted = filtered
    .slice()
    .sort(
      (a, b) =>
        (PRIORITY_ORDER[a.priority] ?? 2) -
        (PRIORITY_ORDER[b.priority] ?? 2),
    );

  return (
    <section className={styles["tab-section"]}>
      <div className={styles["page-header"]}>
        <div>
          <h1>Deliveries</h1>
        </div>
        <div className={styles["header-actions"]}>
          <div className={styles["filter-pills"]}>
            {FILTERS.map((f) => (
              <FilterPill
                key={f.id}
                label={f.label}
                active={ordFilter === f.id}
                onClick={() =>
                  dispatch({ type: "SET_ORD_FILTER", filter: f.id })
                }
              />
            ))}
          </div>
        </div>
      </div>

      <AvailStrip />

      <div>
        {sorted.length === 0 ? (
          <div className={styles["empty-state"]}>
            No orders match the current filter
          </div>
        ) : (
          sorted.map((o) => {
            const driver = getDriver(data, o.assignedDriverId);
            const vehicle = getVehicle(data, o.assignedVehicleId);
            const itemList = o.items
              .map((it) => {
                const inv = getItem(data, it.inventoryId);
                return inv ? `${inv.name} ×${it.qty}` : it.inventoryId;
              })
              .join(", ");
            return (
              <div key={o.id} className={styles["order-card"]}>
                <div className={styles["order-card-header"]}>
                  <PriorityDot priority={o.priority} />
                  <span className={styles["order-id"]}>{o.id}</span>
                  <span className={styles["order-customer"]}>
                    {o.customerName}
                  </span>
                  <StatusPill status={o.status} />
                  <span
                    className={styles["tbl-mono"]}
                    style={{ marginLeft: "auto" }}
                  >
                    {fmtCurrency(o.totalValue)}
                  </span>
                </div>
                <div className={styles["order-meta"]}>
                  <div className={styles["order-meta-item"]}>
                    <span className={styles["order-meta-lbl"]}>Address</span>
                    <span className={styles["order-meta-val"]}>
                      {o.customerAddress}
                    </span>
                  </div>
                  <div className={styles["order-meta-item"]}>
                    <span className={styles["order-meta-lbl"]}>Window</span>
                    <span
                      className={`${styles["order-meta-val"]} ${styles.mono}`}
                    >
                      {fmtTime(o.deliveryWindow.earliest)} –{" "}
                      {fmtTime(o.deliveryWindow.latest)}
                    </span>
                  </div>
                  <div className={styles["order-meta-item"]}>
                    <span className={styles["order-meta-lbl"]}>Driver</span>
                    <span className={styles["order-meta-val"]}>
                      {driver ? (
                        driver.name
                      ) : (
                        <span style={{ color: "var(--amber)" }}>
                          Unassigned
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={styles["order-meta-item"]}>
                    <span className={styles["order-meta-lbl"]}>Vehicle</span>
                    <span
                      className={`${styles["order-meta-val"]} ${styles.mono}`}
                    >
                      {vehicle?.plateNumber ?? "—"}
                    </span>
                  </div>
                  <div
                    className={`${styles["order-meta-item"]} ${styles["order-meta-wide"]}`}
                  >
                    <span className={styles["order-meta-lbl"]}>Items</span>
                    <span
                      className={styles["order-meta-val"]}
                      style={{ fontSize: 12 }}
                    >
                      {itemList}
                    </span>
                  </div>
                </div>
                {o.notes && (
                  <div className={styles["order-notes"]}>{o.notes}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
