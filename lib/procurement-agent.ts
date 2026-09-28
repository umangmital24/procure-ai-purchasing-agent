export type ScenarioKey = "standard-recovery" | "capacity-drift" | "budget-block";

export type Supplier = {
  id: string;
  name: string;
  available: number;
  price: number;
  leadDays: number;
  moq: number;
  reliability: number;
};

export type Scenario = {
  key: ScenarioKey;
  label: string;
  incident: {
    poId: string;
    sku: string;
    product: string;
    node: string;
    ordered: number;
    confirmed: number;
    message: string;
  };
  inventory: number;
  safetyStock: number;
  demand7d: number;
  incoming: number;
  freeStorage: number;
  budget: number;
  suppliers: Supplier[];
};

export type AgentRun = {
  scenario: Scenario;
  runId: string;
  status: "approval_required" | "escalated";
  trace: Array<{ tool: string; result: string; status: "ok" | "warning" }>;
  projectedShortage: number;
  orderQuantity: number;
  selectedSupplier: Supplier | null;
  totalCost: number;
  confidence: number;
  risk: "low" | "medium" | "high";
  explanation: string;
  constraints: Array<{ name: string; status: "pass" | "fail"; detail: string }>;
};

export type ExecutionResult = {
  status: "completed" | "replanned" | "escalated" | "rejected";
  message: string;
  actions: Array<{ title: string; detail: string; status: "success" | "warning" | "failed" }>;
  purchaseOrders: Array<{ id: string; supplier: string; quantity: number; unitPrice: number; etaDays: number }>;
  validation: {
    passed: boolean;
    projectedClosingStock: number;
    safetyStock: number;
    budgetUsed: number;
    checks: string[];
  } | null;
};

export const scenarios: Record<ScenarioKey, Scenario> = {
  "standard-recovery": {
    key: "standard-recovery",
    label: "Standard recovery",
    incident: {
      poId: "PO-1042",
      sku: "BEV-CC-500",
      product: "Coca-Cola 500 ml",
      node: "Dark Store MX-17",
      ordered: 500,
      confirmed: 250,
      message: "We can currently fulfil only 250 of the 500 units requested.",
    },
    inventory: 120,
    safetyStock: 80,
    demand7d: 610,
    incoming: 50,
    freeStorage: 480,
    budget: 35000,
    suppliers: [
      { id: "SUP-B", name: "Distribuidora Nova", available: 300, price: 96, leadDays: 2, moq: 100, reliability: 96 },
      { id: "SUP-C", name: "Pacific Wholesale", available: 500, price: 88, leadDays: 6, moq: 500, reliability: 88 },
      { id: "SUP-D", name: "Mercado Directo", available: 240, price: 99, leadDays: 2, moq: 100, reliability: 91 },
    ],
  },
  "capacity-drift": {
    key: "capacity-drift",
    label: "Capacity changes mid-run",
    incident: {
      poId: "PO-1042",
      sku: "BEV-CC-500",
      product: "Coca-Cola 500 ml",
      node: "Dark Store MX-17",
      ordered: 500,
      confirmed: 250,
      message: "We can currently fulfil only 250 of the 500 units requested.",
    },
    inventory: 120,
    safetyStock: 80,
    demand7d: 610,
    incoming: 50,
    freeStorage: 480,
    budget: 35000,
    suppliers: [
      { id: "SUP-B", name: "Distribuidora Nova", available: 300, price: 96, leadDays: 2, moq: 100, reliability: 96 },
      { id: "SUP-C", name: "Pacific Wholesale", available: 500, price: 88, leadDays: 6, moq: 500, reliability: 88 },
      { id: "SUP-D", name: "Mercado Directo", available: 240, price: 99, leadDays: 2, moq: 100, reliability: 91 },
    ],
  },
  "budget-block": {
    key: "budget-block",
    label: "Budget constraint",
    incident: {
      poId: "PO-1098",
      sku: "BEV-CC-500",
      product: "Coca-Cola 500 ml",
      node: "Dark Store MX-17",
      ordered: 500,
      confirmed: 250,
      message: "Supplier allocation was reduced to 250 units.",
    },
    inventory: 90,
    safetyStock: 80,
    demand7d: 620,
    incoming: 30,
    freeStorage: 520,
    budget: 14500,
    suppliers: [
      { id: "SUP-B", name: "Distribuidora Nova", available: 400, price: 96, leadDays: 2, moq: 100, reliability: 96 },
      { id: "SUP-C", name: "Pacific Wholesale", available: 500, price: 88, leadDays: 6, moq: 500, reliability: 88 },
    ],
  },
};

