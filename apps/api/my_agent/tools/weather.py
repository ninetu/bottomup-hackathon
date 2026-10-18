import json
from pathlib import Path
from typing import Any, Dict, Optional


def _load_weather_data() -> list[Dict[str, Any]]:
    """Loads weather data from weather.json."""
    candidates = [
        Path(__file__).resolve().parent.parent / "dataset" / "weather.json",
        Path.cwd() / "my_agent" / "dataset" / "weather.json",
        Path.cwd() / "dataset" / "weather.json",
    ]
    for path in candidates:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("Could not locate dataset/weather.json")


def get_weather(
    location: str,
    date: Optional[str] = None,
    time: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieves weather forecasts and conditions for a specified city or train station.

    Args:
        location: The name of the city or train station (e.g. 'Bangkok', 'Chiang Mai', 'Ayutthaya',
                  or in Thai 'กรุงเทพอภิวัฒน์', 'เชียงใหม่', 'อยุธยา').
        date: Optional date in 'YYYY-MM-DD' format (e.g. '2026-10-12').
        time: Optional time string in 'HH:MM' (e.g. '14:00') or ISO format 'YYYY-MM-DDTHH:MM:SS'.

    Returns:
        A dictionary containing weather forecast details (temperature, condition, rain probability,
        humidity, wind speed) or an error message if the location or date is not found.
    """
    weather_data = _load_weather_data()

    # Normalize query for robust matching
    q = location.strip().lower().replace(" ", "").replace("_", "").replace("-", "")
    target = None
    for item in weather_data:
        city_norm = item.get("city", "").strip().lower().replace(" ", "")
        loc_norm = item.get("location", "").strip().lower().replace(" ", "")
        if (
            q == city_norm
            or q == loc_norm
            or q in city_norm
            or q in loc_norm
            or city_norm in q
            or loc_norm in q
        ):
            target = item
            break

    if not target:
        available = [
            f"{it.get('city')} ({it.get('location')})" for it in weather_data
        ]
        return {
            "error": f"Location '{location}' not found in weather records.",
            "available_locations": available,
        }

    hourly = target.get("hourly", [])

    # If time contains an ISO timestamp with 'T', extract date and time components
    if time and "T" in time:
        parts = time.split("T")
        if not date:
            date = parts[0]
        time = parts[1]

    # Standardize hour target if time provided (e.g. '14:00' -> '14:')
    target_hour_str = None
    if time:
        time_clean = time.strip().lower()
        hour_part = time_clean.split(":")[0]
        if hour_part.isdigit():
            target_hour_str = f"{int(hour_part):02d}:"

    # Query with specific date
    if date:
        date_clean = date.strip()
        matched_records = [h for h in hourly if h.get("time", "").startswith(date_clean)]
        if not matched_records:
            available_dates = sorted(
                list(set(h.get("time", "").split("T")[0] for h in hourly))
            )
            return {
                "city": target.get("city"),
                "location": target.get("location"),
                "error": f"No weather data found for date '{date}'.",
                "available_dates": available_dates,
            }

        # Specific hour requested on that date
        if target_hour_str:
            hour_matched = [
                h for h in matched_records if f"T{target_hour_str}" in h.get("time", "")
            ]
            if hour_matched:
                return {
                    "city": target.get("city"),
                    "location": target.get("location"),
                    "weather": hour_matched[0],
                }
            return {
                "city": target.get("city"),
                "location": target.get("location"),
                "date": date_clean,
                "requested_time": time,
                "note": f"Exact hour '{time}' not found; providing all hourly data for {date_clean}.",
                "hourly": matched_records,
            }

        # Date summary and hourly details
        temps = [h.get("temperature_c", 0.0) for h in matched_records]
        rains = [h.get("rain_probability", 0) for h in matched_records]
        conditions = list(dict.fromkeys(h.get("condition", "") for h in matched_records))
        return {
            "city": target.get("city"),
            "location": target.get("location"),
            "date": date_clean,
            "summary": {
                "min_temperature_c": min(temps),
                "max_temperature_c": max(temps),
                "max_rain_probability": max(rains),
                "conditions": conditions,
            },
            "hourly": matched_records,
        }

    # Query with time only (no date)
    if target_hour_str:
        time_matched = [
            h for h in hourly if f"T{target_hour_str}" in h.get("time", "")
        ]
        if time_matched:
            return {
                "city": target.get("city"),
                "location": target.get("location"),
                "requested_time": time,
                "forecasts": time_matched,
            }

    # No date or time provided: return daily overview for all available dates
    available_dates = sorted(list(set(h.get("time", "").split("T")[0] for h in hourly)))
    overview = []
    for d in available_dates:
        d_records = [h for h in hourly if h.get("time", "").startswith(d)]
        temps = [h.get("temperature_c", 0.0) for h in d_records]
        rains = [h.get("rain_probability", 0) for h in d_records]
        conditions = list(dict.fromkeys(h.get("condition", "") for h in d_records))
        overview.append(
            {
                "date": d,
                "min_temperature_c": min(temps),
                "max_temperature_c": max(temps),
                "max_rain_probability": max(rains),
                "conditions": conditions,
            }
        )

    return {
        "city": target.get("city"),
        "location": target.get("location"),
        "available_dates": available_dates,
        "daily_forecasts": overview,
    }
