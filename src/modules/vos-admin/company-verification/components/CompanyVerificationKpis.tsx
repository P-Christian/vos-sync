"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { CompanyVerificationKPIs } from "../types";

interface CompanyVerificationKpisProps {
  kpis: CompanyVerificationKPIs;
  onFilterSelect?: (status: string) => void;
  currentFilter?: string;
}

export const CompanyVerificationKpis: React.FC<CompanyVerificationKpisProps> = ({
  kpis,
  onFilterSelect,
  currentFilter,
}) => {
  const cards = [
    {
      id: "ALL",
      title: "Total Companies",
      value: kpis.totalCount,
      icon: Building2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
      borderColor: currentFilter === "ALL" ? "border-blue-500" : "border-border",
    },
    {
      id: "PENDING_VERIFICATION",
      title: "Pending Review",
      value: kpis.pendingCount,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: currentFilter === "PENDING_VERIFICATION" ? "border-amber-500" : "border-border",
    },
    {
      id: "VERIFIED",
      title: "Verified",
      value: kpis.verifiedCount,
      icon: CheckCircle2,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      borderColor: currentFilter === "VERIFIED" ? "border-emerald-500" : "border-border",
    },
    {
      id: "REJECTED",
      title: "Rejected / Suspended",
      value: kpis.rejectedCount,
      icon: XCircle,
      color: "text-rose-500",
      bgColor: "bg-rose-500/10",
      borderColor: currentFilter === "REJECTED" ? "border-rose-500" : "border-border",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            onClick={() => onFilterSelect && onFilterSelect(card.id)}
            className={`cursor-pointer transition-all hover:shadow-md border ${card.borderColor}`}
          >
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{card.value}</h3>
              </div>
              <div className={`p-3 rounded-xl ${card.bgColor} ${card.color}`}>
                <Icon className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
