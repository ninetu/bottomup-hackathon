"use client";

import React from "react";
import {
  IconBuildingStore,
  IconMapPin,
  IconWifi,
  IconWifiOff,
} from "@tabler/icons-react";
import { MerchantProfile } from "@/lib/api";
import { useMerchant } from "@/lib/MerchantContext";
import { MerchantSettingsModal } from "./MerchantSettingsModal";

interface HeaderProps {
  profile?: MerchantProfile;
  onUpdateProfile?: (updated: MerchantProfile) => void;
  isBackendConnected?: boolean;
}

export function Header(props: HeaderProps) {
  const context = useMerchant();

  const profile = props.profile ?? context.profile;
  const onUpdateProfile = props.onUpdateProfile ?? context.updateProfile;
  const isBackendConnected = props.isBackendConnected ?? context.isBackendConnected;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/95 backdrop-blur-md">
      <div className="container mx-auto px-4 py-2.5 max-w-lg flex items-center justify-between">
        {/* Merchant Shop Profile - Vendor feels this is THEIR OWN APP */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <IconBuildingStore size={20} stroke={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-base leading-tight truncate">
                {profile.name}
              </span>
              {/* Connection indicator */}
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                  isBackendConnected
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                }`}
                title={isBackendConnected ? "Connected to Cloud Run Assistant" : "Operating in Offline Fallback Mode"}
              >
                {isBackendConnected ? <IconWifi size={10} /> : <IconWifiOff size={10} />}
                <span>{isBackendConnected ? "Cloud Run" : "Offline"}</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
              <IconMapPin size={11} className="shrink-0" />
              <span className="truncate">{profile.location || profile.city}</span>
            </p>
          </div>
        </div>

        {/* Right action: Merchant Profile Settings */}
        <div className="shrink-0">
          <MerchantSettingsModal
            profile={profile}
            onSave={onUpdateProfile}
          />
        </div>
      </div>
    </header>
  );
}
