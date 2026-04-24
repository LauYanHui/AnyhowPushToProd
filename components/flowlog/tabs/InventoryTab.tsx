"use client";

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
import type { InvFilter } from "@/lib/flowlog/types";
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
        <div className={styles["empty-state"]}>
          No pending reorder requests
        </div>
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

export function InventoryTab() {
  const { state, dispatch } = useFlowLog();
  const { data, invFilter, invSearch } = state;

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
                return (
                  <tr key={i.id}>
                    <td>
                      <span style={{ fontWeight: 500 }}>{i.name}</span>
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
