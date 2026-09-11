import { updateSchoolRepo } from '@/modules/school-admin/services/school-admin.repo';
import { VsSchool } from '@/modules/school-admin/types/school-admin.types';

export async function updateSchoolProfileRepo(schoolId: number, payload: Partial<VsSchool>): Promise<VsSchool> {
  return await updateSchoolRepo(schoolId, payload);
}

export async function uploadSchoolLogoRepo(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/school-admin/school/upload", {
    method: "POST",
    body: formData
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to upload image.");
  }

  const fileId = json.id || json.data?.id;
  if (!fileId) {
    throw new Error("Invalid file upload response from server.");
  }

  const directusBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
  return `${directusBase}/assets/${fileId}`;
}
