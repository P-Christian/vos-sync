export interface FileUploadPolicy {
  label: string;
  maxBytes: number;
  mimeTypes: readonly string[];
  extensions: readonly string[];
  /** When true, only image signatures are accepted (never PDF/office files). */
  imageOnly?: boolean;
}

export const CLIENT_DOCUMENT_UPLOAD_POLICY: FileUploadPolicy = {
  label: "company document",
  maxBytes: 10 * 1024 * 1024,
  mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  extensions: ["pdf", "jpg", "jpeg", "png", "webp"],
};

export const CLIENT_IMAGE_UPLOAD_POLICY: FileUploadPolicy = {
  label: "image",
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  extensions: ["jpg", "jpeg", "png", "webp"],
  imageOnly: true,
};

export const FREELANCER_RESUME_UPLOAD_POLICY: FileUploadPolicy = {
  label: "resume",
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  extensions: ["pdf", "doc", "docx"],
};

export const FREELANCER_IDENTITY_IMAGE_UPLOAD_POLICY: FileUploadPolicy = {
  label: "identity image",
  maxBytes: 10 * 1024 * 1024,
  mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  extensions: ["jpg", "jpeg", "png", "webp"],
  imageOnly: true,
};

export const FREELANCER_ADDRESS_UPLOAD_POLICY: FileUploadPolicy = {
  label: "proof-of-address document",
  maxBytes: 10 * 1024 * 1024,
  mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  extensions: ["pdf", "jpg", "jpeg", "png", "webp"],
};

export function getUploadedFile(formData: FormData): File {
  const value = formData.get("file");
  if (!(value instanceof Blob) || typeof (value as Blob & { name?: unknown }).name !== "string") {
    throw new Error("A file is required.");
  }
  return value as File;
}

function extensionOf(file: File): string {
  const name = file.name.trim().toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : "";
}

function startsWithBytes(actual: Uint8Array, expected: readonly number[]): boolean {
  return expected.every((value, index) => actual[index] === value);
}

async function hasExpectedSignature(file: File, extension: string): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  switch (extension) {
    case "pdf":
      return new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
    case "jpg":
    case "jpeg":
      return startsWithBytes(bytes, [0xff, 0xd8, 0xff]);
    case "png":
      return startsWithBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "webp":
      return (
        new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
        new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
      );
    case "docx":
      // DOCX is an OOXML ZIP package. The ZIP marker is the useful cheap
      // server-side check; full archive validation belongs to virus scanning.
      return startsWithBytes(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWithBytes(bytes, [0x50, 0x4b, 0x05, 0x06]);
    case "doc":
      // Legacy binary Word files use the OLE compound-file marker.
      return startsWithBytes(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    default:
      return false;
  }
}

/** Validate an uploaded file on the server, including a lightweight magic-byte check. */
export async function validateUploadedFile(
  file: File,
  policy: FileUploadPolicy,
): Promise<void> {
  if (file.size <= 0) throw new Error(`${policy.label} cannot be empty.`);
  if (file.size > policy.maxBytes) {
    throw new Error(`${policy.label} exceeds the ${Math.floor(policy.maxBytes / (1024 * 1024))}MB limit.`);
  }

  const extension = extensionOf(file);
  const mimeType = file.type.trim().toLowerCase();
  if (!policy.extensions.includes(extension)) {
    throw new Error(`Unsupported ${policy.label} file type.`);
  }
  if (mimeType && !policy.mimeTypes.includes(mimeType)) {
    throw new Error(`Unsupported ${policy.label} file type.`);
  }
  if (policy.imageOnly && !["jpg", "jpeg", "png", "webp"].includes(extension)) {
    throw new Error(`Only image files may be uploaded as ${policy.label}.`);
  }
  if (!(await hasExpectedSignature(file, extension))) {
    throw new Error(`The uploaded ${policy.label} content does not match its file type.`);
  }
}

export function safeFileName(name: string | null | undefined, fallback = "document"): string {
  const lastPathPart = String(name || "").split(/[\\/]/u).pop() || fallback;
  const cleaned = lastPathPart.replace(/[\u0000-\u001f\u007f]/gu, "").trim();
  return (cleaned || fallback).slice(0, 255);
}

