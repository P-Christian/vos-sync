"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface MutationMetadata {
  feature?: string;
  action?: string;
  entity?: string;
  entityId?: string | number;
}

export interface OptimisticMutationOptions<TData, TVariables> {
  /**
   * The asynchronous API function that performs the database update.
   */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /**
   * Called IMMEDIATELY when action is triggered to update UI optimistically.
   */
  onOptimistic?: (variables: TVariables) => void;
  /**
   * Called if API call fails/throws to revert UI back to exact previous state.
   */
  onRollback?: (variables: TVariables, error: unknown) => void;
  /**
   * Called when API call succeeds with server's response payload.
   */
  onSuccess?: (data: TData, variables: TVariables) => void;
  /**
   * Optional custom error callback.
   */
  onError?: (error: unknown, variables: TVariables) => void;
  /**
   * Error message string or function to display in toast notification on rollback.
   */
  errorMessage?: string | ((error: unknown) => string);
  /**
   * Optional success message string or function to display in toast notification.
   */
  successMessage?: string | ((data: TData) => string);
  /**
   * Operational telemetry metadata for monitoring & debugging transaction lifecycle.
   */
  meta?: MutationMetadata;
}

/**
 * Standard Optimistic UI Transaction Hook
 * Pattern: Click -> Optimistic UI Update -> API Request -> Commit or Rollback + Toast
 */
export function useOptimisticMutation<TData = unknown, TVariables = void>({
  mutationFn,
  onOptimistic,
  onRollback,
  onSuccess,
  onError,
  errorMessage,
  successMessage,
  meta,
}: OptimisticMutationOptions<TData, TVariables>) {
  const [isPending, setIsPending] = useState(false);

  const execute = useCallback(
    async (variables: TVariables) => {
      if (isPending) return;

      setIsPending(true);
      const startTime = Date.now();

      // 1. Trigger optimistic UI update
      try {
        onOptimistic?.(variables);
      } catch (optErr) {
        console.error("[useOptimisticMutation] Error during onOptimistic execution:", optErr);
      }

      // 2. Perform backend API mutation request
      try {
        const data = await mutationFn(variables);
        onSuccess?.(data, variables);

        if (meta) {
          const durationMs = Date.now() - startTime;
          console.log(
            `[useOptimisticMutation] ⚡ SUCCESS [${meta.feature || "global"}:${meta.action || "mutation"}] Entity:${
              meta.entity || "item"
            }#${meta.entityId || "N/A"} (${durationMs}ms)`
          );
        }

        if (successMessage) {
          const msg = typeof successMessage === "function" ? successMessage(data) : successMessage;
          toast.success(msg);
        }

        return data;
      } catch (err: unknown) {
        // 3. Rollback UI on failure
        try {
          onRollback?.(variables, err);
        } catch (rollErr) {
          console.error("[useOptimisticMutation] Error during onRollback execution:", rollErr);
        }

        if (meta) {
          const durationMs = Date.now() - startTime;
          console.warn(
            `[useOptimisticMutation] ↺ ROLLBACK [${meta.feature || "global"}:${meta.action || "mutation"}] Entity:${
              meta.entity || "item"
            }#${meta.entityId || "N/A"} (${durationMs}ms) Error:`,
            err
          );
        }

        onError?.(err, variables);

        const defaultMsg = "Operation failed. Reverting changes...";
        const resolvedErrMsg =
          typeof errorMessage === "function"
            ? errorMessage(err)
            : errorMessage || (err instanceof Error ? err.message : defaultMsg);

        toast.error(resolvedErrMsg);
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [isPending, mutationFn, onOptimistic, onRollback, onSuccess, onError, errorMessage, successMessage, meta]
  );

  return {
    execute,
    isPending,
  };
}

