import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


class InMemoryMerchantStore:
    """Thread-safe in-memory store for merchant profiles, daily plans, and live activity."""

    def __init__(self):
        self._lock = threading.RLock()
        self._profiles: Dict[str, Dict[str, Any]] = {}
        self._plans: Dict[str, Dict[str, Any]] = {}  # key: f"{merchant_id}:{date}"
        self._activity: Dict[str, Dict[str, Any]] = {}  # key: f"{merchant_id}:{date}"
        self._seed_default_merchant()

    def _seed_default_merchant(self):
        default_id = "merchant_default"
        self._profiles[default_id] = {
            "merchant_id": default_id,
            "name": "Somchai Street Food",
            "location": "กรุงเทพอภิวัฒน์",
            "city": "Bangkok",
            "open_time": "07:00",
            "close_time": "15:00",
            "starting_cash": 800.0,
            "reserve_cash": 300.0,
            "available_spend": 500.0,
            "avg_order_value": 35.0,
            "unit_cost_ratio": 0.40,
        }

    def get_profile(self, merchant_id: str = "merchant_default") -> Dict[str, Any]:
        with self._lock:
            if merchant_id not in self._profiles:
                self._profiles[merchant_id] = {
                    "merchant_id": merchant_id,
                    "name": "Local Vendor",
                    "location": "กรุงเทพอภิวัฒน์",
                    "city": "Bangkok",
                    "open_time": "07:00",
                    "close_time": "15:00",
                    "starting_cash": 800.0,
                    "reserve_cash": 300.0,
                    "available_spend": 500.0,
                    "avg_order_value": 35.0,
                    "unit_cost_ratio": 0.40,
                }
            return dict(self._profiles[merchant_id])

    def update_profile(
        self,
        merchant_id: str = "merchant_default",
        name: Optional[str] = None,
        location: Optional[str] = None,
        products: Optional[str] = None,
        open_time: Optional[str] = None,
        close_time: Optional[str] = None,
        available_spend: Optional[float] = None,
        reserve_cash: Optional[float] = None,
        avg_order_value: Optional[float] = None,
    ) -> Dict[str, Any]:
        with self._lock:
            # Ensure profile exists
            if merchant_id not in self._profiles:
                self.get_profile(merchant_id)

            p = self._profiles[merchant_id]
            if name:
                p["name"] = name
            if location:
                p["location"] = location
                p["city"] = "Bangkok" if "กรุงเทพ" in location or "bangkok" in location.lower() else location
            if products:
                p["products"] = products
            if open_time:
                p["open_time"] = open_time
            if close_time:
                p["close_time"] = close_time
            if available_spend is not None:
                p["available_spend"] = float(available_spend)
            if reserve_cash is not None:
                p["reserve_cash"] = float(reserve_cash)
            if avg_order_value is not None:
                p["avg_order_value"] = float(avg_order_value)

            return dict(p)

    def save_plan(
        self,
        merchant_id: str,
        date: str,
        plan_name: str,
        spend: float,
        serves_min: int,
        serves_max: int,
        expected_sales_min: float,
        expected_sales_max: float,
        risk_level: str,
        forecast_hourly_curve: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        key = f"{merchant_id}:{date}"
        with self._lock:
            plan_record = {
                "chosen_plan": plan_name,
                "spend": spend,
                "serves_min": serves_min,
                "serves_max": serves_max,
                "expected_sales_min": expected_sales_min,
                "expected_sales_max": expected_sales_max,
                "risk_level": risk_level,
                "forecast_hourly_curve": forecast_hourly_curve or [],
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            self._plans[key] = plan_record

            # Initialize activity if not exists
            if key not in self._activity:
                profile = self.get_profile(merchant_id)
                self._activity[key] = {
                    "starting_cash": profile["starting_cash"],
                    "market_spend": spend,
                    "sales_today": 0.0,
                    "customers_served": 0,
                    "transactions": [],
                }
            else:
                self._activity[key]["market_spend"] = spend

            return plan_record

    def get_active_plan(self, merchant_id: str, date: str) -> Optional[Dict[str, Any]]:
        key = f"{merchant_id}:{date}"
        with self._lock:
            plan = self._plans.get(key)
            return dict(plan) if plan else None

    def record_sale(
        self,
        merchant_id: str,
        date: str,
        amount: float,
        customers: int = 1,
        note: str = "",
    ) -> Dict[str, Any]:
        key = f"{merchant_id}:{date}"
        with self._lock:
            if key not in self._activity:
                profile = self.get_profile(merchant_id)
                self._activity[key] = {
                    "starting_cash": profile["starting_cash"],
                    "market_spend": 210.0,
                    "sales_today": 0.0,
                    "customers_served": 0,
                    "transactions": [],
                }

            act = self._activity[key]
            act["sales_today"] += amount
            act["customers_served"] += max(1, customers)

            tx_entry = {
                "id": f"tx_{len(act['transactions']) + 1}",
                "time": datetime.now(timezone.utc).strftime("%H:%M"),
                "type": "SALE",
                "amount": amount,
                "customers": customers,
                "note": note or f"Sale of ฿{amount:.0f}",
            }
            act["transactions"].append(tx_entry)

            return {
                "sales_today": act["sales_today"],
                "customers_served": act["customers_served"],
                "new_transaction": tx_entry,
            }

    def record_expense(
        self,
        merchant_id: str,
        date: str,
        amount: float,
        note: str = "",
    ) -> Dict[str, Any]:
        key = f"{merchant_id}:{date}"
        with self._lock:
            if key not in self._activity:
                profile = self.get_profile(merchant_id)
                self._activity[key] = {
                    "starting_cash": profile["starting_cash"],
                    "market_spend": 0.0,
                    "sales_today": 0.0,
                    "customers_served": 0,
                    "transactions": [],
                }
            act = self._activity[key]
            act["market_spend"] += amount
            tx_entry = {
                "id": f"tx_{len(act['transactions']) + 1}",
                "time": datetime.now(timezone.utc).strftime("%H:%M"),
                "type": "EXPENSE",
                "amount": amount,
                "note": note or f"Expense of ฿{amount:.0f}",
            }
            act["transactions"].append(tx_entry)
            return {"market_spend": act["market_spend"], "new_transaction": tx_entry}

    def get_live_activity(self, merchant_id: str, date: str) -> Dict[str, Any]:
        key = f"{merchant_id}:{date}"
        with self._lock:
            profile = self.get_profile(merchant_id)
            act = self._activity.get(
                key,
                {
                    "starting_cash": profile["starting_cash"],
                    "market_spend": 210.0,
                    "sales_today": 0.0,
                    "customers_served": 0,
                    "transactions": [],
                },
            )
            plan = self._plans.get(key, {})
            target_customers_range = f"~{plan.get('serves_min', 25)}–{plan.get('serves_max', 35)}"
            target_sales = (
                (plan.get("expected_sales_min", 380.0) + plan.get("expected_sales_max", 550.0)) / 2
                if plan
                else 500.0
            )

            return {
                "merchant_id": merchant_id,
                "date": date,
                "sales_today": act["sales_today"],
                "customers_served": act["customers_served"],
                "target_customers_range": target_customers_range,
                "target_sales": target_sales,
                "progress_percent": round((act["sales_today"] / max(target_sales, 1)) * 100, 1),
                "forecast_hourly_curve": plan.get("forecast_hourly_curve", []),
                "recent_activity": act["transactions"][-5:],
            }

    def get_learn_summary(self, merchant_id: str, date: str) -> Dict[str, Any]:
        key = f"{merchant_id}:{date}"
        with self._lock:
            profile = self.get_profile(merchant_id)
            act = self._activity.get(
                key,
                {
                    "starting_cash": profile["starting_cash"],
                    "market_spend": 210.0,
                    "sales_today": 480.0,
                    "customers_served": 22,
                    "transactions": [],
                },
            )

            starting_cash = act["starting_cash"]
            sales_today = act["sales_today"]
            market_spend = act["market_spend"]
            net_profit = sales_today - market_spend
            total_cash_now = starting_cash + net_profit

            # Suggested spend for tomorrow: based on profit and reserve
            safe_spend_min = round(max(150.0, market_spend * 0.9), -1)
            safe_spend_max = round(min(profile["available_spend"], market_spend * 1.25), -1)

            return {
                "merchant_id": merchant_id,
                "date": date,
                "suggested_spend_tomorrow_min": safe_spend_min,
                "suggested_spend_tomorrow_max": safe_spend_max,
                "suggested_customers_tomorrow_min": int(safe_spend_min / (profile["avg_order_value"] * profile["unit_cost_ratio"])),
                "suggested_customers_tomorrow_max": int(safe_spend_max / (profile["avg_order_value"] * profile["unit_cost_ratio"])),
                "money_flow": {
                    "starting_cash": starting_cash,
                    "sales_today": sales_today,
                    "customers_today": act["customers_served"],
                    "market_spend": market_spend,
                    "net_profit_today": net_profit,
                    "total_cash_now": total_cash_now,
                    "reserve_cash_protected": profile["reserve_cash"],
                    "reserve_healthy": total_cash_now >= (profile["reserve_cash"] + safe_spend_min),
                },
            }


# Global in-memory store singleton
store = InMemoryMerchantStore()
