from typing import Any, Dict, Optional
from .store import store

STATION_MAPPING = {
    "bangkok": "กรุงเทพอภิวัฒน์",
    "bkk": "กรุงเทพอภิวัฒน์",
    "กรุงเทพ": "กรุงเทพอภิวัฒน์",
    "กรุงเทพอภิวัฒน์": "กรุงเทพอภิวัฒน์",
    "บางซื่อ": "กรุงเทพอภิวัฒน์",
    "chiangmai": "เชียงใหม่",
    "chiang mai": "เชียงใหม่",
    "เชียงใหม่": "เชียงใหม่",
    "ayutthaya": "อยุธยา",
    "อยุธยา": "อยุธยา",
}


def setup_business_profile(
    location: str,
    products: str,
    open_time: str = "07:00",
    close_time: str = "15:00",
    available_spend: float = 500.0,
    reserve_cash: float = 300.0,
    avg_order_value: Optional[float] = None,
    merchant_id: str = "merchant_default",
) -> Dict[str, Any]:
    """Saves or updates the merchant business profile. Do NOT ask user for reserve_cash (system handles it).

    Args:
        location: Selling location or station name (e.g. 'กรุงเทพอภิวัฒน์', 'Bangkok', 'เชียงใหม่', 'อยุธยา').
        products: What the vendor sells (e.g. 'หมูปิ้ง ข้าวเหนียว', 'ข้าวราดแกง', 'เครื่องดื่ม กาแฟ').
        open_time: Stall opening time in 'HH:MM' format (e.g. '07:00').
        close_time: Stall closing time in 'HH:MM' format (e.g. '15:00').
        available_spend: Cash available to spend on ingredients at the morning market today (e.g. 500.0).
        reserve_cash: Internal cash reserve (defaults automatically to 300.0, do NOT ask the user).
        avg_order_value: Optional estimated average price per customer purchase in Baht (e.g. 40.0).
        merchant_id: Merchant identifier.

    Returns:
        Updated profile details ready for daily plan simulation.
    """
    # Normalize station location if matched to a known hub
    loc_clean = location.strip().lower()
    target_loc = location.strip()
    for k, v in STATION_MAPPING.items():
        if k in loc_clean or loc_clean in k:
            target_loc = v
            break

    # If avg_order_value not provided, estimate based on product type
    if avg_order_value is None:
        if any(w in products for w in ["หมูปิ้ง", "ลูกชิ้น", "น้ำ", "กาแฟ", "ขนม"]):
            avg_order_value = 35.0
        else:
            avg_order_value = 50.0

    updated = store.update_profile(
        merchant_id=merchant_id,
        location=target_loc,
        products=products,
        open_time=open_time,
        close_time=close_time,
        available_spend=available_spend,
        reserve_cash=reserve_cash,
        avg_order_value=avg_order_value,
    )

    return {
        "status": "success",
        "message": f"Business profile updated for {updated.get('name', 'Merchant')}.",
        "profile": {
            "location": updated["location"],
            "products": updated.get("products", products),
            "hours": f"{updated['open_time']} – {updated['close_time']}",
            "available_spend": updated["available_spend"],
            "reserve_cash": updated["reserve_cash"],
            "avg_order_value": updated["avg_order_value"],
        },
    }
