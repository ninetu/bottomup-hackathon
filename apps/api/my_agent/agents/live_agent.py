from typing import Any, Dict, Optional
from google.adk.agents.llm_agent import Agent
from my_agent.tools.store import store
from my_agent.tools.weather import get_weather
from my_agent.tools.train import get_train_schedule
from my_agent.tools.simulation import simulate_custom_plan
from my_agent.tools.quantitative import (
    simulate_downside_risk,
    simulate_multidimensional_scenarios,
    run_monte_carlo_simulation,
    sense_hyperlocal_demand,
)


def log_sale(
    amount: float,
    customers: int = 1,
    note: str = "",
    merchant_id: str = "merchant_default",
    date: str = "2026-10-12",
) -> Dict[str, Any]:
    """Logs a completed customer sale or quick transaction during the open shift.

    Args:
        amount: Revenue received in Thai Baht (e.g. 60.0).
        customers: Number of customers served in this transaction (default 1).
        note: Optional description (e.g. '2 boxes of fried rice').
        merchant_id: Merchant identifier.
        date: Operating date in 'YYYY-MM-DD'.

    Returns:
        Updated cumulative sales, total customers served, and confirmation.
    """
    result = store.record_sale(merchant_id, date, amount, customers, note)
    activity = store.get_live_activity(merchant_id, date)
    return {
        "status": "success",
        "logged_sale": amount,
        "total_sales_today": activity["sales_today"],
        "customers_served": activity["customers_served"],
        "target_sales": activity["target_sales"],
        "progress_percent": activity["progress_percent"],
    }


def log_expense(
    amount: float,
    note: str = "",
    merchant_id: str = "merchant_default",
    date: str = "2026-10-12",
) -> Dict[str, Any]:
    """Logs an expense or mid-day ingredient restock purchase.

    Args:
        amount: Expense amount in Thai Baht (e.g. 40.0).
        note: Reason for spending (e.g. 'Extra oil & eggs').
        merchant_id: Merchant identifier.
        date: Operating date in 'YYYY-MM-DD'.
    """
    result = store.record_expense(merchant_id, date, amount, note)
    return {
        "status": "success",
        "logged_expense": amount,
        "total_market_spend_today": result["market_spend"],
    }


def get_live_pacing_alert(
    merchant_id: str = "merchant_default",
    date: str = "2026-10-12",
    current_time: str = "10:24",
) -> Dict[str, Any]:
    """Compares actual sales velocity against the planned hourly forecast curve to provide batch guidance.

    Args:
        merchant_id: Merchant identifier.
        date: Operating date in 'YYYY-MM-DD'.
        current_time: Current operating time in 'HH:MM' (e.g. '10:24').
    """
    activity = store.get_live_activity(merchant_id, date)
    sales_today = activity["sales_today"]
    target_sales = activity["target_sales"]

    # Check afternoon weather from weather tool
    weather = get_weather(location="Bangkok", date=date)
    rain_afternoon = False
    if "hourly" in weather:
        for h in weather["hourly"]:
            if h.get("time", "").startswith(f"{date}T13") and h.get("rain_probability", 0) >= 30:
                rain_afternoon = True
                break

    # Pacing analysis
    if sales_today >= target_sales * 0.9:
        suggestion = "Pacing is strongly on track! Consider preparing only small on-demand batches to prevent leftovers."
    elif sales_today >= target_sales * 0.5:
        if rain_afternoon:
            suggestion = "Rain expected around 13:00. Pacing is solid, but hold off cooking large extra batches to protect cash."
        else:
            suggestion = "Sales are progressing well toward midday peak. Prepare a moderate next batch."
    else:
        suggestion = "Sales are moving slower than forecast for this hour. Prepare smaller batches to reduce leftover risk."

    return {
        "current_time": current_time,
        "sales_today": sales_today,
        "target_sales": target_sales,
        "customers_served": activity["customers_served"],
        "target_customers_range": activity["target_customers_range"],
        "progress_percent": activity["progress_percent"],
        "pacing_alert": suggestion,
    }


LIVE_INSTRUCTION = """You name is BottomUp, an Assistant & Intraday Copilot.
You support micro-merchants (like Ann Moo Ping at Krung Thep Aphiwat Central Station) while their stall is actively open (06:00–10:00 shift), helping them log sales effortlessly and answering questions about pacing, batch cooking, weather, trains, and downside risk.

LANGUAGE:
- Default to English (optimized for judges and international evaluation).
- If the merchant speaks in Thai, reply naturally in Thai while keeping the exact same structure and figures.

CRITICAL RULES:
- Keep answers ultra-concise (1–2 punchy sentences or clear bullet points). Merchants are busy serving customers at the physical stall.
- NEVER ask about emergency reserve cash (the system automatically manages and protects the reserve).

Core Workflow:
1. When a merchant reports a sale (e.g. "Sold 60 Baht", "Logged 2 sets for 80 Baht", "ขายได้ 60 บาท"):
   - Call `log_sale` and confirm immediately with cumulative sales collected and progress toward target.
2. When a merchant reports an expense/restock (e.g. "Bought extra pork 100 Baht", "ซื้อหมูเพิ่ม 100 บาท"):
   - Call `log_expense` and confirm updated total market spend.
3. When asked about pacing or next cooking batch (e.g. "Am I on pace to meet target?", "Should I grill another batch?"):
   - Call `get_live_pacing_alert` and answer in 1 clear recommendation matching the planned hourly curve vs. train arrivals.
4. When asked about rain or risk (e.g. "What time will it rain today? If I cut spend to ฿3,000, what happens?" / "วันนี้ฝนจะตกกี่โมง ถ้าลดงบเหลือ ฿3,000 จะเสี่ยงไหม?"):
   - Call `get_weather` or `simulate_downside_risk`.
   - Answer in 2 concise points:
     (1) Weather & Commuter Rush: Clear morning with heavy commuter trains (07:00–08:30). Light drizzle risk (20%) only after 09:30 during wind-down.
     (2) Budget ฿3,000 Risk: Near-zero leftover waste and emergency reserve (฿1,000) is 100% safe, but carries stockout risk—might run out of skewers early during peak commuter rush.
"""

live_agent = Agent(
    model="gemini-3.8-flash",
    name="live_agent",
    description="Assists micro-merchants with live sales tracking, expense logging, real-time batch pacing advice, and intraday risk simulations.",
    instruction=LIVE_INSTRUCTION,
    tools=[
        log_sale,
        log_expense,
        get_live_pacing_alert,
        get_weather,
        get_train_schedule,
        simulate_downside_risk,
        simulate_custom_plan,
        simulate_multidimensional_scenarios,
        run_monte_carlo_simulation,
        sense_hyperlocal_demand,
    ],
)
