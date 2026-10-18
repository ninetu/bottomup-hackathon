// API client and mock data layer for BottomUp micro-merchant decision platform

export interface MerchantProfile {
  merchant_id: string;
  name: string;
  location: string;
  city: string;
  open_time: string;
  close_time: string;
  starting_cash: number;
  reserve_cash: number;
  available_spend: number;
  avg_order_value: number;
  unit_cost_ratio: number;
  products?: string;
}

export interface PlanCard {
  id: "PROTECT_CASH" | "BALANCED" | "READY_FOR_DEMAND" | "CUSTOM";
  title: string;
  risk_level: string;
  spend_budget: number;
  serves_customers_min: number;
  serves_customers_max: number;
  expected_sales_min: number;
  expected_sales_max: number;
  description: string;
}

export interface HourlyMilestone {
  hour: string;
  hourly_target: number;
  cumulative_forecast: number;
  annotation: string;
}

export interface PlanScreenData {
  merchant_id: string;
  date: string;
  shift_hours: string;
  available_spend_budget: number;
  safety_reserve_protected: number;
  shift_conditions: string;
  plans: PlanCard[];
  selected_plan?: string;
}

export interface LiveActivityData {
  merchant_id: string;
  date: string;
  sales_today: number;
  customers_served: number;
  target_customers_range: string;
  target_sales: number;
  progress_percent: number;
  forecast_hourly_curve: HourlyMilestone[];
  recent_activity: Array<{
    id: string;
    time: string;
    type: "SALE" | "EXPENSE";
    amount: number;
    customers?: number;
    sender?: string;
    customer_type?: "New" | "Regular" | "VIP";
    note: string;
  }>;
}

export interface LearnScreenData {
  merchant_id: string;
  date: string;
  suggested_spend_tomorrow_min: number;
  suggested_spend_tomorrow_max: number;
  suggested_customers_tomorrow_min: number;
  suggested_customers_tomorrow_max: number;
  money_flow: {
    starting_cash: number;
    sales_today: number;
    customers_today: number;
    market_spend: number;
    net_profit_today: number;
    total_cash_now: number;
    reserve_cash_protected: number;
    reserve_healthy: boolean;
  };
}

export interface TimelineItem {
  id: string;
  time: string;
  category: "activity" | "chat" | "alert";
  type: "PLAN" | "SALE" | "EXPENSE" | "ALERT" | "LEARN" | "USER_MSG" | "AI_MSG";
  title: string;
  detail?: string;
  amount?: number;
  badge?: string;
}

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem("bottomup_api_url");
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/+$/, "");
    }
  }
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
}

export function setCustomApiBaseUrl(url: string): void {
  if (typeof window !== "undefined") {
    if (url && url.trim()) {
      localStorage.setItem("bottomup_api_url", url.trim().replace(/\/+$/, ""));
    } else {
      localStorage.removeItem("bottomup_api_url");
    }
  }
}

export function getCustomApiBaseUrl(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("bottomup_api_url");
  }
  return null;
}

