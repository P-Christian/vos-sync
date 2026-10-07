// src/modules/client/pipeline/services/pipeline.service.ts

import {
  CanonicalStageType,
  CANONICAL_STAGE_TYPES,
  CompanyPipeline,
  PipelineStage,
  PipelineTransition,
  STAGE_TYPE_DETAILS,
  TERMINAL_STAGE_TYPES,
} from "../types";

const DIRECTUS_BASE = (
  process.env.DIRECTUS_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  ""
).replace(/\/$/, "");

const DIRECTUS_TOKEN = process.env.DIRECTUS_STATIC_TOKEN;

function getHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (DIRECTUS_TOKEN) h["Authorization"] = `Bearer ${DIRECTUS_TOKEN}`;
  return h;
}

// Default 8-stage canonical pipeline configuration
export const DEFAULT_PIPELINE_STAGES: Array<{
  stage_name: string;
  stage_type: CanonicalStageType;
  stage_order: number;
  color: string;
  description: string;
  is_terminal: boolean;
  is_system: boolean;
}> = [
  {
    stage_name: "Application Received",
    stage_type: "APPLIED",
    stage_order: 1,
    color: "sky",
    description: "New candidate submission awaiting initial review.",
    is_terminal: false,
    is_system: true,
  },
  {
    stage_name: "Screening",
    stage_type: "SCREENING",
    stage_order: 2,
    color: "blue",
    description: "Initial profile and resume evaluation.",
    is_terminal: false,
    is_system: false,
  },
  {
    stage_name: "Assessment",
    stage_type: "ASSESSMENT",
    stage_order: 3,
    color: "indigo",
    description: "Technical challenge, evaluation test, or assignment.",
    is_terminal: false,
    is_system: false,
  },
  {
    stage_name: "Interview",
    stage_type: "INTERVIEW",
    stage_order: 4,
    color: "purple",
    description: "Live technical or hiring manager interview rounds.",
    is_terminal: false,
    is_system: false,
  },
  {
    stage_name: "Offer",
    stage_type: "OFFER",
    stage_order: 5,
    color: "amber",
    description: "Formal job offer extended to candidate.",
    is_terminal: false,
    is_system: false,
  },
  {
    stage_name: "Hired",
    stage_type: "HIRED",
    stage_order: 6,
    color: "emerald",
    description: "Candidate accepted the offer and is officially hired.",
    is_terminal: true,
    is_system: true,
  },
  {
    stage_name: "Rejected",
    stage_type: "REJECTED",
    stage_order: 7,
    color: "rose",
    description: "Candidate did not meet requirements or was declined.",
    is_terminal: true,
    is_system: true,
  },
  {
    stage_name: "Withdrawn",
    stage_type: "WITHDRAWN",
    stage_order: 8,
    color: "zinc",
    description: "Candidate voluntarily withdrew application.",
    is_terminal: true,
    is_system: true,
  },
];

/**
 * Validates canonical stage type
 */
export function isValidStageType(stageType: string): stageType is CanonicalStageType {
  return CANONICAL_STAGE_TYPES.includes(stageType as CanonicalStageType);
}

/**
 * Validates terminal integrity for a stage type
 */
export function isTerminalStageType(stageType: CanonicalStageType): boolean {
  return TERMINAL_STAGE_TYPES.includes(stageType);
}

/**
 * Retrieves all company pipelines, seeding the default template if none exist.
 */
