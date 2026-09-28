import type { Scenario, Supplier } from "./types.ts";

const MAX_RECOVERY_LEAD_DAYS = 3;

export function calculateProjectedShortage(scenario: Scenario) {
  const requiredStock = scenario.demand7d + scenario.safetyStock;
  const availableStock =
    scenario.inventory + scenario.incoming + scenario.incident.confirmed;

  return Math.max(0, requiredStock - availableStock);
}

export function rankEligibleSuppliers(scenario: Scenario) {
  return scenario.suppliers
    .filter(isEligibleSupplier)
    .toSorted(
      (left, right) =>
        right.reliability - left.reliability || left.price - right.price,
    );
}

export function calculateOrderQuantity(quantity: number, moq: number) {
  return Math.max(moq, Math.ceil(quantity / moq) * moq);
}

function isEligibleSupplier(supplier: Supplier) {
  return (
    supplier.leadDays <= MAX_RECOVERY_LEAD_DAYS &&
    supplier.available >= supplier.moq
  );
}
