"""Quantitative Decision Intelligence Engine for BottomUp.

Provides 5 first-class quantitative tools for Google ADK agents:
1. sense_hyperlocal_demand: Fuses train timetables, rain forecast, and physical stall capacity.
2. run_monte_carlo_simulation: Stochastic customer arrival and basket-size simulation (P10, P50, P90, VaR).
3. simulate_multidimensional_scenarios: Multi-factor stress-testing across weather, train flow, prep, and margins.
4. simulate_downside_risk: Evaluates capital-at-risk, food waste cost in Baht, and emergency cash reserve protection.
5. generate_quantitative_forecast: Time-series intraday pacing milestones and cumulative trajectory curves.
"""

import math
import random
from typing import Any, Dict, List, Optional
from .train import get_train_schedule
from .weather import get_weather


def sense_hyperlocal_demand(
    location: str = "กรุงเทพอภิวัฒน์",
    date: str = "2026-10-12",
    open_time: str = "06:00",
    close_time: str = "10:00",
    stall_capacity_pax: int = 140,
) -> Dict[str, Any]:
    """Senses hyperlocal demand by combining station train timetables, weather precipitation probabilities, and physical stall capacity.

    Args:
        location: City or station name (e.g. 'กรุงเทพอภิวัฒน์', 'Bangkok').
        date: Operating date in 'YYYY-MM-DD'.
        open_time: Shift start time in 'HH:MM'.
        close_time: Shift end time in 'HH:MM'.
        stall_capacity_pax: Physical maximum customers the vendor can serve (e.g. 140 pax from 40kg grill limit).

    Returns:
        Structured demand sensing analysis with train peaks, rain windows, hourly demand density, and physical ceilings.
    """
    # 1. Fetch train timetable movements
    train_data = get_train_schedule(location, start_time=open_time, end_time=close_time)
    peak_rush = train_data.get("peak_rush_hours", [])
    total_trains = train_data.get("total_train_movements", 0)

    # 2. Fetch hourly weather and rain probabilities
    weather_data = get_weather(location, date=date)
    rain_probability_max = 0
    rain_start_hour: Optional[int] = None
    hourly_weather = weather_data.get("hourly", [])
    for h_info in hourly_weather:
        prob = h_info.get("rain_probability", 0)
        t_str = h_info.get("time", "")
        if "T" in t_str:
            hour_val = int(t_str.split("T")[1].split(":")[0])
            open_h = int(open_time.split(":")[0])
            close_h = int(close_time.split(":")[0])
            if open_h <= hour_val <= close_h:
                if prob > rain_probability_max:
                    rain_probability_max = prob
                if prob >= 20 and rain_start_hour is None:
                    rain_start_hour = hour_val

    # 3. Compute hourly demand density weights
    open_h = int(open_time.split(":")[0])
    close_h = int(close_time.split(":")[0])
    hourly_density: List[Dict[str, Any]] = []

    for h in range(open_h, close_h + 1):
        hour_str = f"{h:02d}:00"
        # Baseline foot traffic pattern for morning commuter station
        base_index = 1.0
        annotation = ""
        if h == 6:
            base_index = 1.3
            annotation = "Early Train Arrivals"
        elif h in (7, 8):
            base_index = 2.8
            annotation = "🚆 Morning Commuter Peak"
        elif h == 9:
            base_index = 1.2
            annotation = "Wind Down / Last Batch"
        elif h >= 10:
            base_index = 0.5
            annotation = "Shift Closing"

        # Apply rain discount if rain begins
        if rain_start_hour and h >= rain_start_hour:
            rain_discount = 1.0 - (rain_probability_max / 100.0 * 0.45)
            base_index *= rain_discount
            annotation += f" (🌧️ {rain_probability_max}% Drizzle)"

        hourly_density.append({
            "hour": hour_str,
            "demand_index": round(base_index, 2),
            "annotation": annotation.strip(),
        })

    # 4. Synthesize demand ceiling and expected commuter footfall
    peak_window = "07:00–08:30"
    weather_summary = f"🌧️ Light drizzle possible after {rain_start_hour:02d}:30 ({rain_probability_max}%)" if rain_start_hour else "☀️ Clear morning"

    return {
        "location": location,
        "date": date,
        "operating_window": f"{open_time}–{close_time}",
        "total_train_movements": total_trains,
        "peak_commuter_window": peak_window,
        "shift_conditions_summary": f"🚆 Morning train peak: {peak_window} · {weather_summary}",
        "rain_probability_max": rain_probability_max,
        "rain_start_hour": f"{rain_start_hour:02d}:30" if rain_start_hour else "None",
        "hourly_demand_density": hourly_density,
        "stall_capacity_pax_ceiling": stall_capacity_pax,
        "demand_ceiling_sales_estimate": stall_capacity_pax * 50 + 2000,  # ~฿9,000 ceiling
    }


