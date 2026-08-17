"use client";

// src/modules/vos-admin/role-matching/hooks/useMatchTester.ts

import { useState, useCallback } from "react";
import { SimulationResult, CandidateSimulationProfile } from "../types";
import { runMatchSimulation } from "../services/roleMatchingService";

export function useMatchTester() {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const runTest = useCallback(async (keyword: string, candidateId?: number, candidate?: CandidateSimulationProfile) => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await runMatchSimulation(keyword, candidateId, candidate);
      setResult(res);
    } catch (err: unknown) {
      setError((err as Error).message || "Simulation test failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError("");
  }, []);

  return { result, loading, error, runTest, clearResult };
}
