"use client";

import { useState } from "react";
import styles from "@/app/flowlog.module.css";
import {
  fmtCurrency,
  fmtTime,
  getDriver,
  getItem,
  getVehicle,
} from "@/lib/flowlog/helpers";
import { useFlowLog } from "@/lib/flowlog/state";
import type { Order, OrderStatus, OrdFilter } from "@/lib/flowlog/types";
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

function OrderCard({ order }: { order: Order }) {
  const { state, dispatch } = useFlowLog();
  const { data } = state;
  const [expanded, setExpanded] = useState(false);
  const [driverSel, setDriverSel] = useState(order.assignedDriverId ?? "");
  const [vehicleSel, setVehicleSel] = useState(order.assignedVehicleId ?? "");
  const [assignError, setAssignError] = useState<string | null>(null);

  const driver = getDriver(data, order.assignedDriverId);
  const vehicle = getVehicle(data, order.assignedVehicleId);

  const availDrivers = data.drivers.filter(
    (d) => d.status === "available" || d.id === order.assignedDriverId,
  );
  const availVehicles = data.vehicles.filter(
    (v) => v.status === "available" || v.id === order.assignedVehicleId,
  );

  const itemList = order.items
    .map((it) => {
      const inv = getItem(data, it.inventoryId);
      return inv ? `${inv.name} ×${it.qty}` : it.inventoryId;
    })
    .join(", ");

  function updateStatus(status: OrderStatus, extra?: Partial<Order>) {
    dispatch({ type: "UPDATE_ORDER", id: order.id, patch: { status, ...extra } });
  }

  function handleAssign() {
    if (!driverSel || !vehicleSel) return;
    setAssignError(null);

    const selectedVehicle = data.vehicles.find((v) => v.id === vehicleSel);
    if (selectedVehicle) {
      const orderWeightKg = order.items.reduce((sum, it) => {
        const inv = getItem(data, it.inventoryId);
        return sum + (inv?.weightPerUnitKg ?? 0) * it.qty;
      }, 0);
      const remainingCapacity =
        selectedVehicle.capacityKg - selectedVehicle.currentLoadKg;
      if (orderWeightKg > 0 && orderWeightKg > remainingCapacity) {
        setAssignError(
          `Order weight ${orderWeightKg.toFixed(1)} kg exceeds vehicle remaining capacity ${remainingCapacity.toFixed(1)} kg.`,
        );
        return;
      }
    }

    // Free previously assigned driver/vehicle if re-assigning
    if (order.assignedDriverId && order.assignedDriverId !== driverSel) {
      dispatch({ type: "UPDATE_DRIVER", id: order.assignedDriverId, patch: { status: "available" } });
    }
    if (order.assignedVehicleId && order.assignedVehicleId !== vehicleSel) {
      dispatch({ type: "UPDATE_VEHICLE", id: order.assignedVehicleId, patch: { status: "available" } });
    }
    dispatch({
      type: "UPDATE_ORDER",
      id: order.id,
      patch: {
        assignedDriverId: driverSel,
        assignedVehicleId: vehicleSel,
        status: "assigned",
      },
    });
    dispatch({ type: "UPDATE_DRIVER", id: driverSel, patch: { status: "on_duty" } });
    dispatch({ type: "UPDATE_VEHICLE", id: vehicleSel, patch: { status: "on_route" } });
    setDriverSel("");
    setVehicleSel("");
  }

  const canAssign =
    order.status === "pending" || order.status === "assigned";
  const canTransit = order.status === "assigned";
  const canDeliver = order.status === "in_transit";
  const canFail =
    order.status === "pending" ||
    order.status === "assigned" ||
    order.status === "in_transit";
  const canReset = order.status === "failed";

  return (
    <div className={styles["order-card"]}>
      {/* Clickable header */}
      <div
        className={styles["order-card-header"]}
        style={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded((e) => !e)}
      >
        <PriorityDot priority={order.priority} />
        <span className={styles["order-id"]}>{order.id}</span>
        <span className={styles["order-customer"]}>{order.customerName}</span>
        <StatusPill status={order.status} />
        <span
          className={styles["tbl-mono"]}
          style={{ marginLeft: "auto", marginRight: 8 }}
        >
          {fmtCurrency(order.totalValue)}
        </span>
        <span style={{ color: "var(--hint)", fontSize: 11 }}>
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Always-visible meta */}
      <div className={styles["order-meta"]}>
        <div className={styles["order-meta-item"]}>
          <span className={styles["order-meta-lbl"]}>Address</span>
          <span className={styles["order-meta-val"]}>
            {order.customerAddress}
          </span>
        </div>
        <div className={styles["order-meta-item"]}>
          <span className={styles["order-meta-lbl"]}>Window</span>
          <span
            className={`${styles["order-meta-val"]} ${styles.mono}`}
          >
            {fmtTime(order.deliveryWindow.earliest)} –{" "}
            {fmtTime(order.deliveryWindow.latest)}
          </span>
        </div>
        <div className={styles["order-meta-item"]}>
          <span className={styles["order-meta-lbl"]}>Driver</span>
          <span className={styles["order-meta-val"]}>
            {driver ? (
              driver.name
            ) : (
              <span style={{ color: "var(--amber)" }}>Unassigned</span>
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
          <span className={styles["order-meta-val"]} style={{ fontSize: 12 }}>
            {itemList}
          </span>
        </div>
      </div>

      {order.notes && !expanded && (
        <div className={styles["order-notes"]}>{order.notes}</div>
      )}

      {/* Expanded section */}
      {expanded && (
        <div className={styles["order-expanded"]}>
          {/* Items breakdown */}
          <div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--hint)",
                marginBottom: 8,
              }}
            >
              Items Detail
            </div>
            <div className={styles["order-items-list"]}>
              {order.items.map((it, idx) => {
                const inv = getItem(data, it.inventoryId);
                return (
                  <div key={idx} className={styles["order-item-row"]}>
                    <span>
                      {inv?.name ?? it.inventoryId} × {it.qty}
                      {inv?.unit ? ` ${inv.unit}` : ""}
                    </span>
                    <span
                      style={{
                        color: "var(--muted)",
                        fontFamily: "var(--font-dm-mono), monospace",
                      }}
                    >
                      {fmtCurrency(it.unitCost)} ea ·{" "}
                      {fmtCurrency(it.unitCost * it.qty)}
                    </span>
                  </div>
                );
              })}
              <div
                className={styles["order-item-row"]}
                style={{ fontWeight: 600 }}
              >
                <span>Total</span>
                <span
                  style={{
                    color: "var(--accent)",
                    fontFamily: "var(--font-dm-mono), monospace",
                  }}
                >
                  {fmtCurrency(order.totalValue)}
                </span>
              </div>
            </div>
          </div>

          {/* Driver & Vehicle detail */}
          {(driver || vehicle) && (
            <div className={styles["order-detail-grid"]}>
              {driver && (
                <div className={styles["inv-detail-section"]}>
                  <div className={styles["inv-detail-section-title"]}>
                    Driver
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text)",
                    }}
                  >
                    {driver.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {driver.phone}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--hint)",
                      marginTop: 3,
                    }}
                  >
                    {driver.deliveriesCompletedToday} deliveries ·{" "}
                    {driver.hoursWorkedToday}h worked
                  </div>
                </div>
              )}
              {vehicle && (
                <div className={styles["inv-detail-section"]}>
                  <div className={styles["inv-detail-section-title"]}>
                    Vehicle
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      fontFamily: "var(--font-dm-mono), monospace",
                      color: "var(--text)",
                    }}
                  >
                    {vehicle.plateNumber}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>
                    {vehicle.type}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--hint)",
                      marginTop: 3,
                    }}
                  >
                    Fuel: {vehicle.fuelLevelPct}% · {vehicle.currentLoadKg}/
                    {vehicle.capacityKg} kg
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--hint)",
                  marginBottom: 4,
                }}
              >
                Notes
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--muted)",
                  fontStyle: "italic",
                }}
              >
                {order.notes}
              </div>
            </div>
          )}

          {/* Delivered at */}
          {order.actualDeliveredAt && (
            <div style={{ fontSize: 12, color: "var(--green)" }}>
              Delivered at {fmtTime(order.actualDeliveredAt)}
            </div>
          )}

          {/* Action bar */}
          <div className={styles["order-action-bar"]}>
            {/* Manual assign */}
            {canAssign && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className={styles["order-assign-row"]}>
                  <select
                    value={driverSel}
                    onChange={(e) => { setDriverSel(e.target.value); setAssignError(null); }}
                    className={styles["order-assign-select"]}
                  >
                    <option value="">Select driver…</option>
                    {availDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={vehicleSel}
                    onChange={(e) => { setVehicleSel(e.target.value); setAssignError(null); }}
                    className={styles["order-assign-select"]}
                  >
                    <option value="">Select vehicle…</option>
                    {availVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} ({v.type}, {v.capacityKg - v.currentLoadKg} kg free)
                      </option>
                    ))}
                  </select>
                  <button
                    className={`${styles.btn} ${styles["btn-sm"]}`}
                    onClick={handleAssign}
                    disabled={!driverSel || !vehicleSel}
                  >
                    Assign
                  </button>
                </div>
                {assignError && (
                  <div style={{ fontSize: 11, color: "var(--red)" }}>
                    {assignError}
                  </div>
                )}
              </div>
            )}

            {/* Status transitions */}
            <div className={styles["order-status-btns"]}>
              {canTransit && (
                <button
                  className={`${styles.btn} ${styles["btn-accent"]} ${styles["btn-sm"]}`}
                  onClick={() => updateStatus("in_transit")}
                >
                  Mark In Transit
                </button>
              )}
              {canDeliver && (
                <button
                  className={`${styles.btn} ${styles["btn-accent"]} ${styles["btn-sm"]}`}
                  onClick={() =>
                    updateStatus("delivered", {
                      actualDeliveredAt: new Date().toISOString(),
                    })
                  }
                >
                  Mark Delivered
                </button>
              )}
              {canFail && (
                <button
                  className={`${styles.btn} ${styles["btn-sm"]}`}
                  style={{
                    color: "var(--red)",
                    borderColor: "rgba(248, 113, 113, 0.3)",
                  }}
                  onClick={() => updateStatus("failed")}
                >
                  Mark Failed
                </button>
              )}
              {canReset && (
                <button
                  className={`${styles.btn} ${styles["btn-sm"]}`}
                  onClick={() =>
                    updateStatus("pending", {
                      assignedDriverId: null,
                      assignedVehicleId: null,
                      actualDeliveredAt: null,
                    })
                  }
                >
                  Reset to Pending
                </button>
              )}
              {order.status === "delivered" && (
                <span style={{ fontSize: 11, color: "var(--green)" }}>
                  ✓ Delivered
                  {order.actualDeliveredAt
                    ? ` at ${fmtTime(order.actualDeliveredAt)}`
                    : ""}
                </span>
              )}
              {order.status === "cancelled" && (
                <span style={{ fontSize: 11, color: "var(--hint)" }}>
                  Cancelled
                </span>
              )}
            </div>
          </div>
        </div>
      )}
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
          <div className={styles["page-subtitle"]}>
            Click any order card to expand details and take manual actions
          </div>
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
          sorted.map((o) => <OrderCard key={o.id} order={o} />)
        )}
      </div>
    </section>
  );
}