export async function getCompanyPipelines(companyId: number): Promise<CompanyPipeline[]> {
  try {
    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_pipelines?filter[company_id][_eq]=${companyId}&filter[status][_neq]=ARCHIVED&sort=id`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!res.ok) {
      console.error(`[pipeline.service] Error fetching pipelines for company ${companyId}: ${res.status}`);
      return [];
    }

    const json = (await res.json()) as { data?: CompanyPipeline[] };
    let pipelines = json.data ?? [];

    // If company has no pipelines, seed default company pipeline
    if (pipelines.length === 0) {
      const seeded = await seedDefaultCompanyPipeline(companyId);
      if (seeded) {
        pipelines = [seeded];
      }
    }

    // Hydrate stages and transitions for each pipeline
    const hydratedPipelines: CompanyPipeline[] = [];
    for (const pipeline of pipelines) {
      const hydrated = await getPipelineWithDetails(pipeline.id, companyId);
      if (hydrated) hydratedPipelines.push(hydrated);
      else hydratedPipelines.push(pipeline);
    }

    return hydratedPipelines;
  } catch (error) {
    console.error("[pipeline.service] getCompanyPipelines exception:", error);
    return [];
  }
}

/**
 * Retrieves a single pipeline with full stages and transitions
 */
export async function getPipelineWithDetails(
  pipelineId: number,
  companyId: number
): Promise<CompanyPipeline | null> {
  try {
    // 1. Fetch pipeline
    const pipeRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_pipelines/${pipelineId}?filter[company_id][_eq]=${companyId}`,
      { headers: getHeaders(), cache: "no-store" }
    );

    if (!pipeRes.ok) return null;
    const pipeJson = (await pipeRes.json()) as { data?: CompanyPipeline };
    const pipeline = pipeJson.data;
    if (!pipeline || pipeline.company_id !== companyId) return null;

    // 2. Fetch stages
    const stagesRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_pipeline_stages?filter[pipeline_id][_eq]=${pipelineId}&sort=stage_order`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const stagesJson = (await stagesRes.json()) as { data?: PipelineStage[] };
    const stages = stagesJson.data ?? [];

    // 3. Fetch transitions
    const transRes = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_pipeline_transitions?filter[pipeline_id][_eq]=${pipelineId}`,
      { headers: getHeaders(), cache: "no-store" }
    );
    const transJson = (await transRes.json()) as { data?: PipelineTransition[] };
    const transitions = transJson.data ?? [];

    // 4. Enrich stages with allowed_next_stage_ids
    const transitionMap = new Map<number, number[]>();
    for (const t of transitions) {
      const list = transitionMap.get(t.from_stage_id) ?? [];
      list.push(t.to_stage_id);
      transitionMap.set(t.from_stage_id, list);
    }

    const enrichedStages = stages.map((s) => ({
      ...s,
      is_system: Boolean(s.is_system),
      is_terminal: Boolean(s.is_terminal),
      allowed_next_stage_ids: transitionMap.get(s.id) ?? [],
    }));

    return {
      ...pipeline,
      stages: enrichedStages,
      transitions,
    };
  } catch (error) {
    console.error(`[pipeline.service] getPipelineWithDetails error:`, error);
    return null;
  }
}

/**
 * Automatically seeds the standard default pipeline for a company
 */
export async function seedDefaultCompanyPipeline(companyId: number): Promise<CompanyPipeline | null> {
  try {
    const nowUtc = new Date().toISOString();

    // 1. Create pipeline header
    const createRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_pipelines`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        company_id: companyId,
        name: "Default ATS Pipeline",
        is_default: true,
        version: 1,
        status: "ACTIVE",
        created_at: nowUtc,
        updated_at: nowUtc,
      }),
    });

    if (!createRes.ok) {
      console.error("[pipeline.service] Failed creating default pipeline header:", await createRes.text());
      return null;
    }

    const createJson = (await createRes.json()) as { data?: CompanyPipeline };
    const newPipeline = createJson.data;
    if (!newPipeline?.id) return null;

    // 2. Insert 8 canonical stages
    const createdStages: PipelineStage[] = [];
    for (const s of DEFAULT_PIPELINE_STAGES) {
      const stageRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_stages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          pipeline_id: newPipeline.id,
          stage_name: s.stage_name,
          stage_type: s.stage_type,
          stage_order: s.stage_order,
          color: s.color,
          description: s.description,
          is_terminal: s.is_terminal,
          is_system: s.is_system,
          created_at: nowUtc,
          updated_at: nowUtc,
        }),
      });

      if (stageRes.ok) {
        const stageJson = (await stageRes.json()) as { data?: PipelineStage };
        if (stageJson.data) createdStages.push(stageJson.data);
      }
    }

    // 3. Insert default linear transitions:
    // Application Received -> Screening
    // Screening -> Assessment
    // Screening -> Interview
    // Assessment -> Interview
    // Interview -> Offer
    // Offer -> Hired
    const stageByType = new Map<CanonicalStageType, PipelineStage>();
    for (const st of createdStages) {
      stageByType.set(st.stage_type, st);
    }

    const defaultTransitionPairs: Array<[CanonicalStageType, CanonicalStageType]> = [
      ["APPLIED", "SCREENING"],
      ["SCREENING", "ASSESSMENT"],
      ["SCREENING", "INTERVIEW"],
      ["ASSESSMENT", "INTERVIEW"],
      ["INTERVIEW", "OFFER"],
      ["OFFER", "HIRED"],
    ];

    const createdTransitions: PipelineTransition[] = [];
    for (const [fromType, toType] of defaultTransitionPairs) {
      const fromSt = stageByType.get(fromType);
      const toSt = stageByType.get(toType);
      if (fromSt && toSt) {
        const tRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_transitions`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            pipeline_id: newPipeline.id,
            from_stage_id: fromSt.id,
            to_stage_id: toSt.id,
            created_at: nowUtc,
          }),
        });
        if (tRes.ok) {
          const tJson = (await tRes.json()) as { data?: PipelineTransition };
          if (tJson.data) createdTransitions.push(tJson.data);
        }
      }
    }

    return {
      ...newPipeline,
      stages: createdStages,
      transitions: createdTransitions,
    };
  } catch (error) {
    console.error("[pipeline.service] seedDefaultCompanyPipeline exception:", error);
    return null;
  }
}

