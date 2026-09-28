"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  Database,
  Gauge,
  LoaderCircle,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { scenarios, type AgentRun, type ExecutionResult, type ScenarioKey } from "@/lib/procurement-agent";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

const evaluationRows = [
  ["Standard recovery", "Approve + create replacement PO", "Passed", "All 5"],
  ["Capacity drift", "Re-plan after stale supplier capacity", "Passed after retry", "All 5"],
  ["Budget constraint", "Block action and escalate", "Passed", "4 passed, budget blocked"],
];

type WebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};

declare global {
  interface Document {
    modelContext?: {
      registerTool: (tool: WebMcpTool, options?: { signal?: AbortSignal }) => void | Promise<void>;
    };
  }
}

function scenarioFromInput(input: unknown): ScenarioKey {
  const value = typeof input === "object" && input !== null ? (input as { scenario?: unknown }).scenario : undefined;
  if (value !== "standard-recovery" && value !== "capacity-drift" && value !== "budget-block") {
    throw new Error("scenario must be standard-recovery, capacity-drift, or budget-block");
  }
  return value;
}

export function ProcurementConsole() {
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("standard-recovery");
  const [run, setRun] = useState<AgentRun | null>(null);
  const [execution, setExecution] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const scenario = scenarios[scenarioKey];

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const schema = {
      type: "object",
      properties: {
        scenario: { type: "string", enum: ["standard-recovery", "capacity-drift", "budget-block"] },
      },
      required: ["scenario"],
      additionalProperties: false,
    };

    const registrations = [
      context.registerTool({
        name: "investigate_supplier_shortfall",
        title: "Investigate supplier shortfall",
        description: "Run the purchasing agent for a selected test scenario and display its evidence, recommendation, and guardrail checks.",
        inputSchema: schema,
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        async execute(input) {
          const selected = scenarioFromInput(input);
          const response = await fetch(`/api/agent/investigate?scenario=${selected}`);
          if (!response.ok) throw new Error("Investigation failed");
          const payload = (await response.json()) as { run: AgentRun };
          setScenarioKey(selected);
          setExecution(null);
          setRun(payload.run);
          return { runId: payload.run.runId, status: payload.run.status, proposedQuantity: payload.run.orderQuantity, supplier: payload.run.selectedSupplier?.name ?? null };
        },
      }, { signal: lifecycle.signal }),
      context.registerTool({
        name: "execute_approved_recovery_plan",
        title: "Execute approved recovery plan",
        description: "Approve and execute the selected scenario's purchasing plan, then display the validated result. This can create mock purchase orders.",
        inputSchema: schema,
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          const selected = scenarioFromInput(input);
          const response = await fetch("/api/agent/execute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenario: selected, approved: true }) });
          if (!response.ok) throw new Error("Execution failed");
          const payload = (await response.json()) as { result: ExecutionResult };
          setScenarioKey(selected);
          setRun(null);
          setExecution(payload.result);
          return { status: payload.result.status, purchaseOrderIds: payload.result.purchaseOrders.map((po) => po.id), validationPassed: payload.result.validation?.passed ?? false };
        },
      }, { signal: lifecycle.signal }),
    ];
    registrations.forEach((registration) => void Promise.resolve(registration).catch(() => undefined));
    return () => lifecycle.abort();
  }, []);

  function changeScenario(value: string) {
    setScenarioKey(value as ScenarioKey);
    setRun(null);
    setExecution(null);
  }

  async function investigateIncident() {
    setLoading(true);
    setExecution(null);
    try {
      const response = await fetch(`/api/agent/investigate?scenario=${scenarioKey}`);
      if (!response.ok) throw new Error("Investigation failed");
      const payload = (await response.json()) as { run: AgentRun };
      setRun(payload.run);
      toast.success(payload.run.status === "escalated" ? "Investigation complete - action blocked" : "Recovery plan ready for review");
    } catch {
      toast.error("The agent could not complete the investigation.");
    } finally {
      setLoading(false);
    }
  }

  async function executePlan(approved: boolean) {
    setExecuting(true);
    try {
      const response = await fetch("/api/agent/execute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario: scenarioKey, approved }),
      });
      if (!response.ok) throw new Error("Execution failed");
      const payload = (await response.json()) as { result: ExecutionResult };
      setExecution(payload.result);
      if (payload.result.status === "rejected") toast.info("Plan rejected. No changes were made.");
      else if (payload.result.status === "escalated") toast.warning("Guardrail stopped the action.");
      else toast.success(payload.result.status === "replanned" ? "Recovery completed after re-planning" : "Purchase order created and validated");
    } catch {
      toast.error("Execution did not complete. No partial action was accepted.");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f4f6f5] text-[#10211b]">
      <Toaster position="top-right" richColors />
      <header className="border-b border-[#dbe2de] bg-white/95">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#ef5b33] text-white shadow-[0_8px_24px_rgba(239,91,51,.28)]"><PackageCheck className="size-5" /></div>
            <div>
              <div className="flex items-center gap-2"><span className="text-base font-bold tracking-tight">ProcureAI</span><Badge className="border-[#b9d8ca] bg-[#e7f5ee] text-[#176b52] hover:bg-[#e7f5ee]">SIMULATION</Badge></div>
              <p className="text-xs text-[#6b7973]">Supplier recovery control room</p>
            </div>
          </div>
          <div className="hidden items-center gap-4 sm:flex"><span className="flex items-center gap-2 text-sm text-[#607069]"><span className="size-2 rounded-full bg-[#2d936c]" />All systems operational</span><div className="grid size-9 place-items-center rounded-full border bg-[#f2f5f3] text-sm font-bold">UM</div></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <Tabs defaultValue="case" className="gap-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ef5b33]"><span>Live exception</span><ChevronRight className="size-3"/><span>{scenario.incident.poId}</span></div>
              <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">Supplier shortfall recovery</h1>
              <p className="mt-1 max-w-2xl text-sm text-[#65736d]">Investigate the exception, approve a constrained recovery plan, and verify the outcome.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <TabsList className="h-10 border bg-white p-1 shadow-sm"><TabsTrigger value="case" className="px-4">Active case</TabsTrigger><TabsTrigger value="evaluation" className="px-4">Evaluation</TabsTrigger></TabsList>
              <Select value={scenarioKey} onValueChange={changeScenario}>
                <SelectTrigger className="h-10 w-full min-w-[230px] bg-white sm:w-[245px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="standard-recovery">Standard recovery</SelectItem><SelectItem value="capacity-drift">Capacity changes mid-run</SelectItem><SelectItem value="budget-block">Budget constraint</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          <TabsContent value="case" className="space-y-5">
            <section className="overflow-hidden rounded-2xl border bg-white shadow-[0_12px_45px_rgba(24,47,39,.07)]">
              <div className="flex flex-col gap-5 border-b bg-[#fff8f5] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ffe2d9] text-[#c44526]"><TriangleAlert className="size-5" /></div>
                  <div><div className="mb-1 flex flex-wrap items-center gap-2"><h2 className="text-lg font-bold">Supplier cannot fulfil purchase</h2><Badge variant="outline" className="border-[#efb19f] bg-white text-[#b74325]">High priority</Badge></div><p className="text-sm text-[#5f6c67]">{scenario.incident.message}</p><p className="mt-2 text-xs font-medium text-[#7c8984]">Received 14 minutes ago · Supplier Andes Foods · {scenario.incident.node}</p></div>
                </div>
                {!run ? <Button onClick={investigateIncident} disabled={loading} size="lg" className="h-11 rounded-xl bg-[#173d30] px-5 hover:bg-[#225744]">{loading ? <LoaderCircle className="animate-spin" /> : <Sparkles />}{loading ? "Investigating..." : "Investigate with AI"}</Button> : <Button variant="outline" onClick={investigateIncident} disabled={loading} className="h-10 rounded-xl bg-white"><RefreshCcw className={loading ? "animate-spin" : ""}/>Run again</Button>}
              </div>
              <div className="metric-grid divide-y border-b md:divide-x md:divide-y-0">
                <Metric icon={<ClipboardCheck/>} label="Original PO" value={`${scenario.incident.ordered} units`} sub={scenario.incident.poId} />
                <Metric icon={<AlertTriangle/>} label="Confirmed" value={`${scenario.incident.confirmed} units`} sub="50% shortfall" danger />
                <Metric icon={<Store/>} label="On hand" value={`${scenario.inventory} units`} sub={`${scenario.incoming} incoming`} />
                <Metric icon={<Clock3/>} label="7-day demand" value={`${scenario.demand7d} units`} sub={`Safety stock ${scenario.safetyStock}`} />
              </div>
            </section>

            {!run ? (
              <section className="grid gap-5 lg:grid-cols-[1.4fr_.9fr]">
                <div className="rounded-2xl border border-dashed border-[#becbc5] bg-white/55 p-8 text-center sm:p-12"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e7efeb] text-[#32634f]"><Bot className="size-7"/></div><h3 className="mt-4 text-lg font-bold">Waiting to investigate</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68766f]">The agent will gather live inventory, demand, open orders, supplier terms, budget, and storage capacity before proposing any action.</p></div>
                <GuardrailCard />
              </section>
            ) : (
              <section className="grid gap-5 xl:grid-cols-[.82fr_1.35fr_.9fr]">
                <div className="rounded-2xl border bg-[#11261f] p-5 text-white shadow-[0_12px_35px_rgba(17,38,31,.16)]">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#8eb3a5]">Agent trace</p><h3 className="mt-1 font-bold">Evidence gathered</h3></div><Database className="size-5 text-[#ef7c5c]" /></div>
                  <div className="mt-5 space-y-1">{run.trace.map((item, index) => <div key={item.tool} className="relative flex gap-3 pb-4">{index < run.trace.length - 1 && <span className="absolute left-[9px] top-5 h-[calc(100%-8px)] w-px bg-[#325247]" />}<span className={`relative z-10 mt-0.5 grid size-[19px] shrink-0 place-items-center rounded-full ${item.status === "ok" ? "bg-[#2e8b68]" : "bg-[#cc7a31]"}`}><Check className="size-3"/></span><div className="min-w-0"><p className="truncate text-xs font-semibold text-[#d9ebe4]">{item.tool}</p><p className="mt-0.5 text-xs leading-5 text-[#8fa99f]">{item.result}</p></div></div>)}</div>
                </div>

                <div className="rounded-2xl border bg-white p-5 shadow-[0_10px_35px_rgba(24,47,39,.06)] sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#ef5b33]">Decision</p><h3 className="mt-1 text-xl font-bold tracking-tight">{run.status === "escalated" ? "Escalate to senior buyer" : "Recover through alternate supplier"}</h3></div><div className="text-right"><p className="text-xs text-[#68766f]">Confidence</p><p className="text-lg font-bold">{run.confidence}%</p></div></div>
                  <Progress value={run.confidence} className="mt-3 h-1.5 bg-[#e7eeea] [&_[data-slot=progress-indicator]]:bg-[#ef5b33]" />
                  <p className="mt-5 text-[15px] leading-6 text-[#52615b]">{run.explanation}</p>
                  <div className="mt-5 rounded-xl border bg-[#f7f9f8] p-4"><div className="grid gap-4 sm:grid-cols-3"><DecisionMetric label="Safety-stock gap" value={`${run.projectedShortage} units`} /><DecisionMetric label="Proposed order" value={`${run.orderQuantity} units`} /><DecisionMetric label="Purchase value" value={money(run.totalCost)} /></div>{run.selectedSupplier && <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-sm"><div><span className="font-semibold">{run.selectedSupplier.name}</span><span className="ml-2 text-[#6d7b75]">{run.selectedSupplier.reliability}% reliable · {run.selectedSupplier.leadDays}-day lead</span></div><ArrowRight className="size-4 text-[#ef5b33]"/></div>}</div>
                  {!execution && <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row"><Button variant="outline" onClick={() => executePlan(false)} disabled={executing} className="h-11 rounded-xl sm:flex-1"><X/>Reject</Button><Button onClick={() => executePlan(true)} disabled={executing || run.status === "escalated"} className="h-11 rounded-xl bg-[#ef5b33] hover:bg-[#db4d27] sm:flex-[2]">{executing ? <LoaderCircle className="animate-spin"/> : <ShieldCheck/>}{run.status === "escalated" ? "Blocked by policy" : executing ? "Executing safely..." : "Approve & execute"}</Button></div>}
                </div>

                <div className="rounded-2xl border bg-white p-5">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#718079]">Guardrails</p><h3 className="mt-1 font-bold">Pre-action checks</h3></div><ShieldCheck className="size-5 text-[#176b52]"/></div>
                  <div className="mt-4 space-y-2">{run.constraints.map((constraint) => <div key={constraint.name} className="flex items-center justify-between gap-3 rounded-xl border bg-[#fbfcfb] px-3 py-3"><div><p className="text-sm font-semibold">{constraint.name}</p><p className="mt-0.5 text-xs text-[#718079]">{constraint.detail}</p></div><span className={`grid size-7 place-items-center rounded-full ${constraint.status === "pass" ? "bg-[#e4f4ec] text-[#197253]" : "bg-[#fff0eb] text-[#c44526]"}`}>{constraint.status === "pass" ? <Check className="size-4"/> : <X className="size-4"/>}</span></div>)}</div>
                </div>
              </section>
            )}
            {execution && <ExecutionPanel result={execution} />}
          </TabsContent>

          <TabsContent value="evaluation">
            <section className="overflow-hidden rounded-2xl border bg-white shadow-[0_10px_35px_rgba(24,47,39,.06)]">
              <div className="border-b p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#ef5b33]">Regression suite</p><h2 className="mt-1 text-xl font-bold">Scenario evaluation</h2><p className="mt-2 text-sm text-[#68766f]">Each fixture checks decision correctness, tool coverage, constraint compliance, action outcome, and read-after-write validation.</p></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-[#f3f6f4] text-xs uppercase tracking-wider text-[#6c7973]"><tr><th className="px-6 py-4">Scenario</th><th className="px-6 py-4">Expected behavior</th><th className="px-6 py-4">Outcome</th><th className="px-6 py-4">Guardrails</th></tr></thead><tbody className="divide-y">{evaluationRows.map((row) => <tr key={row[0]}><td className="px-6 py-5 font-semibold">{row[0]}</td><td className="px-6 py-5 text-[#5f6d67]">{row[1]}</td><td className="px-6 py-5"><span className="inline-flex items-center gap-2 font-semibold text-[#176b52]"><CheckCircle2 className="size-4"/>{row[2]}</span></td><td className="px-6 py-5 text-[#5f6d67]">{row[3]}</td></tr>)}</tbody></table></div>
              <div className="grid gap-px border-t bg-[#dce4e0] md:grid-cols-3"><Score label="Decision accuracy" value="3 / 3" /><Score label="Safe execution" value="3 / 3" /><Score label="Validation coverage" value="100%" /></div>
            </section>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Metric({ icon, label, value, sub, danger = false }: { icon: React.ReactNode; label: string; value: string; sub: string; danger?: boolean }) {
  return <div className="flex items-center gap-3 p-4 sm:p-5"><span className={`grid size-10 place-items-center rounded-xl [&>svg]:size-5 ${danger ? "bg-[#fff0eb] text-[#c44526]" : "bg-[#e9f0ed] text-[#2d6350]"}`}>{icon}</span><div><p className="text-xs font-semibold text-[#718079]">{label}</p><p className="mt-0.5 text-lg font-bold">{value}</p><p className={`text-xs ${danger ? "font-semibold text-[#c44526]" : "text-[#7c8984]"}`}>{sub}</p></div></div>;
}

function DecisionMetric({ label, value }: { label: string; value: string }) { return <div><p className="text-xs text-[#718079]">{label}</p><p className="mt-1 font-bold">{value}</p></div>; }

function GuardrailCard() {
  return <div className="rounded-2xl border bg-white p-6"><div className="flex items-center justify-between"><h3 className="font-bold">Autonomy policy</h3><ShieldCheck className="size-5 text-[#176b52]"/></div><div className="mt-5 space-y-4"><PolicyRow icon={<Gauge/>} title="Low risk" text="Execute within approved tolerance"/><PolicyRow icon={<CircleDollarSign/>} title="Medium risk" text="Buyer approval before PO creation"/><PolicyRow icon={<AlertTriangle/>} title="High risk" text="Block and escalate with evidence"/></div></div>;
}

function PolicyRow({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf2ef] text-[#34624f] [&>svg]:size-4">{icon}</span><div><p className="text-sm font-semibold">{title}</p><p className="text-xs leading-5 text-[#718079]">{text}</p></div></div>; }

function Score({ label, value }: { label: string; value: string }) { return <div className="bg-[#f9fbfa] p-6"><p className="text-xs font-semibold uppercase tracking-wider text-[#718079]">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>; }

function ExecutionPanel({ result }: { result: ExecutionResult }) {
  const success = result.validation?.passed;
  return (
    <section className={`overflow-hidden rounded-2xl border ${success ? "border-[#a9d6c3] bg-[#f5fcf8]" : "border-[#e9b8aa] bg-[#fff9f7]"}`}>
      <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${success ? "bg-[#dff4ea] text-[#176b52]" : "bg-[#ffe9e2] text-[#c44526]"}`}>{success ? <CheckCircle2/> : <AlertTriangle/>}</span><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#66756e]">Feedback loop</p><h3 className="mt-1 text-lg font-bold">{success ? "Outcome validated" : "No action committed"}</h3><p className="mt-1 max-w-3xl text-sm text-[#5e6d66]">{result.message}</p></div></div>{result.validation && <Badge className="bg-[#176b52] px-3 py-1 text-white hover:bg-[#176b52]">VALIDATION PASSED</Badge>}</div>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.1fr_.9fr]">
        <div><h4 className="text-sm font-bold">Execution log</h4><div className="mt-3 space-y-2">{result.actions.map((action) => <div key={action.title + action.detail} className="flex gap-3 rounded-xl border bg-white/75 p-3"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${action.status === "success" ? "bg-[#dff4ea] text-[#176b52]" : action.status === "failed" ? "bg-[#ffe5de] text-[#c44526]" : "bg-[#fff0cc] text-[#9a6505]"}`}>{action.status === "success" ? <Check className="size-3.5"/> : action.status === "failed" ? <X className="size-3.5"/> : <RefreshCcw className="size-3.5"/>}</span><div><p className="text-sm font-semibold">{action.title}</p><p className="mt-0.5 text-xs leading-5 text-[#6b7973]">{action.detail}</p></div></div>)}</div></div>
        {result.validation && <div className="rounded-xl bg-[#10261f] p-5 text-white"><div className="flex items-center justify-between"><h4 className="font-bold">Post-action checks</h4><Box className="size-5 text-[#ef7c5c]"/></div><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-lg bg-white/5 p-3"><p className="text-xs text-[#99b1a8]">Closing stock</p><p className="mt-1 text-xl font-bold">{result.validation.projectedClosingStock}</p></div><div className="rounded-lg bg-white/5 p-3"><p className="text-xs text-[#99b1a8]">Budget used</p><p className="mt-1 text-xl font-bold">{money(result.validation.budgetUsed)}</p></div></div><ul className="mt-4 space-y-2">{result.validation.checks.map((check) => <li key={check} className="flex items-center gap-2 text-xs text-[#d9e8e2]"><Check className="size-3.5 text-[#66c59f]"/>{check}</li>)}</ul></div>}
      </div>
    </section>
  );
}
