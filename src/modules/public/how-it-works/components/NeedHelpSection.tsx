// src/modules/public/how-it-works/components/NeedHelpSection.tsx
"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, Mail, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

export function NeedHelpSection() {
  return (
    <div className="bg-muted/40 border-t py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-sm">Still have questions or need assistance?</h4>
            <p className="text-xs text-muted-foreground">Our support team is here to guide you through registration and verification.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button asChild variant="outline" size="sm" className="font-bold text-xs gap-1.5">
            <Link href="/contact-us">
              <Mail className="h-3.5 w-3.5" />
              Contact Support
            </Link>
          </Button>
          <Button asChild size="sm" className="font-bold text-xs gap-1.5">
            <Link href="/contact-us">
              <MessageSquare className="h-3.5 w-3.5" />
              Help Center
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