function roundToMoq(quantity: number, moq: number) {
  return Math.max(moq, Math.ceil(quantity / moq) * moq);
}

export function investigate(key: ScenarioKey): AgentRun {
  const scenario = scenarios[key] ?? scenarios["standard-recovery"];
  const projectedShortage = Math.max(
    0,
    scenario.demand7d + scenario.safetyStock - scenario.inventory - scenario.incoming - scenario.incident.confirmed,
  );
  const eligible = scenario.suppliers
    .filter((supplier) => supplier.leadDays <= 3 && supplier.available >= supplier.moq)
    .sort((a, b) => b.reliability - a.reliability || a.price - b.price);
  const selectedSupplier = eligible[0] ?? null;
  const orderQuantity = selectedSupplier ? roundToMoq(projectedShortage, selectedSupplier.moq) : 0;
  const totalCost = selectedSupplier ? orderQuantity * selectedSupplier.price : 0;
  const budgetPass = totalCost <= scenario.budget;
  const storagePass = orderQuantity <= scenario.freeStorage;
  const supplierPass = !!selectedSupplier && orderQuantity <= selectedSupplier.available;
  const status = budgetPass && storagePass && supplierPass ? "approval_required" : "escalated";

  return {
    scenario,
    runId: `RUN-${key === "standard-recovery" ? "2207" : key === "capacity-drift" ? "2208" : "2209"}`,
    status,
    projectedShortage,
    orderQuantity,
    selectedSupplier,
    totalCost,
    confidence: status === "approval_required" ? 92 : 78,
    risk: status === "approval_required" ? "medium" : "high",
    explanation: status === "approval_required"
      ? `${scenario.incident.confirmed} confirmed units plus current and incoming stock would leave a ${projectedShortage}-unit safety-stock gap. ${selectedSupplier?.name} is the strongest eligible option: ${selectedSupplier?.leadDays}-day lead time, ${selectedSupplier?.reliability}% reliability, and enough available capacity. Ordering ${orderQuantity} units restores coverage while respecting MOQ, budget, and storage limits.`
      : `The shortfall requires ${orderQuantity} additional units, but the proposed purchase would exceed the available purchasing budget. The agent has stopped before creating a purchase order and escalated the case with the evidence attached.`,
    trace: [
      { tool: "inventory.get_position", result: `${scenario.inventory} on hand · ${scenario.incoming} incoming`, status: "ok" },
      { tool: "forecast.get_demand", result: `${scenario.demand7d} units expected in 7 days`, status: "ok" },
      { tool: "purchase_orders.get_open", result: `${scenario.incident.confirmed}/${scenario.incident.ordered} units confirmed`, status: "warning" },
      { tool: "suppliers.rank_options", result: `${eligible.length} eligible alternates found`, status: "ok" },
      { tool: "constraints.check_budget", result: budgetPass ? `₹${scenario.budget.toLocaleString("en-IN")} available` : `₹${totalCost.toLocaleString("en-IN")} needed · ₹${scenario.budget.toLocaleString("en-IN")} available`, status: budgetPass ? "ok" : "warning" },
      { tool: "constraints.check_storage", result: `${scenario.freeStorage} units free capacity`, status: storagePass ? "ok" : "warning" },
    ],
    constraints: [
      { name: "Supplier capacity", status: supplierPass ? "pass" : "fail", detail: selectedSupplier ? `${selectedSupplier.available} units available` : "No eligible supplier" },
      { name: "Minimum order", status: orderQuantity >= (selectedSupplier?.moq ?? Infinity) ? "pass" : "fail", detail: selectedSupplier ? `MOQ ${selectedSupplier.moq}` : "Unavailable" },
      { name: "Lead time", status: (selectedSupplier?.leadDays ?? Infinity) <= 3 ? "pass" : "fail", detail: selectedSupplier ? `${selectedSupplier.leadDays} days` : "Unavailable" },
      { name: "Budget", status: budgetPass ? "pass" : "fail", detail: `₹${totalCost.toLocaleString("en-IN")} / ₹${scenario.budget.toLocaleString("en-IN")}` },
      { name: "Storage", status: storagePass ? "pass" : "fail", detail: `${orderQuantity} / ${scenario.freeStorage} units` },
    ],
  };
}