/**
 * Creates a new company pipeline
 */
export async function createCompanyPipeline(
  companyId: number,
  data: { name: string; is_default?: boolean }
): Promise<CompanyPipeline | null> {
  try {
    const nowUtc = new Date().toISOString();

    if (data.is_default) {
      // Unset previous defaults by ID
      const checkRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_company_pipelines?filter[company_id][_eq]=${companyId}&fields=id,is_default`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (checkRes.ok) {
        const checkJson = (await checkRes.json()) as {
          data?: Array<{ id: number; is_default: boolean | number }>;
        };
        const existingList = checkJson.data ?? [];
        for (const pipe of existingList) {
          if (Boolean(pipe.is_default)) {
            await fetch(`${DIRECTUS_BASE}/items/vs_company_pipelines/${pipe.id}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({ is_default: false, updated_at: nowUtc }),
            });
          }
        }
      }
    }

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_company_pipelines`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        company_id: companyId,
        name: data.name.trim(),
        is_default: Boolean(data.is_default),
        version: 1,
        status: "ACTIVE",
        created_at: nowUtc,
        updated_at: nowUtc,
      }),
    });

    if (!res.ok) return null;
    const json = (await res.json()) as { data?: CompanyPipeline };
    const newPipeline = json.data;
    if (!newPipeline) return null;

    // Clone standard 8 canonical stages to initialize the custom pipeline
    const createdStages: PipelineStage[] = [];
    for (const s of DEFAULT_PIPELINE_STAGES) {
      const stageRes = await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_stages`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          pipeline_id: newPipeline.id,
          stage_name: s.stage_name,
          stage_type: s.stage_type,
          stage_order: s.stage_order,
          color: s.color,
          description: s.description,
          is_terminal: s.is_terminal,
          is_system: s.is_system,
          created_at: nowUtc,
          updated_at: nowUtc,
        }),
      });

      if (stageRes.ok) {
        const stageJson = (await stageRes.json()) as { data?: PipelineStage };
        if (stageJson.data) createdStages.push(stageJson.data);
      }
    }

    // Insert default linear transitions
    const stageByType = new Map<CanonicalStageType, PipelineStage>();
    for (const st of createdStages) {
      stageByType.set(st.stage_type, st);
    }

    const defaultTransitionPairs: Array<[CanonicalStageType, CanonicalStageType]> = [
      ["APPLIED", "SCREENING"],
      ["SCREENING", "ASSESSMENT"],
      ["SCREENING", "INTERVIEW"],
      ["ASSESSMENT", "INTERVIEW"],
      ["INTERVIEW", "OFFER"],
      ["OFFER", "HIRED"],
    ];

    for (const [fromType, toType] of defaultTransitionPairs) {
      const fromSt = stageByType.get(fromType);
      const toSt = stageByType.get(toType);
      if (fromSt && toSt) {
        await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_transitions`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            pipeline_id: newPipeline.id,
            from_stage_id: fromSt.id,
            to_stage_id: toSt.id,
            created_at: nowUtc,
          }),
        });
      }
    }

    return await getPipelineWithDetails(newPipeline.id, companyId);
  } catch (error) {
    console.error("[pipeline.service] createCompanyPipeline error:", error);
    return null;
  }
}

/**
 * Updates company pipeline metadata
 */
export async function updateCompanyPipeline(
  pipelineId: number,
  companyId: number,
  payload: { name?: string; is_default?: boolean; status?: "ACTIVE" | "ARCHIVED" }
): Promise<boolean> {
  try {
    const nowUtc = new Date().toISOString();

    if (payload.is_default) {
      // Unset previous defaults by ID
      const checkRes = await fetch(
        `${DIRECTUS_BASE}/items/vs_company_pipelines?filter[company_id][_eq]=${companyId}&fields=id,is_default`,
        { headers: getHeaders(), cache: "no-store" }
      );
      if (checkRes.ok) {
        const checkJson = (await checkRes.json()) as {
          data?: Array<{ id: number; is_default: boolean | number }>;
        };
        const existingList = checkJson.data ?? [];
        for (const pipe of existingList) {
          if (pipe.id !== pipelineId && Boolean(pipe.is_default)) {
            await fetch(`${DIRECTUS_BASE}/items/vs_company_pipelines/${pipe.id}`, {
              method: "PATCH",
              headers: getHeaders(),
              body: JSON.stringify({ is_default: false, updated_at: nowUtc }),
            });
          }
        }
      }
    }

    const res = await fetch(
      `${DIRECTUS_BASE}/items/vs_company_pipelines/${pipelineId}`,
      {
        method: "PATCH",
        headers: getHeaders(),
        body: JSON.stringify({
          ...payload,
          updated_at: nowUtc,
        }),
      }
    );

    return res.ok;
  } catch (error) {
    console.error("[pipeline.service] updateCompanyPipeline error:", error);
    return false;
  }
}

/**
 * Adds a new stage to a pipeline
 */
export async function addPipelineStage(
  pipelineId: number,
  companyId: number,
  data: {
    stage_name: string;
    stage_type: CanonicalStageType;
    color?: string;
    description?: string;
  }
): Promise<PipelineStage | null> {
  try {
    // Verify pipeline belongs to company
    const pipeline = await getPipelineWithDetails(pipelineId, companyId);
    if (!pipeline) throw new Error("Pipeline not found or unauthorized.");

    if (!isValidStageType(data.stage_type)) {
      throw new Error(`Invalid stage type. Must be one of: ${CANONICAL_STAGE_TYPES.join(", ")}`);
    }

    // Terminal integrity: HIRED, REJECTED, WITHDRAWN must be terminal
    const isTerminal = isTerminalStageType(data.stage_type);

    // Calculate next stage_order
    const currentStages = pipeline.stages ?? [];
    const maxOrder = currentStages.reduce((max, s) => Math.max(max, s.stage_order), 0);
    const stageOrder = maxOrder + 1;

    const defaultColor = STAGE_TYPE_DETAILS[data.stage_type]?.defaultColor || "sky";
    const nowUtc = new Date().toISOString();

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_stages`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        pipeline_id: pipelineId,
        stage_name: data.stage_name.trim(),
        stage_type: data.stage_type,
        stage_order: stageOrder,
        color: data.color || defaultColor,
        description: data.description?.trim() || null,
        is_terminal: isTerminal,
        is_system: false,
        created_at: nowUtc,
        updated_at: nowUtc,
      }),
    });

    if (!res.ok) {
      console.error("[pipeline.service] addPipelineStage failed:", await res.text());
      return null;
    }

    const json = (await res.json()) as { data?: PipelineStage };
    return json.data ?? null;
  } catch (error) {
    console.error("[pipeline.service] addPipelineStage error:", error);
    return null;
  }
}

