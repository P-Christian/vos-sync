"use client";

import React from 'react';
import { Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ApplicationHeader: React.FC = () => {
  return (
    <div className="flex justify-between items-end mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Application History</h1>
        <p className="text-muted-foreground text-sm">Track your journey across 12 active opportunities.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Export
        </Button>
      </div>
    </div>
  );
};
