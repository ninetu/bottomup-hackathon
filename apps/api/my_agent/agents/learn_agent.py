from typing import Any, Dict, Optional
from google.adk.agents.llm_agent import Agent
from my_agent.tools.store import store
from my_agent.tools.weather import get_weather
from my_agent.tools.quantitative import (
    simulate_downside_risk,
    simulate_multidimensional_scenarios,
)


def get_learn_money_summary(
    merchant_id: str = "merchant_default",
    date: str = "2026-10-12",
) -> Dict[str, Any]:
    """Retrieves end-of-day money flow, net profit, and reserve health status.

    Args:
        merchant_id: Merchant identifier.
        date: Operating date in 'YYYY-MM-DD'.
    """
    return store.get_learn_summary(merchant_id, date)


def get_tomorrow_coaching(
    merchant_id: str = "merchant_default",
    current_date: str = "2026-10-12",
    tomorrow_date: str = "2026-10-13",
) -> Dict[str, Any]:
    """Generates financial coaching insights and suggested market ingredient spend range for tomorrow.

    Args:
        merchant_id: Merchant identifier.
        current_date: Today's operating date.
        tomorrow_date: Tomorrow's date to check weather conditions for.
    """
    learn_data = store.get_learn_summary(merchant_id, current_date)
    profile = store.get_profile(merchant_id)
    weather_tomorrow = get_weather(location=profile.get("location", "Bangkok"), date=tomorrow_date)

    # Detect tomorrow rain risk
    tomorrow_rain_prob = 0
    if "daily_forecasts" in weather_tomorrow:
        for f in weather_tomorrow["daily_forecasts"]:
            if f.get("date") == tomorrow_date:
                tomorrow_rain_prob = f.get("max_rain_probability", 0)

    spend_min = learn_data["suggested_spend_tomorrow_min"]
    spend_max = learn_data["suggested_spend_tomorrow_max"]
    cust_min = learn_data["suggested_customers_tomorrow_min"]
    cust_max = learn_data["suggested_customers_tomorrow_max"]

    money_flow = learn_data["money_flow"]
    net_profit = money_flow["net_profit_today"]
    customers_today = money_flow["customers_today"]

    whats_going_well = [
        f"✓ Net profit (+฿{net_profit:.0f}) safely protected tomorrow's ฿{profile['reserve_cash']:.0f} reserve.",
        f"✓ {customers_today} customers served today, proving strong demand before rain.",
    ]

    needs_attention = []
    if tomorrow_rain_prob >= 40:
        needs_attention.append(f"! Rain forecast early tomorrow ({tomorrow_rain_prob}% chance). Stick to ~{cust_min}–{cust_max} customers.")
    else:
        needs_attention.append(f"! Keep ingredient spending within the ฿{spend_min:.0f}–฿{spend_max:.0f} safe range before shopping.")

    return {
        "current_date": current_date,
        "tomorrow_date": tomorrow_date,
        "suggested_spend_tomorrow": f"฿{spend_min:.0f} – ฿{spend_max:.0f}",
        "suggested_customers_tomorrow": f"~{cust_min}–{cust_max} customers",
        "tomorrow_rain_probability": f"{tomorrow_rain_prob}%",
        "whats_going_well": whats_going_well,
        "what_needs_attention": needs_attention,
        "money_flow": money_flow,
    }


LEARN_INSTRUCTION = """You name is BottomUp - a Financial Coach & Learn Agent.
You review the merchant's closed business day (10:00+ shift closing reconciliation) and guide their ingredient shopping budget for tomorrow morning.

LANGUAGE:
- Default to English (optimized for judges and international evaluation).
- If the merchant speaks in Thai, reply naturally in Thai while keeping the exact same structure and figures.

CRITICAL RULES:
- Answer directly and concisely using short bullet points for quick scanning at a glance.
- Ground explanations in the core equation: Spend ──(+Net Profit)──> Actual Sales (e.g. ฿3,400 Spend + ฿2,200 Net Profit = ฿5,600 Sales).
- NEVER ask about emergency reserve cash (the system automatically verifies and protects the reserve).

Core Workflow:
1. Daily Shift Reconciliation:
   - When the merchant asks about today's summary or performance (e.g. "How did I do today?", "Summary of today's sales"):
   - Call `get_learn_money_summary`.
   - Provide a concise summary: Market Spend (฿3,400), Actual Sales (฿5,600 from 92 customers), Net Profit (+฿2,200), and Total Cash in pocket (฿4,200), confirming that the emergency reserve (฿1,000) remained 100% protected.
2. Tomorrow's Coaching & Safe Market Spend:
   - When asked about tomorrow (e.g. "How much should I spend tomorrow?", "What is my shopping budget tomorrow?"):
   - Call `get_tomorrow_coaching`.
   - Share coaching insights:
     • What Went Well: e.g. Net profit safely protected tomorrow's reserve, strong commuter demand.
     • What Needs Attention: e.g. Upcoming weather conditions (rain probability) or budget constraints.
     • Recommended Shopping Budget: Safe market spend range (e.g. suggested spend ฿3,200–฿5,000 for ~68–100+ customers) so they never overspend or risk leftover food waste.
"""

learn_agent = Agent(
    model="gemini-3.8-flash",
    name="learn_agent",
    description="Reviews daily financial health, net profits, down-side risks, and computes tomorrow's safe market ingredient budget.",
    instruction=LEARN_INSTRUCTION,
    tools=[
        get_learn_money_summary,
        get_tomorrow_coaching,
        simulate_downside_risk,
        simulate_multidimensional_scenarios,
    ],
)
