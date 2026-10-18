import json
from pathlib import Path
from typing import Any, Dict, List, Optional

STATION_ALIASES = {
    "bangkok": "กรุงเทพอภิวัฒน์",
    "bkk": "กรุงเทพอภิวัฒน์",
    "กรุงเทพอภิวัฒน์": "กรุงเทพอภิวัฒน์",
    "กรุงเทพ": "กรุงเทพอภิวัฒน์",
    "krung thep aphiwat": "กรุงเทพอภิวัฒน์",
    "chiangmai": "เชียงใหม่",
    "chiang mai": "เชียงใหม่",
    "เชียงใหม่": "เชียงใหม่",
    "ayutthaya": "อยุธยา",
    "อยุธยา": "อยุธยา",
}


def _normalize_time(t_str: str) -> str:
    """Normalizes time strings like '7:30' into '07:30'."""
    parts = t_str.strip().split(":")
    if len(parts) == 2:
        return f"{int(parts[0]):02d}:{int(parts[1]):02d}"
    return t_str.strip()


def _load_train_data() -> list[Dict[str, Any]]:
    """Loads timetable data from train_timetable.json."""
    candidates = [
        Path(__file__).resolve().parent.parent / "dataset" / "train_timetable.json",
        Path.cwd() / "my_agent" / "dataset" / "train_timetable.json",
        Path.cwd() / "dataset" / "train_timetable.json",
    ]
    for path in candidates:
        if path.exists():
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
    raise FileNotFoundError("Could not locate dataset/train_timetable.json")


def get_train_schedule(
    station: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
) -> Dict[str, Any]:
    """Retrieves train arrivals and departures for a station to evaluate passenger foot traffic peaks.

    Args:
        station: Station or city name (e.g. 'Bangkok', 'กรุงเทพอภิวัฒน์', 'Chiang Mai', 'เชียงใหม่', 'Ayutthaya', 'อยุธยา').
        start_time: Optional shift start time in 'HH:MM' format (e.g. '07:00').
        end_time: Optional shift end time in 'HH:MM' format (e.g. '15:00').

    Returns:
        A dictionary containing scheduled train movements, total trains, and peak rush hours.
    """
    raw_data = _load_train_data()

    # Normalize station name
    q = station.strip().lower()
    target_station = STATION_ALIASES.get(q)
    if not target_station:
        for alias, actual in STATION_ALIASES.items():
            if alias in q or q in alias:
                target_station = actual
                break

    if not target_station:
        return {
            "error": f"Station '{station}' not found in timetable.",
            "supported_stations": ["กรุงเทพอภิวัฒน์ (Bangkok)", "เชียงใหม่ (Chiang Mai)", "อยุธยา (Ayutthaya)"],
        }

    # Extract all events (both arrivals and departures create foot traffic)
    events: List[Dict[str, Any]] = []
    for row in raw_data:
        if row.get("StartName") == target_station:
            events.append({
                "train_no": row.get("TrainNo"),
                "event": "Departure",
                "time": _normalize_time(row.get("DepTime", "")),
                "destination": row.get("Endname"),
                "train_type": row.get("tname"),
                "line": row.get("LineName"),
            })
        elif row.get("Endname") == target_station:
            events.append({
                "train_no": row.get("TrainNo"),
                "event": "Arrival",
                "time": _normalize_time(row.get("ArrTime", "")),
                "origin": row.get("StartName"),
                "train_type": row.get("tname"),
                "line": row.get("LineName"),
            })

    events.sort(key=lambda x: x["time"])

    # Filter by operating window if provided
    s_norm = _normalize_time(start_time) if start_time else None
    e_norm = _normalize_time(end_time) if end_time else None

    filtered_events = events
    if s_norm and e_norm:
        filtered_events = [e for e in events if s_norm <= e["time"] <= e_norm]
    elif s_norm:
        filtered_events = [e for e in events if e["time"] >= s_norm]
    elif e_norm:
        filtered_events = [e for e in events if e["time"] <= e_norm]

    # Calculate hourly rush distribution
    hourly_counts: Dict[str, int] = {}
    for ev in filtered_events:
        hour = ev["time"].split(":")[0] + ":00"
        hourly_counts[hour] = hourly_counts.get(hour, 0) + 1

    peak_hours = sorted(hourly_counts.items(), key=lambda x: x[1], reverse=True)[:3]

    return {
        "station": target_station,
        "operating_window": f"{s_norm or '00:00'} - {e_norm or '23:59'}",
        "total_train_movements": len(filtered_events),
        "peak_rush_hours": [{"hour": h, "train_count": c} for h, c in peak_hours],
        "events": filtered_events,
    }
