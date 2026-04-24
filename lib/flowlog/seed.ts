import type { FlowLogData } from "./types";

export function seedData(): FlowLogData {
  const today = new Date();
  const d = (days: number): string => {
    const x = new Date(today);
    x.setDate(x.getDate() + days);
    return x.toISOString().split("T")[0];
  };
  const tw = (h1: number, m1: number, h2: number, m2: number) => {
    const s = new Date(today);
    s.setHours(h1, m1, 0, 0);
    const e = new Date(today);
    e.setHours(h2, m2, 0, 0);
    return { earliest: s.toISOString(), latest: e.toISOString() };
  };

  const suppliers: FlowLogData["suppliers"] = [
    { id: "SUP-001", name: "Meridian Cold Chain Co.", contactEmail: "orders@meridian.sg", leadTimeDays: 2, minimumOrderValue: 500, reliabilityScore: 94, categories: ["frozen_meat", "dairy"], paymentTerms: "Net 30" },
    { id: "SUP-002", name: "FarmFresh Asia Pte Ltd", contactEmail: "supply@farmfreshasia.sg", leadTimeDays: 1, minimumOrderValue: 300, reliabilityScore: 88, categories: ["fresh_produce"], paymentTerms: "COD" },
    { id: "SUP-003", name: "Pacific Dry Goods Ltd", contactEmail: "b2b@pacificdry.com", leadTimeDays: 3, minimumOrderValue: 1000, reliabilityScore: 97, categories: ["dry_goods", "packaging"], paymentTerms: "Net 45" },
    { id: "SUP-004", name: "Dairy Direct SG", contactEmail: "orders@dairydirect.sg", leadTimeDays: 1, minimumOrderValue: 400, reliabilityScore: 91, categories: ["dairy", "beverages"], paymentTerms: "Net 14" },
    { id: "SUP-005", name: "OceanPrime Seafood Exports", contactEmail: "export@oceanprime.sg", leadTimeDays: 2, minimumOrderValue: 800, reliabilityScore: 85, categories: ["fresh_produce", "frozen_meat"], paymentTerms: "Net 30" },
  ];

  const inventory: FlowLogData["inventory"] = [
    { id: "INV-001", sku: "FRZ-BEEF-PATTY-4OZ", name: "Beef Patties 4oz", category: "frozen_meat", unit: "case", currentStock: 142, reorderPoint: 50, reorderQty: 200, maxCapacity: 400, costPerUnit: 48.5, sellPrice: 72.0, supplierId: "SUP-001", warehouseZone: "A3", expiryDates: [{ qty: 60, expiresOn: d(16) }, { qty: 82, expiresOn: d(30) }], lastRestocked: d(-9), notes: "" },
    { id: "INV-002", sku: "FRZ-CHICKEN-THIGH-5KG", name: "Chicken Thighs 5kg", category: "frozen_meat", unit: "case", currentStock: 38, reorderPoint: 40, reorderQty: 150, maxCapacity: 300, costPerUnit: 62.0, sellPrice: 88.0, supplierId: "SUP-001", warehouseZone: "A4", expiryDates: [{ qty: 38, expiresOn: d(4) }], lastRestocked: d(-14), notes: "Check freezer unit 4 temps" },
    { id: "INV-003", sku: "FRZ-PORK-BELLY-SLICED", name: "Sliced Pork Belly", category: "frozen_meat", unit: "case", currentStock: 0, reorderPoint: 30, reorderQty: 100, maxCapacity: 200, costPerUnit: 55.0, sellPrice: 79.0, supplierId: "SUP-001", warehouseZone: "A3", expiryDates: [], lastRestocked: d(-23), notes: "OUT OF STOCK" },
    { id: "INV-004", sku: "FRZ-SALMON-FILLET-VAC", name: "Vacuum Salmon Fillets", category: "frozen_meat", unit: "kg", currentStock: 210, reorderPoint: 80, reorderQty: 300, maxCapacity: 600, costPerUnit: 18.5, sellPrice: 26.0, supplierId: "SUP-005", warehouseZone: "B1", expiryDates: [{ qty: 210, expiresOn: d(36) }], lastRestocked: d(-6), notes: "" },
    { id: "INV-005", sku: "FRS-LEAFY-MIXED-KG", name: "Mixed Leafy Greens", category: "fresh_produce", unit: "kg", currentStock: 85, reorderPoint: 100, reorderQty: 200, maxCapacity: 300, costPerUnit: 3.2, sellPrice: 5.5, supplierId: "SUP-002", warehouseZone: "C1", expiryDates: [{ qty: 85, expiresOn: d(2) }], lastRestocked: d(-1), notes: "Daily order needed" },
    { id: "INV-006", sku: "FRS-TOMATO-BOX-5KG", name: "Cherry Tomatoes 5kg Box", category: "fresh_produce", unit: "box", currentStock: 44, reorderPoint: 30, reorderQty: 80, maxCapacity: 150, costPerUnit: 12.8, sellPrice: 19.0, supplierId: "SUP-002", warehouseZone: "C2", expiryDates: [{ qty: 44, expiresOn: d(3) }], lastRestocked: d(-2), notes: "" },
    { id: "INV-007", sku: "FRS-ONION-BROWN-10KG", name: "Brown Onions 10kg", category: "fresh_produce", unit: "bag", currentStock: 120, reorderPoint: 50, reorderQty: 150, maxCapacity: 400, costPerUnit: 8.5, sellPrice: 13.0, supplierId: "SUP-002", warehouseZone: "C3", expiryDates: [{ qty: 120, expiresOn: d(26) }], lastRestocked: d(-12), notes: "" },
    { id: "INV-008", sku: "FRS-MUSHROOM-SHIITAKE", name: "Shiitake Mushrooms 1kg", category: "fresh_produce", unit: "pack", currentStock: 22, reorderPoint: 40, reorderQty: 100, maxCapacity: 200, costPerUnit: 9.8, sellPrice: 15.5, supplierId: "SUP-002", warehouseZone: "C1", expiryDates: [{ qty: 22, expiresOn: d(1) }], lastRestocked: d(-4), notes: "" },
    { id: "INV-009", sku: "DAI-CHEESE-CHEDDAR-5KG", name: "Cheddar Cheese Block 5kg", category: "dairy", unit: "block", currentStock: 56, reorderPoint: 30, reorderQty: 100, maxCapacity: 200, costPerUnit: 34.0, sellPrice: 52.0, supplierId: "SUP-004", warehouseZone: "D1", expiryDates: [{ qty: 56, expiresOn: d(47) }], lastRestocked: d(-16), notes: "" },
    { id: "INV-010", sku: "DAI-BUTTER-UNSALTED-1KG", name: "Unsalted Butter 1kg", category: "dairy", unit: "block", currentStock: 188, reorderPoint: 60, reorderQty: 200, maxCapacity: 400, costPerUnit: 8.2, sellPrice: 12.5, supplierId: "SUP-004", warehouseZone: "D1", expiryDates: [{ qty: 188, expiresOn: d(21) }], lastRestocked: d(-7), notes: "" },
    { id: "INV-011", sku: "DAI-CREAM-HEAVY-1L", name: "Heavy Whipping Cream 1L", category: "dairy", unit: "carton", currentStock: 14, reorderPoint: 40, reorderQty: 120, maxCapacity: 240, costPerUnit: 4.5, sellPrice: 7.0, supplierId: "SUP-004", warehouseZone: "D2", expiryDates: [{ qty: 14, expiresOn: d(1) }], lastRestocked: d(-8), notes: "CRITICAL — low and near expiry" },
    { id: "INV-012", sku: "DRY-RICE-JASMINE-25KG", name: "Jasmine Rice 25kg", category: "dry_goods", unit: "bag", currentStock: 310, reorderPoint: 100, reorderQty: 300, maxCapacity: 600, costPerUnit: 28.0, sellPrice: 40.0, supplierId: "SUP-003", warehouseZone: "E1", expiryDates: [{ qty: 310, expiresOn: d(342) }], lastRestocked: d(-35), notes: "" },
    { id: "INV-013", sku: "DRY-FLOUR-AP-25KG", name: "All-Purpose Flour 25kg", category: "dry_goods", unit: "bag", currentStock: 95, reorderPoint: 50, reorderQty: 200, maxCapacity: 400, costPerUnit: 22.0, sellPrice: 33.0, supplierId: "SUP-003", warehouseZone: "E2", expiryDates: [{ qty: 95, expiresOn: d(160) }], lastRestocked: d(-22), notes: "" },
    { id: "INV-014", sku: "DRY-SUGAR-WHITE-25KG", name: "White Sugar 25kg", category: "dry_goods", unit: "bag", currentStock: 160, reorderPoint: 60, reorderQty: 200, maxCapacity: 400, costPerUnit: 19.5, sellPrice: 28.0, supplierId: "SUP-003", warehouseZone: "E2", expiryDates: [{ qty: 160, expiresOn: d(252) }], lastRestocked: d(-27), notes: "" },
    { id: "INV-015", sku: "BEV-MILK-WHOLE-1L", name: "Whole Milk 1L", category: "beverages", unit: "carton", currentStock: 330, reorderPoint: 120, reorderQty: 400, maxCapacity: 800, costPerUnit: 2.1, sellPrice: 3.2, supplierId: "SUP-004", warehouseZone: "D3", expiryDates: [{ qty: 330, expiresOn: d(11) }], lastRestocked: d(-4), notes: "" },
    { id: "INV-016", sku: "BEV-OJ-PURE-1L", name: "Pure Orange Juice 1L", category: "beverages", unit: "carton", currentStock: 28, reorderPoint: 80, reorderQty: 200, maxCapacity: 400, costPerUnit: 3.8, sellPrice: 5.8, supplierId: "SUP-004", warehouseZone: "D3", expiryDates: [{ qty: 28, expiresOn: d(5) }], lastRestocked: d(-14), notes: "" },
    { id: "INV-017", sku: "PKG-BOX-COLD-MED", name: "Insulated Cold Box (Med)", category: "packaging", unit: "unit", currentStock: 820, reorderPoint: 300, reorderQty: 1000, maxCapacity: 3000, costPerUnit: 1.2, sellPrice: 1.2, supplierId: "SUP-003", warehouseZone: "F1", expiryDates: [], lastRestocked: d(-45), notes: "" },
    { id: "INV-018", sku: "PKG-ICE-GEL-PACK", name: "Gel Ice Pack 400g", category: "packaging", unit: "unit", currentStock: 240, reorderPoint: 500, reorderQty: 2000, maxCapacity: 5000, costPerUnit: 0.85, sellPrice: 0.85, supplierId: "SUP-003", warehouseZone: "F2", expiryDates: [], lastRestocked: d(-19), notes: "LOW — impacting cold chain ops" },
  ];

  const vehicles: FlowLogData["vehicles"] = [
    { id: "VEH-001", plateNumber: "SBP-2241", type: "refrigerated_van", capacityKg: 800, capacityPallets: 4, currentLoadKg: 0, status: "available", currentDriverId: null, lastServiceDate: d(-54), nextServiceDue: d(37), fuelLevelPct: 88, currentLocation: "Depot — Tuas" },
    { id: "VEH-002", plateNumber: "SDF-9902", type: "refrigerated_van", capacityKg: 800, capacityPallets: 4, currentLoadKg: 620, status: "on_route", currentDriverId: "DRV-002", lastServiceDate: d(-68), nextServiceDue: d(21), fuelLevelPct: 54, currentLocation: "En route to Orchard" },
    { id: "VEH-003", plateNumber: "SGH-4410", type: "refrigerated_truck", capacityKg: 2500, capacityPallets: 12, currentLoadKg: 1800, status: "on_route", currentDriverId: "DRV-003", lastServiceDate: d(-23), nextServiceDue: d(68), fuelLevelPct: 71, currentLocation: "En route to Airport" },
    { id: "VEH-004", plateNumber: "SJK-7733", type: "dry_truck", capacityKg: 3000, capacityPallets: 16, currentLoadKg: 0, status: "maintenance", currentDriverId: null, lastServiceDate: d(-4), nextServiceDue: d(87), fuelLevelPct: 100, currentLocation: "Workshop — Buona Vista" },
    { id: "VEH-005", plateNumber: "SLP-3318", type: "refrigerated_van", capacityKg: 800, capacityPallets: 4, currentLoadKg: 400, status: "on_route", currentDriverId: "DRV-005", lastServiceDate: d(-35), nextServiceDue: d(57), fuelLevelPct: 62, currentLocation: "En route to Woodlands" },
    { id: "VEH-006", plateNumber: "SMR-1124", type: "motorcycle", capacityKg: 50, capacityPallets: 0, currentLoadKg: 30, status: "on_route", currentDriverId: "DRV-006", lastServiceDate: d(-14), nextServiceDue: d(77), fuelLevelPct: 45, currentLocation: "CBD area" },
  ];

  const drivers: FlowLogData["drivers"] = [
    { id: "DRV-001", name: "Aminah Binte Said", phone: "+65 9111 2233", status: "available", currentVehicleId: null, currentOrderId: null, hoursWorkedToday: 0, deliveriesCompletedToday: 0, licenseExpiry: d(700) },
    { id: "DRV-002", name: "Kevin Lim Wei Hao", phone: "+65 9222 3344", status: "on_duty", currentVehicleId: "VEH-002", currentOrderId: "ORD-2026-007", hoursWorkedToday: 5.5, deliveriesCompletedToday: 4, licenseExpiry: d(513) },
    { id: "DRV-003", name: "Rajan s/o Perumal", phone: "+65 9333 4455", status: "on_duty", currentVehicleId: "VEH-003", currentOrderId: "ORD-2026-008", hoursWorkedToday: 6.0, deliveriesCompletedToday: 2, licenseExpiry: d(222) },
    { id: "DRV-004", name: "Jessica Tan Hui Lin", phone: "+65 9444 5566", status: "off_duty", currentVehicleId: null, currentOrderId: null, hoursWorkedToday: 0, deliveriesCompletedToday: 0, licenseExpiry: d(1057) },
    { id: "DRV-005", name: "Ahmad Farid Bin Musa", phone: "+65 9555 6677", status: "on_duty", currentVehicleId: "VEH-005", currentOrderId: "ORD-2026-009", hoursWorkedToday: 4.0, deliveriesCompletedToday: 3, licenseExpiry: d(432) },
    { id: "DRV-006", name: "Li Jianming", phone: "+65 9666 7788", status: "on_duty", currentVehicleId: "VEH-006", currentOrderId: "ORD-2026-010", hoursWorkedToday: 3.5, deliveriesCompletedToday: 5, licenseExpiry: d(942) },
  ];

  const orders: FlowLogData["orders"] = [
    { id: "ORD-2026-001", status: "delivered", priority: "normal", customerName: "Raffles Kitchen Supplies", customerAddress: "10 Collyer Quay #02-01", deliveryWindow: tw(7, 0, 9, 0), assignedVehicleId: "VEH-002", assignedDriverId: "DRV-002", items: [{ inventoryId: "INV-010", qty: 20, unitCost: 8.2 }, { inventoryId: "INV-009", qty: 5, unitCost: 34.0 }], totalValue: 334, actualDeliveredAt: new Date(today.getTime() - 3600000 * 3).toISOString(), notes: "" },
    { id: "ORD-2026-002", status: "delivered", priority: "high", customerName: "Marina Bay Sands F&B", customerAddress: "10 Bayfront Ave", deliveryWindow: tw(6, 0, 8, 0), assignedVehicleId: "VEH-003", assignedDriverId: "DRV-003", items: [{ inventoryId: "INV-001", qty: 30, unitCost: 48.5 }, { inventoryId: "INV-004", qty: 50, unitCost: 18.5 }], totalValue: 2380, actualDeliveredAt: new Date(today.getTime() - 3600000 * 4).toISOString(), notes: "VIP client" },
    { id: "ORD-2026-003", status: "delivered", priority: "normal", customerName: "Jurong West NTUC Fairprice", customerAddress: "50 Jurong Gateway Rd", deliveryWindow: tw(8, 0, 10, 0), assignedVehicleId: "VEH-005", assignedDriverId: "DRV-005", items: [{ inventoryId: "INV-015", qty: 100, unitCost: 2.1 }, { inventoryId: "INV-013", qty: 10, unitCost: 22.0 }], totalValue: 430, actualDeliveredAt: new Date(today.getTime() - 3600000 * 2.5).toISOString(), notes: "" },
    { id: "ORD-2026-004", status: "delivered", priority: "normal", customerName: "Tampines Hub Foodcourt", customerAddress: "1 Tampines Walk", deliveryWindow: tw(9, 0, 11, 0), assignedVehicleId: "VEH-005", assignedDriverId: "DRV-005", items: [{ inventoryId: "INV-005", qty: 30, unitCost: 3.2 }, { inventoryId: "INV-006", qty: 15, unitCost: 12.8 }], totalValue: 288, actualDeliveredAt: new Date(today.getTime() - 3600000 * 2).toISOString(), notes: "" },
    { id: "ORD-2026-005", status: "delivered", priority: "urgent", customerName: "Shangri-La Hotel Kitchens", customerAddress: "22 Orange Grove Rd", deliveryWindow: tw(5, 30, 7, 0), assignedVehicleId: "VEH-002", assignedDriverId: "DRV-002", items: [{ inventoryId: "INV-002", qty: 10, unitCost: 62.0 }, { inventoryId: "INV-011", qty: 24, unitCost: 4.5 }], totalValue: 728, actualDeliveredAt: new Date(today.getTime() - 3600000 * 5).toISOString(), notes: "Early AM — fragile dairy" },
    { id: "ORD-2026-006", status: "delivered", priority: "normal", customerName: "Buona Vista Food Hub", customerAddress: "9 one-north Gateway", deliveryWindow: tw(9, 0, 11, 0), assignedVehicleId: "VEH-006", assignedDriverId: "DRV-006", items: [{ inventoryId: "INV-017", qty: 50, unitCost: 1.2 }, { inventoryId: "INV-018", qty: 100, unitCost: 0.85 }], totalValue: 145, actualDeliveredAt: new Date(today.getTime() - 3600000 * 1).toISOString(), notes: "" },
    { id: "ORD-2026-007", status: "in_transit", priority: "high", customerName: "Orchard Road Catering Co.", customerAddress: "290 Orchard Rd #B1", deliveryWindow: tw(11, 0, 13, 0), assignedVehicleId: "VEH-002", assignedDriverId: "DRV-002", items: [{ inventoryId: "INV-001", qty: 20, unitCost: 48.5 }, { inventoryId: "INV-010", qty: 10, unitCost: 8.2 }], totalValue: 1052, actualDeliveredAt: null, notes: "" },
    { id: "ORD-2026-008", status: "in_transit", priority: "urgent", customerName: "Changi Airport Lounge F&B", customerAddress: "Airport Blvd, Terminal 3", deliveryWindow: tw(10, 0, 12, 0), assignedVehicleId: "VEH-003", assignedDriverId: "DRV-003", items: [{ inventoryId: "INV-004", qty: 80, unitCost: 18.5 }, { inventoryId: "INV-009", qty: 10, unitCost: 34.0 }], totalValue: 1820, actualDeliveredAt: null, notes: "Airport security clearance required" },
    { id: "ORD-2026-009", status: "in_transit", priority: "normal", customerName: "Woodlands Kopitiam Grp", customerAddress: "30 Woodlands Ave 2", deliveryWindow: tw(12, 0, 14, 0), assignedVehicleId: "VEH-005", assignedDriverId: "DRV-005", items: [{ inventoryId: "INV-012", qty: 20, unitCost: 28.0 }, { inventoryId: "INV-007", qty: 10, unitCost: 8.5 }], totalValue: 645, actualDeliveredAt: null, notes: "" },
    { id: "ORD-2026-010", status: "pending", priority: "high", customerName: "Novena Medical Centre Cafe", customerAddress: "10 Sinaran Dr", deliveryWindow: tw(13, 0, 15, 0), assignedVehicleId: null, assignedDriverId: null, items: [{ inventoryId: "INV-011", qty: 10, unitCost: 4.5 }, { inventoryId: "INV-015", qty: 50, unitCost: 2.1 }], totalValue: 150, actualDeliveredAt: null, notes: "Hospital — must arrive cold" },
    { id: "ORD-2026-011", status: "pending", priority: "normal", customerName: "Punggol Hawker Centre Admin", customerAddress: "50 Punggol Central", deliveryWindow: tw(14, 0, 16, 0), assignedVehicleId: null, assignedDriverId: null, items: [{ inventoryId: "INV-007", qty: 20, unitCost: 8.5 }, { inventoryId: "INV-013", qty: 5, unitCost: 22.0 }], totalValue: 280, actualDeliveredAt: null, notes: "" },
    { id: "ORD-2026-012", status: "pending", priority: "urgent", customerName: "Sentosa Resort Kitchen", customerAddress: "8 Sentosa Gateway", deliveryWindow: tw(12, 0, 14, 0), assignedVehicleId: null, assignedDriverId: null, items: [{ inventoryId: "INV-001", qty: 15, unitCost: 48.5 }, { inventoryId: "INV-006", qty: 20, unitCost: 12.8 }], totalValue: 983.5, actualDeliveredAt: null, notes: "URGENT — event tonight" },
    { id: "ORD-2026-013", status: "failed", priority: "normal", customerName: "Geylang Bazaar Vendors", customerAddress: "Geylang Rd Block 3", deliveryWindow: tw(8, 0, 10, 0), assignedVehicleId: "VEH-002", assignedDriverId: "DRV-002", items: [{ inventoryId: "INV-016", qty: 20, unitCost: 3.8 }], totalValue: 76, actualDeliveredAt: null, notes: "Customer not available — rescheduling required" },
  ];

  const reorders: FlowLogData["reorders"] = [
    { id: "REO-2026-0001", inventoryId: "INV-003", supplierId: "SUP-001", qtyOrdered: 100, unitCost: 55.0, totalCost: 5500, status: "sent", createdAt: new Date(today.getTime() - 86400000).toISOString(), expectedDelivery: d(1), urgency: "standard", createdBy: "user", notes: "Out of stock — urgent" },
    { id: "REO-2026-0002", inventoryId: "INV-016", supplierId: "SUP-004", qtyOrdered: 200, unitCost: 3.8, totalCost: 760, status: "pending", createdAt: new Date().toISOString(), expectedDelivery: d(1), urgency: "express", createdBy: "agent", notes: "Low stock — near expiry risk" },
  ];

  const OPS_EMAIL = "tansq05@gmail.com";
  const hoursAgo = (h: number): string =>
    new Date(today.getTime() - h * 3600000).toISOString();

  const emails: FlowLogData["emails"] = [
    {
      id: "EML-000001",
      direction: "incoming",
      from: "vendors@geylang-bazaar.sg",
      to: OPS_EMAIL,
      subject: "ORD-2026-013 — need to reschedule Geylang delivery",
      body:
        "Hi PrimeChill team,\n\n" +
        "Our stall wasn't open when your driver came earlier today — nobody was there to receive the orange juice order (ORD-2026-013). Can we reschedule for tomorrow morning, anytime between 7am–9am? " +
        "Same address, Geylang Rd Block 3.\n\n" +
        "Sorry about this. Thanks — Faizal, Geylang Bazaar.",
      receivedAt: hoursAgo(1),
      status: "unread",
      category: "customer_complaint",
      relatedOrderId: "ORD-2026-013",
      relatedSupplierId: null,
      draftedBy: null,
      agentNotes: "",
      replyToEmailId: null,
    },
    {
      id: "EML-000002",
      direction: "incoming",
      from: "procurement@sentosa-resort.com",
      to: OPS_EMAIL,
      subject: "URGENT — beef patties + tomatoes for tonight's event",
      body:
        "Hello,\n\n" +
        "We have a late booking tonight at the resort and need a rush delivery of 15 cases of Beef Patties 4oz and 20 boxes of Cherry Tomatoes, delivered between 12pm and 2pm today to 8 Sentosa Gateway. " +
        "This is order ORD-2026-012 which we already placed this morning. Can you confirm a driver is assigned? The event is non-negotiable.\n\n" +
        "Best regards,\nMarcus Tan\nExec Chef, Sentosa Resort",
      receivedAt: hoursAgo(2),
      status: "unread",
      category: "customer_inquiry",
      relatedOrderId: "ORD-2026-012",
      relatedSupplierId: null,
      draftedBy: null,
      agentNotes: "",
      replyToEmailId: null,
    },
    {
      id: "EML-000003",
      direction: "incoming",
      from: "orders@meridian.sg",
      to: OPS_EMAIL,
      subject: "Shipment REO-2026-0001 — on track for tomorrow AM",
      body:
        "Hi,\n\nConfirming your pork belly reorder (REO-2026-0001, 100 cases) is loaded and will arrive at the Tuas depot tomorrow between 08:00 and 10:00. " +
        "Please have staff ready to receive.\n\nRgds,\nMeridian Cold Chain Despatch",
      receivedAt: hoursAgo(3),
      status: "unread",
      category: "supplier_update",
      relatedOrderId: null,
      relatedSupplierId: "SUP-001",
      draftedBy: null,
      agentNotes: "",
      replyToEmailId: null,
    },
    {
      id: "EML-000004",
      direction: "incoming",
      from: "ops@changiairport-lounges.sg",
      to: OPS_EMAIL,
      subject: "ETA on ORD-2026-008?",
      body:
        "Hi team,\n\nJust checking in — what's the current ETA on ORD-2026-008 (salmon + cheddar for Terminal 3)? Our prep window is tight this afternoon. " +
        "Please confirm the driver is cleared through airport security.\n\nThanks,\nChangi Lounge Ops",
      receivedAt: hoursAgo(4),
      status: "unread",
      category: "customer_inquiry",
      relatedOrderId: "ORD-2026-008",
      relatedSupplierId: null,
      draftedBy: null,
      agentNotes: "",
      replyToEmailId: null,
    },
    {
      id: "EML-000005",
      direction: "incoming",
      from: "fb@orchardcatering.sg",
      to: OPS_EMAIL,
      subject: "Delay concerns — ORD-2026-007",
      body:
        "Hello,\n\nORD-2026-007 (beef patties + butter) was due at our kitchen between 11–1. It's past the window and we haven't heard anything. " +
        "If the cold chain has been broken we will need to refuse the shipment. Can you confirm dispatch temp and ETA?\n\nBest,\nOrchard Catering Co.",
      receivedAt: hoursAgo(1.5),
      status: "unread",
      category: "customer_complaint",
      relatedOrderId: "ORD-2026-007",
      relatedSupplierId: null,
      draftedBy: null,
      agentNotes: "",
      replyToEmailId: null,
    },
    {
      id: "EML-000006",
      direction: "outgoing",
      from: OPS_EMAIL,
      to: "procurement@marinabaysands.com",
      subject: "Delivered — ORD-2026-002",
      body:
        "Hi team,\n\nConfirming ORD-2026-002 was delivered this morning to Marina Bay Sands F&B. " +
        "Driver: Rajan s/o Perumal, plate SGH-4410. Full cold chain maintained.\n\nCheers,\nPrimeChill Ops",
      receivedAt: hoursAgo(4),
      status: "sent",
      category: "delivery_notification",
      relatedOrderId: "ORD-2026-002",
      relatedSupplierId: null,
      draftedBy: "user",
      agentNotes: "",
      replyToEmailId: null,
    },
    {
      id: "EML-000007",
      direction: "outgoing",
      from: OPS_EMAIL,
      to: "orders@meridian.sg",
      subject: "Purchase order — REO-2026-0001 / Sliced Pork Belly",
      body:
        "Hi Meridian team,\n\nPlease deliver 100 cases of Sliced Pork Belly (SKU FRZ-PORK-BELLY-SLICED) against reorder REO-2026-0001. " +
        "Unit cost USD 55.00, total USD 5,500.00, Net 30. Deliver to Tuas depot by end of week.\n\nRgds,\nPrimeChill Procurement",
      receivedAt: hoursAgo(24),
      status: "sent",
      category: "supplier_update",
      relatedOrderId: null,
      relatedSupplierId: "SUP-001",
      draftedBy: "user",
      agentNotes: "",
      replyToEmailId: null,
    },
    {
      id: "EML-000008",
      direction: "outgoing",
      from: OPS_EMAIL,
      to: "kopitiam-grp@woodlands.sg",
      subject: "Your delivery is out — ORD-2026-009",
      body:
        "Hi,\n\nJust a heads-up — your jasmine rice + onion order (ORD-2026-009) is out for delivery now with Ahmad Farid (SLP-3318), " +
        "ETA 12:00–14:00 at 30 Woodlands Ave 2.\n\nThanks for your business.\nPrimeChill",
      receivedAt: hoursAgo(1),
      status: "sent",
      category: "delivery_notification",
      relatedOrderId: "ORD-2026-009",
      relatedSupplierId: null,
      draftedBy: "user",
      agentNotes: "",
      replyToEmailId: null,
    },
  ];

  const reports: FlowLogData["reports"] = [];

  return {
    suppliers,
    inventory,
    vehicles,
    drivers,
    orders,
    reorders,
    emails,
    reports,
  };
}
