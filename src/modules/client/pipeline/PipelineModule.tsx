"use client";

// src/modules/client/pipeline/PipelineModule.tsx

import React from "react";
import PipelineSettingsTab from "./components/PipelineSettingsTab";

export default function PipelineModule() {
  return (
    <div className="space-y-6 client-page-transition">
      <style>{`
        @keyframes page-entry {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .client-page-transition {
          animation: page-entry 350ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <PipelineSettingsTab isStandalonePage={true} />
    </div>
  );
}
