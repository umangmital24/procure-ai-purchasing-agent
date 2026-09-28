import {
  AlertTriangle,
  ClipboardCheck,
  Clock3,
  LoaderCircle,
  RefreshCcw,
  Sparkles,
  Store,
  TriangleAlert,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Scenario } from "@/lib/procurement/types";

type IncidentSummaryProps = {
  scenario: Scenario;
  hasRun: boolean;
  isInvestigating: boolean;
  onInvestigate: () => void;
};

export function IncidentSummary({
  scenario,
  hasRun,
  isInvestigating,
  onInvestigate,
}: IncidentSummaryProps) {
  const { incident } = scenario;

  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-[0_12px_45px_rgba(24,47,39,.07)]">
      <div className="flex flex-col gap-5 border-b bg-[#fff8f5] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#ffe2d9] text-[#c44526]">
            <TriangleAlert className="size-5" />
          </div>
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold">
                Supplier cannot fulfil purchase
              </h2>
              <Badge
                variant="outline"
                className="border-[#efb19f] bg-white text-[#b74325]"
              >
                High priority
              </Badge>
            </div>
            <p className="text-sm text-[#5f6c67]">{incident.message}</p>
            <p className="mt-2 text-xs font-medium text-[#7c8984]">
              Received 14 minutes ago · Supplier Andes Foods · {incident.node}
            </p>
          </div>
        </div>

        <InvestigationButton
          hasRun={hasRun}
          isLoading={isInvestigating}
          onClick={onInvestigate}
        />
      </div>

      <div className="metric-grid divide-y border-b md:divide-x md:divide-y-0">
        <Metric
          icon={<ClipboardCheck />}
          label="Original PO"
          value={`${incident.ordered} units`}
          detail={incident.poId}
        />
        <Metric
          icon={<AlertTriangle />}
          label="Confirmed"
          value={`${incident.confirmed} units`}
          detail="50% shortfall"
          danger
        />
        <Metric
          icon={<Store />}
          label="On hand"
          value={`${scenario.inventory} units`}
          detail={`${scenario.incoming} incoming`}
        />
        <Metric
          icon={<Clock3 />}
          label="7-day demand"
          value={`${scenario.demand7d} units`}
          detail={`Safety stock ${scenario.safetyStock}`}
        />
      </div>
    </section>
  );
}

function InvestigationButton({
  hasRun,
  isLoading,
  onClick,
}: {
  hasRun: boolean;
  isLoading: boolean;
  onClick: () => void;
}) {
  if (hasRun) {
    return (
      <Button
        variant="outline"
        onClick={onClick}
        disabled={isLoading}
        className="h-10 rounded-xl bg-white"
      >
        <RefreshCcw className={isLoading ? "animate-spin" : undefined} />
        Run again
      </Button>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      size="lg"
      className="h-11 rounded-xl bg-[#173d30] px-5 hover:bg-[#225744]"
    >
      {isLoading ? (
        <LoaderCircle className="animate-spin" />
      ) : (
        <Sparkles />
      )}
      {isLoading ? "Investigating..." : "Investigate with AI"}
    </Button>
  );
}

type MetricProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  danger?: boolean;
};

function Metric({ icon, label, value, detail, danger = false }: MetricProps) {
  const iconColor = danger
    ? "bg-[#fff0eb] text-[#c44526]"
    : "bg-[#e9f0ed] text-[#2d6350]";
  const detailColor = danger
    ? "font-semibold text-[#c44526]"
    : "text-[#7c8984]";

  return (
    <div className="flex items-center gap-3 p-4 sm:p-5">
      <span
        className={`grid size-10 place-items-center rounded-xl [&>svg]:size-5 ${iconColor}`}
      >
        {icon}
      </span>
      <div>
        <p className="text-xs font-semibold text-[#718079]">{label}</p>
        <p className="mt-0.5 text-lg font-bold">{value}</p>
        <p className={`text-xs ${detailColor}`}>{detail}</p>
      </div>
    </div>
  );
}
