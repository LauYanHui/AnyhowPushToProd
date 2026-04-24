"use client";

import { Fragment, useState } from "react";
import styles from "@/app/flowlog.module.css";
import {
  daysUntil,
  fmtCurrency,
  fmtDate,
  getItem,
  nearestExpiry,
  withinNextDays,
} from "@/lib/flowlog/helpers";
import { useFlowLog } from "@/lib/flowlog/state";
import type { InvFilter, Inventory, Reorder } from "@/lib/flowlog/types";
import { FilterPill, StatusPill, StockBar, StockPill } from "../ui";

const CATEGORY_LABEL: Record<string, string> = {
  frozen_meat: "Frozen Meat",
  fresh_produce: "Fresh Produce",
  dry_goods: "Dry Goods",
  dairy: "Dairy",
  beverages: "Beverages",
  packaging: "Packaging",
};

const FILTERS: Array<{ id: InvFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "low_stock", label: "Low Stock" },
  { id: "near_expiry", label: "Near Expiry" },
  { id: "out_of_stock", label: "Out of Stock" },
];

function ReordersCard() {
  const { state } = useFlowLog();
  const { data } = state;
  if (!data.reorders.length) {
    return (
      <div className={styles.card}>
        <div className={styles["empty-state"]}>No pending reorder requests</div>
      </div>
    );
  }
  return (
    <div className={styles.card}>
      {data.reorders.map((r) => {
        const item = getItem(data, r.inventoryId);
        const sup = data.suppliers.find((s) => s.id === r.supplierId);
        return (
          <div key={r.id} className={styles["reorder-row"]}>
            <div className={styles["reorder-main"]}>
              <div className={styles["reorder-name"]}>
                {item?.name ?? "Unknown Item"}
              </div>
              <div className={styles["reorder-meta"]}>
                {sup?.name ?? "—"} · {r.qtyOrdered} units · Expected{" "}
                {fmtDate(r.expectedDelivery)}
              </div>
            </div>
            <StatusPill status={r.status} />
            <span className={styles["reorder-cost"]}>
              {fmtCurrency(r.totalCost)}
            </span>
            <span
              className={`${styles.pill} ${r.urgency === "express" ? styles["pill-amber"] : styles["pill-muted"]}`}
              style={{ fontSize: 10 }}
            >
              {r.urgency}
            </span>
            <span className={styles["reorder-origin"]}>
              {r.createdBy === "agent" ? "🤖 agent" : "👤 user"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function KV({
  label,
  value,
  mono = true,
  color,
}: {
  label: string;
  value: string | number;
  mono?: boolean;
  color?: string;
}) {
  return (
    <div className={styles["inv-detail-kv"]}>
      <span className={styles["inv-detail-kv-label"]}>{label}</span>
      <span
        className={mono ? styles["inv-detail-kv-value"] : undefined}
        style={{
          color: color ?? "var(--text)",
          fontSize: 12,
          textAlign: "right",
          ...(mono
            ? { fontFamily: "var(--font-dm-mono), monospace" }
            : {}),
        }}
      >
        {value}
      </span>
    </div>
  );
}

function InventoryExpandedRow({ item }: { item: Inventory }) {
  const { state, dispatch } = useFlowLog();
  const { data } = state;
  const [qty, setQty] = useState(item.reorderQty);
  const [urgency, setUrgency] = useState<"standard" | "express">("standard");
  const [sent, setSent] = useState(false);

  const supplier = data.suppliers.find((s) => s.id === item.supplierId);
  const stockPct =
    item.maxCapacity > 0
      ? Math.round((item.currentStock / item.maxCapacity) * 100)
      : 0;
  const margin =
    item.sellPrice > 0
      ? Math.round(
          ((item.sellPrice - item.costPerUnit) / item.sellPrice) * 100,
        )
      : 0;
  const sortedExpiry = [...item.expiryDates].sort(
    (a, b) =>
      new Date(a.expiresOn).getTime() - new Date(b.expiresOn).getTime(),
  );

  function handleReorder() {
    const now = new Date();
    const expected = new Date(now);
    expected.setDate(now.getDate() + (supplier?.leadTimeDays ?? 7));
    const r: Reorder = {
      id: `RO-${Date.now()}`,
      inventoryId: item.id,
      supplierId: item.supplierId,
      qtyOrdered: qty,
      unitCost: item.costPerUnit,
      totalCost: qty * item.costPerUnit,
      status: "pending",
      createdAt: now.toISOString(),
      expectedDelivery: expected.toISOString(),
      urgency,
      createdBy: "user",
      notes: "",
    };
    dispatch({ type: "APPEND_REORDER", reorder: r });
    setSent(true);
  }

  return (
    <div className={styles["inv-expanded-content"]}>
      {/* 4-column detail grid */}
      <div className={styles["inv-expanded-grid"]}>
        {/* Stock */}
        <div className={styles["inv-detail-section"]}>
          <div className={styles["inv-detail-section-title"]}>Stock</div>
          <KV
            label="Current"
            value={`${item.currentStock} ${item.unit} (${stockPct}%)`}
          />
          <KV
            label="Max Capacity"
            value={`${item.maxCapacity} ${item.unit}`}
          />
          <KV
            label="Reorder Point"
            value={`${item.reorderPoint} ${item.unit}`}
          />
          <KV
            label="Reorder Qty"
            value={`${item.reorderQty} ${item.unit}`}
          />
        </div>

        {/* Pricing */}
        <div className={styles["inv-detail-section"]}>
          <div className={styles["inv-detail-section-title"]}>Pricing</div>
          <KV
            label={`Cost / ${item.unit}`}
            value={fmtCurrency(item.costPerUnit)}
          />
          <KV
            label={`Sell / ${item.unit}`}
            value={fmtCurrency(item.sellPrice)}
          />
          <KV
            label="Margin"
            value={`${margin}%`}
            color={
              margin > 20
                ? "var(--green)"
                : margin > 0
                  ? "var(--amber)"
                  : "var(--red)"
            }
          />
        </div>

        {/* Storage */}
        <div className={styles["inv-detail-section"]}>
          <div className={styles["inv-detail-section-title"]}>Storage</div>
          <KV label="Zone" value={item.warehouseZone} mono={false} />
          {item.weightPerUnitKg !== undefined && (
            <KV
              label={`Weight / ${item.unit}`}
              value={`${item.weightPerUnitKg} kg`}
            />
          )}
          <KV label="Last Restocked" value={fmtDate(item.lastRestocked)} />
          {item.notes && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: "var(--muted)",
                lineHeight: 1.5,
                fontStyle: "italic",
              }}
            >
              {item.notes}
            </div>
          )}
        </div>

        {/* Supplier */}
        <div className={styles["inv-detail-section"]}>
          <div className={styles["inv-detail-section-title"]}>Supplier</div>
          {supplier ? (
            <>
              <KV label="Name" value={supplier.name} mono={false} />
              <KV label="Lead Time" value={`${supplier.leadTimeDays} days`} />
              <KV
                label="Reliability"
                value={`${supplier.reliabilityScore}%`}
                color={
                  supplier.reliabilityScore >= 90
                    ? "var(--green)"
                    : supplier.reliabilityScore >= 70
                      ? "var(--amber)"
                      : "var(--red)"
                }
              />
              <KV
                label="Min Order"
                value={fmtCurrency(supplier.minimumOrderValue)}
              />
              <KV
                label="Payment"
                value={supplier.paymentTerms}
                mono={false}
              />
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--hint)" }}>
              No supplier on record
            </span>
          )}
        </div>
      </div>

      {/* Expiry batches — rendered as pills */}
      {sortedExpiry.length > 0 && (
        <div>
          <div className={styles["inv-detail-section-title"]} style={{ marginBottom: 8 }}>
            Expiry Batches ({sortedExpiry.length})
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sortedExpiry.map((batch, idx) => {
              const days = daysUntil(batch.expiresOn);
              const pillClass =
                days <= 3
                  ? styles["pill-red"]
                  : days <= 7
                    ? styles["pill-amber"]
                    : styles["pill-muted"];
              return (
                <span
                  key={idx}
                  className={`${styles.pill} ${pillClass}`}
                  style={{ fontSize: 11 }}
                >
                  {fmtDate(batch.expiresOn)} · {days}d · {batch.qty}{" "}
                  {item.unit}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Reorder action */}
      <div className={styles["inv-expanded-footer"]}>
        <span style={{ fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>
          Request Reorder:
        </span>
        {sent ? (
          <span style={{ fontSize: 12, color: "var(--green)" }}>
            Reorder created ✓
          </span>
        ) : (
          <>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className={styles["search-input"]}
              style={{
                width: 70,
                textAlign: "center",
                padding: "4px 8px",
                fontSize: 12,
              }}
              title="Quantity to reorder"
            />
            <span style={{ fontSize: 11, color: "var(--muted)" }}>
              {item.unit}
            </span>
            <select
              value={urgency}
              onChange={(e) =>
                setUrgency(e.target.value as "standard" | "express")
              }
              className={styles["order-assign-select"]}
              style={{ flex: "none", width: "auto", minWidth: 100 }}
            >
              <option value="standard">Standard</option>
              <option value="express">Express</option>
            </select>
            <button
              className={`${styles.btn} ${styles["btn-accent"]} ${styles["btn-sm"]}`}
              onClick={handleReorder}
              disabled={qty < 1}
            >
              Request
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function InventoryTab() {
  const { state, dispatch } = useFlowLog();
  const { data, invFilter, invSearch } = state;
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const today = new Date();
  const search = invSearch.toLowerCase();

  const items = data.inventory.filter((i) => {
    if (
      search &&
      !i.name.toLowerCase().includes(search) &&
      !i.sku.toLowerCase().includes(search)
    )
      return false;
    if (invFilter === "low_stock") return i.currentStock <= i.reorderPoint;
    if (invFilter === "near_expiry")
      return i.expiryDates.some((e) => withinNextDays(e.expiresOn, today, 7));
    if (invFilter === "out_of_stock") return i.currentStock === 0;
    return true;
  });

  return (
    <section className={styles["tab-section"]}>
      <div className={styles["page-header"]}>
        <div>
          <h1>Inventory</h1>
        </div>
        <div className={styles["header-actions"]}>
          <div className={styles["filter-pills"]}>
            {FILTERS.map((f) => (
              <FilterPill
                key={f.id}
                label={f.label}
                active={invFilter === f.id}
                onClick={() =>
                  dispatch({ type: "SET_INV_FILTER", filter: f.id })
                }
              />
            ))}
          </div>
          <input
            className={styles["search-input"]}
            placeholder="Search..."
            value={invSearch}
            onChange={(e) =>
              dispatch({ type: "SET_INV_SEARCH", search: e.target.value })
            }
          />
        </div>
      </div>

      <div className={styles.card}>
        <table className={styles.tbl}>
          <thead>
            <tr>
              <th>Item</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Reorder Pt</th>
              <th>Nearest Expiry</th>
              <th>Status</th>
              <th>Zone</th>
            </tr>
          </thead>
          <tbody>
            {items.length ? (
              items.map((i) => {
                const ne = nearestExpiry(i);
                const days = ne ? daysUntil(ne.expiresOn) : null;
                const expiryColor =
                  days !== null
                    ? days <= 3
                      ? "var(--red)"
                      : days <= 7
                        ? "var(--amber)"
                        : "var(--muted)"
                    : undefined;
                const isExpanded = expandedItemId === i.id;
                return (
                  <Fragment key={i.id}>
                    <tr
                      style={{ cursor: "pointer" }}
                      className={
                        isExpanded ? styles["inv-row-selected"] : undefined
                      }
                      onClick={() =>
                        setExpandedItemId(isExpanded ? null : i.id)
                      }
                    >
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              color: "var(--hint)",
                              fontSize: 10,
                              flexShrink: 0,
                              width: 10,
                            }}
                          >
                            {isExpanded ? "▲" : "▼"}
                          </span>
                          <span style={{ fontWeight: 500 }}>{i.name}</span>
                        </div>
                      </td>
                      <td className={styles["tbl-mono"]}>{i.sku}</td>
                      <td>
                        <span className={styles["inv-cat"]}>
                          {CATEGORY_LABEL[i.category] ?? i.category}
                        </span>
                      </td>
                      <td>
                        <StockBar item={i} />
                      </td>
                      <td
                        className={styles["tbl-mono"]}
                        style={{ color: "var(--muted)" }}
                      >
                        {i.reorderPoint} {i.unit}
                      </td>
                      <td>
                        {ne ? (
                          <span
                            className={styles["expiry-soft"]}
                            style={{ color: expiryColor }}
                          >
                            {fmtDate(ne.expiresOn)} ({days}d)
                          </span>
                        ) : (
                          <span style={{ color: "var(--hint)" }}>—</span>
                        )}
                      </td>
                      <td>
                        <StockPill item={i} />
                      </td>
                      <td className={styles["inv-zone"]}>{i.warehouseZone}</td>
                    </tr>
                    {isExpanded && (
                      <tr className={styles["inv-expanded-row"]}>
                        <td colSpan={8}>
                          <InventoryExpandedRow item={i} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    color: "var(--hint)",
                    padding: 32,
                  }}
                >
                  No items match the current filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles["sec-lbl"]}>Pending Reorder Requests</div>
      <ReordersCard />
    </section>
  );
}
