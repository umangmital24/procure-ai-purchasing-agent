"use client";

import { CaseToolbar } from "@/components/procurement/case-toolbar";
import { DashboardHeader } from "@/components/procurement/dashboard-header";
import { EvaluationPanel } from "@/components/procurement/evaluation-panel";
import { ExecutionPanel } from "@/components/procurement/execution-panel";
import { IncidentSummary } from "@/components/procurement/incident-summary";
import { InvestigationPanel } from "@/components/procurement/investigation-panel";
import { WaitingState } from "@/components/procurement/waiting-state";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { useProcurementAgent } from "@/hooks/use-procurement-agent";
import { useProcurementWebMcp } from "@/hooks/use-procurement-webmcp";

export function ProcurementConsole() {
  const agent = useProcurementAgent();

  useProcurementWebMcp({
    onInvestigation: agent.showInvestigation,
    onExecution: agent.showExecution,
  });

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#10211b]">
      <Toaster position="top-right" richColors />
      <DashboardHeader />

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <Tabs defaultValue="case" className="gap-5">
          <CaseToolbar
            poId={agent.scenario.incident.poId}
            scenarioKey={agent.scenarioKey}
            onScenarioChange={agent.changeScenario}
          />

          <TabsContent value="case" className="space-y-5">
            <IncidentSummary
              scenario={agent.scenario}
              hasRun={agent.run !== null}
              isInvestigating={agent.isInvestigating}
              onInvestigate={agent.investigate}
            />

            {agent.run ? (
              <InvestigationPanel
                run={agent.run}
                hasExecution={agent.execution !== null}
                isExecuting={agent.isExecuting}
                onDecision={agent.execute}
              />
            ) : (
              <WaitingState />
            )}

            {agent.execution ? (
              <ExecutionPanel result={agent.execution} />
            ) : null}
          </TabsContent>

          <TabsContent value="evaluation">
            <EvaluationPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
