"use client";

import React, { useState, useMemo } from "react";
import {
  IconReceipt,
  IconCoin,
  IconArrowRight,
  IconUsers,
  IconToolsKitchen2,
  IconCheck,
  IconSparkles,
  IconShieldCheck,
  IconFlame,
  IconRotateClockwise,
  IconPlus,
  IconBolt,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { LiveActivityData } from "@/lib/api";
import { useMerchant } from "@/lib/MerchantContext";
import { useRouter } from "next/navigation";
import {
  LiveScenarioId,
  LIVE_SCENARIOS,
  playCashChime,
} from "@/lib/liveScenarios";

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

  // Interactive Live Demo States
  const [activeScenarioId, setActiveScenarioId] = useState<LiveScenarioId>("normal");
  const [isFlashingSale, setIsFlashingSale] = useState(false);
  const [lastSaleNotice, setLastSaleNotice] = useState<string | null>(null);
  const [appliedActionNotice, setAppliedActionNotice] = useState<string | null>(null);
  const [showCustomSaleInput, setShowCustomSaleInput] = useState(false);
  const [customAmountText, setCustomAmountText] = useState("");
  const [isDemoControlsOpen, setIsDemoControlsOpen] = useState(true);

  const scenario = LIVE_SCENARIOS[activeScenarioId] || LIVE_SCENARIOS.normal;

  // Active Plan committed title
  const activePlanName = useMemo(() => {
    if (planData.selected_plan === "PROTECT_CASH") return "Safe";
    if (planData.selected_plan === "READY_FOR_DEMAND") return "Max";
    if (planData.selected_plan === "CUSTOM") return "DIY";
    return "Smart";
  }, [planData.selected_plan]);

  // Pacing status calculation factoring in scenario shock
  const pacingStatus = useMemo(() => {
    if (activeScenarioId === "rain") {
      return {
        label: "● Rain Shock (-65% Traffic)",
        className: "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/30",
        isOnTrack: false,
      };
    }
    if (activeScenarioId === "train_surge") {
      return {
        label: "● Surge Wave (+45 Pax Influx)",
        className: "text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30",
        isOnTrack: true,
      };
    }
    if (activeScenarioId === "sellout") {
      return {
        label: "● Ahead of Pace (+28%)",
        className: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
        isOnTrack: true,
      };
    }
    if (activeScenarioId === "slow_morning") {
      return {
        label: "● Pacing Behind (-30%)",
        className: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
        isOnTrack: false,
      };
    }
    const isPacingOnTrack = data.progress_percent >= 50;
    return {
      label: isPacingOnTrack ? "● Pacing On Track" : "● Pacing Behind",
      className: isPacingOnTrack
        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
        : "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
      isOnTrack: isPacingOnTrack,
    };
  }, [activeScenarioId, data.progress_percent]);

  // Handle Quick Cash Sale Log
  const handleQuickSale = (amount: number, customers: number, note: string) => {
    playCashChime();
    merchant.recordSale(amount, customers, note);

    setIsFlashingSale(true);
    setTimeout(() => setIsFlashingSale(false), 1200);

    const notice = `💸 PromptPay +฿${amount} received! (${customers} pax) · Total: ฿${(data.sales_today + amount).toLocaleString()}`;
    setLastSaleNotice(notice);
    setTimeout(() => setLastSaleNotice(null), 3500);
  };

  const handleCustomSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customAmountText);
    if (!isNaN(parsed) && parsed > 0) {
      const estimatedPax = Math.max(1, Math.round(parsed / 50));
      handleQuickSale(parsed, estimatedPax, `Manual Sale: ฿${parsed}`);
      setCustomAmountText("");
      setShowCustomSaleInput(false);
    }
  };

  // Handle Situation / Scenario Change
  const handleSelectScenario = (scenId: LiveScenarioId) => {
    setActiveScenarioId(scenId);
    const target = LIVE_SCENARIOS[scenId];

    // Log situational shift to timeline for audit trail
    merchant.addTimelineItem({
      id: `tl_scen_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      category: "alert",
      type: "ALERT",
      title: target.headline,
      detail: `${target.situationDescription}\n\nDirect Copilot Recommendation: ${target.grillingDirective}`,
      badge: target.badgeLabel,
    });

    const notice = `⚡ Situation switched: ${target.label} · Copilot recommendations refreshed.`;
    setAppliedActionNotice(notice);
    setTimeout(() => setAppliedActionNotice(null), 3200);
  };

  // Handle Applying Copilot Action Recommendation
  const handleApplyAction = () => {
    merchant.addTimelineItem({
      id: `tl_action_${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      category: "chat",
      type: "AI_MSG",
      title: "BottomUp Copilot Action",
      detail: `[Decision Applied] ${scenario.actionToastMessage}\n\nDownside Capital Guard: ${scenario.riskMitigationAction}`,
      badge: "Action Applied",
    });

    setAppliedActionNotice(`✓ ${scenario.actionToastMessage}`);
    setTimeout(() => setAppliedActionNotice(null), 3500);
  };

  // Handle Reset to Default Shift Baseline
  const handleResetBaseline = () => {
    if (merchant.resetDemoState) {
      merchant.resetDemoState();
    }
    setActiveScenarioId("normal");
    setAppliedActionNotice("🔄 Demo reset to 08:30 AM baseline (฿2,850 · 57 customers · Smart plan).");
    setTimeout(() => setAppliedActionNotice(null), 3000);
  };

  // Dynamic SVG actual wave coordinates based on scenario
  const actualWaveData = useMemo(() => {
    switch (activeScenarioId) {
      case "train_surge":
        return {
          dArea: "M 0,105 C 20,95 35,44 50,44 C 75,44 115,16 150,16 C 170,16 185,28 200,30 L 200,115 L 0,115 Z",
          dLine: "M 0,105 C 20,95 35,44 50,44 C 75,44 115,16 150,16 C 170,16 185,28 200,30",
          cx: 200,
          cy: 30,
          color: "#38bdf8",
        };
      case "rain":
        return {
          dArea: "M 0,105 C 20,95 35,44 50,44 C 75,44 115,22 150,22 C 170,30 185,68 190,75 L 190,115 L 0,115 Z",
          dLine: "M 0,105 C 20,95 35,44 50,44 C 75,44 115,22 150,22 C 170,30 185,68 190,75",
          cx: 190,
          cy: 75,
          color: "#f43f5e",
        };
      case "sellout":
        return {
          dArea: "M 0,105 C 20,95 35,44 50,44 C 75,44 115,14 150,14 C 180,14 205,16 220,18 L 220,115 L 0,115 Z",
          dLine: "M 0,105 C 20,95 35,44 50,44 C 75,44 115,14 150,14 C 180,14 205,16 220,18",
          cx: 220,
          cy: 18,
          color: "#a855f7",
        };
      case "slow_morning":
        return {
          dArea: "M 0,105 C 20,95 35,44 50,55 C 75,55 115,40 150,40 C 170,45 185,78 190,85 L 190,115 L 0,115 Z",
          dLine: "M 0,105 C 20,95 35,44 50,55 C 75,55 115,40 150,40 C 170,45 185,78 190,85",
          cx: 190,
          cy: 85,
          color: "#f59e0b",
        };
      default:
        return {
          dArea: "M 0,105 C 20,95 35,44 50,44 C 75,44 115,22 150,22 C 170,22 185,50 190,55 L 190,115 L 0,115 Z",
          dLine: "M 0,105 C 20,95 35,44 50,44 C 75,44 115,22 150,22 C 170,22 185,50 190,55",
          cx: 190,
          cy: 55,
          color: "#10b981",
        };
    }
  }, [activeScenarioId]);

  return (
    <div className="space-y-3 pb-3">
      {/* ──────────────────────────────────────────────────────────
          CARD 0: INTERACTIVE LIVE DEMO SUITE (FOR JUDGES & EVALUATORS)
          Allows triggering cash in and situation changes in real time
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-card to-card border-2 border-primary/30 p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-ping" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-primary flex items-center gap-1">
              <IconSparkles size={14} />
              Live Demo Simulator
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetBaseline}
              className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground gap-1 rounded-lg"
              title="Reset shift to 08:30 baseline"
            >
              <IconRotateClockwise size={12} />
              <span>Reset</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDemoControlsOpen((v) => !v)}
              className="h-6 px-2 text-[10px] text-primary font-semibold rounded-lg"
            >
              {isDemoControlsOpen ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        {isDemoControlsOpen && (
          <div className="space-y-2.5 pt-0.5">
            {/* Action 1: Cash In Triggers */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
                <span className="font-semibold flex items-center gap-1 text-foreground/90">
                  <IconCoin size={13} className="text-amber-500" />
                  Simulate Cash Receive (PromptPay / Cash):
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">Tap to add sale</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSale(50, 1, "PromptPay: 4 skewers + rice")}
                  className="h-8 text-xs font-mono font-bold bg-background/80 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/40 rounded-xl transition-all active:scale-95"
                >
                  +฿50
                  <span className="text-[9px] font-normal text-muted-foreground ml-0.5">1p</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSale(100, 2, "PromptPay: 8 skewers + 2 rice (VIP)")}
                  className="h-8 text-xs font-mono font-bold bg-background/80 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/40 rounded-xl transition-all active:scale-95"
                >
                  +฿100
                  <span className="text-[9px] font-normal text-muted-foreground ml-0.5">2p</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSale(150, 3, "PromptPay: Office order (12 skewers)")}
                  className="h-8 text-xs font-mono font-bold bg-background/80 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/40 rounded-xl transition-all active:scale-95"
                >
                  +฿150
                  <span className="text-[9px] font-normal text-muted-foreground ml-0.5">3p</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCustomSaleInput((v) => !v)}
                  className="h-8 text-[11px] font-semibold bg-background/80 hover:bg-primary/10 hover:text-primary rounded-xl transition-all active:scale-95"
                >
                  <IconPlus size={12} className="mr-0.5" />
                  Custom
                </Button>
              </div>

              {showCustomSaleInput && (
                <form onSubmit={handleCustomSaleSubmit} className="flex gap-1.5 pt-1">
                  <Input
                    type="number"
                    placeholder="Amount in ฿ (e.g. 200)"
                    value={customAmountText}
                    onChange={(e) => setCustomAmountText(e.target.value)}
                    className="h-7 text-xs font-mono rounded-lg"
                    autoFocus
                  />
                  <Button type="submit" size="sm" className="h-7 text-xs font-bold px-3 rounded-lg">
                    Add
                  </Button>
                </form>
              )}
            </div>

            {/* Action 2: Situation Shocks (Weather, Train, Demand) */}
            <div className="space-y-1 pt-1 border-t border-border/50">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
                <span className="font-semibold flex items-center gap-1 text-foreground/90">
                  <IconBolt size={13} className="text-sky-500" />
                  Inject Situation Shocks (Realtime Copilot Adaptation):
                </span>
                <span className="font-mono text-[9px] text-muted-foreground">{scenario.label} active</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(Object.keys(LIVE_SCENARIOS) as LiveScenarioId[]).map((scenId) => {
                  const s = LIVE_SCENARIOS[scenId];
                  const isSelected = activeScenarioId === scenId;
                  return (
                    <button
                      key={scenId}
                      type="button"
                      onClick={() => handleSelectScenario(scenId)}
                      className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-center border transition-all active:scale-95 ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-2xs font-bold ring-1 ring-primary/40"
                          : "bg-background/80 text-muted-foreground hover:text-foreground border-border/70 hover:border-border"
                      }`}
                    >
                      <span className="text-sm leading-none mb-0.5">{s.icon}</span>
                      <span className="text-[9px] leading-tight font-medium truncate w-full">
                        {s.label.split(" ")[0]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Temporary Notifications */}
        {lastSaleNotice && (
          <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-[11px] font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <span>{lastSaleNotice}</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping shrink-0 ml-1.5" />
          </div>
        )}
        {appliedActionNotice && (
          <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-800 dark:text-sky-200 text-[11px] font-semibold flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
            <span>{appliedActionNotice}</span>
            <IconCheck size={14} className="text-sky-500 shrink-0 ml-1.5" />
          </div>
        )}
      </div>

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
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${pacingStatus.className}`}
            >
              {pacingStatus.label}
            </span>
          </div>
        </div>

        {/* Unified 2-Column Metrics Summary: Sales & Customers */}
        <div
          className={`grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-muted/30 border border-border/50 transition-all duration-300 ${
            isFlashingSale ? "ring-2 ring-emerald-500 bg-emerald-500/10 scale-[1.01]" : ""
          }`}
        >
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
            <div className="text-2xl font-normal font-mono text-foreground leading-tight mt-0.5 flex items-baseline gap-1">
              <span>฿{data.sales_today.toLocaleString()}</span>
              {isFlashingSale && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-bounce">
                  +฿
                </span>
              )}
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
                  <span className="w-2.5 h-1 rounded-full inline-block" style={{ backgroundColor: actualWaveData.color }} />
                  <span className="font-bold text-foreground">Actual</span>
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold flex items-center gap-1" style={{ color: actualWaveData.color }}>
              <span className="h-1.5 w-1.5 rounded-full animate-ping inline-block" style={{ backgroundColor: actualWaveData.color }} />
              08:35 AM · {scenario.shortTag}
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
                {/* Actual progress dynamic gradient */}
                <linearGradient id="actualProgressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={actualWaveData.color} stopOpacity="0.32" />
                  <stop offset="100%" stopColor={actualWaveData.color} stopOpacity="0.02" />
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

              {/* 3. Actual Progress Area Fill (dynamic reacting to scenario) */}
              <path
                d={actualWaveData.dArea}
                fill="url(#actualProgressGrad)"
                className="transition-all duration-500 ease-out"
              />

              {/* 4. Actual Progress Solid Line */}
              <path
                d={actualWaveData.dLine}
                fill="none"
                stroke={actualWaveData.color}
                strokeWidth="3"
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />

              {/* 5. Live Cursor Beacon Dot reacting to scenario */}
              <circle
                cx={actualWaveData.cx}
                cy={actualWaveData.cy}
                r="5"
                fill={actualWaveData.color}
                className="transition-all duration-500 ease-out"
              />
              <circle
                cx={actualWaveData.cx}
                cy={actualWaveData.cy}
                r="9"
                fill={actualWaveData.color}
                opacity="0.3"
                className="animate-pulse transition-all duration-500 ease-out"
              />
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

        {/* ──────────────────────────────────────────────────────────
            ACTIONABLE INTRADAY AI COPILOT INSIGHT & DIRECTIVE CARD
            Reacts dynamically to Cash In and Active Situational Shocks
            ────────────────────────────────────────────────────────── */}
        <div className="p-3 rounded-2xl bg-muted/40 border border-border/70 text-xs space-y-2">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 items-center justify-center text-xs">
                💡
              </span>
              <span className="font-bold text-[11px] tracking-tight text-foreground flex items-center gap-1">
                BottomUp Intraday Copilot
                <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal border-primary/30 text-primary">
                  Realtime Sensing
                </Badge>
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
              {scenario.icon} {scenario.label}
            </span>
          </div>

          {/* Headline & Situation Diagnosis */}
          <div className="space-y-1">
            <p className="text-[12px] font-bold text-foreground leading-snug">
              {scenario.headline}
            </p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {scenario.situationDescription}
            </p>
          </div>

          {/* Actionable Directives: Grill Batch & Downside Protection */}
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            {/* Grilling Directive */}
            <div className="p-2 rounded-xl bg-background/80 border border-border/60 flex items-start gap-2">
              <IconFlame size={15} className="text-orange-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 block">
                  Cooking & Grilling Directive
                </span>
                <p className="text-[11px] text-foreground font-medium leading-snug">
                  {scenario.grillingDirective}
                </p>
              </div>
            </div>

            {/* Downside Margin Protection */}
            <div className="p-2 rounded-xl bg-background/80 border border-border/60 flex items-start gap-2">
              <IconShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Downside Capital & Waste Guard
                </span>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {scenario.riskMitigationAction}
                </p>
              </div>
            </div>
          </div>

          {/* Interactive AI Action Button */}
          <div className="pt-1 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleApplyAction}
              className="flex-1 h-8 text-[11px] font-bold rounded-xl gap-1.5 shadow-2xs active:scale-[0.98] transition-transform"
            >
              <IconSparkles size={13} />
              <span>{scenario.actionCtaText}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/timeline")}
              className="h-8 px-2.5 text-[11px] font-semibold rounded-xl text-muted-foreground hover:text-foreground"
            >
              View in Timeline
            </Button>
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
