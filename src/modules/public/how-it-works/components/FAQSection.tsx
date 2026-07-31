// src/modules/public/how-it-works/components/FAQSection.tsx
"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown} from "lucide-react";
import { FAQ_ITEMS } from "../config";
import { RoleKey } from "../types";

interface Props {
  activeRole: RoleKey;
}

export function FAQSection({ activeRole }: Props) {
  const [openId, setOpenId] = useState<string | null>("faq-1");

  // Filter FAQs relevant to general or the active role
  const relevantFaqs = FAQ_ITEMS.filter(
    (item) => item.category === "general" || item.category === activeRole
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
      <div className="text-center space-y-3 mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wide">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Frequently Asked Questions</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          Questions About VOS Sync Onboarding?
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground max-w-xl mx-auto">
          Find instant answers regarding registration, verification speed, account security, and role features.
        </p>
      </div>

      <div className="space-y-3">
        {relevantFaqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div
              key={faq.id}
              className="bg-card border rounded-2xl overflow-hidden transition-all duration-200 shadow-2xs"
            >
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-bold text-sm text-foreground hover:text-primary transition-colors"
              >
                <span>{faq.question}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-primary" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-muted/40">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
