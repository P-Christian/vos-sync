"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { Button, ButtonProps } from "@/components/ui/button";
import { useOptimisticMutation, OptimisticMutationOptions } from "@/hooks/use-optimistic-mutation";

export interface AsyncActionButtonProps<TData = unknown, TVariables = void>
  extends Omit<ButtonProps, "onClick" | "onError">,
    Omit<OptimisticMutationOptions<TData, TVariables>, "mutationFn"> {
  action: (variables: TVariables) => Promise<TData>;
  variables?: TVariables;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  showSpinner?: boolean;
}


/**
 * Reusable Async Action Button Component
 * Automates optimistic UI state transactions, pending disabled state, loading spinner, and rollback error handling.
 */
export function AsyncActionButton<TData = unknown, TVariables = void>({
  action,
  variables,
  onOptimistic,
  onRollback,
  onSuccess,
  onError,
  errorMessage,
  successMessage,
  meta,
  onClick,
  disabled,
  children,
  showSpinner = true,
  ...props
}: AsyncActionButtonProps<TData, TVariables>) {

  const { execute, isPending } = useOptimisticMutation({
    mutationFn: action,
    onOptimistic,
    onRollback,
    onSuccess,
    onError,
    errorMessage,
    successMessage,
    meta,
  });


  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (!e.isDefaultPrevented()) {
      try {
        await execute(variables as TVariables);
      } catch {
        // Handled silently by useOptimisticMutation error toast & rollback
      }
    }
  };

  return (
    <Button disabled={disabled || isPending} onClick={handleClick} {...props}>
      {isPending && showSpinner && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 mr-1.5" />}
      {children}
    </Button>
  );
}
