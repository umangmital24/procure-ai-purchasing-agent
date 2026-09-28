"use client";

import { useEffect } from "react";
import {
  fetchInvestigation,
  submitRecoveryDecision,
} from "@/lib/procurement/client-api";
import { isScenarioKey, scenarioKeys } from "@/lib/procurement/fixtures";
import type {
  AgentRun,
  ExecutionResult,
  ScenarioKey,
} from "@/lib/procurement/types";

type ToolDefinition = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
  execute: (input: unknown) => unknown | Promise<unknown>;
};

type WebMcpContext = {
  registerTool: (
    tool: ToolDefinition,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

declare global {
  interface Document {
    modelContext?: WebMcpContext;
  }
}

type UseProcurementWebMcpInput = {
  onInvestigation: (scenario: ScenarioKey, run: AgentRun) => void;
  onExecution: (scenario: ScenarioKey, result: ExecutionResult) => void;
};

const SCENARIO_INPUT_SCHEMA = {
  type: "object",
  properties: {
    scenario: { type: "string", enum: scenarioKeys },
  },
  required: ["scenario"],
  additionalProperties: false,
};

export function useProcurementWebMcp({
  onInvestigation,
  onExecution,
}: UseProcurementWebMcpInput) {
  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;

    const lifecycle = new AbortController();
    const options = { signal: lifecycle.signal };

    const registrations = [
      context.registerTool(
        createInvestigationTool(onInvestigation),
        options,
      ),
      context.registerTool(
        createExecutionTool(onInvestigation, onExecution),
        options,
      ),
    ];

    for (const registration of registrations) {
      void Promise.resolve(registration).catch(() => undefined);
    }

    return () => lifecycle.abort();
  }, [onExecution, onInvestigation]);
}

function createInvestigationTool(
  onInvestigation: UseProcurementWebMcpInput["onInvestigation"],
): ToolDefinition {
  return {
    name: "investigate_supplier_shortfall",
    title: "Investigate supplier shortfall",
    description:
      "Run the purchasing agent for a selected test scenario and display its evidence, recommendation, and guardrail checks.",
    inputSchema: SCENARIO_INPUT_SCHEMA,
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    async execute(input) {
      const scenario = parseScenario(input);
      const { run } = await fetchInvestigation(scenario);
      onInvestigation(scenario, run);

      return {
        runId: run.runId,
        status: run.status,
        proposedQuantity: run.orderQuantity,
        supplier: run.selectedSupplier?.name ?? null,
      };
    },
  };
}

function createExecutionTool(
  onInvestigation: UseProcurementWebMcpInput["onInvestigation"],
  onExecution: UseProcurementWebMcpInput["onExecution"],
): ToolDefinition {
  return {
    name: "execute_approved_recovery_plan",
    title: "Execute approved recovery plan",
    description:
      "Approve and execute the selected scenario's purchasing plan, then display the validated result. This can create mock purchase orders.",
    inputSchema: SCENARIO_INPUT_SCHEMA,
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      const scenario = parseScenario(input);
      const { run } = await fetchInvestigation(scenario);
      onInvestigation(scenario, run);

      const { result } = await submitRecoveryDecision(scenario, true);
      onExecution(scenario, result);

      return {
        status: result.status,
        purchaseOrderIds: result.purchaseOrders.map((order) => order.id),
        validationPassed: result.validation?.passed ?? false,
      };
    },
  };
}

function parseScenario(input: unknown): ScenarioKey {
  const scenario =
    typeof input === "object" && input !== null
      ? (input as { scenario?: unknown }).scenario
      : undefined;

  if (!isScenarioKey(scenario)) {
    throw new Error(
      "scenario must be standard-recovery, capacity-drift, or budget-block",
    );
  }

  return scenario;
}
