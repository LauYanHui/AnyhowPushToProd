import { computeAnalytics } from "./analytics";
import {
  fmtTime,
  getItem,
  nearestExpiry,
  stockStatus,
} from "./helpers";
import type { FlowLogData } from "./types";

export interface ToolResult {
  result: unknown;
  nextData?: FlowLogData;
}

export function executeTool(
  name: string,
  input: Record<string, unknown>,
  data: FlowLogData,
): ToolResult {
  try {
    switch (name) {
      case "get_inventory":
        return { result: getInventory(input, data) };
      case "get_orders":
        return { result: getOrders(input, data) };
      case "get_fleet_status":
        return { result: getFleetStatus(input, data) };
      case "get_analytics":
        return { result: getAnalytics(input, data) };
      case "update_stock_level":
        return updateStock(input, data);
      case "create_reorder":
        return createReorder(input, data);
      case "update_order_status":
        return updateOrderStatus(input, data);
      case "assign_delivery":
        return assignDelivery(input, data);
      default:
        return { result: { error: `Unknown tool: ${name}` } };
    }
  } catch (e) {
    return {
      result: { error: e instanceof Error ? e.message : String(e) },
    };
  }
}

function getInventory(
  input: Record<string, unknown>,
  data: FlowLogData,
): Record<string, unknown> {
  const filter = input.filter as string;
  const category = input.category as string | undefined;
  const today = new Date();
  const in7 = new Date(today);
  in7.setDate(today.getDate() + 7);

  let items = data.inventory;
  if (category) items = items.filter((i) => i.category === category);
  if (filter === "low_stock")
    items = items.filter((i) => i.currentStock <= i.reorderPoint);
  else if (filter === "near_expiry")
    items = items.filter((i) =>
      i.expiryDates.some(
        (e) =>
          new Date(e.expiresOn) <= in7 && new Date(e.expiresOn) >= today,
      ),
    );
  else if (filter === "out_of_stock")
    items = items.filter((i) => i.currentStock === 0);

  return {
    count: items.length,
    items: items.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      currentStock: i.currentStock,
      unit: i.unit,
      reorderPoint: i.reorderPoint,
      reorderQty: i.reorderQty,
      stockStatus: stockStatus(i),
      costPerUnit: i.costPerUnit,
      supplierId: i.supplierId,
      nearestExpiry: nearestExpiry(i),
      notes: i.notes,
    })),
  };
}

function getOrders(
  input: Record<string, unknown>,
  data: FlowLogData,
): Record<string, unknown> {
  const status = input.status as string;
  const date = input.date as string | undefined;
  let orders = data.orders;
  if (status !== "all") orders = orders.filter((o) => o.status === status);
  if (date)
    orders = orders.filter((o) => o.deliveryWindow.earliest.startsWith(date));

  return {
    count: orders.length,
    orders: orders.map((o) => ({
      id: o.id,
      status: o.status,
      priority: o.priority,
      customerName: o.customerName,
      customerAddress: o.customerAddress,
      deliveryWindow: o.deliveryWindow,
      assignedDriverId: o.assignedDriverId,
      assignedVehicleId: o.assignedVehicleId,
      totalValue: o.totalValue,
      items: o.items,
      notes: o.notes,
    })),
  };
}

function getFleetStatus(
  input: Record<string, unknown>,
  data: FlowLogData,
): Record<string, unknown> {
  const includeOffline = Boolean(input.include_offline);
  let vehicles = data.vehicles;
  if (!includeOffline)
    vehicles = vehicles.filter(
      (v) => v.status !== "offline" && v.status !== "maintenance",
    );

  return {
    vehicles: vehicles.map((v) => ({
      id: v.id,
      plateNumber: v.plateNumber,
      type: v.type,
      status: v.status,
      capacityKg: v.capacityKg,
      currentLoadKg: v.currentLoadKg,
      utilizationPct: Math.round((v.currentLoadKg / v.capacityKg) * 100),
      fuelLevelPct: v.fuelLevelPct,
      currentDriverId: v.currentDriverId,
      currentLocation: v.currentLocation,
    })),
    drivers: data.drivers.map((d) => ({
      id: d.id,
      name: d.name,
      phone: d.phone,
      status: d.status,
      currentVehicleId: d.currentVehicleId,
      currentOrderId: d.currentOrderId,
      hoursWorkedToday: d.hoursWorkedToday,
      deliveriesCompletedToday: d.deliveriesCompletedToday,
    })),
    summary: {
      availableVehicles: data.vehicles.filter((v) => v.status === "available")
        .length,
      availableDrivers: data.drivers.filter((d) => d.status === "available")
        .length,
      onRouteVehicles: data.vehicles.filter((v) => v.status === "on_route")
        .length,
    },
  };
}

function getAnalytics(
  input: Record<string, unknown>,
  data: FlowLogData,
): Record<string, unknown> {
  const metric = input.metric as Parameters<typeof computeAnalytics>[1];
  return computeAnalytics(data, metric);
}

function updateStock(
  input: Record<string, unknown>,
  data: FlowLogData,
): ToolResult {
  const inventoryId = input.inventory_id as string;
  const adjustment = Number(input.adjustment);
  const reason = input.reason as string;
  const item = data.inventory.find((i) => i.id === inventoryId);
  if (!item)
    return { result: { error: `Item ${inventoryId} not found` } };
  const before = item.currentStock;
  const after = Math.max(0, before + adjustment);
  const nextData: FlowLogData = {
    ...data,
    inventory: data.inventory.map((i) =>
      i.id === inventoryId ? { ...i, currentStock: after } : i,
    ),
  };
  return {
    result: {
      success: true,
      item_id: inventoryId,
      name: item.name,
      before,
      after,
      adjustment,
      reason,
    },
    nextData,
  };
}

