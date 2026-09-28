import {
  AlertTriangle,
  Bot,
  CircleDollarSign,
  Gauge,
  ShieldCheck,
} from "lucide-react";

const autonomyLevels = [
  {
    icon: Gauge,
    title: "Low risk",
    description: "Execute within approved tolerance",
  },
  {
    icon: CircleDollarSign,
    title: "Medium risk",
    description: "Buyer approval before PO creation",
  },
  {
    icon: AlertTriangle,
    title: "High risk",
    description: "Block and escalate with evidence",
  },
];

export function WaitingState() {
  return (
    <section className="grid gap-5 lg:grid-cols-[1.4fr_.9fr]">
      <div className="rounded-2xl border border-dashed border-[#becbc5] bg-white/55 p-8 text-center sm:p-12">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#e7efeb] text-[#32634f]">
          <Bot className="size-7" />
        </div>
        <h3 className="mt-4 text-lg font-bold">Waiting to investigate</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68766f]">
          The agent will gather live inventory, demand, open orders, supplier
          terms, budget, and storage capacity before proposing any action.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Autonomy policy</h3>
          <ShieldCheck className="size-5 text-[#176b52]" />
        </div>
        <div className="mt-5 space-y-4">
          {autonomyLevels.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#edf2ef] text-[#34624f]">
                <Icon className="size-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs leading-5 text-[#718079]">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
