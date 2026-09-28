import type { AgentRun } from "@/lib/procurement-agent";

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

export async function explainDecision(run: AgentRun) {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL;
  if (!apiKey || !model) return run.explanation;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content:
              "You explain purchasing decisions to a professional buyer. The deterministic policy engine has already calculated and approved the plan. Never change quantities, supplier, risk, status, or constraints. Write one concise paragraph using only the supplied JSON.",
          },
          {
            role: "user",
            content: JSON.stringify({
              incident: run.scenario.incident,
              projectedShortage: run.projectedShortage,
              selectedSupplier: run.selectedSupplier,
              orderQuantity: run.orderQuantity,
              totalCost: run.totalCost,
              status: run.status,
              constraints: run.constraints,
            }),
          },
        ],
      }),
    });
    if (!response.ok) return run.explanation;
    const payload = (await response.json()) as GroqResponse;
    return payload.choices?.[0]?.message?.content?.trim() || run.explanation;
  } catch {
    return run.explanation;
  } finally {
    clearTimeout(timeout);
  }
}
