import random
from typing import Any, Dict, List, Optional
from .store import store
from .train import get_train_schedule
from .weather import get_weather


def run_monte_carlo_distribution(
    target_customers: int,
    avg_ticket: float,
    rain_risk_factor: float = 0.0,
    n_simulations: int = 1000,
) -> tuple[float, float]:
    """Runs Monte Carlo simulation of variable customer basket sizes and foot-traffic volatility.

    Returns:
        (10th percentile sales, 90th percentile sales) rounded to nearest ฿10.
    """
    simulated_sales: List[float] = []
    effective_rain_penalty = min(0.35, rain_risk_factor * 0.5)

    for _ in range(n_simulations):
        # Actual customer traffic follows normal distribution penalized by rain probability
        base_arrivals = random.gauss(target_customers, target_customers * 0.12)
        actual_arrivals = max(5, int(base_arrivals * (1.0 - effective_rain_penalty)))

        # Individual customer basket sizes follow a gamma distribution around average ticket size
        # Most buy ~avg_ticket, some buy smaller snacks, some buy larger orders
        baskets = [
            random.gammavariate(alpha=4.0, beta=avg_ticket / 4.0)
            for _ in range(actual_arrivals)
        ]
        simulated_sales.append(sum(baskets))

    simulated_sales.sort()
    idx_p10 = int(n_simulations * 0.10)
    idx_p90 = int(n_simulations * 0.90)

    p10 = round(simulated_sales[idx_p10] / 10.0) * 10.0
    p90 = round(simulated_sales[idx_p90] / 10.0) * 10.0
    return float(p10), float(p90)


