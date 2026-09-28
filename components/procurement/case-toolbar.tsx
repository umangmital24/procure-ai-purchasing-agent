import { ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scenarios } from "@/lib/procurement/fixtures";
import type { ScenarioKey } from "@/lib/procurement/types";

type CaseToolbarProps = {
  poId: string;
  scenarioKey: ScenarioKey;
  onScenarioChange: (scenario: ScenarioKey) => void;
};

export function CaseToolbar({
  poId,
  scenarioKey,
  onScenarioChange,
}: CaseToolbarProps) {
  return (
    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div>
        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#ef5b33]">
          <span>Live exception</span>
          <ChevronRight className="size-3" />
          <span>{poId}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-3xl">
          Supplier shortfall recovery
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[#65736d]">
          Investigate the exception, approve a constrained recovery plan, and
          verify the outcome.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <TabsList className="h-10 border bg-white p-1 shadow-sm">
          <TabsTrigger value="case" className="px-4">
            Active case
          </TabsTrigger>
          <TabsTrigger value="evaluation" className="px-4">
            Evaluation
          </TabsTrigger>
        </TabsList>

        <Select
          value={scenarioKey}
          onValueChange={(value) => onScenarioChange(value as ScenarioKey)}
        >
          <SelectTrigger className="h-10 w-full min-w-[230px] bg-white sm:w-[245px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.values(scenarios).map((scenario) => (
              <SelectItem key={scenario.key} value={scenario.key}>
                {scenario.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