def run_monte_carlo_simulation(
    target_customers: int,
    avg_order_value: float = 50.0,
    rain_risk_factor: float = 0.0,
    n_simulations: int = 1000,
) -> Dict[str, Any]:
    """Runs a stochastic Monte Carlo simulation modeling customer arrivals and Gamma-distributed order basket values.

    Args:
        target_customers: Anticipated customer count based on prep batch size.
        avg_order_value: Average customer ticket size in Thai Baht (default ฿50 for Moo Ping + sticky rice).
        rain_risk_factor: Rain probability expressed between 0.0 and 1.0.
        n_simulations: Number of Monte Carlo simulation runs (default 1000).

    Returns:
        Empirical percentiles (P10, P50, P90), expected sales, Value at Risk (VaR), and standard error.
    """
    simulated_sales: List[float] = []
    effective_rain_penalty = min(0.35, rain_risk_factor * 0.5)

    for _ in range(n_simulations):
        # Actual customer arrivals follow a Gaussian distribution penalized by precipitation risk
        base_arrivals = random.gauss(target_customers, target_customers * 0.12)
        actual_arrivals = max(5, int(base_arrivals * (1.0 - effective_rain_penalty)))

        # Customer ticket basket sizes follow a Gamma distribution around avg_order_value
        # Shape alpha=4.0 gives a realistic right-skewed food purchase distribution
        baskets = [
            random.gammavariate(alpha=4.0, beta=avg_order_value / 4.0)
            for _ in range(actual_arrivals)
        ]
        simulated_sales.append(sum(baskets))

    simulated_sales.sort()
    n = len(simulated_sales)
    idx_p10 = int(n * 0.10)
    idx_p50 = int(n * 0.50)
    idx_p90 = int(n * 0.90)

    p10 = round(simulated_sales[idx_p10] / 10.0) * 10.0
    p50 = round(simulated_sales[idx_p50] / 10.0) * 10.0
    p90 = round(simulated_sales[idx_p90] / 10.0) * 10.0

    mean_val = sum(simulated_sales) / n
    variance = sum((x - mean_val) ** 2 for x in simulated_sales) / (n - 1)
    std_dev = math.sqrt(variance)

    # Value at Risk at 90% confidence level (difference from expected median to P10 floor)
    var_90 = max(0.0, p50 - p10)

    return {
        "n_simulations": n_simulations,
        "target_customers": target_customers,
        "avg_order_value": avg_order_value,
        "p10_conservative_floor": float(p10),
        "p50_median_expected": float(p50),
        "p90_rush_upside": float(p90),
        "mean_expected_sales": round(mean_val, 1),
        "std_deviation": round(std_dev, 1),
        "value_at_risk_90": round(var_90, 1),
        "confidence_interval_80": f"฿{p10:,.0f} – ฿{p90:,.0f}",
    }