export const DEFAULT_TIMELINE_ITEMS: TimelineItem[] = [
  {
    id: "tl_1",
    time: "05:45",
    category: "alert",
    type: "ALERT",
    title: "Morning Signals Synced",
    detail: "Weather: Clear morning · Commuter trains arriving 07:00 & 08:00 (peak station influx).",
    badge: "System Alert",
  },
  {
    id: "tl_2",
    time: "06:00",
    category: "activity",
    type: "PLAN",
    title: "Committed Smart Plan",
    detail: "Meat spend ฿3,400 (~27kg) · Target 68–88 pax · Expected sales ฿5,100–฿6,200",
    badge: "Morning Plan",
  },
  {
    id: "tl_3",
    time: "06:45",
    category: "activity",
    type: "SALE",
    title: "Sale Logged (+฿50)",
    detail: "4 Skewers + 1 Sticky rice (089-412-xxxx)",
    amount: 50,
    badge: "Sale",
  },
  {
    id: "tl_4",
    time: "07:15",
    category: "activity",
    type: "SALE",
    title: "Sale Logged (+฿100)",
    detail: "8 Skewers + 2 Sticky rice (081-872-xxxx)",
    amount: 100,
    badge: "Sale",
  },
  {
    id: "tl_5",
    time: "08:10",
    category: "activity",
    type: "SALE",
    title: "Sale Logged (+฿80)",
    detail: "Commuter breakfast set (083-119-xxxx)",
    amount: 80,
    badge: "Sale",
  },
  {
    id: "tl_6",
    time: "08:35",
    category: "chat",
    type: "AI_MSG",
    title: "Shop Copilot",
    detail: "Collected ฿2,850 from 57 customers (ahead of morning pace). Train rush is tapering. Grill last batch of 15-20 skewers to wrap up by 09:30 with zero waste.",
    badge: "AI Insight",
  },
];

export const DEFAULT_PROFILE: MerchantProfile = {
  merchant_id: "merchant_default",
  name: "Ann Moo Ping",
  location: "Krung Thep Aphiwat Central Station",
  city: "Bangkok",
  open_time: "06:00",
  close_time: "10:00",
  starting_cash: 2000,
  reserve_cash: 1000,
  available_spend: 5000,
  avg_order_value: 50,
  unit_cost_ratio: 0.6,
  products: "Grilled Pork Skewers (10 Baht/skewer), Sticky Rice (10 Baht/bag)",
};

export const DEFAULT_PLAN_DATA: PlanScreenData = {
  merchant_id: "merchant_default",
  date: "2026-10-12",
  shift_hours: "06:00 – 10:00",
  available_spend_budget: 5000,
  safety_reserve_protected: 1000,
  shift_conditions: "🚆 Morning train peak: 07:00–08:30 · 🌧️ Light drizzle possible after 09:30 (20%)",
  plans: [
    {
      id: "PROTECT_CASH",
      title: "🛡️ Safe",
      risk_level: "🟢 Low Risk",
      spend_budget: 2600,
      serves_customers_min: 50,
      serves_customers_max: 65,
      expected_sales_min: 3900,
      expected_sales_max: 4800,
      description: "Preps ~20kg pork. Lean grill inventory guards cash against early slowdown.",
    },
    {
      id: "BALANCED",
      title: "⭐ Smart (Recommended)",
      risk_level: "🟡 Medium Risk",
      spend_budget: 3400,
      serves_customers_min: 68,
      serves_customers_max: 88,
      expected_sales_min: 5100,
      expected_sales_max: 6200,
      description: "Preps ~27kg pork. Optimal balance capturing 07:00–08:30 commuter trains.",
    },
    {
      id: "READY_FOR_DEMAND",
      title: "🚀 Max",
      risk_level: "🔴 High Upside",
      spend_budget: 5000,
      serves_customers_min: 100,
      serves_customers_max: 135,
      expected_sales_min: 7500,
      expected_sales_max: 9500,
      description: "Full 40kg batch. Maximizes peak morning rush turnout for highest revenue.",
    },
  ],
  selected_plan: "BALANCED",
};

