import type { AgentRun, ExecutionResult, ScenarioKey } from "./types.ts";

export async function fetchInvestigation(scenario: ScenarioKey) {
  return request<{ run: AgentRun }>(
    `/api/agent/investigate?scenario=${scenario}`,
  );
}

export async function submitRecoveryDecision(
  scenario: ScenarioKey,
  approved: boolean,
) {
  return request<{ result: ExecutionResult }>("/api/agent/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenario, approved }),
  });
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}
