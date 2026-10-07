/* eslint-disable react-hooks/set-state-in-effect */
// src/modules/client/pipeline/hooks/usePipelineSettings.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CanonicalStageType,
  CompanyPipeline,
  PipelineStage,
} from "../types";

export function usePipelineSettings() {
  const [pipelines, setPipelines] = useState<CompanyPipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/client/pipelines");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to load pipelines.");
      }

      const list: CompanyPipeline[] = json.pipelines ?? [];
      setPipelines(list);

      // Select default or first pipeline
      if (list.length > 0) {
        setSelectedPipelineId((prev) => {
          if (prev && list.some((p) => p.id === prev)) return prev;
          const defaultPipe = list.find((p) => p.is_default) ?? list[0];
          return defaultPipe.id;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching pipelines.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const selectedPipeline =
    pipelines.find((p) => p.id === selectedPipelineId) ?? pipelines[0] ?? null;

  const createPipeline = useCallback(
    async (name: string, isDefault = false) => {
      setSaving(true);
      setError("");
      setSuccess("");
      try {
        const res = await fetch("/api/client/pipelines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, is_default: isDefault }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to create pipeline.");
        }

        setSuccess(`Pipeline "${name}" created successfully.`);
        await fetchPipelines();
        if (json.pipeline?.id) {
          setSelectedPipelineId(json.pipeline.id);
        }
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create pipeline.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchPipelines]
  );

  const addStage = useCallback(
    async (data: {
      stage_name: string;
      stage_type: CanonicalStageType;
      color?: string;
      description?: string;
    }) => {
      if (!selectedPipeline) return false;
      setSaving(true);
      setError("");
      setSuccess("");
      try {
        const res = await fetch(`/api/client/pipelines/${selectedPipeline.id}/stages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to add stage.");
        }

        setSuccess(`Stage "${data.stage_name}" added.`);
        await fetchPipelines();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add stage.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [selectedPipeline, fetchPipelines]
  );

  const updateStage = useCallback(
    async (
      stageId: number,
      data: { stage_name?: string; color?: string; description?: string }
    ) => {
      if (!selectedPipeline) return false;
      setSaving(true);
      setError("");
      setSuccess("");
      try {
        const res = await fetch(
          `/api/client/pipelines/${selectedPipeline.id}/stages/${stageId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to update stage.");
        }

        setSuccess("Stage updated successfully.");
        await fetchPipelines();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update stage.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [selectedPipeline, fetchPipelines]
  );

  const deleteStage = useCallback(
    async (stageId: number) => {
      if (!selectedPipeline) return false;
      const currentPipelineId = selectedPipeline.id;
      const originalPipelines = [...pipelines];

      // Optimistic update: instantly remove stage from state
      setPipelines((prev) =>
        prev.map((p) =>
          p.id === currentPipelineId
            ? { ...p, stages: (p.stages ?? []).filter((s) => s.id !== stageId) }
            : p
        )
      );

      setError("");
      setSuccess("");
      try {
        const res = await fetch(
          `/api/client/pipelines/${currentPipelineId}/stages/${stageId}`,
          {
            method: "DELETE",
          }
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to delete stage.");
        }

        setSuccess("Stage removed successfully.");
        return true;
      } catch (err) {
        // Rollback on failure
        setPipelines(originalPipelines);
        setError(err instanceof Error ? err.message : "Failed to delete stage.");
        return false;
      }
    },
    [selectedPipeline, pipelines]
  );

  const updateTransitions = useCallback(
    async (fromStageId: number, targetStageIds: number[]) => {
      if (!selectedPipeline) return false;
      setSaving(true);
      setError("");
      setSuccess("");
      try {
        const res = await fetch(
          `/api/client/pipelines/${selectedPipeline.id}/transitions`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              from_stage_id: fromStageId,
              target_stage_ids: targetStageIds,
            }),
          }
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to update transitions.");
        }

        setSuccess("Stage transitions updated.");
        await fetchPipelines();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update transitions.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [selectedPipeline, fetchPipelines]
  );

  const moveStageOrder = useCallback(
    async (stageId: number, direction: "up" | "down") => {
      if (!selectedPipeline?.stages) return false;
      const currentPipelineId = selectedPipeline.id;
      const originalPipelines = [...pipelines];

      const stages = [...selectedPipeline.stages].sort(
        (a, b) => a.stage_order - b.stage_order
      );
      const currentIndex = stages.findIndex((s) => s.id === stageId);
      if (currentIndex === -1) return false;

      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      if (targetIndex < 0 || targetIndex >= stages.length) return false;

      // Swap in array
      const temp = stages[currentIndex];
      stages[currentIndex] = stages[targetIndex];
      stages[targetIndex] = temp;

      // Update stage_order numbers to reflect new array order
      const reorderedStages = stages.map((s, idx) => ({
        ...s,
        stage_order: idx + 1,
      }));

      // Optimistic update: update state immediately for smooth animation
      setPipelines((prev) =>
        prev.map((p) =>
          p.id === currentPipelineId ? { ...p, stages: reorderedStages } : p
        )
      );

      const orderedIds = reorderedStages.map((s) => s.id);
      setError("");

      try {
        const res = await fetch(
          `/api/client/pipelines/${currentPipelineId}/reorder`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ordered_stage_ids: orderedIds }),
          }
        );
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to reorder stages.");
        }

        return true;
      } catch (err) {
        // Rollback on failure
        setPipelines(originalPipelines);
        setError(err instanceof Error ? err.message : "Failed to reorder stages.");
        return false;
      }
    },
    [selectedPipeline, pipelines]
  );

  const reorderStages = useCallback(
    async (newOrderedStages: PipelineStage[]) => {
      if (!selectedPipeline?.stages) return false;
      const currentPipelineId = selectedPipeline.id;
      const originalPipelines = [...pipelines];

      // Update stage_order numbers to reflect new array order
      const reorderedStages = newOrderedStages.map((s, idx) => ({
        ...s,
        stage_order: idx + 1,
      }));

      // Optimistic update: update state immediately for smooth drag-and-drop
      setPipelines((prev) =>
        prev.map((p) =>
          p.id === currentPipelineId ? { ...p, stages: reorderedStages } : p
        )
      );

      const orderedIds = reorderedStages.map((s) => s.id);
      setError("");

      try {
        const res = await fetch(
          `/api/client/pipelines/${currentPipelineId}/reorder`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ordered_stage_ids: orderedIds }),
          }
        );
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to reorder stages.");
        }

        return true;
      } catch (err) {
        // Rollback on failure
        setPipelines(originalPipelines);
        setError(err instanceof Error ? err.message : "Failed to reorder stages.");
        return false;
      }
    },
    [selectedPipeline, pipelines]
  );

  const setDefaultPipeline = useCallback(
    async (pipelineId: number) => {
      setSaving(true);
      setError("");
      setSuccess("");
      try {
        const res = await fetch(`/api/client/pipelines/${pipelineId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_default: true }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to set default template.");
        }

        setSuccess("Template marked as company default successfully.");
        await fetchPipelines();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to set default template."
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [fetchPipelines]
  );

  return {
    pipelines,
    selectedPipeline,
    selectedPipelineId,
    setSelectedPipelineId,
    loading,
    saving,
    error,
    success,
    clearMessages,
    fetchPipelines,
    createPipeline,
    setDefaultPipeline,
    addStage,
    updateStage,
    deleteStage,
    updateTransitions,
    moveStageOrder,
    reorderStages,
  };
}
