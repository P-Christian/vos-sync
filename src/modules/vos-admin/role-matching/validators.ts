// src/modules/vos-admin/role-matching/validators.ts

export function slugifyCode(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_");
}

export function normalizeKeyword(keyword: string): string {
  return keyword
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, " ");
}

export function validateCategoryInput(name: string, code: string): { valid: boolean; error?: string } {
  if (!name.trim()) return { valid: false, error: "Category name is required." };
  if (!code.trim()) return { valid: false, error: "Category code is required." };
  return { valid: true };
}

export function validateRoleInput(name: string, categoryId: number): { valid: boolean; error?: string } {
  if (!name.trim()) return { valid: false, error: "Role name is required." };
  if (!categoryId || categoryId <= 0) return { valid: false, error: "Category selection is required." };
  return { valid: true };
}

export function validateKeywordInput(alias: string, roleId: number): { valid: boolean; error?: string } {
  if (!alias.trim()) return { valid: false, error: "Keyword text is required." };
  if (!roleId || roleId <= 0) return { valid: false, error: "Standard Role selection is required." };
  return { valid: true };
}