def simulate_multidimensional_scenarios(
    spend_budget: float,
    unit_cost_ratio: float = 0.60,
    avg_order_value: float = 50.0,
    weather_shock: bool = False,
    train_delay_factor: float = 0.0,
) -> Dict[str, Any]:
    """Evaluates multi-dimensional scenario perturbations across weather shocks, train flow, grill capacity, and cost margins.

    Args:
        spend_budget: Ingredient purchasing spend budget in Thai Baht (e.g. ฿3,400).
        unit_cost_ratio: Cost of raw ingredients as percentage of sales (e.g. 0.60).
        avg_order_value: Average customer basket in Thai Baht (e.g. ฿50).
        weather_shock: Whether sudden early rain occurs during peak service.
        train_delay_factor: Station train delay penalty (0.0 = on time, 0.3 = 30% train passenger drop).

    Returns:
        Comprehensive multi-scenario matrix with Adverse, Baseline, and Upside projections.
    """
    cost_per_pax = avg_order_value * unit_cost_ratio
    max_prepared_pax = max(10, int(spend_budget / cost_per_pax))

    # Scenario 1: Adverse (Rain shock at 08:30 + commuter delay)
    adverse_traffic_mult = 0.65 * (1.0 - train_delay_factor * 0.5) if weather_shock else 0.75
    adverse_pax = max(10, int(max_prepared_pax * adverse_traffic_mult))
    adverse_sales = adverse_pax * avg_order_value
    unsold_pax_adverse = max(0, max_prepared_pax - adverse_pax)
    spoilage_waste_adverse = round(unsold_pax_adverse * cost_per_pax)
    adverse_net_profit = adverse_sales - spend_budget

    # Scenario 2: Baseline (Normal commuter peak, minor rain after 09:30 wind-down)
    baseline_traffic_mult = 0.90 * (1.0 - train_delay_factor * 0.2)
    baseline_pax = max(15, min(max_prepared_pax, int(max_prepared_pax * baseline_traffic_mult)))
    baseline_sales = baseline_pax * avg_order_value * 1.05
    unsold_pax_baseline = max(0, max_prepared_pax - baseline_pax)
    spoilage_waste_baseline = round(unsold_pax_baseline * cost_per_pax * 0.5)  # partially repurposable
    baseline_net_profit = baseline_sales - spend_budget

    # Scenario 3: High Turnout (Full train passenger conversion, zero waste)
    upside_pax = max_prepared_pax
    upside_sales = upside_pax * avg_order_value * 1.15
    upside_net_profit = upside_sales - spend_budget

    return {
        "spend_budget": spend_budget,
        "max_prepared_capacity_pax": max_prepared_pax,
        "scenarios": {
            "adverse_stress_test": {
                "name": "🌧️ Adverse (Rain & Delay Shock)",
                "customers_served": adverse_pax,
                "gross_sales": round(adverse_sales),
                "net_profit": round(adverse_net_profit),
                "unsold_inventory_waste": spoilage_waste_adverse,
                "roi_multiplier": round(adverse_sales / max(spend_budget, 1), 2),
            },
            "baseline_expected": {
                "name": "⭐ Baseline (Normal Commuter Wave)",
                "customers_served": baseline_pax,
                "gross_sales": round(baseline_sales),
                "net_profit": round(baseline_net_profit),
                "unsold_inventory_waste": spoilage_waste_baseline,
                "roi_multiplier": round(baseline_sales / max(spend_budget, 1), 2),
            },
            "upside_full_conversion": {
                "name": "🚀 Upside (Full Peak Conversion)",
                "customers_served": upside_pax,
                "gross_sales": round(upside_sales),
                "net_profit": round(upside_net_profit),
                "unsold_inventory_waste": 0,
                "roi_multiplier": round(upside_sales / max(spend_budget, 1), 2),
            },
        },
    }


