export type LiveScenarioId = "normal" | "rain" | "train_surge" | "sellout" | "slow_morning";

export interface LiveScenario {
  id: LiveScenarioId;
  label: string;
  icon: string;
  shortTag: string;
  badgeLabel: string;
  badgeColorClass: string;
  timelineCurveType: "on_track" | "surging" | "flattening";
  headline: string;
  situationDescription: string;
  grillingDirective: string;
  riskMitigationAction: string;
  actionCtaText: string;
  actionToastMessage: string;
}

export const LIVE_SCENARIOS: Record<LiveScenarioId, LiveScenario> = {
  normal: {
    id: "normal",
    label: "Normal Pace",
    icon: "☀️",
    shortTag: "Baseline 08:30",
    badgeLabel: "Pacing On Track",
    badgeColorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    timelineCurveType: "on_track",
    headline: "Commuter Rush Concluding on Pace",
    situationDescription:
      "Commuter rush from 07:00–08:30 morning trains cleared right on target (~57 customers). Foot traffic naturally begins tapering as office workers reach desks.",
    grillingDirective:
      "Grill only a final wind-down batch of 15–20 skewers. Keep remaining raw pork chilled in cooler.",
    riskMitigationAction:
      "Pacing is 100% on target. Zero food waste expected if you wrap by 09:30 AM.",
    actionCtaText: "Confirm Wind-Down Batch",
    actionToastMessage: "Recorded final 20-skewer wind-down batch. Target wrap-up at 09:30.",
  },
  rain: {
    id: "rain",
    label: "Rain Shock",
    icon: "🌧️",
    shortTag: "Downpour 08:35",
    badgeLabel: "Rain Shock (-65% Traffic)",
    badgeColorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    timelineCurveType: "flattening",
    headline: "Sudden Downpour Detected at Station",
    situationDescription:
      "Rain radar shows 85% heavy rain over Bang Sue until 09:45. Outdoor pedestrian traffic dropped by 65%. Commuters are trapped sheltering inside the concourse.",
    grillingDirective:
      "STOP grilling raw skewers immediately! Do not put any new pork on the grill to prevent waste.",
    riskMitigationAction:
      "Repackage the 25 already-cooked hot skewers into 'Grab-&-Go Shelter Packs' (3 skewers + rice @ ฿35). Sell to waiting commuters under shelter to recover ฿280 profit with 0 waste.",
    actionCtaText: "Apply Rain Shelter Combo (฿35)",
    actionToastMessage: "Applied Rain Combo strategy: Repackaged 25 skewers into shelter packs.",
  },
  train_surge: {
    id: "train_surge",
    label: "Train Surge",
    icon: "🚆",
    shortTag: "Express 51 Surge",
    badgeLabel: "Surge Wave (+45 Pax)",
    badgeColorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30",
    timelineCurveType: "surging",
    headline: "Delayed Express 51 Arrived (+150 Commuters)",
    situationDescription:
      "Delayed Northern Express 51 just arrived at Platform 4. Over 150 hungry commuters are flooding into the station food court right now for the next 25 minutes.",
    grillingDirective:
      "FIRE maximum batch (35–40 skewers) on high heat NOW! Pre-pack 20 bags of sticky rice on the front table.",
    riskMitigationAction:
      "High-velocity 25-minute window open. Fast-serve queue will convert +40 customers, adding ~฿1,400 sales with 100% sell-through.",
    actionCtaText: "Fire Rush Batch (40 Skewers)",
    actionToastMessage: "Rush batch fired: 40 skewers grilling on high heat to meet Express 51 influx.",
  },
  sellout: {
    id: "sellout",
    label: "Rapid Sellout",
    icon: "⚡",
    shortTag: "Pacing +28% Ahead",
    badgeLabel: "Ahead of Pace (+28%)",
    badgeColorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    timelineCurveType: "surging",
    headline: "Inventory 85% Sold Out Ahead of Schedule",
    situationDescription:
      "Sales velocity is running +28% above morning forecast. Raw stock in cooler is down to the final ~12 skewers. Target revenue is virtually achieved.",
    grillingDirective:
      "Cook remaining 12 skewers on explicit customer order only. Do NOT buy emergency pork from market.",
    riskMitigationAction:
      "Shift profit is fully secured. Lock in your ฿2,200+ net margin and prepare to clean grill for an early close at 09:15.",
    actionCtaText: "Prepare Early Stall Close",
    actionToastMessage: "Early closing prep initiated. Target profit locked in.",
  },
  slow_morning: {
    id: "slow_morning",
    label: "Slow Morning",
    icon: "🐢",
    shortTag: "Pacing -30% Behind",
    badgeLabel: "Pacing Behind (-30%)",
    badgeColorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    timelineCurveType: "flattening",
    headline: "Footfall Running 30% Below Morning Forecast",
    situationDescription:
      "Station concourse flow is lower than historical Monday averages. If normal 30-skewer batches continue, leftover cooked meat risk exceeds ฿400 in lost margin.",
    grillingDirective:
      "Shift to micro-grilling: cook only 6–8 skewers at a time directly in front of display to keep aroma fresh.",
    riskMitigationAction:
      "Keep the remaining 35 raw skewers vacuum-chilled for tomorrow morning or afternoon shift to preserve capital.",
    actionCtaText: "Switch to Micro-Grill Mode",
    actionToastMessage: "Switched to micro-grill mode: 6-8 skewers per batch to eliminate leftover risk.",
  },
};

/**
 * Play a subtle, pleasant cash register chime using Web Audio API
 * Runs entirely on client side without external audio assets.
 */
export function playCashChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    
    // First bell tone (higher bell)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.08); // E6
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second bell tone (cash register coin chime)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(1318.51, now + 0.08); // E6
    osc2.frequency.exponentialRampToValueAtTime(1975.53, now + 0.16); // B6
    gain2.gain.setValueAtTime(0.15, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch {
    // AudioContext blocked or unsupported, fail silently
  }
}
