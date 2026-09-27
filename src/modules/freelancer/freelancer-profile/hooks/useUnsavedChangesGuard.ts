"use client";

import { useEffect } from "react";

export const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved profile changes. Leave without saving?";

export function shouldWarnOnNavigate(hasPendingChanges: boolean, isSaving: boolean): boolean {
  return hasPendingChanges && !isSaving;
}

export function createBeforeUnloadHandler(message: string): (event: BeforeUnloadEvent) => void {
  return (event) => {
    event.preventDefault();
    event.returnValue = message;
  };
}

export type InAppNavigationCandidate = {
  readonly href: string | null;
  readonly target: string | null;
  readonly download: boolean;
};

export function isConfirmableInAppNavigation(
  candidate: InAppNavigationCandidate,
  origin: string,
  currentHref: string
): boolean {
  if (!candidate.href || candidate.href.startsWith("#")) return false;
  if (candidate.target === "_blank" || candidate.download) return false;
  let url: URL | null = null;
  try {
    url = new URL(candidate.href, currentHref);
  } catch {
    return false;
  }
  if (url.origin !== origin) return false;
  return url.href !== currentHref;
}

export function useUnsavedChangesGuard(
  hasPendingChanges: boolean,
  isSaving: boolean,
  message: string = UNSAVED_CHANGES_MESSAGE
): void {
  const active = shouldWarnOnNavigate(hasPendingChanges, isSaving);

  useEffect(() => {
    if (!active) return;
    const onBeforeUnload = createBeforeUnloadHandler(message);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [active, message]);

  useEffect(() => {
    if (!active) return;
    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const anchor = target.closest("a[href]");
      if (!anchor) return;
      const candidate: InAppNavigationCandidate = {
        href: anchor.getAttribute("href"),
        target: anchor.getAttribute("target"),
        download: anchor.hasAttribute("download"),
      };
      if (!isConfirmableInAppNavigation(candidate, window.location.origin, window.location.href)) {
        return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active, message]);
}