function createReorder(
  input: Record<string, unknown>,
  data: FlowLogData,
): ToolResult {
  const inventoryId = input.inventory_id as string;
  const quantity = input.quantity as number | undefined;
  const urgency = input.urgency as "standard" | "express";
  const notes = (input.notes as string) || "";

  const item = data.inventory.find((i) => i.id === inventoryId);
  if (!item)
    return { result: { error: `Item ${inventoryId} not found` } };
  const sup = data.suppliers.find((s) => s.id === item.supplierId);
  const qty = quantity ?? item.reorderQty;
  const mult = urgency === "express" ? 1.4 : 1.0;
  const lead =
    urgency === "express"
      ? Math.ceil((sup?.leadTimeDays || 2) / 2)
      : sup?.leadTimeDays || 2;
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + lead);
  const reorder = {
    id: `REO-${String(Date.now()).slice(-6)}`,
    inventoryId,
    supplierId: item.supplierId,
    qtyOrdered: qty,
    unitCost: item.costPerUnit,
    totalCost: Math.round(qty * item.costPerUnit * mult * 100) / 100,
    status: "pending" as const,
    createdAt: new Date().toISOString(),
    expectedDelivery: expDate.toISOString().split("T")[0],
    urgency,
    createdBy: "agent" as const,
    notes,
  };
  const nextData: FlowLogData = {
    ...data,
    reorders: [...data.reorders, reorder],
  };
  return {
    result: {
      success: true,
      reorder_id: reorder.id,
      item_name: item.name,
      qty_ordered: qty,
      supplier: sup?.name,
      total_cost: reorder.totalCost,
      expected_delivery: reorder.expectedDelivery,
      urgency,
    },
    nextData,
  };
}

function updateOrderStatus(
  input: Record<string, unknown>,
  data: FlowLogData,
): ToolResult {
  const orderId = input.order_id as string;
  const newStatus = input.new_status as string;
  const driverId = input.driver_id as string | undefined;
  const vehicleId = input.vehicle_id as string | undefined;
  const notes = input.notes as string | undefined;

  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return { result: { error: `Order ${orderId} not found` } };
  const old = order.status;

  const nextData: FlowLogData = {
    ...data,
    orders: data.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: newStatus as typeof o.status,
            actualDeliveredAt:
              newStatus === "delivered"
                ? new Date().toISOString()
                : o.actualDeliveredAt,
            assignedDriverId: driverId ?? o.assignedDriverId,
            assignedVehicleId: vehicleId ?? o.assignedVehicleId,
            notes: notes ?? o.notes,
          }
        : o,
    ),
  };

  return {
    result: {
      success: true,
      order_id: orderId,
      customer: order.customerName,
      old_status: old,
      new_status: newStatus,
    },
    nextData,
  };
}

function assignDelivery(
  input: Record<string, unknown>,
  data: FlowLogData,
): ToolResult {
  const orderId = input.order_id as string;
  const driverId = input.driver_id as string;
  const vehicleId = input.vehicle_id as string;

  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return { result: { error: `Order ${orderId} not found` } };
  if (order.status !== "pending" && order.status !== "assigned")
    return {
      result: { error: `Order is ${order.status}, cannot assign` },
    };

  const driver = data.drivers.find((d) => d.id === driverId);
  if (!driver)
    return { result: { error: `Driver ${driverId} not found` } };
  if (driver.status !== "available")
    return {
      result: {
        error: `Driver ${driver.name} is ${driver.status}, not available`,
      },
    };

  const vehicle = data.vehicles.find((v) => v.id === vehicleId);
  if (!vehicle)
    return { result: { error: `Vehicle ${vehicleId} not found` } };
  if (vehicle.status !== "available")
    return {
      result: {
        error: `Vehicle ${vehicle.plateNumber} is ${vehicle.status}, not available`,
      },
    };

  const orderWeight = order.items.reduce((s, it) => {
    const inv = getItem(data, it.inventoryId);
    return s + it.qty * (inv ? 1 : 1);
  }, 0);
  if (vehicle.currentLoadKg + orderWeight > vehicle.capacityKg) {
    return {
      result: {
        error: `Vehicle ${vehicle.plateNumber} capacity exceeded (${vehicle.currentLoadKg}+${orderWeight} > ${vehicle.capacityKg}kg)`,
      },
    };
  }

  const nextData: FlowLogData = {
    ...data,
    orders: data.orders.map((o) =>
      o.id === orderId
        ? {
            ...o,
            status: "assigned",
            assignedDriverId: driverId,
            assignedVehicleId: vehicleId,
          }
        : o,
    ),
    drivers: data.drivers.map((d) =>
      d.id === driverId
        ? {
            ...d,
            status: "on_duty",
            currentVehicleId: vehicleId,
            currentOrderId: orderId,
          }
        : d,
    ),
    vehicles: data.vehicles.map((v) =>
      v.id === vehicleId
        ? {
            ...v,
            status: "on_route",
            currentDriverId: driverId,
            currentLoadKg: v.currentLoadKg + orderWeight,
          }
        : v,
    ),
  };

  return {
    result: {
      success: true,
      order_id: orderId,
      customer: order.customerName,
      assigned_driver: driver.name,
      assigned_vehicle: vehicle.plateNumber,
      delivery_window: `${fmtTime(order.deliveryWindow.earliest)}–${fmtTime(order.deliveryWindow.latest)}`,
    },
    nextData,
  };
}
