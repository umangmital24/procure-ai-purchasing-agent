import { CheckCircle2 } from "lucide-react";

const evaluationRows = [
  {
    scenario: "Standard recovery",
    expected: "Approve + create replacement PO",
    outcome: "Passed",
    guardrails: "All 5",
  },
  {
    scenario: "Capacity drift",
    expected: "Re-plan after stale supplier capacity",
    outcome: "Passed after retry",
    guardrails: "All 5",
  },
  {
    scenario: "Budget constraint",
    expected: "Block action and escalate",
    outcome: "Passed",
    guardrails: "4 passed, budget blocked",
  },
];

const scores = [
  { label: "Decision accuracy", value: "3 / 3" },
  { label: "Safe execution", value: "3 / 3" },
  { label: "Validation coverage", value: "100%" },
];

export function EvaluationPanel() {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-[0_10px_35px_rgba(24,47,39,.06)]">
      <div className="border-b p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#ef5b33]">
          Regression suite
        </p>
        <h2 className="mt-1 text-xl font-bold">Scenario evaluation</h2>
        <p className="mt-2 text-sm text-[#68766f]">
          Each fixture checks decision correctness, tool coverage, constraint
          compliance, action outcome, and read-after-write validation.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#f3f6f4] text-xs uppercase tracking-wider text-[#6c7973]">
            <tr>
              <th className="px-6 py-4">Scenario</th>
              <th className="px-6 py-4">Expected behavior</th>
              <th className="px-6 py-4">Outcome</th>
              <th className="px-6 py-4">Guardrails</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {evaluationRows.map((row) => (
              <tr key={row.scenario}>
                <td className="px-6 py-5 font-semibold">{row.scenario}</td>
                <td className="px-6 py-5 text-[#5f6d67]">{row.expected}</td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center gap-2 font-semibold text-[#176b52]">
                    <CheckCircle2 className="size-4" />
                    {row.outcome}
                  </span>
                </td>
                <td className="px-6 py-5 text-[#5f6d67]">
                  {row.guardrails}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-px border-t bg-[#dce4e0] md:grid-cols-3">
        {scores.map((score) => (
          <div key={score.label} className="bg-[#f9fbfa] p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#718079]">
              {score.label}
            </p>
            <p className="mt-2 text-2xl font-bold">{score.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
