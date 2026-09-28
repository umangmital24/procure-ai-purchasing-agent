import { investigate, scenarios, type ScenarioKey } from "@/lib/procurement-agent";
import { explainDecision } from "@/lib/llm-explainer";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("scenario") as ScenarioKey | null;
  if (!key || !scenarios[key]) {
    return Response.json({ error: "Unknown scenario" }, { status: 400 });
  }
  const run = investigate(key);
  run.explanation = await explainDecision(run);
  return Response.json({ run });
}