/**
 * Updates a stage in a pipeline
 */
export async function updatePipelineStage(
  pipelineId: number,
  stageId: number,
  companyId: number,
  data: {
    stage_name?: string;
    color?: string;
    description?: string;
    stage_order?: number;
  }
): Promise<boolean> {
  try {
    const pipeline = await getPipelineWithDetails(pipelineId, companyId);
    if (!pipeline) return false;

    const stage = pipeline.stages?.find((s) => s.id === stageId);
    if (!stage) return false;

    const nowUtc = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      updated_at: nowUtc,
    };

    if (data.stage_name !== undefined) updatePayload.stage_name = data.stage_name.trim();
    if (data.color !== undefined) updatePayload.color = data.color;
    if (data.description !== undefined) updatePayload.description = data.description.trim() || null;
    if (data.stage_order !== undefined) updatePayload.stage_order = data.stage_order;

    const res = await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_stages/${stageId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(updatePayload),
    });

    return res.ok;
  } catch (error) {
    console.error("[pipeline.service] updatePipelineStage error:", error);
    return false;
  }
}

/**
 * Deletes a stage from a pipeline (system stages cannot be deleted)
 */
export async function deletePipelineStage(
  pipelineId: number,
  stageId: number,
  companyId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const pipeline = await getPipelineWithDetails(pipelineId, companyId);
    if (!pipeline) return { success: false, error: "Pipeline not found." };

    const stage = pipeline.stages?.find((s) => s.id === stageId);
    if (!stage) return { success: false, error: "Stage not found." };

    if (stage.is_system) {
      return { success: false, error: "System stages are required and cannot be deleted." };
    }

    // 1. Delete transitions referencing this stage
    const transToDelete = (pipeline.transitions ?? []).filter(
      (t) => t.from_stage_id === stageId || t.to_stage_id === stageId
    );
    for (const t of transToDelete) {
      await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_transitions/${t.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    }

    // 2. Delete the stage
    const res = await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_stages/${stageId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });

    return { success: res.ok };
  } catch (error) {
    console.error("[pipeline.service] deletePipelineStage error:", error);
    return { success: false, error: "Failed to delete stage." };
  }
}

