// src/modules/matching-engine/campus/index.ts
// Clean export barrel for the campus matching domain.
// Does NOT re-export from the parent matching-engine to avoid coupling.

export * from "./types";
export * from "./curriculumTaxonomy";
export * from "./requirementNormalizer";
export * from "./eligibilityFilter";
export * from "./academicEvaluator";
export * from "./hybridEvaluator";
export * from "./runCampusMatch";
