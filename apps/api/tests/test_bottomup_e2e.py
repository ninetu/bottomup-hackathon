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
from my_agent.tools.quantitative import (
    sense_hyperlocal_demand,
    run_monte_carlo_simulation,
    simulate_multidimensional_scenarios,
    simulate_downside_risk,
    generate_quantitative_forecast,
)
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
    schedule = get_train_schedule("กรุงเทพอภิวัฒน์", start_time="06:00", end_time="10:00")
    assert schedule["station"] == "กรุงเทพอภิวัฒน์"
    assert schedule["total_train_movements"] > 0
    assert len(schedule["peak_rush_hours"]) > 0


def test_quantitative_tools_suite():
    """Verify all 5 quantitative decision intelligence tools."""
    # 1. Demand Sensing
    sensing = sense_hyperlocal_demand("กรุงเทพอภิวัฒน์", date="2026-10-12")
    assert sensing["total_train_movements"] > 0
    assert len(sensing["hourly_demand_density"]) >= 4
    assert sensing["stall_capacity_pax_ceiling"] == 140

    # 2. Monte Carlo Simulation
    mc = run_monte_carlo_simulation(target_customers=75, avg_order_value=50.0, rain_risk_factor=0.20, n_simulations=500)
    assert mc["p10_conservative_floor"] > 0
    assert mc["p10_conservative_floor"] <= mc["p50_median_expected"] <= mc["p90_rush_upside"]
    assert mc["value_at_risk_90"] >= 0

    # 3. Multi-Dimensional Scenarios
    multi = simulate_multidimensional_scenarios(spend_budget=3400.0, unit_cost_ratio=0.60, avg_order_value=50.0)
    assert "scenarios" in multi
    assert "adverse_stress_test" in multi["scenarios"]
    assert "baseline_expected" in multi["scenarios"]
    assert "upside_full_conversion" in multi["scenarios"]
    assert multi["scenarios"]["baseline_expected"]["roi_multiplier"] > 1.0

    # 4. Downside Risk & Reserve Protection
    risk = simulate_downside_risk(spend_budget=3400.0, starting_cash=2000.0, reserve_cash=1000.0, rain_probability=20.0)
    assert risk["reserve_protected"] is True
    assert risk["estimated_waste_risk_baht"] > 0

    # 5. Quantitative Forecast Curve
    curve = generate_quantitative_forecast(target_sales=5600.0, open_hour=6, close_hour=10)
    assert len(curve) == 5
    assert curve[0]["hour"] == "06:00"
    assert curve[-1]["cumulative_forecast"] >= 5000.0


def test_simulation_engine():
    """Verify Monte Carlo simulation and 3 plan cards generation for Ann Moo Ping."""
    plans = generate_daily_plans("merchant_default", "2026-10-12")
    assert len(plans["plans"]) == 3
    plan_ids = [p["id"] for p in plans["plans"]]
    assert "PROTECT_CASH" in plan_ids
    assert "BALANCED" in plan_ids
    assert "READY_FOR_DEMAND" in plan_ids

    # Smart/Balanced plan values matching DEMO.md
    smart = next(p for p in plans["plans"] if p["id"] == "BALANCED")
    assert smart["spend_budget"] == 3400.0
    assert smart["serves_customers_min"] >= 50
    assert smart["expected_sales_max"] > smart["expected_sales_min"]

    # Safe plan
    safe = next(p for p in plans["plans"] if p["id"] == "PROTECT_CASH")
    assert safe["spend_budget"] == 2600.0

    # Max plan
    max_plan = next(p for p in plans["plans"] if p["id"] == "READY_FOR_DEMAND")
    assert max_plan["spend_budget"] == 5000.0

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
        spend=3400.0,
        serves_min=68,
        serves_max=88,
        expected_sales_min=5100.0,
        expected_sales_max=6200.0,
        risk_level="Medium",
    )

    # 2. Log sales
    store.record_sale(m_id, date, amount=50.0, customers=1, note="PromptPay 089-412-xxxx", customer_type="Regular")
    store.record_sale(m_id, date, amount=100.0, customers=2, note="PromptPay 081-872-xxxx", customer_type="VIP")

    live = store.get_live_activity(m_id, date)
    assert live["sales_today"] == 150.0
    assert live["customers_served"] == 3
    assert len(live["recent_activity"]) == 2
    assert live["recent_activity"][-1]["customer_type"] == "VIP"

    # 3. Evening learn summary
    learn = store.get_learn_summary(m_id, date)
    assert learn["money_flow"]["market_spend"] == 3400.0
    assert learn["suggested_spend_tomorrow_min"] > 0
    assert learn["suggested_spend_tomorrow_max"] >= learn["suggested_spend_tomorrow_min"]


