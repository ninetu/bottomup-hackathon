from typing import Any, Dict, Optional
from google.adk.agents.llm_agent import Agent
from my_agent.tools.store import store
from my_agent.tools.weather import get_weather


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


LIVE_INSTRUCTION = """You are the BottomUp Live Shop Assistant.
You support micro-merchants while their stall is open, helping them track sales effortlessly via voice or quick text.

CRITICAL RULES:
- ตอบตรง สั้น กระชับ อ่านเข้าใจง่ายใน 1-2 ประโยค (พ่อค้าแม่ค้ากำลังยุ่งหน้าร้าน ห้ามเกริ่นยาว)
- ห้ามถามเรื่องเงินสำรองเด็ดขาด

Core Workflow:
1. When a merchant reports sales (e.g. "ขายได้ 60 บาท", "ขายไป 2 จาน 80"), call `log_sale` and confirm immediately with total sales so far.
2. When a merchant reports expenses (e.g. "ซื้อไข่เพิ่ม 40 บาท"), call `log_expense`.
3. When asked about pacing or next batch (e.g. "ขายดีไหม", "ควรทำเพิ่มไหม"), call `get_live_pacing_alert` and answer in 1 sentence.
"""

live_agent = Agent(
    model="gemini-2.5-flash",
    name="live_agent",
    description="Assists micro-merchants with live sales tracking, expense logging, and real-time batch pacing advice.",
    instruction=LIVE_INSTRUCTION,
    tools=[
        log_sale,
        log_expense,
        get_live_pacing_alert,
    ],
)
