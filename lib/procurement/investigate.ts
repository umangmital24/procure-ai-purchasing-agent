import { scenarios } from "./fixtures.ts";
import {
  calculateOrderQuantity,
  calculateProjectedShortage,
  rankEligibleSuppliers,
} from "./planner.ts";
import type {
  AgentRun,
  ConstraintCheck,
  Scenario,
  ScenarioKey,
  Supplier,
  TraceEntry,
} from "./types.ts";

const RUN_IDS: Record<ScenarioKey, string> = {
  "standard-recovery": "RUN-2207",
  "capacity-drift": "RUN-2208",
  "budget-block": "RUN-2209",
};

export function investigateScenario(key: ScenarioKey): AgentRun {
  const scenario = scenarios[key];
  const projectedShortage = calculateProjectedShortage(scenario);
  const eligibleSuppliers = rankEligibleSuppliers(scenario);
  const selectedSupplier = eligibleSuppliers[0] ?? null;
  const orderQuantity = selectedSupplier
    ? calculateOrderQuantity(projectedShortage, selectedSupplier.moq)
    : 0;
  const totalCost = selectedSupplier
    ? orderQuantity * selectedSupplier.price
    : 0;

  const constraints = buildConstraintChecks(
    scenario,
    selectedSupplier,
    orderQuantity,
    totalCost,
  );
  const canExecute = constraints.every((check) => check.status === "pass");

  return {
    scenario,
    runId: RUN_IDS[key],
    status: canExecute ? "approval_required" : "escalated",
    projectedShortage,
    orderQuantity,
    selectedSupplier,
    totalCost,
    confidence: canExecute ? 92 : 78,
    risk: canExecute ? "medium" : "high",
    explanation: buildExplanation({
      scenario,
      selectedSupplier,
      projectedShortage,
      orderQuantity,
      canExecute,
    }),
    trace: buildTrace(
      scenario,
      eligibleSuppliers.length,
      totalCost,
      constraints,
    ),
    constraints,
  };
}

type ExplanationInput = {
  scenario: Scenario;
  selectedSupplier: Supplier | null;
  projectedShortage: number;
  orderQuantity: number;
  canExecute: boolean;
};

function buildExplanation(input: ExplanationInput) {
  const {
    scenario,
    selectedSupplier,
    projectedShortage,
    orderQuantity,
    canExecute,
  } = input;

  if (!canExecute) {
    return `The shortfall requires ${orderQuantity} additional units, but the proposed purchase would exceed the available purchasing budget. The agent has stopped before creating a purchase order and escalated the case with the evidence attached.`;
  }

  return `${scenario.incident.confirmed} confirmed units plus current and incoming stock would leave a ${projectedShortage}-unit safety-stock gap. ${selectedSupplier?.name} is the strongest eligible option: ${selectedSupplier?.leadDays}-day lead time, ${selectedSupplier?.reliability}% reliability, and enough available capacity. Ordering ${orderQuantity} units restores coverage while respecting MOQ, budget, and storage limits.`;
}

function buildConstraintChecks(
  scenario: Scenario,
  supplier: Supplier | null,
  orderQuantity: number,
  totalCost: number,
): ConstraintCheck[] {
  const hasCapacity = Boolean(supplier && orderQuantity <= supplier.available);
  const meetsMoq = Boolean(supplier && orderQuantity >= supplier.moq);
  const meetsLeadTime = Boolean(supplier && supplier.leadDays <= 3);
  const fitsBudget = totalCost <= scenario.budget;
  const fitsStorage = orderQuantity <= scenario.freeStorage;

  return [
    {
      name: "Supplier capacity",
      status: hasCapacity ? "pass" : "fail",
      detail: supplier ? `${supplier.available} units available` : "No eligible supplier",
    },
    {
      name: "Minimum order",
      status: meetsMoq ? "pass" : "fail",
      detail: supplier ? `MOQ ${supplier.moq}` : "Unavailable",
    },
    {
      name: "Lead time",
      status: meetsLeadTime ? "pass" : "fail",
      detail: supplier ? `${supplier.leadDays} days` : "Unavailable",
    },
    {
      name: "Budget",
      status: fitsBudget ? "pass" : "fail",
      detail: `${formatMoney(totalCost)} / ${formatMoney(scenario.budget)}`,
    },
    {
      name: "Storage",
      status: fitsStorage ? "pass" : "fail",
      detail: `${orderQuantity} / ${scenario.freeStorage} units`,
    },
  ];
}

function buildTrace(
  scenario: Scenario,
  eligibleSupplierCount: number,
  totalCost: number,
  constraints: ConstraintCheck[],
): TraceEntry[] {
  const budgetCheck = constraints.find((check) => check.name === "Budget");
  const storageCheck = constraints.find((check) => check.name === "Storage");

  return [
    {
      tool: "inventory.get_position",
      result: `${scenario.inventory} on hand · ${scenario.incoming} incoming`,
      status: "ok",
    },
    {
      tool: "forecast.get_demand",
      result: `${scenario.demand7d} units expected in 7 days`,
      status: "ok",
    },
    {
      tool: "purchase_orders.get_open",
      result: `${scenario.incident.confirmed}/${scenario.incident.ordered} units confirmed`,
      status: "warning",
    },
    {
      tool: "suppliers.rank_options",
      result: `${eligibleSupplierCount} eligible alternates found`,
      status: "ok",
    },
    {
      tool: "constraints.check_budget",
      result:
        budgetCheck?.status === "pass"
          ? `${formatMoney(scenario.budget)} available`
          : `${formatMoney(totalCost)} needed · ${formatMoney(scenario.budget)} available`,
      status: budgetCheck?.status === "pass" ? "ok" : "warning",
    },
    {
      tool: "constraints.check_storage",
      result: `${scenario.freeStorage} units free capacity`,
      status: storageCheck?.status === "pass" ? "ok" : "warning",
    },
  ];
}

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}
