import type { Scenario, ScenarioKey } from "./types.ts";

const BASE_INCIDENT = {
  poId: "PO-1042",
  sku: "BEV-CC-500",
  product: "Coca-Cola 500 ml",
  node: "Dark Store MX-17",
  ordered: 500,
  confirmed: 250,
  message: "We can currently fulfil only 250 of the 500 units requested.",
} as const;

const BASE_SUPPLIERS = [
  {
    id: "SUP-B",
    name: "Distribuidora Nova",
    available: 300,
    price: 96,
    leadDays: 2,
    moq: 100,
    reliability: 96,
  },
  {
    id: "SUP-C",
    name: "Pacific Wholesale",
    available: 500,
    price: 88,
    leadDays: 6,
    moq: 500,
    reliability: 88,
  },
  {
    id: "SUP-D",
    name: "Mercado Directo",
    available: 240,
    price: 99,
    leadDays: 2,
    moq: 100,
    reliability: 91,
  },
] as const;

export const scenarioKeys: ScenarioKey[] = [
  "standard-recovery",
  "capacity-drift",
  "budget-block",
];

export const scenarios: Record<ScenarioKey, Scenario> = {
  "standard-recovery": {
    key: "standard-recovery",
    label: "Standard recovery",
    incident: { ...BASE_INCIDENT },
    inventory: 120,
    safetyStock: 80,
    demand7d: 610,
    incoming: 50,
    freeStorage: 480,
    budget: 35_000,
    suppliers: BASE_SUPPLIERS.map((supplier) => ({ ...supplier })),
  },
  "capacity-drift": {
    key: "capacity-drift",
    label: "Capacity changes mid-run",
    incident: { ...BASE_INCIDENT },
    inventory: 120,
    safetyStock: 80,
    demand7d: 610,
    incoming: 50,
    freeStorage: 480,
    budget: 35_000,
    suppliers: BASE_SUPPLIERS.map((supplier) => ({ ...supplier })),
  },
  "budget-block": {
    key: "budget-block",
    label: "Budget constraint",
    incident: {
      ...BASE_INCIDENT,
      poId: "PO-1098",
      message: "Supplier allocation was reduced to 250 units.",
    },
    inventory: 90,
    safetyStock: 80,
    demand7d: 620,
    incoming: 30,
    freeStorage: 520,
    budget: 14_500,
    suppliers: [
      { ...BASE_SUPPLIERS[0], available: 400 },
      { ...BASE_SUPPLIERS[1] },
    ],
  },
};

export function isScenarioKey(value: unknown): value is ScenarioKey {
  return typeof value === "string" && scenarioKeys.includes(value as ScenarioKey);
}
