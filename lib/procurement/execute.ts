import { investigateScenario } from "./investigate.ts";
import type {
  ActionLogEntry,
  ExecutionResult,
  Scenario,
  ScenarioKey,
  ValidationResult,
} from "./types.ts";

const VALIDATION_CHECKS = [
  "PO record exists",
  "Quantity and supplier match approved plan",
  "No duplicate PO detected",
  "Safety-stock coverage restored",
  "Budget and storage constraints respected",
];

export function executeRecoveryPlan(
  key: ScenarioKey,
  approved: boolean,
): ExecutionResult {
  const run = investigateScenario(key);

  if (!approved) return rejectedResult();
  if (run.status === "escalated" || !run.selectedSupplier) {
    return escalatedResult();
  }

  const initialAction = createOriginalPoUpdate(run.scenario);
  if (key === "capacity-drift") {
    return executeCapacityDriftRecovery(run.scenario, initialAction);
  }

  const projectedClosingStock = calculateClosingStock(
    run.scenario,
    run.orderQuantity,
  );

  return {
    status: "completed",
    message:
      "Recovery plan executed and independently validated against the latest operational state.",
    actions: [
      initialAction,
      {
        title: "Create PO-2047",
        detail: `${run.orderQuantity} units · ${run.selectedSupplier.name} · ETA ${run.selectedSupplier.leadDays} days`,
        status: "success",
      },
      {
        title: "Read-after-write validation",
        detail:
          "Re-read PO, supplier capacity, budget, and projected inventory",
        status: "success",
      },
    ],
    purchaseOrders: [
      {
        id: "PO-2047",
        supplier: run.selectedSupplier.name,
        quantity: run.orderQuantity,
        unitPrice: run.selectedSupplier.price,
        etaDays: run.selectedSupplier.leadDays,
      },
    ],
    validation: buildValidation({
      scenario: run.scenario,
      purchasedQuantity: run.orderQuantity,
      projectedClosingStock,
      budgetUsed: run.totalCost,
      checks: VALIDATION_CHECKS,
    }),
  };
}

function executeCapacityDriftRecovery(
  scenario: Scenario,
  initialAction: ActionLogEntry,
): ExecutionResult {
  const primarySupplier = scenario.suppliers.find(
    (supplier) => supplier.id === "SUP-B",
  );
  const fallbackSupplier = scenario.suppliers.find(
    (supplier) => supplier.id === "SUP-D",
  );

  if (!primarySupplier || !fallbackSupplier) {
    return escalatedResult("Required recovery suppliers are unavailable.");
  }

  const primaryQuantity = 120;
  const fallbackQuantity = 200;
  const purchasedQuantity = primaryQuantity + fallbackQuantity;
  const budgetUsed =
    primaryQuantity * primarySupplier.price +
    fallbackQuantity * fallbackSupplier.price;
  const projectedClosingStock = calculateClosingStock(
    scenario,
    purchasedQuantity,
  );

  return {
    status: "replanned",
    message:
      "The first action failed safely. The agent refreshed supplier capacity, re-planned the remaining quantity, and validated two replacement POs.",
    actions: [
      initialAction,
      {
        title: "Create PO with Distribuidora Nova",
        detail: "Rejected: available quantity changed from 300 to 120",
        status: "failed",
      },
      {
        title: "Refresh and re-plan",
        detail: "Split recovery across two eligible suppliers",
        status: "warning",
      },
      {
        title: "Create PO-2048",
        detail: "120 units · Distribuidora Nova · ETA 2 days",
        status: "success",
      },
      {
        title: "Create PO-2049",
        detail: "200 units · Mercado Directo · ETA 2 days",
        status: "success",
      },
    ],
    purchaseOrders: [
      {
        id: "PO-2048",
        supplier: primarySupplier.name,
        quantity: primaryQuantity,
        unitPrice: primarySupplier.price,
        etaDays: primarySupplier.leadDays,
      },
      {
        id: "PO-2049",
        supplier: fallbackSupplier.name,
        quantity: fallbackQuantity,
        unitPrice: fallbackSupplier.price,
        etaDays: fallbackSupplier.leadDays,
      },
    ],
    validation: buildValidation({
      scenario,
      purchasedQuantity,
      projectedClosingStock,
      budgetUsed,
      checks: [
        "Both PO records exist",
        "Supplier confirmations received",
        "No duplicate PO detected",
        "Safety-stock coverage restored",
        "Budget and storage constraints rechecked",
      ],
    }),
  };
}

function createOriginalPoUpdate(scenario: Scenario): ActionLogEntry {
  return {
    title: `Modify ${scenario.incident.poId}`,
    detail: `Reduce original PO from ${scenario.incident.ordered} to ${scenario.incident.confirmed} confirmed units`,
    status: "success",
  };
}

function calculateClosingStock(
  scenario: Scenario,
  purchasedQuantity: number,
) {
  return (
    scenario.inventory +
    scenario.incoming +
    scenario.incident.confirmed +
    purchasedQuantity -
    scenario.demand7d
  );
}

type ValidationInput = {
  scenario: Scenario;
  purchasedQuantity: number;
  projectedClosingStock: number;
  budgetUsed: number;
  checks: string[];
};

function buildValidation(input: ValidationInput): ValidationResult {
  const {
    scenario,
    purchasedQuantity,
    projectedClosingStock,
    budgetUsed,
    checks,
  } = input;

  return {
    passed:
      projectedClosingStock >= scenario.safetyStock &&
      budgetUsed <= scenario.budget &&
      purchasedQuantity <= scenario.freeStorage,
    projectedClosingStock,
    safetyStock: scenario.safetyStock,
    budgetUsed,
    checks,
  };
}

function rejectedResult(): ExecutionResult {
  return {
    status: "rejected",
    message:
      "Buyer rejected the recovery plan. No purchasing records were changed.",
    actions: [],
    purchaseOrders: [],
    validation: null,
  };
}

function escalatedResult(
  message = "Policy blocked execution. The case remains assigned to the senior buyer.",
): ExecutionResult {
  return {
    status: "escalated",
    message,
    actions: [
      {
        title: "Execution blocked",
        detail: "A purchasing guardrail failed before PO creation",
        status: "warning",
      },
    ],
    purchaseOrders: [],
    validation: null,
  };
}