def test_api_direct_routes():
    """Verify fast direct data routes for instant mobile UI rendering and Swagger inspection."""
    client = TestClient(app)

    # Health
    assert client.get("/health").status_code == 200

    # Page 1 Direct Plan
    r_plan = client.get("/api/merchant/merchant_default/plan?date=2026-10-12")
    assert r_plan.status_code == 200
    assert len(r_plan.json()["plans"]) == 3
    assert r_plan.json()["available_spend_budget"] == 5000.0

    # Page 2 Direct Live
    r_live = client.get("/api/merchant/merchant_default/live?date=2026-10-12")
    assert r_live.status_code == 200
    assert "sales_today" in r_live.json()
    assert r_live.json()["sales_today"] == 2850.0

    # Page 3 Direct Learn
    r_learn = client.get("/api/merchant/merchant_default/learn?date=2026-10-12")
    assert r_learn.status_code == 200
    assert r_learn.json()["money_flow"]["net_profit_today"] == 2200.0

    # Commit plan API
    r_commit = client.post("/api/merchant/merchant_default/plan/commit", json={
        "plan_id": "BALANCED",
        "date": "2026-10-12"
    })
    assert r_commit.status_code == 200
    assert r_commit.json()["status"] == "success"

    # Sale API
    r_sale = client.post("/api/merchant/merchant_default/sale", json={
        "amount": 50.0,
        "customers": 1,
        "note": "PromptPay Sale",
        "sender": "089-111-xxxx",
        "customer_type": "Regular",
        "date": "2026-10-12"
    })
    assert r_sale.status_code == 200

    # Quantitative Direct Inspection Endpoints for Judges
    r_ds = client.get("/api/quantitative/demand-sensing?location=Bangkok")
    assert r_ds.status_code == 200

    r_mc = client.get("/api/quantitative/monte-carlo?target_customers=75")
    assert r_mc.status_code == 200
    assert "p50_median_expected" in r_mc.json()

    r_risk = client.get("/api/quantitative/risk?spend_budget=3400")
    assert r_risk.status_code == 200
    assert "reserve_protected" in r_risk.json()

    r_multi = client.get("/api/quantitative/multidimensional?spend_budget=3400")
    assert r_multi.status_code == 200
    assert "scenarios" in r_multi.json()


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

    # 2. Live Agent (Testing the exact DEMO.md Scene 5 Question)
    r2 = client.post("/api/agent/live/chat", json={
        "user_id": "merchant_default",
        "message": "วันนี้ฝนจะตกกี่โมง ถ้าลดงบเหลือ ฿3,000 จะเสี่ยงไหม?",
        "session_id": "test_s2"
    })
    assert r2.status_code == 200
    assert len(r2.json()["reply"]) > 0

    # 3. Learn Agent
    r3 = client.post("/api/agent/learn/chat", json={
        "user_id": "merchant_default",
        "message": "สรุปยอดวันนี้และแนะนำงบซื้อของพรุ่งนี้หน่อย",
        "session_id": "test_s3"
    })
    assert r3.status_code == 200
    assert len(r3.json()["reply"]) > 0


def test_business_profile_setup():
    """Verify merchant business profiling (where, what, hours, budget)."""
    res = setup_business_profile(
        location="กรุงเทพอภิวัฒน์",
        products="หมูปิ้ง ข้าวเหนียว",
        open_time="06:00",
        close_time="10:00",
        available_spend=5000.0,
        reserve_cash=1000.0,
        avg_order_value=50.0,
        merchant_id="merchant_test_profile",
    )
    assert res["status"] == "success"
    assert res["profile"]["location"] == "กรุงเทพอภิวัฒน์"
    assert res["profile"]["available_spend"] == 5000.0
    assert res["profile"]["hours"] == "06:00 – 10:00"


if __name__ == "__main__":
    print("Running test_weather_tool...")
    test_weather_tool()
    print("Running test_train_tool...")
    test_train_tool()
    print("Running test_quantitative_tools_suite...")
    test_quantitative_tools_suite()
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
    print("\n================ ALL 8 TEST SUITES PASSED ================")


