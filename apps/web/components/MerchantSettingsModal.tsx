"use client";

import React, { useState } from "react";
import {
  IconSettings,
  IconBuildingStore,
  IconCoin,
  IconMapPin,
  IconClock,
  IconShieldCheck,
  IconCheck,
  IconServer,
  IconWifi,
  IconWifiOff,
  IconRefresh,
} from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MerchantProfile,
  getApiBaseUrl,
  setCustomApiBaseUrl,
  checkBackendHealth,
} from "@/lib/api";
import { useMerchant } from "@/lib/MerchantContext";

interface MerchantSettingsModalProps {
  profile: MerchantProfile;
  onSave: (updated: MerchantProfile) => void;
}

export function MerchantSettingsModal({
  profile,
  onSave,
}: MerchantSettingsModalProps) {
  const merchant = useMerchant();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MerchantProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);

  // Cloud Run backend URL state
  const [backendUrl, setBackendUrl] = useState<string>("");
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    ok: boolean;
    message: string;
  }>({ tested: false, ok: false, message: "" });
  const [isTesting, setIsTesting] = useState(false);

  const handleOpen = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setForm(profile);
      setIsSaved(false);
      setBackendUrl(getApiBaseUrl());
      setTestResult({ tested: false, ok: false, message: "" });
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult({ tested: false, ok: false, message: "" });
    const res = await checkBackendHealth(backendUrl);
    setIsTesting(false);
    if (res.ok) {
      setTestResult({
        tested: true,
        ok: true,
        message: `✓ Connected to Cloud Run (${res.latencyMs}ms)`,
      });
    } else {
      setTestResult({
        tested: true,
        ok: false,
        message: `✗ Unreachable (${res.latencyMs}ms) - verify URL or allow CORS`,
      });
    }
  };

  const handleApplyBackendUrl = async () => {
    setCustomApiBaseUrl(backendUrl);
    await merchant.refreshConnection();
    await handleTestConnection();
  };

  const handleResetBackendUrl = async () => {
    setCustomApiBaseUrl("");
    const defaultUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/+$/, "");
    setBackendUrl(defaultUrl);
    await merchant.refreshConnection();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
    if (backendUrl !== getApiBaseUrl()) {
      setCustomApiBaseUrl(backendUrl);
      merchant.refreshConnection().catch(() => {});
    }
    setIsSaved(true);
    setTimeout(() => {
      setOpen(false);
    }, 600);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <IconSettings size={14} />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconBuildingStore size={18} className="text-primary" />
            Merchant Profile & Guardrails
          </DialogTitle>
          <DialogDescription>
            Configure your shop location, shift hours, and financial safety limits.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="shop_name" className="text-xs font-semibold flex items-center gap-1">
              <IconBuildingStore size={13} /> Shop Name
            </Label>
            <Input
              id="shop_name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-xs font-semibold flex items-center gap-1">
              <IconMapPin size={13} /> Location / Station Hub
            </Label>
            <Input
              id="location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="h-8 text-xs"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="open_time" className="text-xs font-semibold flex items-center gap-1">
                <IconClock size={13} /> Open Time
              </Label>
              <Input
                id="open_time"
                value={form.open_time}
                onChange={(e) => setForm({ ...form, open_time: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="close_time" className="text-xs font-semibold flex items-center gap-1">
                <IconClock size={13} /> Close Time
              </Label>
              <Input
                id="close_time"
                value={form.close_time}
                onChange={(e) => setForm({ ...form, close_time: e.target.value })}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="p-3 bg-muted/60 rounded-lg space-y-3 border border-border/60">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <IconShieldCheck size={15} className="text-emerald-600 dark:text-emerald-400" />
              Cash Constraints & Safety Reserves
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="starting_cash" className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <IconCoin size={11} /> Starting Cash (฿)
                </Label>
                <Input
                  id="starting_cash"
                  type="number"
                  value={form.starting_cash}
                  onChange={(e) =>
                    setForm({ ...form, starting_cash: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="reserve_cash" className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <IconShieldCheck size={11} /> Emergency Reserve (฿)
                </Label>
                <Input
                  id="reserve_cash"
                  type="number"
                  value={form.reserve_cash}
                  onChange={(e) =>
                    setForm({ ...form, reserve_cash: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="available_spend" className="text-[11px] text-muted-foreground">
                  Max Available Spend (฿)
                </Label>
                <Input
                  id="available_spend"
                  type="number"
                  value={form.available_spend}
                  onChange={(e) =>
                    setForm({ ...form, available_spend: Number(e.target.value) || 0 })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="avg_ticket" className="text-[11px] text-muted-foreground">
                  Avg Ticket Price (฿)
                </Label>
                <Input
                  id="avg_ticket"
                  type="number"
                  value={form.avg_order_value}
                  onChange={(e) =>
                    setForm({ ...form, avg_order_value: Number(e.target.value) || 35 })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cloud Run Backend Service Connection Section */}
          <div className="p-3 bg-muted/40 rounded-lg space-y-2.5 border border-border/70">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <IconServer size={14} className="text-primary" />
                Backend API Connection (Cloud Run)
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                  merchant.isBackendConnected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                }`}
              >
                {merchant.isBackendConnected ? (
                  <>
                    <IconWifi size={10} /> Online
                  </>
                ) : (
                  <>
                    <IconWifiOff size={10} /> Offline
                  </>
                )}
              </span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="backend_url" className="text-[11px] text-muted-foreground">
                Target Service URL (e.g. Cloud Run or localhost)
              </Label>
              <div className="flex gap-1.5">
                <Input
                  id="backend_url"
                  value={backendUrl}
                  onChange={(e) => {
                    setBackendUrl(e.target.value);
                    setTestResult({ tested: false, ok: false, message: "" });
                  }}
                  placeholder="https://bottomup-api-xxx.a.run.app"
                  className="h-8 text-xs font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={isTesting || !backendUrl.trim()}
                  className="h-8 px-2.5 text-xs shrink-0"
                >
                  {isTesting ? <IconRefresh size={12} className="animate-spin" /> : "Test"}
                </Button>
              </div>
            </div>

            {testResult.tested && (
              <div
                className={`text-[11px] font-medium p-1.5 rounded-md border flex items-center justify-between ${
                  testResult.ok
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30"
                }`}
              >
                <span>{testResult.message}</span>
                {testResult.ok && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleApplyBackendUrl}
                    className="h-6 px-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                  >
                    Apply Now
                  </Button>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground">
              <span>Allows judges to test any deployed Cloud Run URL directly.</span>
              <button
                type="button"
                onClick={handleResetBackendUrl}
                className="underline hover:text-foreground transition-colors"
              >
                Reset Default
              </button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="submit"
              size="sm"
              className="w-full sm:w-auto gap-1"
              disabled={isSaved}
            >
              {isSaved ? (
                <>
                  <IconCheck size={14} /> Saved!
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