export const DEFAULT_LIVE_DATA: LiveActivityData = {
  merchant_id: "merchant_default",
  date: "2026-10-12",
  sales_today: 2850,
  customers_served: 57,
  target_customers_range: "~68–88",
  target_sales: 5600,
  progress_percent: 50.9,
  forecast_hourly_curve: [
    { hour: "06:00", hourly_target: 600, cumulative_forecast: 600, annotation: "First Grill" },
    { hour: "07:00", hourly_target: 1800, cumulative_forecast: 2400, annotation: "🚆 Train Rush" },
    { hour: "08:00", hourly_target: 2000, cumulative_forecast: 4400, annotation: "🚆 Commuter Peak" },
    { hour: "09:00", hourly_target: 900, cumulative_forecast: 5300, annotation: "Wind Down" },
    { hour: "10:00", hourly_target: 300, cumulative_forecast: 5600, annotation: "Closing" },
  ],
  recent_activity: [
    { id: "tx_1", time: "06:45", type: "SALE", amount: 50, customers: 1, sender: "089-412-xxxx", customer_type: "Regular", note: "PromptPay Transfer" },
    { id: "tx_2", time: "07:15", type: "SALE", amount: 100, customers: 2, sender: "081-872-xxxx", customer_type: "VIP", note: "PromptPay Transfer" },
    { id: "tx_3", time: "07:50", type: "SALE", amount: 50, customers: 1, sender: "095-234-xxxx", customer_type: "New", note: "PromptPay Transfer" },
    { id: "tx_4", time: "08:10", type: "SALE", amount: 80, customers: 1, sender: "083-119-xxxx", customer_type: "New", note: "PromptPay Transfer" },
    { id: "tx_5", time: "08:35", type: "SALE", amount: 150, customers: 3, sender: "086-551-xxxx", customer_type: "VIP", note: "PromptPay Transfer" },
  ],
};

export const DEFAULT_LEARN_DATA: LearnScreenData = {
  merchant_id: "merchant_default",
  date: "2026-10-12",
  suggested_spend_tomorrow_min: 3200,
  suggested_spend_tomorrow_max: 5000,
  suggested_customers_tomorrow_min: 70,
  suggested_customers_tomorrow_max: 120,
  money_flow: {
    starting_cash: 2000,
    sales_today: 5600,
    customers_today: 92,
    market_spend: 3400,
    net_profit_today: 2200,
    total_cash_now: 4200,
    reserve_cash_protected: 1000,
    reserve_healthy: true,
  },
};

// Check if backend is reachable (supports custom URL test)
export async function checkBackendHealth(targetUrl?: string): Promise<{ ok: boolean; latencyMs: number; status?: string }> {
  const base = targetUrl || getApiBaseUrl();
  const startTime = Date.now();
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2500),
    });
    const latencyMs = Date.now() - startTime;
    return { ok: res.ok, latencyMs, status: res.ok ? "healthy" : `HTTP ${res.status}` };
  } catch {
    return { ok: false, latencyMs: Date.now() - startTime, status: "unreachable" };
  }
}

// Fetch merchant profile
export async function fetchMerchantProfile(merchantId = "merchant_default"): Promise<MerchantProfile> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/merchant/${merchantId}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return DEFAULT_PROFILE;
}

// Fetch plan screen data
export async function fetchPlanScreen(merchantId = "merchant_default", date = "2026-10-12"): Promise<PlanScreenData> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/merchant/${merchantId}/plan?date=${date}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return DEFAULT_PLAN_DATA;
}

// Fetch live screen data
export async function fetchLiveScreen(merchantId = "merchant_default", date = "2026-10-12"): Promise<LiveActivityData> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/merchant/${merchantId}/live?date=${date}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return DEFAULT_LIVE_DATA;
}

// Fetch learn screen data
export async function fetchLearnScreen(merchantId = "merchant_default", date = "2026-10-12"): Promise<LearnScreenData> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/merchant/${merchantId}/learn?date=${date}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return DEFAULT_LEARN_DATA;
}

// Commit plan to backend
export async function commitPlanToBackend(
  merchantId = "merchant_default",
  planId = "BALANCED",
  customSpend?: number,
  customPax?: number,
  date = "2026-10-12"
): Promise<{ status: string; message?: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/merchant/${merchantId}/plan/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: planId,
        custom_spend: customSpend,
        custom_target_customers: customPax,
        date,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) return await res.json();
  } catch {
    // offline graceful
  }
  return { status: "local_committed" };
}

