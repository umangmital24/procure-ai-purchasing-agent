import { PackageCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function DashboardHeader() {
  return (
    <header className="border-b border-[#dbe2de] bg-white/95">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-[#ef5b33] text-white shadow-[0_8px_24px_rgba(239,91,51,.28)]">
            <PackageCheck className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight">
                ProcureAI
              </span>
              <Badge className="border-[#b9d8ca] bg-[#e7f5ee] text-[#176b52] hover:bg-[#e7f5ee]">
                SIMULATION
              </Badge>
            </div>
            <p className="text-xs text-[#6b7973]">
              Supplier recovery control room
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-4 sm:flex">
          <span className="flex items-center gap-2 text-sm text-[#607069]">
            <span className="size-2 rounded-full bg-[#2d936c]" />
            All systems operational
          </span>
          <div className="grid size-9 place-items-center rounded-full border bg-[#f2f5f3] text-sm font-bold">
            UM
          </div>
        </div>
      </div>
    </header>
  );
}
