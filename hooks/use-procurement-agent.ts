"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  fetchInvestigation,
  submitRecoveryDecision,
} from "@/lib/procurement/client-api";
import { scenarios } from "@/lib/procurement/fixtures";
import type {
  AgentRun,
  ExecutionResult,
  ScenarioKey,
} from "@/lib/procurement/types";

export function useProcurementAgent() {
  const [scenarioKey, setScenarioKey] =
    useState<ScenarioKey>("standard-recovery");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const changeScenario = useCallback((nextScenario: ScenarioKey) => {
    setScenarioKey(nextScenario);
    setRun(null);
    setExecution(null);
  }, []);

  const showInvestigation = useCallback(
    (nextScenario: ScenarioKey, nextRun: AgentRun) => {
      setScenarioKey(nextScenario);
      setRun(nextRun);
      setExecution(null);
    },
    [],
  );

  const showExecution = useCallback(
    (nextScenario: ScenarioKey, result: ExecutionResult) => {
      setScenarioKey(nextScenario);
      setExecution(result);
    },
    [],
  );

  const investigate = useCallback(async () => {
    setIsInvestigating(true);
    setExecution(null);

    try {
      const { run: nextRun } = await fetchInvestigation(scenarioKey);
      setRun(nextRun);
      toast.success(
        nextRun.status === "escalated"
          ? "Investigation complete - action blocked"
          : "Recovery plan ready for review",
      );
    } catch {
      toast.error("The agent could not complete the investigation.");
    } finally {
      setIsInvestigating(false);
    }
  }, [scenarioKey]);

  const execute = useCallback(
    async (approved: boolean) => {
      setIsExecuting(true);

      try {
        const { result } = await submitRecoveryDecision(
          scenarioKey,
          approved,
        );
        setExecution(result);
        showExecutionToast(result);
      } catch {
        toast.error(
          "Execution did not complete. No partial action was accepted.",
        );
      } finally {
        setIsExecuting(false);
      }
    },
    [scenarioKey],
  );

  return {
    scenarioKey,
    scenario: scenarios[scenarioKey],
    run,
    execution,
    isInvestigating,
    isExecuting,
    changeScenario,
    investigate,
    execute,
    showInvestigation,
    showExecution,
  };
}

function showExecutionToast(result: ExecutionResult) {
  if (result.status === "rejected") {
    toast.info("Plan rejected. No changes were made.");
    return;
  }

  if (result.status === "escalated") {
    toast.warning("Guardrail stopped the action.");
    return;
  }

  toast.success(
    result.status === "replanned"
      ? "Recovery completed after re-planning"
      : "Purchase order created and validated",
  );
}
