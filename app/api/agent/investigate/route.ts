import { isScenarioKey } from "@/lib/procurement/fixtures";
import { investigateScenario } from "@/lib/procurement/investigate";
import { explainDecision } from "@/lib/procurement/llm-explainer";

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("scenario");
  if (!isScenarioKey(key)) {
    return Response.json({ error: "Unknown scenario" }, { status: 400 });
  }
  const run = investigateScenario(key);
  run.explanation = await explainDecision(run);
  return Response.json({ run });
}
