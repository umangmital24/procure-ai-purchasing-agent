import {
  ArrowRight,
  Check,
  Database,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/format";
import type { AgentRun, ConstraintCheck } from "@/lib/procurement/types";

type InvestigationPanelProps = {
  run: AgentRun;
  hasExecution: boolean;
  isExecuting: boolean;
  onDecision: (approved: boolean) => void;
};

export function InvestigationPanel({
  run,
  hasExecution,
  isExecuting,
  onDecision,
}: InvestigationPanelProps) {
  return (
    <section className="grid gap-5 xl:grid-cols-[.82fr_1.35fr_.9fr]">
      <AgentTrace run={run} />
      <DecisionCard
        run={run}
        hasExecution={hasExecution}
        isExecuting={isExecuting}
        onDecision={onDecision}
      />
      <ConstraintList constraints={run.constraints} />
    </section>
  );
}

function AgentTrace({ run }: { run: AgentRun }) {
  return (
    <div className="rounded-2xl border bg-[#11261f] p-5 text-white shadow-[0_12px_35px_rgba(17,38,31,.16)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#8eb3a5]">
            Agent trace
          </p>
          <h3 className="mt-1 font-bold">Evidence gathered</h3>
        </div>
        <Database className="size-5 text-[#ef7c5c]" />
      </div>

      <div className="mt-5 space-y-1">
        {run.trace.map((entry, index) => (
          <div key={entry.tool} className="relative flex gap-3 pb-4">
            {index < run.trace.length - 1 ? (
              <span className="absolute left-[9px] top-5 h-[calc(100%-8px)] w-px bg-[#325247]" />
            ) : null}
            <span
              className={`relative z-10 mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full ${
                entry.status === "ok" ? "bg-[#2e8b68]" : "bg-[#cc7a31]"
              }`}
            >
              <Check className="size-3" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-[#d9ebe4]">
                {entry.tool}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-[#8fa99f]">
                {entry.result}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type DecisionCardProps = InvestigationPanelProps;

function DecisionCard({
  run,
  hasExecution,
  isExecuting,
  onDecision,
}: DecisionCardProps) {
  const title =
    run.status === "escalated"
      ? "Escalate to senior buyer"
      : "Recover through alternate supplier";

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-[0_10px_35px_rgba(24,47,39,.06)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#ef5b33]">
            Decision
          </p>
          <h3 className="mt-1 text-xl font-bold tracking-tight">{title}</h3>
        </div>
        <div className="text-right">
          <p className="text-xs text-[#68766f]">Confidence</p>
          <p className="text-lg font-bold">{run.confidence}%</p>
        </div>
      </div>

      <Progress
        value={run.confidence}
        className="mt-3 h-1.5 bg-[#e7eeea] [&_[data-slot=progress-indicator]]:bg-[#ef5b33]"
      />
      <p className="mt-5 text-[15px] leading-6 text-[#52615b]">
        {run.explanation}
      </p>

      <DecisionSummary run={run} />

      {!hasExecution ? (
        <DecisionActions
          isExecuting={isExecuting}
          isBlocked={run.status === "escalated"}
          onDecision={onDecision}
        />
      ) : null}
    </div>
  );
}

function DecisionSummary({ run }: { run: AgentRun }) {
  return (
    <div className="mt-5 rounded-xl border bg-[#f7f9f8] p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <DecisionMetric
          label="Safety-stock gap"
          value={`${run.projectedShortage} units`}
        />
        <DecisionMetric
          label="Proposed order"
          value={`${run.orderQuantity} units`}
        />
        <DecisionMetric
          label="Purchase value"
          value={formatMoney(run.totalCost)}
        />
      </div>

      {run.selectedSupplier ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-sm">
          <div>
            <span className="font-semibold">{run.selectedSupplier.name}</span>
            <span className="ml-2 text-[#6d7b75]">
              {run.selectedSupplier.reliability}% reliable ·{" "}
              {run.selectedSupplier.leadDays}-day lead
            </span>
          </div>
          <ArrowRight className="size-4 text-[#ef5b33]" />
        </div>
      ) : null}
    </div>
  );
}

function DecisionMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[#718079]">{label}</p>
      <p className="mt-1 font-bold">{value}</p>
    </div>
  );
}

type DecisionActionsProps = {
  isExecuting: boolean;
  isBlocked: boolean;
  onDecision: (approved: boolean) => void;
};

function DecisionActions({
  isExecuting,
  isBlocked,
  onDecision,
}: DecisionActionsProps) {
  const executeLabel = isBlocked
    ? "Blocked by policy"
    : isExecuting
      ? "Executing safely..."
      : "Approve & execute";

  return (
    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
      <Button
        variant="outline"
        onClick={() => onDecision(false)}
        disabled={isExecuting}
        className="h-11 rounded-xl sm:flex-1"
      >
        <X />
        Reject
      </Button>
      <Button
        onClick={() => onDecision(true)}
        disabled={isExecuting || isBlocked}
        className="h-11 rounded-xl bg-[#ef5b33] hover:bg-[#db4d27] sm:flex-[2]"
      >
        {isExecuting ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <ShieldCheck />
        )}
        {executeLabel}
      </Button>
    </div>
  );
}

function ConstraintList({ constraints }: { constraints: ConstraintCheck[] }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#718079]">
            Guardrails
          </p>
          <h3 className="mt-1 font-bold">Pre-action checks</h3>
        </div>
        <ShieldCheck className="size-5 text-[#176b52]" />
      </div>

      <div className="mt-4 space-y-2">
        {constraints.map((constraint) => (
          <ConstraintRow key={constraint.name} constraint={constraint} />
        ))}
      </div>
    </div>
  );
}

function ConstraintRow({ constraint }: { constraint: ConstraintCheck }) {
  const passed = constraint.status === "pass";

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border bg-[#fbfcfb] px-3 py-3">
      <div>
        <p className="text-sm font-semibold">{constraint.name}</p>
        <p className="mt-0.5 text-xs text-[#718079]">{constraint.detail}</p>
      </div>
      <span
        className={`grid size-7 place-items-center rounded-full ${
          passed
            ? "bg-[#e4f4ec] text-[#197253]"
            : "bg-[#fff0eb] text-[#c44526]"
        }`}
      >
        {passed ? <Check className="size-4" /> : <X className="size-4" />}
      </span>
    </div>
  );
}
