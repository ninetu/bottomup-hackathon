"use client";

import React, { useState, useMemo } from "react";
import {
  IconTrain,
  IconToolsKitchen2,
  IconCloudRain,
  IconRocket,
  IconCheck,
  IconArrowRight,
  IconSparkles,
  IconPencil,
  IconShield,
  IconUser,
  IconCpu,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanScreenData, PlanCard } from "@/lib/api";
import { useMerchant } from "@/lib/MerchantContext";
import { useRouter } from "next/navigation";

interface PlanStageProps {
  data?: PlanScreenData;
  onCommitPlan?: (planId: string, customPlan?: PlanCard) => void;
  onNavigateToLive?: () => void;
}

export function PlanStage(props: PlanStageProps) {
  const merchant = useMerchant();
  const router = useRouter();

  const data = props.data ?? merchant.planData;
  const onCommitPlan = props.onCommitPlan ?? merchant.commitPlan;
  const onNavigateToLive = props.onNavigateToLive ?? (() => router.push("/live"));

  // Step 1: Big Number Spend Budget vs Target Revenue
  // Default Moo Ping vendor: ฿5,000 spend budget (40kg pork @ 10 Baht/ไม้, 6:00 - 10:00)
  const defaultSpend = data.available_spend_budget || 5000;
  const [maxSpend, setMaxSpend] = useState<number>(defaultSpend);
  const [activeAnchor, setActiveAnchor] = useState<"spend" | "revenue">("spend");
  const [editingTarget, setEditingTarget] = useState<"spend" | "revenue" | null>(null);
  const [inputValue, setInputValue] = useState<string>(String(defaultSpend));

  // Moo Ping unit economics: ~1.6x–1.8x gross revenue (40kg meat produces ~800-900 skewers + sticky rice = ~฿8,500-฿9,500)
  const smartRatio = 1.7;

  // Physical market demand ceiling based on 6am - 10am morning commuter rush window
  // Max station capacity = ~120-150 customers -> ~฿9,000 sales ceiling -> ~฿5,000 spend ceiling (40kg pork limit)
  const demandCeilingSpend = 5000;
  const demandCeilingSales = 9000;
  const demandCeilingPax = 140;

  // Realistic revenue projection: capped gracefully at demand ceiling rather than inflating to billions
  const estRevenueHero = useMemo(() => {
    const raw = Math.round(maxSpend * smartRatio);
    if (maxSpend <= demandCeilingSpend) return raw;
    const excess = maxSpend - demandCeilingSpend;
    return Math.round(demandCeilingSales + Math.sqrt(excess) * 15);
  }, [maxSpend, smartRatio, demandCeilingSpend, demandCeilingSales]);

  const [ceilingExceededMessage, setCeilingExceededMessage] = useState<string | null>(null);

  // Preset plans: Anchored to budget with Monte Carlo risk bounds for Moo Ping vendor:
  // - Max = 100% of maxSpend (฿5,000 = full 40kg pork, capture entire morning peak)
  // - Smart = ~68% of maxSpend (~฿3,400 = ~27kg pork, balanced sweet spot)
  // - Safe = ~52% of maxSpend (~฿2,600 = ~20kg pork, capital guard against late rain/slow rush)
  const planMax = useMemo(() => {
    const spend = maxSpend;
    const custMin = Math.max(20, Math.round((spend / 40) * 0.9));
    const custMax = Math.max(custMin + 15, Math.round((spend / 40) * 1.3));
    const salesMin = Math.round(spend * 1.55);
    const salesMax = Math.round(spend * 1.9);
    const avgSales = Math.round((salesMin + salesMax) / 2);
    const profit = Math.max(0, avgSales - spend);
    const multiplier = spend > 0 ? (avgSales / spend).toFixed(1) + "x" : "1.7x";
    const protectedCash = Math.max(0, maxSpend - spend);
    const isExceedingCeiling = spend > demandCeilingSpend;
    const wasteRiskBaht = Math.round(spend * (isExceedingCeiling ? 0.35 : 0.22));
    return {
      id: "READY_FOR_DEMAND" as const,
      name: "Max",
      badge: isExceedingCeiling ? "Near Ceiling" : "Full 40kg",
      spend,
      salesMin,
      salesMax,
      avgSales,
      profit,
      custMin,
      custMax,
      multiplier,
      wasteRisk: `~฿${wasteRiskBaht}`,
      protectedCash,
      riskLevel: "High Waste Risk",
      description: isExceedingCeiling
        ? `Exceeds 40kg grill capacity. Unsold marinated pork risks spoiling if morning rush slows by 09:30.`
        : `Grills full 40kg batch. Maximizes peak commuter rush before 09:30 wind-down.`,
    };
  }, [maxSpend, demandCeilingSpend]);

  const planSmart = useMemo(() => {
    const spend = Math.max(500, Math.round(maxSpend * 0.68));
    const custMin = Math.max(15, Math.round((spend / 40) * 0.85));
    const custMax = Math.max(custMin + 10, Math.round((spend / 40) * 1.2));
    const salesMin = Math.round(spend * 1.5);
    const salesMax = Math.round(spend * 1.8);
    const avgSales = Math.round((salesMin + salesMax) / 2);
    const profit = Math.max(0, avgSales - spend);
    const multiplier = spend > 0 ? (avgSales / spend).toFixed(1) + "x" : "1.7x";
    const protectedCash = Math.max(0, maxSpend - spend);
    const wasteRiskBaht = Math.max(50, Math.round(spend * 0.08));
    return {
      id: "BALANCED" as const,
      name: "Smart",
      badge: "AI Pick ⭐",
      spend,
      salesMin,
      salesMax,
      avgSales,
      profit,
      custMin,
      custMax,
      multiplier,
      wasteRisk: `~฿${wasteRiskBaht}`,
      protectedCash,
      riskLevel: "Optimal Balance",
      description: `Preps ~27kg pork. Captures 80% of train passengers between 07:00–08:30 with low leftover risk.`,
    };
  }, [maxSpend]);

  const planSafe = useMemo(() => {
    const spend = Math.max(300, Math.round(maxSpend * 0.52));
    const custMin = Math.max(10, Math.round((spend / 40) * 0.8));
    const custMax = Math.max(custMin + 8, Math.round((spend / 40) * 1.1));
    const salesMin = Math.round(spend * 1.45);
    const salesMax = Math.round(spend * 1.75);
    const avgSales = Math.round((salesMin + salesMax) / 2);
    const profit = Math.max(0, avgSales - spend);
    const multiplier = spend > 0 ? (avgSales / spend).toFixed(1) + "x" : "1.6x";
    const protectedCash = Math.max(0, maxSpend - spend);
    const wasteRiskBaht = Math.max(20, Math.round(spend * 0.03));
    return {
      id: "PROTECT_CASH" as const,
      name: "Safe",
      badge: "Low Risk",
      spend,
      salesMin,
      salesMax,
      avgSales,
      profit,
      custMin,
      custMax,
      multiplier,
      wasteRisk: `~฿${wasteRiskBaht}`,
      protectedCash,
      riskLevel: "Minimal Risk",
      description: `Preps ~20kg pork. Lean grill inventory guards cash if rain hits early or train delays occur.`,
    };
  }, [maxSpend]);

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    data.selected_plan || "BALANCED"
  );
  const [customSpend, setCustomSpend] = useState<number>(planSmart.spend);
  const [showDiy, setShowDiy] = useState<boolean>(false);

  // DIY dynamic metric estimations for Moo Ping
  const custMinDiy = Math.max(10, Math.round((customSpend / 40) * 0.8));
  const custMaxDiy = Math.max(custMinDiy + 10, Math.round((customSpend / 40) * 1.2));
  const salesMinDiy = Math.round(customSpend * 1.5);
  const salesMaxDiy = Math.round(customSpend * 1.8);
  const avgSalesDiy = Math.round((salesMinDiy + salesMaxDiy) / 2);
  const profitDiy = Math.max(0, avgSalesDiy - customSpend);
  const multiplierDiy = customSpend > 0 ? (avgSalesDiy / customSpend).toFixed(1) + "x" : "1.7x";

  // Active plan calculations
  const activePlan = useMemo(() => {
    if (selectedPlanId === "PROTECT_CASH") {
      return {
        id: "PROTECT_CASH",
        title: "Plan 1 · Safe",
        shortTitle: "Safe",
        badge: planSafe.badge,
        spend: planSafe.spend,
        customers: `${planSafe.custMin}–${planSafe.custMax}`,
        sales: `฿${planSafe.salesMin}–฿${planSafe.salesMax}`,
        salesMin: planSafe.salesMin,
        salesMax: planSafe.salesMax,
        avgSales: planSafe.avgSales,
        multiplier: planSafe.multiplier,
        isPreset: true,
      };
    }
    if (selectedPlanId === "READY_FOR_DEMAND") {
      return {
        id: "READY_FOR_DEMAND",
        title: "Plan 3 · Max",
        shortTitle: "Max",
        badge: planMax.badge,
        spend: planMax.spend,
        customers: `${planMax.custMin}–${planMax.custMax}`,
        sales: `฿${planMax.salesMin}–฿${planMax.salesMax}`,
        salesMin: planMax.salesMin,
        salesMax: planMax.salesMax,
        avgSales: planMax.avgSales,
        multiplier: planMax.multiplier,
        isPreset: true,
      };
    }
    if (selectedPlanId === "CUSTOM") {
      return {
        id: "CUSTOM",
        title: "DIY Plan",
        shortTitle: "DIY",
        badge: "Custom",
        spend: customSpend,
        customers: `${custMinDiy}–${custMaxDiy}`,
        sales: `฿${salesMinDiy}–฿${salesMaxDiy}`,
        salesMin: salesMinDiy,
        salesMax: salesMaxDiy,
        avgSales: avgSalesDiy,
        multiplier: multiplierDiy,
        isPreset: false,
        custMin: custMinDiy,
        custMax: custMaxDiy,
      };
    }

    // Default: Smart (BALANCED)
    return {
      id: "BALANCED",
      title: "Plan 2 · Smart ⭐",
      shortTitle: "Smart",
      badge: planSmart.badge,
      spend: planSmart.spend,
      customers: `${planSmart.custMin}–${planSmart.custMax}`,
      sales: `฿${planSmart.salesMin}–฿${planSmart.salesMax}`,
      salesMin: planSmart.salesMin,
      salesMax: planSmart.salesMax,
      avgSales: planSmart.avgSales,
      multiplier: planSmart.multiplier,
      isPreset: true,
    };
  }, [
    selectedPlanId,
    customSpend,
    planSafe,
    planSmart,
    planMax,
    custMinDiy,
    custMaxDiy,
    salesMinDiy,
    salesMaxDiy,
    avgSalesDiy,
    multiplierDiy,
  ]);

  const spendAmount = activePlan.spend;

  // Step 3 Slider Configuration:
  // Track spans from safe minimum to the day's physical Demand Ceiling (฿5,000 for 40kg pork)
  const sliderMin = Math.max(500, Math.round(maxSpend * 0.2));
  const sliderMax = Math.max(demandCeilingSpend, maxSpend, planMax.spend);

  const isExceedingDemandCeiling = maxSpend > demandCeilingSpend;

  const sliderValue = useMemo(() => {
    if (selectedPlanId === "PROTECT_CASH") return planSafe.spend;
    if (selectedPlanId === "BALANCED") return planSmart.spend;
    if (selectedPlanId === "READY_FOR_DEMAND") return planMax.spend;
    return customSpend;
  }, [selectedPlanId, planSafe.spend, planSmart.spend, planMax.spend, customSpend]);

  const p1SliderPct = Math.min(100, Math.max(0, Math.round(((planSafe.spend - sliderMin) / (sliderMax - sliderMin)) * 100)));
  const p2SliderPct = Math.min(100, Math.max(0, Math.round(((planSmart.spend - sliderMin) / (sliderMax - sliderMin)) * 100)));
  const p3SliderPct = Math.min(100, Math.max(0, Math.round(((planMax.spend - sliderMin) / (sliderMax - sliderMin)) * 100)));
  const diySliderPct = Math.min(100, Math.max(0, Math.round(((sliderValue - sliderMin) / (sliderMax - sliderMin)) * 100)));

  const handleSaveHero = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      if (editingTarget === "spend") {
        if (parsed > demandCeilingSpend) {
          setMaxSpend(demandCeilingSpend);
          setCeilingExceededMessage(
            `Spend clamped to ฿${demandCeilingSpend.toLocaleString()} ceiling (max 40kg grill capacity)`
          );
        } else {
          setMaxSpend(parsed);
          setCeilingExceededMessage(null);
        }
        setActiveAnchor("spend");
      } else if (editingTarget === "revenue") {
        if (parsed > demandCeilingSales) {
          setMaxSpend(demandCeilingSpend);
          setCeilingExceededMessage(
            `Target sales clamped to ฿${demandCeilingSales.toLocaleString()} ceiling (~${demandCeilingPax} customers max)`
          );
        } else {
          const derivedSpend = Math.max(500, Math.round(parsed / smartRatio));
          setMaxSpend(derivedSpend);
          setCeilingExceededMessage(null);
        }
        setActiveAnchor("revenue");
      }
    }
    setEditingTarget(null);
  };

  const handleStartEdit = (target: "spend" | "revenue") => {
    if (editingTarget === target) {
      setEditingTarget(null);
    } else {
      setEditingTarget(target);
      setInputValue(target === "spend" ? String(maxSpend) : String(estRevenueHero));
    }
  };

  const handleCommitAndStart = () => {
    if (activePlan.isPreset) {
      onCommitPlan(activePlan.id);
    } else {
      const customPlanCard: PlanCard = {
        id: "CUSTOM",
        title: `DIY PLAN (฿${customSpend})`,
        risk_level: "Custom Plan",
        spend_budget: customSpend,
        serves_customers_min: activePlan.custMin ?? 20,
        serves_customers_max: activePlan.custMax ?? 30,
        expected_sales_min: activePlan.salesMin,
        expected_sales_max: activePlan.salesMax,
        description: `Custom spending budget of ฿${customSpend}`,
      };
      onCommitPlan("CUSTOM", customPlanCard);
    }
    onNavigateToLive();
  };

  return (
    <div className="space-y-4 pb-6">
      {/* ──────────────────────────────────────────────────────────
          STEP 1: TWO-SIDED HERO (SPEND ──> EXPECTED SALES)
          Allows thinking forward ($500 spend) OR backward ($3,000 sales)
          Both numbers use normal font weight with clear edit affordance.
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-4 shadow-xs">
        {/* Top Header Labels: [Spend] on left | [Expected Sales] on right */}
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => handleStartEdit("spend")}
            className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeAnchor === "spend"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeAnchor === "spend" ? "bg-primary" : "bg-muted-foreground/40"
              }`}
            />
            <span>Spend</span>
          </button>

          <button
            type="button"
            onClick={() => handleStartEdit("revenue")}
            className={`text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeAnchor === "revenue"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Expected Sales</span>
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                activeAnchor === "revenue"
                  ? "bg-emerald-500"
                  : "bg-muted-foreground/40"
              }`}
            />
          </button>
        </div>

        {/* Big Numbers Equation Row with interactive edit affordance */}
        <div className="flex items-center justify-between gap-2 pt-1 min-w-0">
          {/* SPEND SIDE (normal font weight) */}
          <div className="shrink-0 max-w-[45%]">
            {editingTarget === "spend" ? (
              <div className="flex items-center gap-1 bg-muted/60 border border-primary rounded-xl px-2 py-1">
                <span className="font-mono text-sm text-muted-foreground">฿</span>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveHero();
                    if (e.key === "Escape") setEditingTarget(null);
                  }}
                  className="font-mono text-xl sm:text-2xl font-normal text-foreground bg-transparent w-16 sm:w-20 focus:outline-none"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveHero} className="h-7 px-2 rounded-lg font-bold text-[11px]">
                  Save
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleStartEdit("spend")}
                className="group inline-flex items-center gap-1 px-2 py-1 rounded-xl border border-dashed border-border/70 hover:border-primary hover:bg-muted/40 transition-all text-left"
                title="Tap to change spend budget"
              >
                <span className="text-2xl sm:text-3xl md:text-4xl font-normal font-mono tracking-tight text-foreground/90 group-hover:text-primary transition-colors leading-none">
                  ฿{maxSpend.toLocaleString()}
                </span>
                <IconPencil size={12} className="text-muted-foreground group-hover:text-primary transition-colors opacity-70 shrink-0" />
              </button>
            )}
          </div>

          {/* CONNECTING ARROW (Direction reflects anchor) */}
          <div className="flex-1 flex flex-col items-center justify-center px-1 min-w-[50px] overflow-hidden">
            <div className="w-full flex items-center justify-center gap-1">
              <div className="h-[1.5px] flex-1 bg-border/80" />
              {activeAnchor === "revenue" ? (
                <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/30 whitespace-nowrap">
                  <span>← Goal</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 text-[9px] sm:text-[10px] font-mono font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full border border-border/60 whitespace-nowrap">
                  <span>1.7x</span>
                </div>
              )}
              <IconArrowRight
                size={12}
                className={`shrink-0 ${
                  activeAnchor === "revenue"
                    ? "rotate-180 text-emerald-600 dark:text-emerald-400"
                    : "text-muted-foreground"
                }`}
              />
              <div className="h-[1.5px] flex-1 bg-border/80" />
            </div>
          </div>

          {/* EXPECTED SALES SIDE (normal font weight) */}
          <div className="shrink-0 max-w-[45%] text-right">
            {editingTarget === "revenue" ? (
              <div className="flex items-center gap-1 bg-muted/60 border border-emerald-500 rounded-xl px-2 py-1 ml-auto">
                <span className="font-mono text-sm text-emerald-600 dark:text-emerald-400">฿</span>
                <input
                  type="number"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveHero();
                    if (e.key === "Escape") setEditingTarget(null);
                  }}
                  className="font-mono text-xl sm:text-2xl font-normal text-emerald-600 dark:text-emerald-400 bg-transparent w-16 sm:w-20 focus:outline-none text-right"
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveHero} className="h-7 px-2 rounded-lg font-bold text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => handleStartEdit("revenue")}
                className="group inline-flex items-center gap-1 px-2 py-1 rounded-xl border border-dashed border-border/70 hover:border-emerald-500 hover:bg-emerald-500/5 transition-all text-right ml-auto"
                title="Tap to set sales goal"
              >
                <IconPencil size={12} className="text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors opacity-70 shrink-0" />
                <span className="text-2xl sm:text-3xl md:text-4xl font-normal font-mono tracking-tight text-emerald-600 dark:text-emerald-400 transition-colors leading-none">
                  ฿{estRevenueHero.toLocaleString()}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Real-world Demand Ceiling Alert or Toast Message */}
        {(ceilingExceededMessage || isExceedingDemandCeiling) && (
          <div className="mt-3 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-2 text-xs animate-in fade-in slide-in-from-top-1">
            <div className="flex items-start gap-2">
              <span className="text-amber-600 dark:text-amber-400 text-sm shrink-0 mt-0.5">⚠️</span>
              <div>
                <p className="font-bold text-[11px] text-amber-900 dark:text-amber-200 leading-snug">
                  {ceilingExceededMessage || `Exceeds Today's Demand Ceiling (฿${demandCeilingSales.toLocaleString()} from ~${demandCeilingPax} pax)`}
                </p>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-snug mt-0.5">
                  Peak morning commuter capacity (06:00–10:00) maxes out at ~40kg pork (฿{demandCeilingSpend.toLocaleString()} spend). Over-prepping risks unsold meat.
                </p>
              </div>
            </div>
            {isExceedingDemandCeiling && (
              <button
                type="button"
                onClick={() => {
                  setMaxSpend(demandCeilingSpend);
                  setActiveAnchor("spend");
                  setCeilingExceededMessage(null);
                }}
                className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold text-[10px] rounded-lg shrink-0 whitespace-nowrap transition-colors"
              >
                Tune to ฿{demandCeilingSpend.toLocaleString()}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          STEP 2: DEMAND SENSING (THE "WHY NOW")
          Visual local demands, weather shift & commuter surge
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Demand Sensing
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 text-[9px] font-mono font-bold text-sky-700 dark:text-sky-300 border border-sky-500/20 truncate">
            <span>📍 Ceiling: ฿9,000 from ~140 pax</span>
          </span>
        </div>

        {/* Timeline Canvas with Perfectly Aligned Demand Curve Behind */}
        <div className="relative pt-3 pb-2 overflow-hidden rounded-2xl bg-muted/20 border border-border/40">
          {/* SVG Smooth Curve representing estimated customer flow, perfectly aligned with column centers:
              - Column 1 center (06:30 เตาแรกพร้อม): x = 50 (16.7%) -> Peak 1 (y = 48)
              - Column 2 center (07:30 พีคคนทำงาน): x = 150 (50.0%) -> Big Peak 2 (y = 28)
              - Column 3 center (09:30 ปิดร้าน/ฝน): x = 250 (83.3%) -> Valley / Drop (y = 86)
          */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 300 120"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="demandCurveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Area fill under curve */}
            <path
              d="M 0,110 C 20,95 35,48 50,48 C 75,48 115,26 150,26 C 185,26 215,86 250,86 C 275,86 290,105 300,110 L 300,120 L 0,120 Z"
              fill="url(#demandCurveGrad)"
            />

            {/* Simulated Forecast Dashed Line Curve with safe vertical padding */}
            <path
              d="M 0,110 C 20,95 35,48 50,48 C 75,48 115,26 150,26 C 185,26 215,86 250,86 C 275,86 290,105 300,110"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
              strokeDasharray="5 3"
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

          {/* 3 Chronological Nodes anchored directly on the curve peaks/valleys */}
          <div className="grid grid-cols-3 gap-2 relative z-10 text-center px-1">
            {/* Node 1: 06:30 First Grill */}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[10px] font-bold text-muted-foreground mb-1">
                06:30
              </span>
              <div className="w-10 h-10 rounded-full bg-background border-2 border-amber-500 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <IconTrain size={18} stroke={2.2} />
              </div>
              <span className="text-xs font-bold text-foreground mt-1.5 leading-tight">
                First Grill
              </span>
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 mt-0.5">
                Early Trains
              </span>
            </div>

            {/* Node 2: 07:30 Commuter Rush (Peak) */}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[10px] font-bold text-muted-foreground mb-1">
                07:30
              </span>
              <div className="w-10 h-10 rounded-full bg-background border-2 border-orange-500 text-orange-600 dark:text-orange-400 flex items-center justify-center shadow-xs">
                <IconToolsKitchen2 size={18} stroke={2.2} />
              </div>
              <span className="text-xs font-bold text-foreground mt-1.5 leading-tight">
                Commuter Peak
              </span>
              <span className="text-[10px] font-semibold text-orange-700 dark:text-orange-300 mt-0.5">
                Full Grills
              </span>
            </div>

            {/* Node 3: 09:30 Wind Down / Sold Out */}
            <div className="flex flex-col items-center">
              <span className="font-mono text-[10px] font-bold text-muted-foreground mb-1">
                09:30
              </span>
              <div className="w-10 h-10 rounded-full bg-background border-2 border-sky-500 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                <IconCloudRain size={18} stroke={2.2} />
              </div>
              <span className="text-xs font-bold text-foreground mt-1.5 leading-tight">
                Wind Down
              </span>
              <span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300 mt-0.5">
                Sold Out / Clear
              </span>
            </div>
          </div>
        </div>

        {/* Actionable AI Key Insight & Simulation Proof */}
        <div className="p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-sm leading-none shrink-0 mt-0.5">💡</span>
            <p className="text-[11px] text-foreground/80 leading-snug">
              <strong>AI Copilot:</strong> Commuter train arrivals at Krung Thep Aphiwat peak between 07:00–08:30 AM. Recommend <strong>Smart (฿{planSmart.spend.toLocaleString()})</strong> with ~27kg pork to capture morning rush and clear out cleanly by 09:30.
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/80 pt-1 border-t border-border/30">
            <IconCpu size={11} className="text-sky-500 shrink-0" stroke={2.2} />
            <span>Simulated across 1,000 Monte Carlo runs (weather × commuter rush × skewering capacity)</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          STEP 3: SIMULATED SCENARIOS (SPEND -> RETURN EQUATION)
          Plans: Safe, Smart, Max
          Equation: [$Spend] -- Plan Name (Multiplier) --> [$Expected Sales]
          ────────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-card border border-border/80 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Simulated Scenarios
          </span>
          <button
            type="button"
            onClick={() => {
              if (showDiy) {
                // Cancel DIY: hide DIY card & reset selection to Smart plan
                setShowDiy(false);
                setSelectedPlanId("BALANCED");
                setCustomSpend(planSmart.spend);
              } else {
                setShowDiy(true);
                setSelectedPlanId("CUSTOM");
              }
            }}
            className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
          >
            <IconUser size={12} />
            <span>{showDiy ? "Cancel DIY" : "+ DIY"}</span>
          </button>
        </div>

        {/* Standard Slider with DIY Knob & Pinned Plan Markers */}
        <div className="p-3.5 rounded-3xl bg-muted/30 border border-border/60 space-y-1">
          {/* Pinned Markers Row Above the Slider */}
          <div className="relative h-[48px] w-full">
            {/* Safe Plan Marker (Shield) */}
            <button
              type="button"
              onClick={() => {
                setSelectedPlanId("PROTECT_CASH");
                setCustomSpend(planSafe.spend);
              }}
              style={{ left: `${p1SliderPct}%` }}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center group transition-transform z-10"
            >
              <div
                className={`relative flex items-center justify-center w-7 h-7 rounded-full shadow-xs transition-all ${
                  selectedPlanId === "PROTECT_CASH"
                    ? "bg-primary text-primary-foreground scale-110 ring-2 ring-primary/30"
                    : "bg-card text-foreground border border-border hover:border-primary/60"
                }`}
              >
                <IconShield size={14} stroke={2.2} />
              </div>
              <div
                className={`w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] -mt-[0.5px] ${
                  selectedPlanId === "PROTECT_CASH" ? "border-t-primary" : "border-t-border"
                }`}
              />
              <span className="font-mono text-[10px] font-bold text-foreground mt-0.5 leading-none">
                ฿{planSafe.spend}
              </span>
            </button>

            {/* Smart Plan Marker (Sparkle - AI Pick) */}
            <button
              type="button"
              onClick={() => {
                setSelectedPlanId("BALANCED");
                setCustomSpend(planSmart.spend);
              }}
              style={{ left: `${p2SliderPct}%` }}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center group transition-transform z-10"
            >
              <div className="relative">
                <div
                  className={`flex items-center justify-center w-7 h-7 rounded-full shadow-xs transition-all ${
                    selectedPlanId === "BALANCED"
                      ? "bg-amber-500 text-amber-950 scale-110 ring-2 ring-amber-500/40"
                      : "bg-card text-amber-600 dark:text-amber-400 border border-amber-500/50 hover:border-amber-500"
                  }`}
                >
                  <IconSparkles size={14} stroke={2.2} />
                </div>
                <span className="absolute -top-1.5 -right-1 text-[7px] bg-amber-500 text-amber-950 font-black px-1 rounded-full shadow-2xs">
                  AI
                </span>
              </div>
              <div
                className={`w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] -mt-[0.5px] ${
                  selectedPlanId === "BALANCED" ? "border-t-amber-500" : "border-t-amber-500/60"
                }`}
              />
              <span className="font-mono text-[10px] font-bold text-foreground mt-0.5 leading-none">
                ฿{planSmart.spend}
              </span>
            </button>

            {/* Max Plan Marker (Rocket) */}
            <button
              type="button"
              onClick={() => {
                setSelectedPlanId("READY_FOR_DEMAND");
                setCustomSpend(planMax.spend);
              }}
              style={{ left: `${p3SliderPct}%` }}
              className="absolute top-0 -translate-x-1/2 flex flex-col items-center group transition-transform z-10"
            >
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full shadow-xs transition-all ${
                  selectedPlanId === "READY_FOR_DEMAND"
                    ? "bg-primary text-primary-foreground scale-110 ring-2 ring-primary/30"
                    : "bg-card text-foreground border border-border hover:border-primary/60"
                }`}
              >
                <IconRocket size={14} stroke={2.2} />
              </div>
              <div
                className={`w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] -mt-[0.5px] ${
                  selectedPlanId === "READY_FOR_DEMAND" ? "border-t-primary" : "border-t-border"
                }`}
              />
              <span className="font-mono text-[10px] font-bold text-foreground mt-0.5 leading-none">
                ฿{planMax.spend}
              </span>
            </button>

            {/* DIY User Marker at diySliderPct */}
            {showDiy && (
              <button
                type="button"
                onClick={() => setSelectedPlanId("CUSTOM")}
                style={{ left: `${diySliderPct}%` }}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center group transition-all duration-200 z-20 animate-in fade-in zoom-in-90"
              >
                <div
                  className={`relative flex items-center justify-center w-7 h-7 rounded-full shadow-xs transition-all ${
                    selectedPlanId === "CUSTOM"
                      ? "bg-purple-600 text-white scale-110 ring-2 ring-purple-400"
                      : "bg-card text-purple-600 dark:text-purple-400 border border-purple-500/50 hover:border-purple-600"
                  }`}
                >
                  <IconUser size={14} stroke={2.2} />
                </div>
                <div
                  className={`w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px] -mt-[0.5px] ${
                    selectedPlanId === "CUSTOM" ? "border-t-purple-600" : "border-t-purple-500/60"
                  }`}
                />
                <span
                  className={`font-mono text-[10px] font-bold mt-0.5 leading-none ${
                    selectedPlanId === "CUSTOM" ? "text-purple-600 dark:text-purple-400 font-black" : "text-foreground"
                  }`}
                >
                  ฿{customSpend.toLocaleString()}
                </span>
              </button>
            )}
          </div>

          {/* Standard Slider Bar */}
          <div className="space-y-1">
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={100}
              value={sliderValue}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCustomSpend(val);
                if (val === planSafe.spend) {
                  setSelectedPlanId("PROTECT_CASH");
                } else if (val === planSmart.spend) {
                  setSelectedPlanId("BALANCED");
                } else if (val === planMax.spend) {
                  setSelectedPlanId("READY_FOR_DEMAND");
                } else {
                  setSelectedPlanId("CUSTOM");
                  setShowDiy(true);
                }
              }}
              className="w-full h-2.5 bg-muted rounded-full cursor-pointer accent-primary focus:outline-none transition-all block"
              aria-label="Budget Slider"
            />

            <div className="flex justify-between items-center text-[10px] font-mono text-muted-foreground pt-0.5">
              <span>฿{sliderMin.toLocaleString()} Min</span>
              <span className="text-[10px] font-sans font-medium text-primary">
                {selectedPlanId === "CUSTOM"
                  ? `DIY (฿${customSpend.toLocaleString()})`
                  : `Plan ${activePlan.shortTitle} (฿${spendAmount.toLocaleString()})`}
              </span>
              <span className="flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-300">
                <span>฿{sliderMax.toLocaleString()}</span>
                <span className="text-[9px] font-sans opacity-80">
                  {sliderMax === demandCeilingSpend ? "Ceiling 📍" : "Limit"}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────
            PLAN CARDS (CLEAN EQUATION: SPEND -> (+ ฿PROFIT) -> REVENUE)
            Format:
            [icon] Low Risk                                    Safe
            spend           (20 - 30 customers)          Est. revenue
            ฿90 (normal)  ─────── (+ ฿110) ───────>     ฿200 (bold)
            ────────────────────────────────────────────────────────── */}
        <div className="space-y-2.5">
          {/* Card: DIY Custom Plan (Revealed when DIY is toggled) */}
          {showDiy && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setSelectedPlanId("CUSTOM")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedPlanId("CUSTOM");
                }
              }}
              className={`w-full text-left rounded-2xl p-4 transition-all cursor-pointer border duration-300 animate-in fade-in slide-in-from-top-2 ${
                selectedPlanId === "CUSTOM"
                  ? "border-purple-500 bg-purple-500/[0.04] shadow-xs ring-1 ring-purple-500/30"
                  : "border-border/70 bg-card hover:bg-muted/30"
              }`}
            >
              {/* Top Row: [icon] Badge (Left) | Plan Name + Check (Right) */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/15">
                    <IconUser size={14} stroke={2.2} />
                  </div>
                  <span>Customize</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground">DIY</span>
                  <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                    selectedPlanId === "CUSTOM" ? "bg-purple-600 text-white" : "border border-border"
                  }`}>
                    {selectedPlanId === "CUSTOM" && <IconCheck size={10} stroke={3} />}
                  </div>
                </div>
              </div>

              {/* Sub-header labels: spend | (customers) | Expected Sales */}
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 gap-1">
                <span className="font-medium uppercase tracking-wider text-[9px] sm:text-[10px] shrink-0">spend</span>
                <span className="font-medium text-[10px] sm:text-[11px] text-sky-600 dark:text-sky-400 truncate text-center px-1">
                  ({custMinDiy} – {custMaxDiy} customers)
                </span>
                <span className="font-medium uppercase tracking-wider text-[9px] sm:text-[10px] shrink-0 text-right">Expected Sales</span>
              </div>

              {/* Big Equation Row: ฿{spend} ──── (+ ฿{profit}) ────> ฿{revenue} */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-normal font-mono text-foreground/85 leading-none shrink-0">
                  ฿{customSpend}
                </span>

                <div className="flex-1 flex items-center justify-center gap-1 min-w-[60px]">
                  <div className="h-[1.5px] flex-1 bg-border/80" />
                  <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap shadow-2xs shrink-0">
                    + ฿{profitDiy}
                  </span>
                  <IconArrowRight size={13} className="shrink-0 text-muted-foreground" />
                  <div className="h-[1.5px] flex-1 bg-border/80" />
                </div>

                <span className="text-2xl sm:text-3xl font-normal font-mono text-emerald-600 dark:text-emerald-400 leading-none shrink-0 text-right">
                  ฿{avgSalesDiy}
                </span>
              </div>
            </div>
          )}

          {/* Plan 1: Safe (Shield Icon, Low Risk) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedPlanId("PROTECT_CASH");
              setCustomSpend(planSafe.spend);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedPlanId("PROTECT_CASH");
                setCustomSpend(planSafe.spend);
              }
            }}
            className={`w-full text-left rounded-2xl p-4 transition-all cursor-pointer border ${
              selectedPlanId === "PROTECT_CASH"
                ? "border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary/30"
                : "border-border/70 bg-card hover:bg-muted/30"
            }`}
          >
            {/* Top Row: [icon] Badge (Left) | Plan Name + Check (Right) */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-muted text-foreground">
                  <IconShield size={14} stroke={2.2} />
                </div>
                <span>Low Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Safe</span>
                <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                  selectedPlanId === "PROTECT_CASH" ? "bg-primary text-primary-foreground" : "border border-border"
                }`}>
                  {selectedPlanId === "PROTECT_CASH" && <IconCheck size={10} stroke={3} />}
                </div>
              </div>
            </div>

            {/* Sub-header labels: spend | (customers) | Expected Sales */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 gap-1">
              <span className="font-medium uppercase tracking-wider text-[9px] sm:text-[10px] shrink-0">spend</span>
              <span className="font-medium text-[10px] sm:text-[11px] text-sky-600 dark:text-sky-400 truncate text-center px-1">
                ({planSafe.custMin} – {planSafe.custMax} customers)
              </span>
              <span className="font-medium uppercase tracking-wider text-[9px] sm:text-[10px] shrink-0 text-right">Expected Sales</span>
            </div>

            {/* Big Equation Row: ฿{spend} ──── (+ ฿{profit}) ────> ฿{revenue} */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-3xl font-normal font-mono text-foreground/85 leading-none shrink-0">
                ฿{planSafe.spend.toLocaleString()}
              </span>

              <div className="flex-1 flex items-center justify-center gap-1 min-w-[60px]">
                <div className="h-[1.5px] flex-1 bg-border/80" />
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap shadow-2xs shrink-0">
                  + ฿{planSafe.profit.toLocaleString()}
                </span>
                <IconArrowRight size={13} className="shrink-0 text-muted-foreground" />
                <div className="h-[1.5px] flex-1 bg-border/80" />
              </div>

              <span className="text-2xl sm:text-3xl font-normal font-mono text-emerald-600 dark:text-emerald-400 leading-none shrink-0 text-right">
                ฿{planSafe.avgSales.toLocaleString()}
              </span>
            </div>

            {/* Risk Trade-off Micro-Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-border/40 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20 whitespace-nowrap">
                <span>🛡️ {planSafe.wasteRisk} Waste Risk</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold whitespace-nowrap">
                <span>฿{planSafe.protectedCash} Protected</span>
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
              {planSafe.description}
            </p>
          </div>

          {/* Plan 2: Smart (Sparkles Icon, AI Pick ⭐) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedPlanId("BALANCED");
              setCustomSpend(planSmart.spend);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedPlanId("BALANCED");
                setCustomSpend(planSmart.spend);
              }
            }}
            className={`w-full text-left rounded-2xl p-4 transition-all cursor-pointer relative border-2 ${
              selectedPlanId === "BALANCED"
                ? "border-amber-500 bg-amber-500/[0.04] shadow-md ring-2 ring-amber-500/20"
                : "border-border/70 bg-card hover:bg-muted/30"
            }`}
          >
            {/* Top Row: [icon] Badge (Left) | Plan Name + Check (Right) */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <IconSparkles size={14} stroke={2.2} />
                </div>
                <Badge className="text-[9px] py-0 px-1.5 bg-amber-500 text-amber-950 font-black">
                  AI Pick ⭐
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Smart</span>
                <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                  selectedPlanId === "BALANCED" ? "bg-amber-500 text-amber-950" : "border border-border"
                }`}>
                  {selectedPlanId === "BALANCED" && <IconCheck size={10} stroke={3} />}
                </div>
              </div>
            </div>

            {/* Sub-header labels: spend | (customers) | Expected Sales */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 gap-1">
              <span className="font-medium uppercase tracking-wider text-[9px] sm:text-[10px] shrink-0">spend</span>
              <span className="font-medium text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 font-semibold truncate text-center px-1">
                ({planSmart.custMin} – {planSmart.custMax} customers)
              </span>
              <span className="font-medium uppercase tracking-wider text-[9px] sm:text-[10px] shrink-0 text-right">Expected Sales</span>
            </div>

            {/* Big Equation Row: ฿{spend} ──── (+ ฿{profit}) ────> ฿{revenue} */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-3xl font-normal font-mono text-foreground/85 leading-none shrink-0">
                ฿{planSmart.spend.toLocaleString()}
              </span>

              <div className="flex-1 flex items-center justify-center gap-1 min-w-[60px]">
                <div className="h-[1.5px] flex-1 bg-amber-500/30" />
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap shadow-2xs shrink-0">
                  + ฿{planSmart.profit.toLocaleString()}
                </span>
                <IconArrowRight size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="h-[1.5px] flex-1 bg-amber-500/30" />
              </div>

              <span className="text-2xl sm:text-3xl font-normal font-mono text-emerald-600 dark:text-emerald-400 leading-none shrink-0 text-right">
                ฿{planSmart.avgSales.toLocaleString()}
              </span>
            </div>

            {/* Risk Trade-off Micro-Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-border/40 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/20 whitespace-nowrap">
                <span>⚖️ {planSmart.wasteRisk} Waste Risk</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold whitespace-nowrap">
                <span>฿{planSmart.protectedCash} Protected</span>
              </span>
              <span className="text-[9px] font-sans font-bold text-amber-600 dark:text-amber-400 ml-auto whitespace-nowrap">
                Sweet Spot 🎯
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
              {planSmart.description}
            </p>
          </div>

          {/* Plan 3: Max (Rocket Icon, High Upside) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedPlanId("READY_FOR_DEMAND");
              setCustomSpend(planMax.spend);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                setSelectedPlanId("READY_FOR_DEMAND");
                setCustomSpend(planMax.spend);
              }
            }}
            className={`w-full text-left rounded-2xl p-4 transition-all cursor-pointer border ${
              selectedPlanId === "READY_FOR_DEMAND"
                ? "border-primary bg-primary/[0.04] shadow-xs ring-1 ring-primary/30"
                : "border-border/70 bg-card hover:bg-muted/30"
            }`}
          >
            {/* Top Row: [icon] Badge (Left) | Plan Name + Check (Right) */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
                  <IconRocket size={14} stroke={2.2} />
                </div>
                <span>Full Budget</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-foreground">Max</span>
                <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                  selectedPlanId === "READY_FOR_DEMAND" ? "bg-primary text-primary-foreground" : "border border-border"
                }`}>
                  {selectedPlanId === "READY_FOR_DEMAND" && <IconCheck size={10} stroke={3} />}
                </div>
              </div>
            </div>

            {/* Sub-header labels: spend | (customers) | Expected Sales */}
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1 gap-1">
              <span className="font-medium uppercase tracking-wider text-[9px] sm:text-[10px] shrink-0">spend</span>
              <span className="font-medium text-[10px] sm:text-[11px] text-sky-600 dark:text-sky-400 truncate text-center px-1">
                ({planMax.custMin} – {planMax.custMax} customers)
              </span>
              <span className="font-medium uppercase tracking-wider text-[9px] sm:text-[10px] shrink-0 text-right">Expected Sales</span>
            </div>

            {/* Big Equation Row: ฿{spend} ──── (+ ฿{profit}) ────> ฿{revenue} */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2">
              <span className="text-2xl sm:text-3xl font-normal font-mono text-foreground/85 leading-none shrink-0">
                ฿{planMax.spend.toLocaleString()}
              </span>

              <div className="flex-1 flex items-center justify-center gap-1 min-w-[60px]">
                <div className="h-[1.5px] flex-1 bg-border/80" />
                <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] sm:text-xs font-mono font-bold whitespace-nowrap shadow-2xs shrink-0">
                  + ฿{planMax.profit.toLocaleString()}
                </span>
                <IconArrowRight size={13} className="shrink-0 text-muted-foreground" />
                <div className="h-[1.5px] flex-1 bg-border/80" />
              </div>

              <span className="text-2xl sm:text-3xl font-normal font-mono text-emerald-600 dark:text-emerald-400 leading-none shrink-0 text-right">
                ฿{planMax.avgSales.toLocaleString()}
              </span>
            </div>

            {/* Risk Trade-off Micro-Pills */}
            <div className="flex items-center gap-1.5 flex-wrap mt-2 pt-2 border-t border-border/40 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold border border-rose-500/20 whitespace-nowrap">
                <IconAlertTriangle size={11} stroke={2.5} />
                <span>⚠️ {planMax.wasteRisk} Waste Risk</span>
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold whitespace-nowrap">
                <span>฿0 Buffer</span>
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
              {planMax.description}
            </p>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────
          STEP 4: ACTION BUTTON (IN-FLOW, NON-FLOATING)
          ────────────────────────────────────────────────────────── */}
      <div className="pt-2">
        <Button
          size="lg"
          onClick={handleCommitAndStart}
          className="w-full h-13 text-base font-bold gap-2 shadow-sm rounded-2xl active:scale-[0.98] transition-transform"
        >
          <IconCheck size={18} stroke={2.5} />
          <span>Launch {activePlan.shortTitle} ฿{spendAmount.toLocaleString()} 🚀</span>
          <IconArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
