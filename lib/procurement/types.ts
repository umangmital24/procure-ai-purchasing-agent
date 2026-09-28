export type ScenarioKey =
  | "standard-recovery"
  | "capacity-drift"
  | "budget-block";

export type Supplier = {
  id: string;
  name: string;
  available: number;
  price: number;
  leadDays: number;
  moq: number;
  reliability: number;
};

export type PurchaseIncident = {
  poId: string;
  sku: string;
  product: string;
  node: string;
  ordered: number;
  confirmed: number;
  message: string;
};

export type Scenario = {
  key: ScenarioKey;
  label: string;
  incident: PurchaseIncident;
  inventory: number;
  safetyStock: number;
  demand7d: number;
  incoming: number;
  freeStorage: number;
  budget: number;
  suppliers: Supplier[];
};

export type TraceEntry = {
  tool: string;
  result: string;
  status: "ok" | "warning";
};

export type ConstraintCheck = {
  name: string;
  status: "pass" | "fail";
  detail: string;
};

export type AgentRun = {
  scenario: Scenario;
  runId: string;
  status: "approval_required" | "escalated";
  trace: TraceEntry[];
  projectedShortage: number;
  orderQuantity: number;
  selectedSupplier: Supplier | null;
  totalCost: number;
  confidence: number;
  risk: "medium" | "high";
  explanation: string;
  constraints: ConstraintCheck[];
};

export type ActionLogEntry = {
  title: string;
  detail: string;
  status: "success" | "warning" | "failed";
};

export type PurchaseOrder = {
  id: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  etaDays: number;
};

export type ValidationResult = {
  passed: boolean;
  projectedClosingStock: number;
  safetyStock: number;
  budgetUsed: number;
  checks: string[];
};

export type ExecutionResult = {
  status: "completed" | "replanned" | "escalated" | "rejected";
  message: string;
  actions: ActionLogEntry[];
  purchaseOrders: PurchaseOrder[];
  validation: ValidationResult | null;
};
