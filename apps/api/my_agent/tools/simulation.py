"""Simulation and Planning Orchestrator for BottomUp.

Integrates hyperlocal demand sensing, Monte Carlo simulation, and downside risk
evaluation to produce 3 daily plan scenarios (Safe, Smart, Max) and custom DIY simulations.
"""

from typing import Any, Dict, List, Optional
from .store import store
from .quantitative import (
    sense_hyperlocal_demand,
    run_monte_carlo_simulation,
    simulate_downside_risk,
    generate_quantitative_forecast,
)


def run_monte_carlo_distribution(
    target_customers: int,
    avg_ticket: float,
    rain_risk_factor: float = 0.0,
    n_simulations: int = 1000,
) -> tuple[float, float]:
    """Compatibility wrapper around run_monte_carlo_simulation returning (P10, P90)."""
    res = run_monte_carlo_simulation(
        target_customers=target_customers,
        avg_order_value=avg_ticket,
        rain_risk_factor=rain_risk_factor,
        n_simulations=n_simulations,
    )
    return res["p10_conservative_floor"], res["p90_rush_upside"]


def generate_hourly_curve(
    target_sales: float,
    open_hour: int = 6,
    close_hour: int = 10,
    train_peak_hours: Optional[List[str]] = None,
    rain_start_hour: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Builds the hourly forecast milestone curve matching operating hours, train surges, and rain."""
    peak_ints = []
    if train_peak_hours:
        for p in train_peak_hours:
            try:
                peak_ints.append(int(p.split(":")[0]))
            except Exception:
                pass
    if not peak_ints:
        peak_ints = [7, 8]

    return generate_quantitative_forecast(
        target_sales=target_sales,
        open_hour=open_hour,
        close_hour=close_hour,
        peak_hours=peak_ints,
        rain_start_hour=rain_start_hour,
    )


def generate_daily_plans(
    merchant_id: str = "merchant_default",
    date: str = "2026-10-12",
) -> Dict[str, Any]:
    """Generates the 3 daily plan cards (Safe, Smart, Max) backed by quantitative demand sensing,

    Monte Carlo simulation, and downside capital risk evaluation.
    """
    profile = store.get_profile(merchant_id)
    available_spend = profile.get("available_spend", 5000.0)
    location = profile.get("location", "Krung Thep Aphiwat Central Station")
    open_time = profile.get("open_time", "06:00")
    close_time = profile.get("close_time", "10:00")
    avg_ticket = profile.get("avg_order_value", 50.0)
    unit_cost_ratio = profile.get("unit_cost_ratio", 0.60)
    cost_per_pax = max(10.0, avg_ticket * unit_cost_ratio)

    # 1. Sense hyperlocal demand (trains + precipitation + stall ceiling)
    sensing = sense_hyperlocal_demand(
        location=location,
        date=date,
        open_time=open_time,
        close_time=close_time,
        stall_capacity_pax=140,
    )
    rain_factor = sensing["rain_probability_max"] / 100.0
    rain_start_h = int(sensing["rain_start_hour"].split(":")[0]) if sensing["rain_start_hour"] != "None" else None

    # 2. Derive Plan Tiers anchored to budget and unit economics
    # Safe: ~52% of budget (฿2,600 for ฿5,000 budget), ~20kg pork, minimal leftover risk
    spend_safe = round((available_spend * 0.52) / 100.0) * 100.0
    cust_safe = max(15, int(spend_safe / cost_per_pax))
    mc_safe = run_monte_carlo_simulation(cust_safe, avg_order_value=avg_ticket, rain_risk_factor=rain_factor)
    risk_safe = simulate_downside_risk(spend_safe, starting_cash=profile["starting_cash"], reserve_cash=profile["reserve_cash"], rain_probability=sensing["rain_probability_max"])
    protect_cash_plan = {
        "id": "PROTECT_CASH",
        "title": "🛡️ Safe",
        "risk_level": "🟢 Low Risk",
        "spend_budget": float(spend_safe),
        "serves_customers_min": int(cust_safe * 0.85),
        "serves_customers_max": int(cust_safe * 1.15),
        "expected_sales_min": mc_safe["p10_conservative_floor"],
        "expected_sales_max": mc_safe["p90_rush_upside"],
        "waste_risk_baht": risk_safe["estimated_waste_risk_baht"],
        "protected_cash": max(0.0, available_spend - spend_safe),
        "description": "Preps ~20kg pork. Lean grill inventory guards cash against early slowdown.",
    }

    # Smart (Recommended): ~68% of budget (฿3,400 for ฿5,000 budget), ~27kg pork, optimal commuter balance
    spend_smart = round((available_spend * 0.68) / 100.0) * 100.0
    cust_smart = max(20, int(spend_smart / cost_per_pax))
    mc_smart = run_monte_carlo_simulation(cust_smart, avg_order_value=avg_ticket, rain_risk_factor=rain_factor)
    risk_smart = simulate_downside_risk(spend_smart, starting_cash=profile["starting_cash"], reserve_cash=profile["reserve_cash"], rain_probability=sensing["rain_probability_max"])
    balanced_plan = {
        "id": "BALANCED",
        "title": "⭐ Smart (Recommended)",
        "risk_level": "🟡 Medium Risk",
        "spend_budget": float(spend_smart),
        "serves_customers_min": int(cust_smart * 0.85),
        "serves_customers_max": int(cust_smart * 1.15),
        "expected_sales_min": mc_smart["p10_conservative_floor"],
        "expected_sales_max": mc_smart["p90_rush_upside"],
        "waste_risk_baht": risk_smart["estimated_waste_risk_baht"],
        "protected_cash": max(0.0, available_spend - spend_smart),
        "description": "Preps ~27kg pork. Optimal balance capturing 07:00–08:30 commuter trains.",
    }

    # Max: 100% of budget (฿5,000), 40kg full grill, high upside
    spend_max = float(available_spend)
    cust_max = max(30, int(spend_max / cost_per_pax))
    mc_max = run_monte_carlo_simulation(cust_max, avg_order_value=avg_ticket, rain_risk_factor=rain_factor)
    risk_max = simulate_downside_risk(spend_max, starting_cash=profile["starting_cash"], reserve_cash=profile["reserve_cash"], rain_probability=sensing["rain_probability_max"])
    ready_for_demand_plan = {
        "id": "READY_FOR_DEMAND",
        "title": "🚀 Max",
        "risk_level": "🔴 High Upside",
        "spend_budget": float(spend_max),
        "serves_customers_min": int(cust_max * 0.85),
        "serves_customers_max": int(cust_max * 1.15),
        "expected_sales_min": mc_max["p10_conservative_floor"],
        "expected_sales_max": mc_max["p90_rush_upside"],
        "waste_risk_baht": risk_max["estimated_waste_risk_baht"],
        "protected_cash": 0.0,
        "description": "Full 40kg batch. Maximizes peak morning rush turnout for highest revenue.",
    }

    # 3. Generate forecast hourly milestone curve matching Smart plan
    open_h = int(open_time.split(":")[0])
    close_h = int(close_time.split(":")[0])
    target_sales_balanced = (balanced_plan["expected_sales_min"] + balanced_plan["expected_sales_max"]) / 2.0
    hourly_curve = generate_hourly_curve(
        target_sales=target_sales_balanced,
        open_hour=open_h,
        close_hour=close_h,
        rain_start_hour=rain_start_h,
    )

    # Pre-commit Smart as default active plan if none chosen yet
    if not store.get_active_plan(merchant_id, date):
        store.save_plan(
            merchant_id=merchant_id,
            date=date,
            plan_name=balanced_plan["id"],
            spend=balanced_plan["spend_budget"],
            serves_min=balanced_plan["serves_customers_min"],
            serves_max=balanced_plan["serves_customers_max"],
            expected_sales_min=balanced_plan["expected_sales_min"],
            expected_sales_max=balanced_plan["expected_sales_max"],
            risk_level=balanced_plan["risk_level"],
            forecast_hourly_curve=hourly_curve,
        )

    return {
        "merchant_id": merchant_id,
        "date": date,
        "operating_hours": f"{open_time} – {close_time}",
        "shift_hours": f"{open_time} – {close_time}",
        "available_spend": available_spend,
        "available_spend_budget": available_spend,
        "safety_reserve_protected": profile["reserve_cash"],
        "shift_conditions": sensing["shift_conditions_summary"],
        "recommended_plan_id": "BALANCED",
        "plans": [protect_cash_plan, balanced_plan, ready_for_demand_plan],
        "selected_plan": store.get_active_plan(merchant_id, date).get("chosen_plan", "BALANCED") if store.get_active_plan(merchant_id, date) else "BALANCED",
        "forecast_hourly_curve": hourly_curve,
    }


# Cache of latest custom simulations per merchant
_last_custom_simulation: Dict[str, Dict[str, Any]] = {}


def commit_merchant_plan(
    merchant_id: str = "merchant_default",
    date: str = "2026-10-12",
    plan_id: str = "BALANCED",
    custom_spend: Optional[float] = None,
    custom_target_customers: Optional[int] = None,
) -> Dict[str, Any]:
    """Commits the chosen plan (PROTECT_CASH | BALANCED | READY_FOR_DEMAND | CUSTOM) for today."""
    daily_plans = generate_daily_plans(merchant_id, date)
    plan_key = f"{merchant_id}:{date}"
    chosen = None

    if plan_id.upper() == "CUSTOM" or custom_spend is not None:
        cached = _last_custom_simulation.get(plan_key, {})
        spend = float(custom_spend) if custom_spend is not None else float(cached.get("spend_budget", 3400.0))
        cust = int(custom_target_customers) if custom_target_customers is not None else int(cached.get("target_customers", 75))

        p10 = cached.get("expected_sales_min")
        p90 = cached.get("expected_sales_max")
        if p10 is None or p90 is None:
            profile = store.get_profile(merchant_id)
            avg_ticket = profile.get("avg_order_value", 50.0)
            mc = run_monte_carlo_simulation(cust, avg_order_value=avg_ticket)
            p10 = mc["p10_conservative_floor"]
            p90 = mc["p90_rush_upside"]

        profile = store.get_profile(merchant_id)
        avail = profile.get("available_spend", 5000.0)
        risk = "🟢 Low Risk" if spend <= avail * 0.55 else ("🟡 Medium Risk" if spend <= avail * 0.75 else "🔴 High Risk")

        chosen = {
            "id": "CUSTOM",
            "title": f"🛠️ CUSTOM (฿{spend:,.0f})",
            "risk_level": risk,
            "spend_budget": spend,
            "serves_customers_min": int(cust * 0.85),
            "serves_customers_max": int(cust * 1.15),
            "expected_sales_min": p10,
            "expected_sales_max": p90,
        }
    else:
        chosen = next((p for p in daily_plans["plans"] if p["id"].upper() == plan_id.upper()), None)

    if not chosen:
        chosen = daily_plans["plans"][1]  # Default to Smart

    open_h = int(daily_plans["operating_hours"].split("–")[0].split(":")[0])
    close_h = int(daily_plans["operating_hours"].split("–")[1].split(":")[0])
    target_sales = (chosen["expected_sales_min"] + chosen["expected_sales_max"]) / 2.0

    hourly_curve = generate_hourly_curve(target_sales=target_sales, open_hour=open_h, close_hour=close_h)

    saved = store.save_plan(
        merchant_id=merchant_id,
        date=date,
        plan_name=chosen["id"],
        spend=chosen["spend_budget"],
        serves_min=chosen["serves_customers_min"],
        serves_max=chosen["serves_customers_max"],
        expected_sales_min=chosen["expected_sales_min"],
        expected_sales_max=chosen["expected_sales_max"],
        risk_level=chosen["risk_level"],
        forecast_hourly_curve=hourly_curve,
    )

    return {
        "status": "success",
        "message": f"Successfully committed plan: {chosen['title']}",
        "active_plan": saved,
    }


def simulate_custom_plan(
    merchant_id: str = "merchant_default",
    date: str = "2026-10-12",
    custom_spend: float = 3000.0,
    custom_target_customers: Optional[int] = None,
) -> Dict[str, Any]:
    """Simulates custom prep assumptions provided by the merchant using Monte Carlo and risk models."""
    profile = store.get_profile(merchant_id)
    avg_ticket = profile.get("avg_order_value", 50.0)
    avail = profile.get("available_spend", 5000.0)
    cost_per_pax = max(10.0, avg_ticket * profile.get("unit_cost_ratio", 0.60))

    target_cust = custom_target_customers if custom_target_customers else max(15, int(custom_spend / cost_per_pax))
    mc = run_monte_carlo_simulation(target_cust, avg_order_value=avg_ticket)
    risk_info = simulate_downside_risk(custom_spend, starting_cash=profile["starting_cash"], reserve_cash=profile["reserve_cash"])

    result = {
        "plan_name": "CUSTOM",
        "spend_budget": custom_spend,
        "target_customers": target_cust,
        "expected_sales_min": mc["p10_conservative_floor"],
        "expected_sales_max": mc["p90_rush_upside"],
        "risk_level": risk_info["risk_rating"],
        "waste_risk_baht": risk_info["estimated_waste_risk_baht"],
        "reserve_protected": risk_info["reserve_protected"],
        "note": f"Spending ฿{custom_spend:,.0f} preps ~{int(custom_spend/125)}kg pork to serve ~{target_cust} customers.",
    }
    _last_custom_simulation[f"{merchant_id}:{date}"] = result
    return result
