import { execute, scenarios, type ScenarioKey } from "@/lib/procurement-agent";

export async function POST(request: Request) {
  const payload = (await request.json()) as { scenario?: ScenarioKey; approved?: boolean };
  if (!payload.scenario || !scenarios[payload.scenario]) {
    return Response.json({ error: "Unknown scenario" }, { status: 400 });
  }
  return Response.json({ result: execute(payload.scenario, payload.approved === true) });
}
