"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import {
  DEFAULT_PROFILE,
  DEFAULT_PLAN_DATA,
  DEFAULT_LIVE_DATA,
  DEFAULT_LEARN_DATA,
  DEFAULT_TIMELINE_ITEMS,
  MerchantProfile,
  PlanScreenData,
  PlanCard,
  LiveActivityData,
  LearnScreenData,
  TimelineItem,
  checkBackendHealth,
  fetchMerchantProfile,
  fetchPlanScreen,
  fetchLiveScreen,
  fetchLearnScreen,
} from "@/lib/api";

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function getFormattedTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface MerchantContextType {
  profile: MerchantProfile;
  planData: PlanScreenData;
  liveData: LiveActivityData;
  learnData: LearnScreenData;
  timelineItems: TimelineItem[];
  isBackendConnected: boolean;
  currentDate: string;
  updateProfile: (updated: MerchantProfile) => void;
  commitPlan: (planId: string, customPlan?: PlanCard) => void;
  recordSale: (amount: number, customers: number, note: string) => void;
  recordExpense: (amount: number, note: string) => void;
  addTimelineItem: (item: TimelineItem) => void;
}

const MerchantContext = createContext<MerchantContextType | null>(null);

export function MerchantProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<MerchantProfile>(DEFAULT_PROFILE);
  const [planData, setPlanData] = useState<PlanScreenData>(DEFAULT_PLAN_DATA);
  const [liveData, setLiveData] = useState<LiveActivityData>(DEFAULT_LIVE_DATA);
  const [learnData, setLearnData] = useState<LearnScreenData>(DEFAULT_LEARN_DATA);
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(DEFAULT_TIMELINE_ITEMS);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [currentDate] = useState("2026-10-12");

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      const isOnline = await checkBackendHealth();
      if (!mounted) return;
      setIsBackendConnected(isOnline);

      if (isOnline) {
        try {
          const [prof, plan, live, learn] = await Promise.all([
            fetchMerchantProfile(),
            fetchPlanScreen("merchant_default", currentDate),
            fetchLiveScreen("merchant_default", currentDate),
            fetchLearnScreen("merchant_default", currentDate),
          ]);
          if (mounted) {
            if (prof) setProfile(prof);
            if (plan) setPlanData(plan);
            if (live) setLiveData(live);
            if (learn) setLearnData(learn);
          }
        } catch {
          // fallback to default state
        }
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [currentDate]);

  const addTimelineItem = (item: TimelineItem) => {
    setTimelineItems((prev) => [...prev, item]);
  };

  const commitPlan = (planId: string, customPlan?: PlanCard) => {
    setPlanData((prev) => ({
      ...prev,
      selected_plan: planId,
    }));

    const plan = customPlan || planData.plans.find((p) => p.id === planId);
    if (plan) {
      const time = getFormattedTime();
      const targetSales = Math.round((plan.expected_sales_min + plan.expected_sales_max) / 2);

      setLiveData((prev) => ({
        ...prev,
        target_sales: targetSales,
        target_customers_range: `~${plan.serves_customers_min}–${plan.serves_customers_max}`,
        progress_percent: Math.min(100, Math.round((prev.sales_today / targetSales) * 100)),
      }));

      setLearnData((prev) => ({
        ...prev,
        money_flow: {
          ...prev.money_flow,
          market_spend: plan.spend_budget,
          net_profit_today: prev.money_flow.sales_today - plan.spend_budget,
          total_cash_now: prev.money_flow.starting_cash + (prev.money_flow.sales_today - plan.spend_budget),
        },
      }));

      addTimelineItem({
        id: generateId("tl_plan"),
        time,
        category: "activity",
        type: "PLAN",
        title: `Committed ${plan.title.replace(/^[^\w]+/, "")} Plan`,
        detail: `Spend budget ฿${plan.spend_budget} · Target ~${plan.serves_customers_min}–${plan.serves_customers_max} pax · Est. Sales ฿${plan.expected_sales_min}–฿${plan.expected_sales_max}`,
        badge: "Plan Selected",
      });
    }
  };

  const recordSale = (amount: number, customers: number, note: string) => {
    const time = getFormattedTime();
    // Simulate mobile SMS transfer sender & repeat recognition
    const phonePrefix = ["081", "089", "095", "086", "082"][Math.floor(Math.random() * 5)];
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const sender = `${phonePrefix}-${randomSuffix}-xxxx`;
    const rand = Math.random();
    const customerType = rand > 0.65 ? ("VIP" as const) : rand > 0.35 ? ("Regular" as const) : ("New" as const);
    const newTx = {
      id: generateId("tx"),
      time,
      type: "SALE" as const,
      amount,
      customers,
      sender,
      customer_type: customerType,
      note: note || sender,
    };

    setLiveData((prev) => {
      const newSales = prev.sales_today + amount;
      const newCustomers = prev.customers_served + customers;
      const newPercent = Math.min(100, Math.round((newSales / Math.max(1, prev.target_sales)) * 1000) / 10);

      return {
        ...prev,
        sales_today: newSales,
        customers_served: newCustomers,
        progress_percent: newPercent,
        recent_activity: [newTx, ...prev.recent_activity.slice(0, 5)],
      };
    });

    setLearnData((prev) => {
      const newSales = prev.money_flow.sales_today + amount;
      const netProfit = newSales - prev.money_flow.market_spend;
      const totalCash = prev.money_flow.starting_cash + netProfit;

      return {
        ...prev,
        money_flow: {
          ...prev.money_flow,
          sales_today: newSales,
          customers_today: prev.money_flow.customers_today + customers,
          net_profit_today: netProfit,
          total_cash_now: totalCash,
        },
      };
    });

    addTimelineItem({
      id: generateId("tl_sale"),
      time,
      category: "activity",
      type: "SALE",
      title: `Sale Logged (+฿${amount})`,
      detail: `${note}${customers > 1 ? ` (${customers} pax)` : ""}`,
      amount,
      badge: "Sale",
    });
  };

  const recordExpense = (amount: number, note: string) => {
    const time = getFormattedTime();
    const newTx = {
      id: generateId("tx"),
      time,
      type: "EXPENSE" as const,
      amount,
      sender: "08x-xxx-xxxx",
      note: note || "08x-xxx-xxxx",
    };

    setLiveData((prev) => ({
      ...prev,
      recent_activity: [newTx, ...prev.recent_activity.slice(0, 5)],
    }));

    setLearnData((prev) => {
      const newSpend = prev.money_flow.market_spend + amount;
      const netProfit = prev.money_flow.sales_today - newSpend;
      const totalCash = prev.money_flow.starting_cash + netProfit;

      return {
        ...prev,
        money_flow: {
          ...prev.money_flow,
          market_spend: newSpend,
          net_profit_today: netProfit,
          total_cash_now: totalCash,
        },
      };
    });

    addTimelineItem({
      id: generateId("tl_exp"),
      time,
      category: "activity",
      type: "EXPENSE",
      title: `Expense Logged (-฿${amount})`,
      detail: note,
      amount: -amount,
      badge: "Expense",
    });
  };

  return (
    <MerchantContext.Provider
      value={{
        profile,
        planData,
        liveData,
        learnData,
        timelineItems,
        isBackendConnected,
        currentDate,
        updateProfile: setProfile,
        commitPlan,
        recordSale,
        recordExpense,
        addTimelineItem,
      }}
    >
      {children}
    </MerchantContext.Provider>
  );
}

export function useMerchant() {
  const context = useContext(MerchantContext);
  if (!context) {
    throw new Error("useMerchant must be used within a MerchantProvider");
  }
  return context;
}
