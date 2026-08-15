"use client";

import { useState, useEffect, useCallback } from "react";
import { RoleCategory } from "../types";

export const CANONICAL_ROLE_CATEGORIES: RoleCategory[] = [
  { category_id: 1, category_code: "marketing", category_name: "Digital Marketing & Social Media", description: "Marketing, content, SEO, social" },
  { category_id: 2, category_code: "frontend", category_name: "Frontend Software Engineering", description: "React, Vue, Angular, UI" },
  { category_id: 3, category_code: "backend", category_name: "Backend Software Engineering", description: "APIs, services, databases" },
  { category_id: 4, category_code: "fullstack", category_name: "Full Stack Software Engineering", description: "End-to-end web development" },
  { category_id: 5, category_code: "mobile", category_name: "Mobile App Development", description: "iOS, Android, Flutter, React Native" },
  { category_id: 6, category_code: "devops", category_name: "DevOps & Cloud Infrastructure", description: "AWS, Azure, Kubernetes, CI/CD" },
  { category_id: 7, category_code: "data", category_name: "Data Engineering & Analytics", description: "ETL, SQL, warehousing, data science, AI" },
  { category_id: 8, category_code: "qa", category_name: "Quality Assurance & Software Testing", description: "QA, automation, manual testing" },
  { category_id: 9, category_code: "design", category_name: "UI/UX & Product Design", description: "Figma, UX research, interface design" },
];

let cachedCategories: RoleCategory[] | null = null;
let activeFetchPromise: Promise<RoleCategory[]> | null = null;

async function fetchCategories(): Promise<RoleCategory[]> {
  if (cachedCategories && cachedCategories.length > 0) {
    return cachedCategories;
  }
  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      const res = await fetch("/api/client/jobs/categories", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch role categories");
      }
      const json = await res.json();
      const list: RoleCategory[] = json.categories ?? [];
      cachedCategories = list.length > 0 ? list : CANONICAL_ROLE_CATEGORIES;
      return cachedCategories;
    } catch {
      cachedCategories = CANONICAL_ROLE_CATEGORIES;
      return CANONICAL_ROLE_CATEGORIES;
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

export function useRoleCategories() {
  const [categories, setCategories] = useState<RoleCategory[]>(
    cachedCategories || CANONICAL_ROLE_CATEGORIES
  );
  const [loading, setLoading] = useState(!cachedCategories);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      cachedCategories = null;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load categories");
      setCategories(CANONICAL_ROLE_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const findCategoryById = useCallback(
    (id: number | null | undefined): RoleCategory | undefined => {
      if (!id) return undefined;
      return categories.find((c) => c.category_id === Number(id));
    },
    [categories]
  );

  const findCategoryByName = useCallback(
    (name: string | null | undefined): RoleCategory | undefined => {
      if (!name) return undefined;
      const lower = name.trim().toLowerCase();
      return categories.find(
        (c) =>
          c.category_name.toLowerCase() === lower ||
          c.category_code.toLowerCase() === lower
      );
    },
    [categories]
  );

  return {
    categories,
    loading,
    error,
    refresh: () => load(true),
    findCategoryById,
    findCategoryByName,
  };
}
