// src/modules/matching-engine/explanation/evidenceBuilder.ts

import { EvaluatorResult, EvidenceItem } from "../types/evaluatorTypes";

export function collectEvidence(evaluatorResults: EvaluatorResult[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const res of evaluatorResults) {
    items.push(...res.evidence);
  }
  return items;
}