export function execute(key: ScenarioKey, approved: boolean): ExecutionResult {
  const run = investigate(key);
  if (!approved) {
    return { status: "rejected", message: "Buyer rejected the recovery plan. No purchasing records were changed.", actions: [], purchaseOrders: [], validation: null };
  }
  if (run.status === "escalated" || !run.selectedSupplier) {
    return { status: "escalated", message: "Policy blocked execution. The case remains assigned to the senior buyer.", actions: [{ title: "Execution blocked", detail: "Budget guardrail failed before PO creation", status: "warning" }], purchaseOrders: [], validation: null };
  }

  const scenario = run.scenario;
  const baseActions: ExecutionResult["actions"] = [
    { title: `Modify ${scenario.incident.poId}`, detail: `Reduce original PO from ${scenario.incident.ordered} to ${scenario.incident.confirmed} confirmed units`, status: "success" },
  ];

  if (key === "capacity-drift") {
    const firstQty = 120;
    const secondQty = 200;
    const second = scenario.suppliers.find((supplier) => supplier.id === "SUP-D")!;
    const budgetUsed = firstQty * run.selectedSupplier.price + secondQty * second.price;
    const closing = scenario.inventory + scenario.incoming + scenario.incident.confirmed + firstQty + secondQty - scenario.demand7d;
    return {
      status: "replanned",
      message: "The first action failed safely. The agent refreshed supplier capacity, re-planned the remaining quantity, and validated two replacement POs.",
      actions: [
        ...baseActions,
        { title: "Create PO with Distribuidora Nova", detail: "Rejected: available quantity changed from 300 to 120", status: "failed" },
        { title: "Refresh and re-plan", detail: "Split recovery across two eligible suppliers", status: "warning" },
        { title: "Create PO-2048", detail: "120 units · Distribuidora Nova · ETA 2 days", status: "success" },
        { title: "Create PO-2049", detail: "200 units · Mercado Directo · ETA 2 days", status: "success" },
      ],
      purchaseOrders: [
        { id: "PO-2048", supplier: run.selectedSupplier.name, quantity: firstQty, unitPrice: run.selectedSupplier.price, etaDays: 2 },
        { id: "PO-2049", supplier: second.name, quantity: secondQty, unitPrice: second.price, etaDays: 2 },
      ],
      validation: {
        passed: closing >= scenario.safetyStock && budgetUsed <= scenario.budget,
        projectedClosingStock: closing,
        safetyStock: scenario.safetyStock,
        budgetUsed,
        checks: ["Both PO records exist", "Supplier confirmations received", "No duplicate PO detected", "Safety-stock coverage restored", "Budget and storage constraints rechecked"],
      },
    };
  }

  const closing = scenario.inventory + scenario.incoming + scenario.incident.confirmed + run.orderQuantity - scenario.demand7d;
  return {
    status: "completed",
    message: "Recovery plan executed and independently validated against the latest operational state.",
    actions: [
      ...baseActions,
      { title: "Create PO-2047", detail: `${run.orderQuantity} units · ${run.selectedSupplier.name} · ETA ${run.selectedSupplier.leadDays} days`, status: "success" },
      { title: "Read-after-write validation", detail: "Re-read PO, supplier capacity, budget, and projected inventory", status: "success" },
    ],
    purchaseOrders: [{ id: "PO-2047", supplier: run.selectedSupplier.name, quantity: run.orderQuantity, unitPrice: run.selectedSupplier.price, etaDays: run.selectedSupplier.leadDays }],
    validation: {
      passed: closing >= scenario.safetyStock,
      projectedClosingStock: closing,
      safetyStock: scenario.safetyStock,
      budgetUsed: run.totalCost,
      checks: ["PO record exists", "Quantity and supplier match approved plan", "No duplicate PO detected", "Safety-stock coverage restored", "Budget and storage constraints respected"],
    },
  };
}