/**
 * Replaces transitions for a stage or entire pipeline
 */
export async function updateStageTransitions(
  pipelineId: number,
  fromStageId: number,
  targetStageIds: number[],
  companyId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const pipeline = await getPipelineWithDetails(pipelineId, companyId);
    if (!pipeline) return { success: false, error: "Pipeline not found." };

    const stages = pipeline.stages ?? [];
    const fromStage = stages.find((s) => s.id === fromStageId);
    if (!fromStage) return { success: false, error: "Source stage not found." };

    // Terminal integrity: Terminal stages cannot have outgoing transitions
    if (fromStage.is_terminal) {
      return { success: false, error: "Terminal stages cannot have outgoing transitions." };
    }

    // Validate that all targetStageIds belong to this pipeline
    const stageIdSet = new Set(stages.map((s) => s.id));
    for (const toId of targetStageIds) {
      if (!stageIdSet.has(toId)) {
        return { success: false, error: `Invalid transition target stage #${toId} does not belong to this pipeline.` };
      }
      if (toId === fromStageId) {
        return { success: false, error: "Self-transitions are not permitted." };
      }
    }

    // 1. Delete existing transitions where from_stage_id === fromStageId
    const existingForStage = (pipeline.transitions ?? []).filter((t) => t.from_stage_id === fromStageId);
    for (const t of existingForStage) {
      await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_transitions/${t.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
    }

    // 2. Insert new transitions
    const nowUtc = new Date().toISOString();
    for (const toId of targetStageIds) {
      await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_transitions`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          pipeline_id: pipelineId,
          from_stage_id: fromStageId,
          to_stage_id: toId,
          created_at: nowUtc,
        }),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[pipeline.service] updateStageTransitions error:", error);
    return { success: false, error: "Failed to update transitions." };
  }
}

/**
 * Batch reorders stages for a pipeline
 */
export async function reorderPipelineStages(
  pipelineId: number,
  orderedStageIds: number[],
  companyId: number
): Promise<boolean> {
  try {
    const pipeline = await getPipelineWithDetails(pipelineId, companyId);
    if (!pipeline) return false;

    const stages = pipeline.stages ?? [];
    const stageMap = new Map(stages.map((s) => [s.id, s]));

    const nowUtc = new Date().toISOString();
    let order = 1;
    for (const stageId of orderedStageIds) {
      if (stageMap.has(stageId)) {
        await fetch(`${DIRECTUS_BASE}/items/vs_company_pipeline_stages/${stageId}`, {
          method: "PATCH",
          headers: getHeaders(),
          body: JSON.stringify({
            stage_order: order++,
            updated_at: nowUtc,
          }),
        });
      }
    }

    return true;
  } catch (error) {
    console.error("[pipeline.service] reorderPipelineStages error:", error);
    return false;
  }
}
