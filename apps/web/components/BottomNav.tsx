"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconChecklist,
  IconActivity,
  IconChartPie,
  IconTimeline,
} from "@tabler/icons-react";

export function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [prevPathname, setPrevPathname] = useState(pathname);

  // Auto-show when route changes (canonical React pattern for state-from-props/context)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setIsVisible(true);
  }

  // Smooth auto-hide on scroll down, instant reveal on scroll up
  useEffect(() => {
    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (currentY <= 20) {
            setIsVisible(true);
          } else {
            const delta = currentY - lastY;
            if (delta > 8) {
              setIsVisible(false);
            } else if (delta < -8) {
              setIsVisible(true);
            }
          }
          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabs = [
    {
      id: "plan",
      href: "/plan",
      label: "Plan",
      icon: IconChecklist,
      isActive: pathname === "/plan" || pathname === "/",
    },
    {
      id: "live",
      href: "/live",
      label: "Live",
      icon: IconActivity,
      isActive: pathname === "/live",
    },
    {
      id: "learn",
      href: "/learn",
      label: "Learn",
      icon: IconChartPie,
      isActive: pathname === "/learn",
    },
    {
      id: "timeline",
      href: "/timeline",
      label: "Timeline",
      icon: IconTimeline,
      isActive: pathname === "/timeline",
    },
  ];

  return (
    <nav
      className={`fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ease-out will-change-transform ${
        isVisible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
    >
      <div className="max-w-lg mx-auto px-3 py-1 flex items-center justify-around h-12">
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center py-0.5 rounded-lg transition-all relative ${
                tab.isActive
                  ? "text-primary font-semibold"
                  : "text-muted-foreground hover:text-foreground active:scale-95"
              }`}
            >
              {tab.isActive && (
                <span className="absolute -top-1 w-6 h-0.5 rounded-full bg-primary" />
              )}
              <Icon
                size={18}
                stroke={tab.isActive ? 2.5 : 1.8}
                className={tab.isActive ? "text-primary" : "text-muted-foreground"}
              />
              <span className="text-[10px] leading-tight tracking-tight mt-0.5">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