def simulate_downside_risk(
    spend_budget: float,
    starting_cash: float = 2000.0,
    reserve_cash: float = 1000.0,
    unit_cost_ratio: float = 0.60,
    rain_probability: float = 20.0,
) -> Dict[str, Any]:
    """Calculates capital-at-risk, food spoilage waste cost in Thai Baht, and emergency cash reserve protection.

    Args:
        spend_budget: Planned morning market spend in Thai Baht (e.g. ฿3,400).
        starting_cash: Total cash in pocket at 04:30 AM (e.g. ฿2,000).
        reserve_cash: Untouchable emergency safety buffer (e.g. ฿1,000).
        unit_cost_ratio: Raw ingredient cost fraction (e.g. 0.60).
        rain_probability: Rain probability percentage (e.g. 20.0).

    Returns:
        Detailed risk assessment with waste cost in Baht, worst-case closing cash, and safety reserve health.
    """
    # Estimated waste risk in Baht based on precipitation and budget size
    rain_factor = rain_probability / 100.0
    waste_rate = 0.05 + (rain_factor * 0.25)
    waste_risk_baht = round(spend_budget * waste_rate)

    # Worst case scenario: early rain halts sales at 55% of expected conversion
    expected_sales_mid = spend_budget * 1.65
    worst_case_sales = spend_budget * 1.10  # barely covers spend
    worst_case_closing_cash = (starting_cash - spend_budget) + worst_case_sales

    # Reserve buffer health check
    reserve_cushion = worst_case_closing_cash - reserve_cash
    reserve_protected = reserve_cushion >= 0

    risk_rating = "🟢 Low Risk"
    if waste_risk_baht > 500 or not reserve_protected:
        risk_rating = "🔴 High Risk"
    elif waste_risk_baht > 200:
        risk_rating = "🟡 Medium Risk"

    return {
        "spend_budget": spend_budget,
        "starting_cash": starting_cash,
        "reserve_cash_untouchable": reserve_cash,
        "estimated_waste_risk_baht": waste_risk_baht,
        "protected_cash_buffer": max(0.0, starting_cash - spend_budget),
        "worst_case_closing_cash": round(worst_case_closing_cash),
        "reserve_cushion_above_emergency": round(reserve_cushion),
        "reserve_protected": reserve_protected,
        "risk_rating": risk_rating,
        "risk_verdict": (
            f"฿{reserve_cash:,.0f} emergency reserve is 100% safe. "
            f"Estimated waste risk is limited to ~฿{waste_risk_baht:,.0f}."
            if reserve_protected
            else f"⚠️ Warning: ฿{spend_budget:,.0f} spend risks dipping into your ฿{reserve_cash:,.0f} emergency reserve by ฿{abs(reserve_cushion):,.0f}."
        ),
    }


def generate_quantitative_forecast(
    target_sales: float,
    open_hour: int = 6,
    close_hour: int = 10,
    peak_hours: Optional[List[int]] = None,
    rain_start_hour: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """Generates an intraday quantitative forecast curve with cumulative milestone targets and live pacing thresholds.

    Args:
        target_sales: Target total gross sales for the shift in Thai Baht (e.g. ฿5,600).
        open_hour: Shift start hour (default 6).
        close_hour: Shift end hour (default 10).
        peak_hours: List of peak commuter hours (default [7, 8]).
        rain_start_hour: Optional hour when precipitation is forecast.

    Returns:
        List of hourly milestone objects with hourly_target, cumulative_forecast, and annotations.
    """
    peaks = set(peak_hours or [7, 8])
    hours = list(range(open_hour, close_hour + 1))
    weights: Dict[int, float] = {}
    annotations: Dict[int, str] = {}

    for h in hours:
        if h == 6:
            weight = 1.2
            annotations[h] = "First Grill"
        elif h in peaks:
            weight = 3.2
            annotations[h] = "🚆 Commuter Peak"
        elif h == 9:
            weight = 1.4
            annotations[h] = "Wind Down"
        else:
            weight = 0.5
            annotations[h] = "Closing"

        if rain_start_hour and h >= rain_start_hour:
            weight *= 0.65
            annotations[h] += " 🌧️"

        weights[h] = weight

    total_weight = sum(weights.values())
    curve: List[Dict[str, Any]] = []
    cumulative = 0.0

    for h in hours:
        hour_str = f"{h:02d}:00"
        fraction = weights[h] / total_weight
        hour_target = round((target_sales * fraction) / 10.0) * 10.0
        cumulative += hour_target
        curve.append({
            "hour": hour_str,
            "hourly_target": hour_target,
            "cumulative_forecast": cumulative,
            "annotation": annotations.get(h, ""),
        })

    return curve
