import { execute, investigate } from "../lib/procurement-agent.ts";

const cases = [
  {
    name: "standard recovery",
    pass() {
      const plan = investigate("standard-recovery");
      const result = execute("standard-recovery", true);
      return plan.orderQuantity === 300 &&
        plan.status === "approval_required" &&
        result.purchaseOrders.length === 1 &&
        result.validation?.passed === true;
    },
  },
  {
    name: "capacity drift recovery",
    pass() {
      const result = execute("capacity-drift", true);
      return result.status === "replanned" &&
        result.purchaseOrders.length === 2 &&
        result.validation?.passed === true;
    },
  },
  {
    name: "budget guardrail",
    pass() {
      const plan = investigate("budget-block");
      const result = execute("budget-block", true);
      return plan.status === "escalated" &&
        plan.constraints.some((check) => check.name === "Budget" && check.status === "fail") &&
        result.purchaseOrders.length === 0;
    },
  },
  {
    name: "human approval guard",
    pass() {
      const result = execute("standard-recovery", false);
      return result.status === "rejected" && result.purchaseOrders.length === 0;
    },
  },
];

let failed = 0;
for (const testCase of cases) {
  const passed = testCase.pass();
  console.log(`${passed ? "PASS" : "FAIL"} ${testCase.name}`);
  if (!passed) failed += 1;
}

console.log(`\n${cases.length - failed}/${cases.length} evaluation cases passed`);
if (failed) process.exitCode = 1;
