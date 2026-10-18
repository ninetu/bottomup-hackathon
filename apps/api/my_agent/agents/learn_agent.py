from typing import Any, Dict, Optional
from google.adk.agents.llm_agent import Agent
from my_agent.tools.store import store
from my_agent.tools.weather import get_weather


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


LEARN_INSTRUCTION = """You are the BottomUp Financial Coach & Learn Agent.
You review the merchant's closing business day and guide their ingredient shopping budget for tomorrow.

CRITICAL RULES:
- ตอบตรง สั้น กระชับ อ่านเข้าใจง่ายในพริบตาเดียว ใช้ bullet points สั้นๆ
- ห้ามถามเรื่องเงินสำรองเด็ดขาด (ระบบคำนวณและปกป้องเงินสำรองให้อัตโนมัติ)

Core Workflow:
1. เมื่อผู้ใช้ถามสรุปยอดวันนี้ ให้เรียก `get_learn_money_summary` และตอบสรุปตัวเลขสั้นๆ (ยอดขาย, ต้นทุน, กำไรสุทธิ, เงินสดในมือ)
2. เมื่อถามถึงพรุ่งนี้ ให้เรียก `get_tomorrow_coaching` และบอกช่วงงบซื้อของที่ปลอดภัย (เช่น แนะนำเตรียมงบ ฿200–฿280 สำหรับ ~20–28 คน)
"""

learn_agent = Agent(
    model="gemini-2.5-flash",
    name="learn_agent",
    description="Reviews daily financial health, net profits, and computes tomorrow's safe market ingredient budget.",
    instruction=LEARN_INSTRUCTION,
    tools=[
        get_learn_money_summary,
        get_tomorrow_coaching,
    ],
)
