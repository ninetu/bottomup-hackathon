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
import { MerchantProfile } from "@/lib/api";

interface MerchantSettingsModalProps {
  profile: MerchantProfile;
  onSave: (updated: MerchantProfile) => void;
}

export function MerchantSettingsModal({
  profile,
  onSave,
}: MerchantSettingsModalProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MerchantProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);

  const handleOpen = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      setForm(profile);
      setIsSaved(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
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
