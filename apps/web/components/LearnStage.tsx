"use client";

import React from "react";
import {
  IconSparkles,
  IconCalendarEvent,
  IconCheck,
  IconAlertTriangle,
  IconArrowRight,
  IconThumbUp,
  IconBulb,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { LearnScreenData } from "@/lib/api";
import { useMerchant } from "@/lib/MerchantContext";
import { useRouter } from "next/navigation";

interface LearnStageProps {
  data?: LearnScreenData;
  onPlanTomorrow?: () => void;
}

export function LearnStage(props: LearnStageProps) {
  const merchant = useMerchant();
  const router = useRouter();

  const data = props.data ?? merchant.learnData;
  const onPlanTomorrow = props.onPlanTomorrow ?? (() => router.push("/plan"));
  const { money_flow } = data;

  const spendAmount = money_flow.market_spend || 3400;
  const actualSales = money_flow.sales_today || 5600;
  const netProfit = money_flow.net_profit_today || (actualSales - spendAmount);

  return (
    <div className="space-y-3.5 pb-6">
      {/* ──────────────────────────────────────────────────────────
          STEP 1: SPEND ──(+PROFIT)──> ACTUAL SALES (HERO EQUATION)
          Replaces the 3 separate float/spend/sales boxes
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Shift Closed · Daily Reconciliation
          </span>
          <span className="text-[11px] font-mono text-muted-foreground">{data.date}</span>
        </div>

        {/* Spend ──(+Net Profit)──> Actual Sales Equation */}
        <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/60 space-y-2">
          {/* Sub-header labels: Spend | (Meals) | Actual Sales */}
          <div className="flex items-center justify-between text-xs text-muted-foreground gap-1">
            <span className="font-medium uppercase tracking-wider text-[10px]">Spend</span>
            <span className="font-medium text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold truncate text-center px-1">
              ({money_flow.customers_today || 92} customers served)
            </span>
            <span className="font-medium uppercase tracking-wider text-[10px] text-right">Actual Sales</span>
          </div>

          {/* Big Numbers Row with Centered Profit Pill */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-3xl sm:text-4xl font-normal font-mono text-foreground/90 leading-none shrink-0">
              ฿{spendAmount.toLocaleString()}
            </span>

            <div className="flex-1 flex items-center justify-center gap-1 min-w-[70px]">
              <div className="h-[1.5px] flex-1 bg-border/80" />
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-mono font-bold whitespace-nowrap shadow-2xs shrink-0">
                + ฿{netProfit.toLocaleString()} Net
              </span>
              <IconArrowRight size={14} className="shrink-0 text-muted-foreground" />
              <div className="h-[1.5px] flex-1 bg-border/80" />
            </div>

            <span className="text-3xl sm:text-4xl font-normal font-mono text-emerald-600 dark:text-emerald-400 leading-none shrink-0 text-right">
              ฿{actualSales.toLocaleString()}
            </span>
          </div>

          <p className="text-[10px] text-muted-foreground pt-1 border-t border-border/40 text-center">
            Total cash in pocket after shift: <strong className="text-foreground font-mono">฿{money_flow.total_cash_now.toLocaleString()}</strong>
          </p>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          STEP 2: DEMAND SENSING RETROSPECTIVE (MATCHING /PLAN WAVE)
          Shows how the morning's sensed wave performed across 6am–10am
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Shift Demand Retrospective
          </span>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            06:00 – 10:00 Morning Window
          </span>
        </div>

        {/* Demand Sensing Wave with Completed Pacing */}
        <div className="relative pt-3 pb-2 overflow-hidden rounded-2xl bg-muted/20 border border-border/40">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 300 120"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="learnWaveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Area Fill across full completed shift */}
            <path
              d="M 0,110 C 20,95 35,48 50,48 C 75,48 115,26 150,26 C 185,26 215,86 250,86 C 275,86 290,105 300,110 L 300,120 L 0,120 Z"
              fill="url(#learnWaveGrad)"
            />

            {/* Completed Solid Green Line with Full Conversion */}
            <path
              d="M 0,110 C 20,95 35,48 50,48 C 75,48 115,26 150,26 C 185,26 215,86 250,86 C 275,86 290,105 300,110"
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="opacity-90"
            />
          </svg>

          {/* Stepper Arrow Indicators between nodes */}
          <div className="absolute top-[36px] left-[33.3%] -translate-x-1/2 z-10 text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border border-border/70 shadow-2xs">
            <IconArrowRight size={11} stroke={2.5} />
          </div>
          <div className="absolute top-[36px] left-[66.6%] -translate-x-1/2 z-10 text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border border-border/70 shadow-2xs">
            <IconArrowRight size={11} stroke={2.5} />
          </div>

          {/* 3 Chronological Nodes for Moo Ping shift: 06:30 -> 07:30 -> 09:30 */}
          <div className="grid grid-cols-3 gap-1 relative z-10 text-center px-1">
            {/* Node 1: 06:30 First Grill */}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[9px] font-bold text-muted-foreground mb-1">
                06:30
              </span>
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <IconCheck size={18} stroke={3} />
              </div>
              <span className="text-[11px] font-bold text-foreground mt-1 leading-tight">
                First Grill
              </span>
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 px-1 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/20 font-mono">
                ฿1,250 on Target
              </span>
            </div>

            {/* Node 2: 07:30 Commuter Peak */}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[9px] font-bold text-muted-foreground mb-1">
                07:30
              </span>
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <IconCheck size={18} stroke={3} />
              </div>
              <span className="text-[11px] font-bold text-foreground mt-1 leading-tight">
                Commuter Peak
              </span>
              <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 px-1 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/20 font-mono">
                +฿3,200 Exceeded
              </span>
            </div>

            {/* Node 3: 09:30 Wind Down */}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[9px] font-bold text-muted-foreground mb-1">
                09:30
              </span>
              <div className="w-10 h-10 rounded-full bg-background border-2 border-sky-500 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                <IconCheck size={18} stroke={3} />
              </div>
              <span className="text-[11px] font-bold text-foreground mt-1 leading-tight">
                Sold Out
              </span>
              <span className="text-[9px] font-bold text-sky-700 dark:text-sky-300 mt-0.5 px-1 py-0.2 rounded-md bg-sky-500/10 border border-sky-500/20 font-mono">
                Zero Waste
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          STEP 3: BEHAVIORAL RETROSPECTIVE (WHAT TO KEEP VS. CHANGE)
          Specific to Moo Ping 40kg & 10-baht skewer operations
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-4 shadow-xs space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <IconBulb size={14} className="text-amber-500" />
          Behavioral Learning & Actions
        </h3>

        {/* 🟢 What went well (Keep it) */}
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <IconThumbUp size={14} stroke={2.5} />
            <span>What Went Well (Keep doing this)</span>
          </div>
          <ul className="text-[11px] text-emerald-900/90 dark:text-emerald-200/90 space-y-1 pl-5 list-disc leading-snug pt-0.5">
            <li>
              <strong>First grill timed perfectly:</strong> Ignited charcoal coals early and served the first batch by 06:30 AM, converting morning arrivals smoothly.
            </li>
            <li>
              <strong>Sticky rice ratio balanced:</strong> Steamed 15kg of sticky rice, matching ~27kg pork skewers with zero unsold surplus.
            </li>
          </ul>
        </div>

        {/* 🔴 What to adjust tomorrow (Change behavior) */}
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
            <IconAlertTriangle size={14} stroke={2.5} />
            <span>What to Adjust Tomorrow (Behavior Change)</span>
          </div>
          <ul className="text-[11px] text-amber-900/90 dark:text-amber-200/90 space-y-1 pl-5 list-disc leading-snug pt-0.5">
            <li>
              <strong>Traffic slows after 08:30:</strong> Avoid placing fresh batches on the grill after 08:30 AM; cook strictly on-demand to close cleanly by 09:30 AM.
            </li>
            <li>
              <strong>Clear morning forecast:</strong> Special morning commuter schedule tomorrow with 0% rain. Safely scale fresh meat spend up to ฿4,000 (~32kg).
            </li>
          </ul>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          STEP 4: TOMORROW'S PRE-COMPUTED SENSING RECOMMENDATION
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <IconSparkles size={14} className="text-primary" />
            Tomorrow&apos;s Sensed Plan
          </h3>
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            ☀️ Clear Skies (06:00 – 10:00)
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-muted/30 border border-border/60 space-y-1.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Recommended Spend:</span>
            <span className="font-mono font-bold text-sm text-foreground">
              ฿{data.suggested_spend_tomorrow_min.toLocaleString()} – ฿{data.suggested_spend_tomorrow_max.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground font-medium">Expected Customers:</span>
            <span className="font-mono font-medium text-foreground">
              ~{data.suggested_customers_tomorrow_min} – {data.suggested_customers_tomorrow_max} pax (~30–40kg)
            </span>
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-border/40 text-[11px]">
            <span className="text-muted-foreground">Applied Lesson:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Grill aligned to commuter waves; clean 09:30 close with zero waste
            </span>
          </div>
        </div>

        {/* In-Flow Action Button */}
        <div className="pt-0.5">
          <Button
            size="lg"
            onClick={onPlanTomorrow}
            className="w-full h-12 text-sm font-bold gap-2 shadow-sm rounded-2xl active:scale-[0.98] transition-transform"
          >
            <IconCalendarEvent size={16} />
            <span>Plan Tomorrow with Applied Learnings →</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
