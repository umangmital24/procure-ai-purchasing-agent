import {
  AlertTriangle,
  Box,
  Check,
  CheckCircle2,
  RefreshCcw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import type {
  ActionLogEntry,
  ExecutionResult,
} from "@/lib/procurement/types";

export function ExecutionPanel({ result }: { result: ExecutionResult }) {
  const passed = result.validation?.passed === true;
  const containerColor = passed
    ? "border-[#a9d6c3] bg-[#f5fcf8]"
    : "border-[#e9b8aa] bg-[#fff9f7]";
  const statusColor = passed
    ? "bg-[#dff4ea] text-[#176b52]"
    : "bg-[#ffe9e2] text-[#c44526]";

  return (
    <section className={`overflow-hidden rounded-2xl border ${containerColor}`}>
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex gap-3">
          <span
            className={`grid size-11 shrink-0 place-items-center rounded-xl ${statusColor}`}
          >
            {passed ? <CheckCircle2 /> : <AlertTriangle />}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#66756e]">
              Feedback loop
            </p>
            <h3 className="mt-1 text-lg font-bold">
              {passed ? "Outcome validated" : "No action committed"}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-[#5e6d66]">
              {result.message}
            </p>
          </div>
        </div>

        {result.validation ? (
          <Badge className="bg-[#176b52] px-3 py-1 text-white hover:bg-[#176b52]">
            VALIDATION PASSED
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_.9fr]">
        <ExecutionLog actions={result.actions} />
        {result.validation ? (
          <ValidationSummary result={result} />
        ) : null}
      </div>
    </section>
  );
}

function ExecutionLog({ actions }: { actions: ActionLogEntry[] }) {
  return (
    <div>
      <h4 className="text-sm font-bold">Execution log</h4>
      <div className="mt-3 space-y-2">
        {actions.length > 0 ? (
          actions.map((action) => (
            <ActionRow key={`${action.title}-${action.detail}`} action={action} />
          ))
        ) : (
          <p className="rounded-xl border bg-white/75 p-4 text-sm text-[#6b7973]">
            No purchasing action was attempted.
          </p>
        )}
      </div>
    </div>
  );
}

function ActionRow({ action }: { action: ActionLogEntry }) {
  const statusColor = {
    success: "bg-[#dff4ea] text-[#176b52]",
    failed: "bg-[#ffe5de] text-[#c44526]",
    warning: "bg-[#fff0cc] text-[#9a6505]",
  }[action.status];

  const StatusIcon =
    action.status === "success"
      ? Check
      : action.status === "failed"
        ? X
        : RefreshCcw;

  return (
    <div className="flex gap-3 rounded-xl border bg-white/75 p-3">
      <span
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${statusColor}`}
      >
        <StatusIcon className="size-3.5" />
      </span>
      <div>
        <p className="text-sm font-semibold">{action.title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[#6b7973]">
          {action.detail}
        </p>
      </div>
    </div>
  );
}

function ValidationSummary({ result }: { result: ExecutionResult }) {
  const validation = result.validation;
  if (!validation) return null;

  return (
    <div className="rounded-xl bg-[#10261f] p-5 text-white">
      <div className="flex items-center justify-between">
        <h4 className="font-bold">Post-action checks</h4>
        <Box className="size-5 text-[#ef7c5c]" />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ValidationMetric
          label="Closing stock"
          value={String(validation.projectedClosingStock)}
        />
        <ValidationMetric
          label="Budget used"
          value={formatMoney(validation.budgetUsed)}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {validation.checks.map((check) => (
          <li
            key={check}
            className="flex items-center gap-2 text-xs text-[#d9e8e2]"
          >
            <Check className="size-3.5 text-[#66c59f]" />
            {check}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ValidationMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/5 p-3">
      <p className="text-xs text-[#99b1a8]">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
