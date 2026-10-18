"use client";

import React, { useMemo } from "react";
import {
  IconReceipt,
  IconCoin,
  IconArrowRight,
  IconUsers,
  IconToolsKitchen2,
  IconCheck,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LiveActivityData } from "@/lib/api";
import { useMerchant } from "@/lib/MerchantContext";
import { useRouter } from "next/navigation";

interface LiveStageProps {
  data?: LiveActivityData;
  onNavigateToLearn?: () => void;
}

export function LiveStage(props: LiveStageProps) {
  const merchant = useMerchant();
  const router = useRouter();

  const data = props.data ?? merchant.liveData;
  const planData = merchant.planData;
  const onNavigateToLearn = props.onNavigateToLearn ?? (() => router.push("/learn"));

  // Active Plan committed title
  const activePlanName = useMemo(() => {
    if (planData.selected_plan === "PROTECT_CASH") return "Safe";
    if (planData.selected_plan === "READY_FOR_DEMAND") return "Max";
    if (planData.selected_plan === "CUSTOM") return "DIY";
    return "Smart";
  }, [planData.selected_plan]);

  // Determine current pacing status
  const isPacingOnTrack = data.progress_percent >= 50;

  return (
    <div className="space-y-3 pb-3">
      {/* ──────────────────────────────────────────────────────────
          CARD 1: LIVE SHIFT DASHBOARD & SENSING TIMELINE
          Top: Sales ฿2,850 / ฿5,600 | Customers 57 / ~68-88
          Chart: Demand Sensing 3-Node Timeline matching /plan
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-3.5 shadow-xs space-y-2.5">
        {/* Header Row: Title & Plan Badge */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Shift Dashboard
          </span>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] py-0 px-2 font-mono font-bold border-primary/30 text-primary">
              Plan: {activePlanName}
            </Badge>
            <span
              className={`text-[10px] font-semibold flex items-center gap-1 ${
                isPacingOnTrack
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              ● {isPacingOnTrack ? "Pacing On Track" : "Pacing Behind"}
            </span>
          </div>
        </div>

        {/* Unified 2-Column Metrics Summary: Sales & Customers */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/30 border border-border/50">
          {/* Column 1: Sales Collected */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium flex items-center gap-1">
                <IconCoin size={13} className="text-amber-500" />
                Sales
              </span>
              <span className="font-mono text-[10px]">
                /฿{data.target_sales.toLocaleString()}
              </span>
            </div>
            <div className="text-2xl font-normal font-mono text-foreground leading-tight mt-0.5">
              ฿{data.sales_today.toLocaleString()}
            </div>
            <Progress value={Math.min(100, data.progress_percent)} className="h-1 mt-1" />
          </div>

          {/* Column 2: Customers Served */}
          <div className="border-l border-border/40 pl-2.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="font-medium flex items-center gap-1">
                <IconUsers size={13} className="text-sky-500" />
                Customers
              </span>
              <span className="font-mono text-[10px]">
                {data.target_customers_range}
              </span>
            </div>
            <div className="text-2xl font-normal font-mono text-foreground leading-tight mt-0.5">
              {data.customers_served}
              <span className="text-xs font-normal text-muted-foreground ml-1">pax</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              Avg ~฿{(data.sales_today / Math.max(1, data.customers_served)).toFixed(0)} / pax
            </p>
          </div>
        </div>

        {/* Unified Live Demand Sensing Timeline Curve matching /plan */}
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
            <div className="flex items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-[9px] text-muted-foreground flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Plan vs. Actual Wave
              </span>
              <div className="flex items-center gap-2 text-[9px] font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-sky-400 border-t border-dashed border-sky-400 inline-block" />
                  <span>Sensing</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-1 bg-emerald-500 rounded-full inline-block" />
                  <span className="font-bold text-foreground">Actual</span>
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
              08:30 AM
            </span>
          </div>

          {/* Timeline Wave Container */}
          <div className="relative pt-2 pb-1 overflow-hidden rounded-2xl bg-muted/20 border border-border/40">
            {/* SVG Dual-Line Demand Wave */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 300 115"
              preserveAspectRatio="none"
            >
              <defs>
                {/* Simulated plan light blue gradient */}
                <linearGradient id="simulatedWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
                {/* Actual progress solid green gradient */}
                <linearGradient id="actualProgressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* 1. Full-shift Simulated Area (The Plan Forecast) */}
              <path
                d="M 0,105 C 20,95 35,46 50,46 C 75,46 115,24 150,24 C 185,24 215,84 250,84 C 275,84 290,102 300,105 L 300,115 L 0,115 Z"
                fill="url(#simulatedWaveGrad)"
              />

              {/* 2. Full-shift Simulated Dashed Curve (The Plan) */}
              <path
                d="M 0,105 C 20,95 35,46 50,46 C 75,46 115,24 150,24 C 185,24 215,84 250,84 C 275,84 290,102 300,105"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="4 3"
                className="opacity-70"
              />

              {/* 3. Actual Progress Area Fill (06:00 -> 08:30 current position at x=190) */}
              <path
                d="M 0,105 C 20,95 35,44 50,44 C 75,44 115,22 150,22 C 170,22 185,50 190,55 L 190,115 L 0,115 Z"
                fill="url(#actualProgressGrad)"
              />

              {/* 4. Actual Progress Solid Emerald Line (rides along curve up to 08:30) */}
              <path
                d="M 0,105 C 20,95 35,44 50,44 C 75,44 115,22 150,22 C 170,22 185,50 190,55"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* 5. Live Cursor Beacon Dot at x=190, y=55 (Current Hour ~08:30 AM) */}
              <circle cx="190" cy="55" r="5" fill="#10b981" className="opacity-90" />
              <circle cx="190" cy="55" r="8" fill="#10b981" opacity="0.35" />
            </svg>

            {/* Stepper Arrow Indicators between nodes */}
            <div className="absolute top-[32px] left-[33.3%] -translate-x-1/2 z-10 text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border border-border/70 shadow-2xs">
              <IconArrowRight size={11} stroke={2.5} />
            </div>
            <div className="absolute top-[32px] left-[66.6%] -translate-x-1/2 z-10 text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border border-border/70 shadow-2xs">
              <IconArrowRight size={11} stroke={2.5} />
            </div>

            {/* 3 Chronological Nodes anchored directly on the curve peaks/valleys */}
            <div className="grid grid-cols-3 gap-1 relative z-10 text-center px-1">
              {/* Node 1: 06:30 First Grill */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] font-bold text-muted-foreground mb-1">
                  06:30
                </span>
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <IconCheck size={16} stroke={3} />
                </div>
                <span className="text-[11px] font-bold text-foreground mt-1 leading-tight">
                  First Grill
                </span>
                {/* Node Micro-Badge: Plan vs. Actual */}
                <span className="font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 px-1 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  ฿1,250 / ฿1,000 ✓
                </span>
              </div>

              {/* Node 2: 07:30 Commuter Peak */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                  07:30
                </span>
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 border-2 border-emerald-500 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                  <IconCheck size={16} stroke={3} />
                </div>
                <span className="text-[11px] font-bold text-foreground mt-1 leading-tight">
                  Commuter Peak
                </span>
                {/* Node Micro-Badge: Target */}
                <span className="font-mono text-[9px] font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 px-1 py-0.2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  ฿3,200 / ฿3,000 ✓
                </span>
              </div>

              {/* Node 3: 09:30 Wind Down */}
              <div className="flex flex-col items-center">
                <span className="font-mono text-[9px] font-bold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping inline-block" />
                  09:30
                </span>
                <div className="w-9 h-9 rounded-full bg-background border-2 border-orange-500 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs ring-2 ring-orange-500/20">
                  <IconToolsKitchen2 size={16} stroke={2.2} />
                </div>
                <span className="text-[11px] font-bold text-foreground mt-1 leading-tight">
                  Wind Down
                </span>
                {/* Node Micro-Badge */}
                <span className="font-mono text-[9px] font-semibold text-orange-600 dark:text-orange-400 mt-0.5 px-1 py-0.2 rounded-md bg-orange-500/10 border border-orange-500/20">
                  Last Grill ●
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actionable Intraday AI Insight Box */}
        <div className="flex items-start gap-2 p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-xs">
          <span className="text-amber-500 text-sm leading-none shrink-0 mt-0.5">💡</span>
          <div className="space-y-0.5">
            <p className="text-[11px] text-foreground/85 leading-snug">
              <strong>Shop Copilot:</strong> Commuter rush from morning trains between 07:00–08:30 AM sold out on pace. As foot traffic begins tapering at 08:30, grill only a final batch of 15–20 skewers to wrap up by 09:30 with zero waste.
            </p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          CARD 2: ACTIVITY STREAM & CLOSE SHIFT (EXPANDED TO REST OF AREA)
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <IconReceipt size={14} />
            Live Activity Stream
          </h3>
          <span className="text-[10px] font-mono text-muted-foreground">
            {data.recent_activity.length} logged
          </span>
        </div>

        <div className="divide-y divide-border/40 text-xs">
          {data.recent_activity.map((tx) => (
            <div key={tx.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-muted-foreground text-[11px] w-11 shrink-0">
                  {tx.time}
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-muted-foreground shrink-0 text-xs">👤</span>
                  <span className="font-mono text-xs text-foreground/90 font-medium truncate">
                    {tx.sender || (tx.note.includes("08") || tx.note.includes("09") ? tx.note : "08x-xxx-xxxx")}
                  </span>
                  {tx.customer_type && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-md font-bold uppercase tracking-wider shrink-0 ${
                        tx.customer_type === "VIP"
                          ? "bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30"
                          : tx.customer_type === "Regular"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                          : "bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30"
                      }`}
                    >
                      {tx.customer_type}
                    </span>
                  )}
                </div>
              </div>

              <span
                className={`font-mono font-bold text-xs shrink-0 ${
                  tx.type === "SALE"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {tx.type === "SALE" ? `+฿${tx.amount}` : `-฿${Math.abs(tx.amount)}`}
              </span>
            </div>
          ))}
        </div>

        {/* Close Shift In-Flow CTA */}
        <div className="pt-1.5 border-t border-border/40">
          <Button
            size="lg"
            onClick={onNavigateToLearn}
            className="w-full h-11 text-sm font-bold gap-2 shadow-sm rounded-2xl active:scale-[0.98] transition-transform"
          >
            <span>Close Shift & Review Cash</span>
            <IconArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
