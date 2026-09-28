import { executeRecoveryPlan } from "@/lib/procurement/execute";
import { isScenarioKey } from "@/lib/procurement/fixtures";

export async function POST(request: Request) {
  const payload = (await request.json()) as {
    scenario?: unknown;
    approved?: boolean;
  };
  if (!isScenarioKey(payload.scenario)) {
    return Response.json({ error: "Unknown scenario" }, { status: 400 });
  }
  return Response.json({
    result: executeRecoveryPlan(payload.scenario, payload.approved === true),
  });
}
