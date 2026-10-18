"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  IconReceipt,
  IconCoin,
  IconShieldCheck,
  IconCloudRain,
  IconSparkles,
  IconUser,
  IconSend,
  IconLoader2,
  IconBulb,
  IconFilter,
  IconChartPie,
} from "@tabler/icons-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimelineItem, sendAgentMessage } from "@/lib/api";
import { useMerchant } from "@/lib/MerchantContext";

function generateTimelineId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function getFormattedTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface TimelineStageProps {
  items?: TimelineItem[];
  onAddTimelineItem?: (item: TimelineItem) => void;
  shopName?: string;
}

export function TimelineStage(props: TimelineStageProps) {
  const merchant = useMerchant();

  const items = props.items ?? merchant.timelineItems;
  const onAddTimelineItem = props.onAddTimelineItem ?? merchant.addTimelineItem;
  const shopName = props.shopName ?? merchant.profile.name;

  const [filter, setFilter] = useState<"all" | "activity" | "chat" | "alert">("all");
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [items, isLoading]);

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const time = getFormattedTime();
    const userItem: TimelineItem = {
      id: generateTimelineId("tl_user"),
      time,
      category: "chat",
      type: "USER_MSG",
      title: "You",
      detail: text,
      badge: "Question",
    };

    onAddTimelineItem(userItem);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await sendAgentMessage("live", text, sessionId);
      if (response.session_id) {
        setSessionId(response.session_id);
      }
      const aiItem: TimelineItem = {
        id: generateTimelineId("tl_ai"),
        time: getFormattedTime(),
        category: "chat",
        type: "AI_MSG",
        title: "Shop Copilot",
        detail: response.reply,
        badge: "AI Advice",
      };
      onAddTimelineItem(aiItem);
    } catch {
      const fallbackItem: TimelineItem = {
        id: generateTimelineId("tl_err"),
        time: getFormattedTime(),
        category: "chat",
        type: "AI_MSG",
        title: "Shop Copilot",
        detail: "Recorded! All your shift figures and safety reserves remain protected.",
        badge: "Status",
      };
      onAddTimelineItem(fallbackItem);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemIcon = (type: TimelineItem["type"]) => {
    switch (type) {
      case "SALE":
        return <IconReceipt size={16} className="text-emerald-500" />;
      case "EXPENSE":
        return <IconCoin size={16} className="text-rose-500" />;
      case "PLAN":
        return <IconShieldCheck size={16} className="text-primary" />;
      case "ALERT":
        return <IconCloudRain size={16} className="text-sky-500" />;
      case "LEARN":
        return <IconChartPie size={16} className="text-indigo-500" />;
      case "USER_MSG":
        return <IconUser size={14} className="text-primary-foreground" />;
      case "AI_MSG":
      default:
        return <IconSparkles size={16} className="text-amber-500" />;
    }
  };

  const quickPrompts = [
    "Am I on pace to meet target?",
    "Will rain hit my shop today?",
    "Should I prepare another batch?",
    "How much should I spend tomorrow?",
  ];

  return (
    <div className="space-y-3 flex flex-col h-[calc(100vh-135px)]">
      {/* Top Filter Bar */}
      <div className="flex items-center justify-between gap-1.5 shrink-0 bg-muted/40 p-1.5 rounded-xl border border-border/60">
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <IconFilter size={14} className="text-muted-foreground ml-1 mr-0.5 shrink-0" />
          <button
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === "all"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter("activity")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === "activity"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setFilter("chat")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === "chat"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            AI Chat
          </button>
          <button
            onClick={() => setFilter("alert")}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              filter === "alert"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Alerts
          </button>
        </div>
      </div>

      {/* Main Timeline Scrollable Feed */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredItems.map((item) => {
          const isUserChat = item.type === "USER_MSG";
          const isAiChat = item.type === "AI_MSG";

          if (isUserChat) {
            return (
              <div key={item.id} className="flex justify-end gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-primary text-primary-foreground p-3 text-xs leading-relaxed shadow-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold">{item.title}</span>
                    <span className="text-[10px] text-primary-foreground/75 font-mono">{item.time}</span>
                  </div>
                  <p className="whitespace-pre-wrap">{item.detail}</p>
                </div>
              </div>
            );
          }

          if (isAiChat) {
            return (
              <div key={item.id} className="flex gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  <IconSparkles size={14} />
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-tl-xs bg-muted/60 border border-border/70 p-3 text-xs leading-relaxed shadow-xs space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      {item.title}
                      <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal">
                        Copilot
                      </Badge>
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{item.time}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-foreground/90">{item.detail}</p>
                </div>
              </div>
            );
          }

          // Operational activity or alert card
          return (
            <Card
              key={item.id}
              className={`border transition-all ${
                item.type === "SALE"
                  ? "border-emerald-500/30 bg-emerald-500/[0.03]"
                  : item.type === "EXPENSE"
                  ? "border-rose-500/30 bg-rose-500/[0.03]"
                  : item.type === "ALERT"
                  ? "border-sky-500/30 bg-sky-500/[0.03]"
                  : "border-border/80 bg-card/70"
              }`}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background border border-border/80 mt-0.5">
                      {getItemIcon(item.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-foreground">
                          {item.title}
                        </span>
                        {item.badge && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                      {item.detail && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                          {item.detail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-muted-foreground font-mono block">
                      {item.time}
                    </span>
                    {item.amount !== undefined && (
                      <span
                        className={`text-xs font-mono font-bold ${
                          item.amount >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {item.amount >= 0 ? `+฿${item.amount}` : `-฿${Math.abs(item.amount)}`}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2 px-1">
            <IconLoader2 size={14} className="animate-spin text-primary" />
            <span>Copilot analyzing {shopName} operations...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="shrink-0 pt-1">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
          <IconBulb size={11} />
          <span>Quick prompt:</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              disabled={isLoading}
              className="rounded-full bg-secondary/80 hover:bg-secondary border border-border/60 px-2.5 py-1 text-[11px] text-secondary-foreground whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Chat Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 pt-1 shrink-0"
      >
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask copilot or note activity for ${shopName}...`}
          disabled={isLoading}
          className="text-xs h-9 bg-background"
        />
        <Button
          type="submit"
          size="sm"
          disabled={isLoading || !inputText.trim()}
          className="h-9 px-3 gap-1 shrink-0"
        >
          <IconSend size={14} />
          <span>Send</span>
        </Button>
      </form>
    </div>
  );
}
