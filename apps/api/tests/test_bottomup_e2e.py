import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient

from my_agent.tools.weather import get_weather
from my_agent.tools.train import get_train_schedule
from my_agent.tools.simulation import generate_daily_plans, commit_merchant_plan, simulate_custom_plan
from my_agent.tools.profile import setup_business_profile
from my_agent.tools.store import store
from server import app


def test_weather_tool():
    """Verify weather data lookup for Bangkok and Chiang Mai."""
    bkk = get_weather("Bangkok", date="2026-10-12")
    assert bkk["city"] == "Bangkok"
    assert "summary" in bkk
    assert bkk["summary"]["max_rain_probability"] >= 0

    cnx = get_weather("เชียงใหม่", date="2026-10-12", time="10:00")
    assert cnx["city"] == "Chiang Mai"
    assert "weather" in cnx
    assert cnx["weather"]["condition"] == "Sunny"


def test_train_tool():
    """Verify train schedule lookup for Krung Thep Aphiwat station."""
    schedule = get_train_schedule("กรุงเทพอภิวัฒน์", start_time="07:00", end_time="15:00")
    assert schedule["station"] == "กรุงเทพอภิวัฒน์"
    assert schedule["total_train_movements"] > 0
    assert len(schedule["peak_rush_hours"]) > 0


def test_simulation_engine():
    """Verify Monte Carlo simulation and 3 plan cards generation."""
    plans = generate_daily_plans("merchant_default", "2026-10-12")
    assert len(plans["plans"]) == 3
    plan_ids = [p["id"] for p in plans["plans"]]
    assert "PROTECT_CASH" in plan_ids
    assert "BALANCED" in plan_ids
    assert "READY_FOR_DEMAND" in plan_ids

    # Balanced plan values
    balanced = next(p for p in plans["plans"] if p["id"] == "BALANCED")
    assert balanced["spend_budget"] == 220.0
    assert balanced["serves_customers_min"] > 0
    assert balanced["serves_customers_max"] >= balanced["serves_customers_min"]
    assert balanced["expected_sales_max"] > balanced["expected_sales_min"]

    # Commit plan
    committed = commit_merchant_plan("merchant_default", "2026-10-12", "BALANCED")
    assert committed["status"] == "success"


def test_merchant_store_lifecycle():
    """Verify store transitions across morning, intraday sales, and evening summary."""
    m_id = "test_merchant"
    date = "2026-10-12"

    # 1. Save plan
    store.save_plan(
        merchant_id=m_id,
        date=date,
        plan_name="BALANCED",
        spend=220.0,
        serves_min=25,
        serves_max=35,
        expected_sales_min=380.0,
        expected_sales_max=550.0,
        risk_level="Medium",
    )

    # 2. Log sales
    store.record_sale(m_id, date, amount=60.0, customers=2, note="2 boxes")
    store.record_sale(m_id, date, amount=45.0, customers=1, note="1 meal")

    live = store.get_live_activity(m_id, date)
    assert live["sales_today"] == 105.0
    assert live["customers_served"] == 3
    assert len(live["recent_activity"]) == 2

    # 3. Evening learn summary
    learn = store.get_learn_summary(m_id, date)
    assert learn["money_flow"]["sales_today"] == 105.0
    assert learn["money_flow"]["market_spend"] == 220.0
    assert learn["suggested_spend_tomorrow_min"] > 0
    assert learn["suggested_spend_tomorrow_max"] >= learn["suggested_spend_tomorrow_min"]


def test_api_direct_routes():
    """Verify fast direct data routes for instant mobile UI rendering."""
    client = TestClient(app)

    # Health
    assert client.get("/health").status_code == 200

    # Page 1 Direct Plan
    r_plan = client.get("/api/merchant/merchant_default/plan?date=2026-10-12")
    assert r_plan.status_code == 200
    assert len(r_plan.json()["plans"]) == 3

    # Page 2 Direct Live
    r_live = client.get("/api/merchant/merchant_default/live?date=2026-10-12")
    assert r_live.status_code == 200
    assert "sales_today" in r_live.json()

    # Page 3 Direct Learn
    r_learn = client.get("/api/merchant/merchant_default/learn?date=2026-10-12")
    assert r_learn.status_code == 200
    assert "suggested_spend_tomorrow_min" in r_learn.json()


def test_api_agent_conversational_routes():
    """Verify conversational AI endpoints for the 3 lifecycle stages."""
    client = TestClient(app)

    # 1. Plan Agent
    r1 = client.post("/api/agent/plan/chat", json={
        "user_id": "merchant_default",
        "message": "วันนี้สภาพอากาศเป็นยังไง",
        "session_id": "test_s1"
    })
    assert r1.status_code == 200
    assert len(r1.json()["reply"]) > 0

    # 2. Live Agent
    r2 = client.post("/api/agent/live/chat", json={
        "user_id": "merchant_default",
        "message": "ขายได้ 60 บาท",
        "session_id": "test_s2"
    })
    assert r2.status_code == 200
    assert len(r2.json()["reply"]) > 0

    # 3. Learn Agent
    r3 = client.post("/api/agent/learn/chat", json={
        "user_id": "merchant_default",
        "message": "สรุปวันนี้และแนะนำพรุ่งนี้หน่อย",
        "session_id": "test_s3"
    })
    assert r3.status_code == 200
    assert len(r3.json()["reply"]) > 0


def test_business_profile_setup():
    """Verify merchant business profiling (where, what, hours, budget)."""
    res = setup_business_profile(
        location="กรุงเทพอภิวัฒน์",
        products="หมูปิ้ง ข้าวเหนียว",
        open_time="06:30",
        close_time="14:30",
        available_spend=450.0,
        reserve_cash=250.0,
        avg_order_value=40.0,
        merchant_id="merchant_test_profile",
    )
    assert res["status"] == "success"
    assert res["profile"]["location"] == "กรุงเทพอภิวัฒน์"
    assert res["profile"]["available_spend"] == 450.0
    assert res["profile"]["hours"] == "06:30 – 14:30"


if __name__ == "__main__":
    print("Running test_weather_tool...")
    test_weather_tool()
    print("Running test_train_tool...")
    test_train_tool()
    print("Running test_business_profile_setup...")
    test_business_profile_setup()
    print("Running test_simulation_engine...")
    test_simulation_engine()
    print("Running test_merchant_store_lifecycle...")
    test_merchant_store_lifecycle()
    print("Running test_api_direct_routes...")
    test_api_direct_routes()
    print("Running test_api_agent_conversational_routes...")
    test_api_agent_conversational_routes()
    print("\n================ ALL 6 TEST SUITES PASSED ================")