// Record live sale to backend
export async function recordSaleToBackend(
  amount: number,
  customers = 1,
  note = "",
  sender?: string,
  customerType: "New" | "Regular" | "VIP" = "Regular",
  merchantId = "merchant_default",
  date = "2026-10-12"
): Promise<{ status: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/merchant/${merchantId}/sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        customers,
        note,
        sender,
        customer_type: customerType,
        date,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) return await res.json();
  } catch {
    // offline
  }
  return { status: "local_recorded" };
}

// Record expense to backend
export async function recordExpenseToBackend(
  amount: number,
  note = "",
  merchantId = "merchant_default",
  date = "2026-10-12"
): Promise<{ status: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/merchant/${merchantId}/expense`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount,
        note,
        date,
      }),
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) return await res.json();
  } catch {
    // offline
  }
  return { status: "local_recorded" };
}

// Send conversational message to an agent stage (Plan, Live, Learn)
export async function sendAgentMessage(
  stage: "plan" | "live" | "learn",
  message: string,
  sessionId?: string,
  merchantId = "merchant_default",
  date = "2026-10-12"
): Promise<{ reply: string; session_id: string }> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/agent/${stage}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: merchantId,
        message,
        session_id: sessionId,
        date,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Return friendly simulated contextual response when offline
  }

  // Realistic mock replies per stage for Auntie Ann (ป้าแอน หมูปิ้ง)
  const lowerMsg = message.toLowerCase();
  if (
    lowerMsg.includes("ฝน") ||
    lowerMsg.includes("rain") ||
    lowerMsg.includes("3,000") ||
    lowerMsg.includes("3000") ||
    lowerMsg.includes("ลดงบ")
  ) {
    return {
      reply: `(1) สภาพอากาศ: ช่วงเช้าฟ้าโปร่ง ฝนมีโอกาสตกเบาๆ (20%) หลัง 09:30 น. ช่วงพีครถไฟ 07:00–08:30 น. คนเดินทางเข้าสถานีหนาแน่น ขายได้เต็มที่\n(2) ลดงบเหลือ ฿3,000: เสี่ยงของเหลือต่ำมาก (แทบไม่เหลือทิ้ง) และเงินสำรอง ฿1,000 ปลอดภัย 100% แต่มีความเสี่ยงของหมดเร็วเกินไป ทำให้พลาดลูกค้าช่วงรถไฟพีค`,
      session_id: sessionId || "sim_live_session",
    };
  }

  if (stage === "plan") {
    return {
      reply: `สวัสดีค่ะป้าแอน! เช้านี้งบซื้อของ ฿5,000 แนะนำ **Smart Plan (฿3,400 หมู ~27กก.)** ดักจับผู้โดยสารรถไฟช่วง 07:00–08:30 น. ได้สมดุลที่สุด ปิดยอดได้ก่อนฝนโปรย 09:30 น. และเก็บเงินสดสำรอง ฿1,600 ไว้ปลอดภัยค่ะ`,
      session_id: sessionId || "sim_plan_session",
    };
  }

  if (stage === "live") {
    return {
      reply: `ป้าแอนขายไปแล้ว 57 คน ได้ยอด ฿2,850 (51% ของเป้าหมาย ฿5,600) กำลังอยู่ในเกณฑ์ดีมากค่ะ! หลัง 08:30 น. คนเริ่มซา แนะนำย่างหมูเตาสุดท้ายอีกแค่ 15–20 ไม้ เพื่อปิดร้านตอน 09:30 น. โดยไม่มีของเหลือทิ้งค่ะ`,
      session_id: sessionId || "sim_live_session",
    };
  }

  return {
    reply: `ปิดร้านยอดเยี่ยมค่ะป้าแอน! วันนี้กำไรสุทธิ +฿2,200 และเงินสำรอง ฿1,000 ปลอดภัย 100% พรุ่งนี้ท้องฟ้าแจ่มใส 0% ฝน แนะนำเตรียมงบ ฿3,200–฿5,000 ขยายรับลูกค้าได้ถึง 70–120 คนค่ะ`,
    session_id: sessionId || "sim_learn_session",
  };
}