def generate_hourly_curve(
    target_sales: float,
    open_hour: int = 7,
    close_hour: int = 15,
    train_peak_hours: Optional[List[str]] = None,
    rain_start_hour: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Builds the hourly forecast milestone curve matching operating hours, train surges, and rain."""
    hours = list(range(open_hour, close_hour + 1))
    weights: Dict[int, float] = {}
    annotations: Dict[int, str] = {}

    train_peaks = set()
    if train_peak_hours:
        for p in train_peak_hours:
            try:
                train_peaks.add(int(p.split(":")[0]))
            except Exception:
                pass

    for h in hours:
        # Base meal rush weights: morning breakfast (07-09), lunch (11-13)
        weight = 1.0
        if h in (7, 8, 9):
            weight = 2.2
        elif h in (11, 12, 13):
            weight = 2.5
        elif h == 10:
            weight = 1.4
        else:
            weight = 1.0

        # Train rush multiplier
        if h in train_peaks or h == 12:
            weight *= 1.3
            annotations[h] = "🚆 Peak"

        # Rain penalty
        if rain_start_hour and h >= rain_start_hour:
            weight *= 0.65
            annotations[h] = "🌧️ Rain"

        weights[h] = weight

    total_weight = sum(weights.values())
    curve: List[Dict[str, Any]] = []
    cumulative_sales = 0.0

    for h in hours:
        hour_str = f"{h:02d}:00"
        fraction = weights[h] / total_weight
        hour_target = round((target_sales * fraction) / 10.0) * 10.0
        cumulative_sales += hour_target

        curve.append({
            "hour": hour_str,
            "hourly_target": hour_target,
            "cumulative_forecast": cumulative_sales,
            "annotation": annotations.get(h, ""),
        })

    return curve


def generate_daily_plans(
    merchant_id: str = "merchant_default",
    date: str = "2026-10-12",
) -> Dict[str, Any]:
    """Generates the 3 daily plan cards (Protect Cash, Balanced, Ready for Demand)

    using weather, train schedule, and Monte Carlo simulation.
    """
    profile = store.get_profile(merchant_id)
    available_spend = profile.get("available_spend", 500.0)
    location = profile.get("location", "กรุงเทพอภิวัฒน์")
    open_time = profile.get("open_time", "07:00")
    close_time = profile.get("close_time", "15:00")
    avg_ticket = profile.get("avg_order_value", 35.0)

    # 1. Fetch weather & rain conditions
    weather_info = get_weather(location, date=date)
    rain_probability = 0
    rain_start_hour = None
    if "hourly" in weather_info:
        for item in weather_info["hourly"]:
            prob = item.get("rain_probability", 0)
            if prob >= 30 and rain_start_hour is None:
                t_str = item.get("time", "")
                if "T" in t_str:
                    hour_int = int(t_str.split("T")[1].split(":")[0])
                    rain_start_hour = hour_int
                    rain_probability = prob

    # 2. Fetch train schedule
    train_info = get_train_schedule(location, start_time=open_time, end_time=close_time)
    peak_hours_list = [p["hour"] for p in train_info.get("peak_rush_hours", [])]

    # Synthesize shift condition text
    conditions_summary = []
    if rain_start_hour:
        conditions_summary.append(f"🌧️ Rain likely after {rain_start_hour:02d}:00 ({rain_probability}%)")
    else:
        conditions_summary.append("☀️ Clear weather expected")

    if peak_hours_list:
        conditions_summary.append(f"🚆 Morning Train Peak ({peak_hours_list[0]})")
    shift_conditions_text = " · ".join(conditions_summary)

    # 3. Dynamic plan tier calculations based on merchant budget and unit economics
    unit_cost_ratio = profile.get("unit_cost_ratio", 0.40)
    cost_per_customer = max(5.0, avg_ticket * unit_cost_ratio)
    rain_risk = rain_probability / 100.0

    # Protect Cash: ~36% of available spend (guards working capital)
    spend_pc = round(max(100.0, available_spend * 0.36) / 10.0) * 10.0
    cust_pc = max(10, int(spend_pc / cost_per_customer))
    pc_p10, pc_p90 = run_monte_carlo_distribution(cust_pc, avg_ticket=avg_ticket, rain_risk_factor=rain_risk)
    protect_cash_plan = {
        "id": "PROTECT_CASH",
        "title": "🛡️ PROTECT CASH",
        "risk_level": "🟢 Low Risk",
        "spend_budget": float(spend_pc),
        "serves_customers_min": int(cust_pc * 0.80),
        "serves_customers_max": int(cust_pc * 1.15),
        "expected_sales_min": pc_p10,
        "expected_sales_max": pc_p90,
        "description": "Prepare less and guard essential working capital against afternoon rain.",
    }

    # Balanced (Recommended): ~44% of available spend (balances profit & leftover waste)
    spend_bal = round(max(150.0, available_spend * 0.44) / 10.0) * 10.0
    cust_bal = max(15, int(spend_bal / cost_per_customer))
    bal_p10, bal_p90 = run_monte_carlo_distribution(cust_bal, avg_ticket=avg_ticket, rain_risk_factor=rain_risk)
    balanced_plan = {
        "id": "BALANCED",
        "title": "⭐ BALANCED (Recommended)",
        "risk_level": "🟡 Medium Risk",
        "spend_budget": float(spend_bal),
        "serves_customers_min": int(cust_bal * 0.85),
        "serves_customers_max": int(cust_bal * 1.15),
        "expected_sales_min": bal_p10,
        "expected_sales_max": bal_p90,
        "description": "Optimal balance between sales potential and leftover waste risk.",
    }

    # Ready for Demand: ~64% of available spend (captures rush hour footfall)
    spend_rfd = round(max(200.0, available_spend * 0.64) / 10.0) * 10.0
    cust_rfd = max(20, int(spend_rfd / cost_per_customer))
    rfd_p10, rfd_p90 = run_monte_carlo_distribution(cust_rfd, avg_ticket=avg_ticket, rain_risk_factor=rain_risk)
    ready_for_demand_plan = {
        "id": "READY_FOR_DEMAND",
        "title": "📈 READY FOR DEMAND",
        "risk_level": "🔴 High Risk",
        "spend_budget": float(spend_rfd),
        "serves_customers_min": int(cust_rfd * 0.85),
        "serves_customers_max": int(cust_rfd * 1.15),
        "expected_sales_min": rfd_p10,
        "expected_sales_max": rfd_p90,
        "description": "Prepare more to maximize sales during morning train rush hours.",
    }

    # 4. Generate forecast hourly milestone curve for the recommended Balanced plan
    open_h = int(open_time.split(":")[0])
    close_h = int(close_time.split(":")[0])
    target_sales_balanced = (balanced_plan["expected_sales_min"] + balanced_plan["expected_sales_max"]) / 2.0
    hourly_curve = generate_hourly_curve(
        target_sales=target_sales_balanced,
        open_hour=open_h,
        close_hour=close_h,
        train_peak_hours=peak_hours_list,
        rain_start_hour=rain_start_hour,
    )

    # Pre-commit Balanced as default active plan if none chosen yet
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
        "operating_hours": f"{open_time}–{close_time}",
        "available_spend": available_spend,
        "shift_conditions": shift_conditions_text,
        "recommended_plan_id": "BALANCED",
        "plans": [protect_cash_plan, balanced_plan, ready_for_demand_plan],
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
    """Commits the chosen plan (PROTECT_CASH | BALANCED | READY_FOR_DEMAND | CUSTOM) for today.

    Args:
        merchant_id: Merchant identifier.
        date: Operating date in 'YYYY-MM-DD'.
        plan_id: Plan to commit ('PROTECT_CASH', 'BALANCED', 'READY_FOR_DEMAND', or 'CUSTOM').
        custom_spend: Optional spend budget if committing a CUSTOM plan.
        custom_target_customers: Optional target customers if committing a CUSTOM plan.
    """
    daily_plans = generate_daily_plans(merchant_id, date)
    plan_key = f"{merchant_id}:{date}"
    chosen = None

    # Handle CUSTOM plan selection
    if plan_id.upper() == "CUSTOM" or custom_spend is not None:
        cached = _last_custom_simulation.get(plan_key, {})
        spend = float(custom_spend) if custom_spend is not None else float(cached.get("spend_budget", 260.0))
        cust = int(custom_target_customers) if custom_target_customers is not None else int(cached.get("target_customers", 35))

        p10 = cached.get("expected_sales_min")
        p90 = cached.get("expected_sales_max")
        if p10 is None or p90 is None:
            profile = store.get_profile(merchant_id)
            avg_ticket = profile.get("avg_order_value", 35.0)
            p10, p90 = run_monte_carlo_distribution(cust, avg_ticket=avg_ticket)

        risk = cached.get("risk_level")
        if not risk:
            profile = store.get_profile(merchant_id)
            avail = profile.get("available_spend", 500.0)
            risk = "🟢 Low Risk" if spend <= avail * 0.4 else ("🟡 Medium Risk" if spend <= avail * 0.7 else "🔴 High Risk")

        chosen = {
            "id": "CUSTOM",
            "title": f"🛠️ CUSTOM (งบ ฿{spend:.0f})",
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
        chosen = daily_plans["plans"][1]  # Default to Balanced

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
    custom_spend: float = 260.0,
    custom_target_customers: int = 35,
) -> Dict[str, Any]:
    """Simulates custom prep assumptions provided by the merchant."""
    profile = store.get_profile(merchant_id)
    avg_ticket = profile.get("avg_order_value", 35.0)
    avail = profile.get("available_spend", 500.0)

    p10, p90 = run_monte_carlo_distribution(custom_target_customers, avg_ticket=avg_ticket)
    risk_level = "🟢 Low Risk" if custom_spend <= avail * 0.4 else ("🟡 Medium Risk" if custom_spend <= avail * 0.7 else "🔴 High Risk")

    result = {
        "plan_name": "CUSTOM",
        "spend_budget": custom_spend,
        "target_customers": custom_target_customers,
        "expected_sales_min": p10,
        "expected_sales_max": p90,
        "risk_level": risk_level,
        "note": f"Spending ฿{custom_spend:.0f} to serve ~{custom_target_customers} customers.",
    }
    # Cache for commit_merchant_plan
    _last_custom_simulation[f"{merchant_id}:{date}"] = result
    return result
